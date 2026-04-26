import os
import re
import json
from typing import Dict, List, Union, Optional

# Optional imports for PDF/DOCX
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None

# LLM client
from google import genai

# ----------------------------------------------
#  Text extraction (same as before)
# ----------------------------------------------
def extract_text(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    if ext == '.pdf':
        if PyPDF2 is None:
            return None, "PyPDF2 not installed"
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + " "
        except Exception as e:
            return None, f"PDF error: {e}"

    elif ext in ['.docx', '.doc']:
        if docx is None:
            return None, "python-docx not installed"
        try:
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + " "
        except Exception as e:
            return None, f"DOCX error: {e}"

    elif ext == '.txt':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            return None, f"TXT error: {e}"
    else:
        return None, f"Unsupported format: {ext}"

    if not text.strip():
        return None, "Empty text"
    return text.strip(), None

# ----------------------------------------------
#  Rule‑based fallback (simple URL + GitHub detection)
# ----------------------------------------------
def rule_based_fallback(text: str) -> Dict:
    """Simple regex‑based detection if LLM fails."""
    github_urls = re.findall(r'https?://(?:www\.)?github\.com/[^\s]+', text, re.IGNORECASE)
    other_urls = re.findall(r'https?://[^\s]+', text, re.IGNORECASE)
    is_github = len(github_urls) > 0
    return {
        "is_github_based": is_github,
        "websites_found": other_urls[:10],
        "classification": {"github": github_urls},
        "reasoning": "Rule‑based fallback (LLM unavailable)",
        "llm_used": False
    }

# ----------------------------------------------
#  LLM‑based website detection (any kind)
# ----------------------------------------------
def analyze_with_llm(text: str, api_key: str) -> Optional[Dict]:
    """
    Call Gemini to extract and classify all websites.
    Returns parsed JSON or None on failure.
    """
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
You are a resume parser. Extract ALL websites/URLs from the resume below.

For each URL, determine:
- full_url
- platform (e.g., "GitHub", "GitLab", "LinkedIn", "Personal Portfolio", "Blog", "Stack Overflow", "Docker Hub", "npm", "PyPI", "Custom domain", etc.)
- is_git_platform (true/false) — true if it hosts source code (GitHub, GitLab, Bitbucket, Gitea, etc.)

Also give final verdict:
- is_github_based: true if the candidate's main code hosting is GitHub (i.e., GitHub URLs appear and are primary)
- reasoning: short sentence

Return ONLY valid JSON in this format:
{{
  "websites": [
    {{"full_url": "https://...", "platform": "...", "is_git_platform": true/false}}
  ],
  "is_github_based": true/false,
  "reasoning": "..."
}}

Resume text:
\"\"\"
{text[:4000]}
\"\"\"
"""
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        result_text = response.text.strip()
        # Clean markdown code blocks if present
        if result_text.startswith("json"):
            result_text = result_text[7:]
        if result_text.endswith(""):
            result_text = result_text[:-3]
        result_text = result_text.strip()

        data = json.loads(result_text)
        data["llm_used"] = True
        return data
    except Exception as e:
        return None

# ----------------------------------------------
#  Main pipeline
# ----------------------------------------------
def analyze_resume_github_llm(file_path: str) -> Dict:
    """
    Main entry point. Uses LLM if API key exists and works;
    otherwise falls back to rule‑based detection.
    """
    # Extract text
    text, error = extract_text(file_path)
    if error:
        return {
            "success": False,
            "error": error,
            "is_github_based": None,
            "websites": [],
            "reasoning": None
        }

    # Get API key from environment
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

    # Fallback to rule‑based
    fallback = rule_based_fallback(text)
    return {
        "success": True,
        "file_path": file_path,
        "is_github_based": fallback["is_github_based"],
        "websites": [{"full_url": u, "platform": "unknown", "is_git_platform": "github" in u} for u in fallback["websites_found"]],
        "reasoning": fallback["reasoning"],
        "method": "rule‑based fallback"
    }

# ----------------------------------------------
#  Command-line test
# ----------------------------------------------
if _name_ == "_main_":
    test_file = r"D:\job-align\ml\data\raw\ai_resume_test.pdf"
    result = analyze_resume_github_llm(test_file)
    print(json.dumps(result, indent=2, ensure_ascii=False))