import hashlib
import json
import os
import re
from typing import Dict, Optional

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None

try:
    from google import genai
except Exception:
    genai = None

LLM_MODEL = "gemini-2.0-flash"
MAX_LLM_CHARS = 1600
_client = None
_llm_unavailable = False
_llm_cache: Dict[str, Dict] = {}


def extract_text(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    if ext == ".pdf":
        if PyPDF2 is None:
            return None, "PyPDF2 not installed"
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + " "
        except Exception as e:
            return None, f"PDF error: {e}"

    elif ext in [".docx", ".doc"]:
        if docx is None:
            return None, "python-docx not installed"
        try:
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + " "
        except Exception as e:
            return None, f"DOCX error: {e}"

    elif ext == ".txt":
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception as e:
            return None, f"TXT error: {e}"
    else:
        return None, f"Unsupported format: {ext}"

    if not text.strip():
        return None, "Empty text"
    return text.strip(), None


def _use_llm() -> bool:
    return os.environ.get("SCAM_FILTER_USE_LLM", "").lower() in ("1", "true", "yes")


def _normalize_url(url: str) -> str:
    cleaned = url.strip().rstrip(".,;:)")
    if cleaned.startswith("www."):
        cleaned = "https://" + cleaned
    return cleaned


def _platform_for_url(url: str) -> str:
    lowered = url.lower()
    if "github.com" in lowered:
        return "GitHub"
    if "gitlab.com" in lowered:
        return "GitLab"
    if "bitbucket.org" in lowered:
        return "Bitbucket"
    if "linkedin.com" in lowered:
        return "LinkedIn"
    if "stackoverflow.com" in lowered:
        return "Stack Overflow"
    if "hub.docker.com" in lowered or "docker.com" in lowered:
        return "Docker Hub"
    if "npmjs.com" in lowered:
        return "npm"
    if "pypi.org" in lowered:
        return "PyPI"
    if "kaggle.com" in lowered:
        return "Kaggle"
    return "Custom domain"


def _is_git_platform(url: str) -> bool:
    lowered = url.lower()
    return any(domain in lowered for domain in ("github.com", "gitlab.com", "bitbucket.org", "gitea"))


def rule_based_fallback(text: str, reason: str = "Rule-based URL extraction") -> Dict:
    urls = re.findall(r"https?://[^\s,;]+|www\.[^\s,;]+", text, re.IGNORECASE)
    unique_urls = []
    seen = set()

    for url in urls:
        normalized = _normalize_url(url)
        key = normalized.lower()
        if key not in seen:
            seen.add(key)
            unique_urls.append(normalized)

    websites = [
        {
            "full_url": url,
            "platform": _platform_for_url(url),
            "is_git_platform": _is_git_platform(url)
        }
        for url in unique_urls[:10]
    ]

    return {
        "is_github_based": any(site["platform"] == "GitHub" for site in websites),
        "websites": websites,
        "reasoning": reason,
        "llm_used": False
    }


def _get_client(api_key: str):
    global _client
    if genai is None:
        raise RuntimeError("google-genai is not installed")
    if _client is None:
        _client = genai.Client(api_key=api_key)
    return _client


def _is_llm_error(error: Exception) -> bool:
    msg = str(error).lower()
    return any(token in msg for token in (
        "resource_exhausted", "quota exceeded", "429",
        "no connection", "connection", "timeout", "api key"
    ))


def _strip_json_fence(content: str) -> str:
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end >= start:
        return text[start:end + 1]
    return text


def analyze_with_llm(text: str, api_key: str) -> Optional[Dict]:
    global _llm_unavailable
    if not _use_llm() or _llm_unavailable:
        return None

    cache_key = hashlib.sha256(text[:MAX_LLM_CHARS].encode("utf-8", errors="ignore")).hexdigest()
    if cache_key in _llm_cache:
        return _llm_cache[cache_key]

    prompt = f"""
Extract website/profile URLs from this resume. Return ONLY JSON:
{{
  "websites": [
    {{"full_url": "https://...", "platform": "GitHub", "is_git_platform": true}}
  ],
  "is_github_based": true,
  "reasoning": "short sentence"
}}

Resume:
\"\"\"
{text[:MAX_LLM_CHARS]}
\"\"\"
"""
    try:
        response = _get_client(api_key).models.generate_content(
            model=LLM_MODEL,
            contents=prompt
        )
        data = json.loads(_strip_json_fence(response.text))
        data["llm_used"] = True
        _llm_cache[cache_key] = data
        return data
    except Exception as e:
        if _is_llm_error(e):
            _llm_unavailable = True
        return None


def analyze_resume_github_llm(file_path: str) -> Dict:
    text, error = extract_text(file_path)
    if error:
        return {
            "success": False,
            "error": error,
            "is_github_based": None,
            "websites": [],
            "reasoning": None
        }

    fallback = rule_based_fallback(text)
    if fallback["websites"]:
        return {
            "success": True,
            "file_path": file_path,
            "is_github_based": fallback["is_github_based"],
            "websites": fallback["websites"],
            "reasoning": fallback["reasoning"],
            "method": "rule-based"
        }

    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        llm_result = analyze_with_llm(text, api_key)
        if llm_result:
            return {
                "success": True,
                "file_path": file_path,
                "is_github_based": llm_result.get("is_github_based", False),
                "websites": llm_result.get("websites", []),
                "reasoning": llm_result.get("reasoning", ""),
                "method": "LLM (Gemini)"
            }

    return {
        "success": True,
        "file_path": file_path,
        "is_github_based": False,
        "websites": [],
        "reasoning": "No explicit website URLs found.",
        "method": "rule-based fallback"
    }


if __name__ == "__main__":
    test_file = r"D:\job-align\ml\data\raw\ai_resume_test.pdf"
    result = analyze_resume_github_llm(test_file)
    print(json.dumps(result, indent=2, ensure_ascii=False))
