import os
import json
import re
import time
from typing import List, Dict, Any
from google import genai

# ================= CONFIG =================
client = None
MODEL_NAME = "gemini-3.1-flash-lite"
BACKOFF_SECONDS = [5, 10, 20]
BATCH_SIZE = 8
_llm_quota_exhausted = False
LOW_VALUE_TERMS = (
    "recitation", "art competition", "school magazine",
    "nationality", "languages known", "interests"
)

# ================= HELPERS =================
def _get_client():
    global client
    if client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        client = genai.Client(api_key=api_key)
    return client


def _is_hard_quota_exhausted(error: Exception) -> bool:
    msg = str(error).lower()
    return (
        "resource_exhausted" in msg or
        "429" in msg or
        "quota exceeded" in msg
    )

def _strip_code_fences(content: str) -> str:
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json_block(content: str) -> str:
    text = _strip_code_fences(content)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end >= start:
        return text[start:end + 1]
    return text




def _clean_suggestion(candidate: str) -> str:
    text = re.sub(r"\s+", " ", (candidate or "").strip())
    return text.strip(" \t\r\n-")


def _fallback_suggestion(original: str, job_desc: str = "", missing_competencies: List[str] = None) -> str:
    missing_competencies = missing_competencies or []
    lowered = original.lower()
    if any(term in lowered for term in LOW_VALUE_TERMS):
        return (
            "Deprioritize or remove this line unless it demonstrates a role-relevant "
            "technical contribution, leadership result, or measurable impact."
        )

    focus = ", ".join(str(item) for item in missing_competencies[:3] if str(item).strip())
    if focus:
        return (
            "Tie this line more directly to the job by adding evidence for "
            f"{focus}, and rewrite it with a specific action, tool, and outcome."
        )
    if job_desc:
        return (
            "Make this line more job-aligned by naming the relevant skill or tool, "
            "then add a clear result or measurable impact."
        )
    return "Rewrite this line with a stronger action verb, concrete skill, and measurable result."


def _is_valid_suggestion(original: str, candidate: str) -> bool:
    if not candidate:
        return False

    orig = original.strip().lower()
    cand = _clean_suggestion(candidate).lower()

    # identical or near identical
    if cand == orig:
        return False

    if len(cand.split()) < 8:
        return False

    # reject generic junk
    banned = [
        "this sentence is bad",
        "not relevant",
        "needs improvement",
        "could be better"
    ]
    if any(b in cand for b in banned):
        return False

    return True


def _call_with_retry(prompt: str) -> str:
    global _llm_quota_exhausted
    if _llm_quota_exhausted:
        raise RuntimeError("Gemini hard quota exhausted for current process.")
    last_error = None

    for attempt in range(len(BACKOFF_SECONDS) + 1):
        try:
            response = _get_client().models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return (response.text or "").strip()

        except Exception as e:
            last_error = e
            if _is_hard_quota_exhausted(e):
                _llm_quota_exhausted = True
                break

            if attempt >= len(BACKOFF_SECONDS):
                break

            time.sleep(BACKOFF_SECONDS[attempt])

    raise last_error


# ================= PROMPT =================

def _build_prompt(entries: List[Dict[str, Any]]) -> str:
    payload = []

    for i, e in enumerate(entries):
        payload.append({
            "id": i,
            "sentence": e["sentence"],
            "job_description": e.get("job_desc", ""),
            "missing_competencies": e.get("missing_competencies", []),
            "context_chunks": e.get("top_chunks", [])
        })

    return f"""
You are a precise resume improvement engine.

TASK:
For each weak resume sentence, write a concrete improvement suggestion that is specific to the sentence and the target job.

RULES:
- Output ONLY valid JSON:
  {{"suggestions":[{{"id":0,"suggestion":"..."}}]}}
- One suggestion per input sentence
- Keep ids unchanged
- Use ONLY given sentence + context
- Explain what to change and include a stronger suggested rewrite when possible
- You MAY infer soft impact only when it follows from the sentence/context
- DO NOT invent numbers, tools, or experiences
- Keep each suggestion under 45 words
- Do not give generic advice; refer to the sentence content and job fit

INPUT:
{json.dumps(payload, ensure_ascii=False)}
"""


# ================= MAIN =================

def generate_suggestions_batch(
    entries: List[Dict[str, Any]],
    batch_size: int = BATCH_SIZE
) -> List[str]:

    if not entries:
        return []

    results = [
        _fallback_suggestion(
            e.get("sentence", ""),
            e.get("job_desc", ""),
            e.get("missing_competencies", [])
        )
        for e in entries
    ]

    batch_size = max(1, min(8, batch_size))

    # -------- Batch Processing --------
    for start in range(0, len(entries), batch_size):
        batch = entries[start:start + batch_size]
        originals = [e["sentence"] for e in batch]

        try:
            prompt = _build_prompt(batch)
            raw = _call_with_retry(prompt)

            content = _extract_json_block(raw)

            if not content.startswith("{"):
                raise ValueError("Invalid JSON from LLM")

            parsed = json.loads(content)

            suggestion_items = parsed.get("suggestions", parsed.get("rewrites"))
            if suggestion_items is None:
                raise ValueError("Missing suggestions key")

            id_to_suggestion = {}
            for item in suggestion_items:
                if not isinstance(item, dict) or "id" not in item:
                    continue
                suggestion = item.get("suggestion", item.get("rewritten", ""))
                id_to_suggestion[int(item["id"])] = _clean_suggestion(str(suggestion))

            # -------- Apply results --------
            for local_idx, original in enumerate(originals):
                global_idx = start + local_idx

                candidate = id_to_suggestion.get(local_idx, "")

                if _is_valid_suggestion(original, candidate):
                    results[global_idx] = candidate
                else:
                    entry = entries[global_idx]
                    results[global_idx] = _fallback_suggestion(
                        original,
                        entry.get("job_desc", ""),
                        entry.get("missing_competencies", [])
                    )

        except Exception:
            for local_idx, original in enumerate(originals):
                entry = entries[start + local_idx]
                results[start + local_idx] = _fallback_suggestion(
                    original,
                    entry.get("job_desc", ""),
                    entry.get("missing_competencies", [])
                )

    return results


# ================= SINGLE WRAPPER =================

def generate_suggestion(
    sentence: str,
    job_desc: str,
    missing_competencies: List[str],
    top_chunks: List[str]
) -> str:

    rewritten = generate_suggestions_batch(
        [{
            "sentence": sentence,
            "job_desc": job_desc,
            "missing_competencies": missing_competencies,
            "top_chunks": top_chunks
        }],
        batch_size=1
    )

    return rewritten[0] if rewritten else sentence
