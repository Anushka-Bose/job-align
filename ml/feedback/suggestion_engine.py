import os
import json
import re
import time
from typing import List, Dict, Any
from google import genai

# ================= CONFIG =================
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = "gemini-2.5-flash"
BACKOFF_SECONDS = [5, 10, 20]
BATCH_SIZE = 8

# ================= HELPERS =================

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




def _is_valid_rewrite(original: str, candidate: str) -> bool:
    if not candidate:
        return False

    orig = original.strip().lower()
    cand = candidate.strip().lower()

    # identical or near identical
    if cand == orig:
        return False

    if abs(len(cand) - len(orig)) < 5:
        return False

    # reject generic junk
    banned = [
        "improve", "could be strengthened", "this sentence",
        "add impact", "consider adding"
    ]
    if any(b in cand for b in banned):
        return False

    return True


def _call_with_retry(prompt: str) -> str:
    last_error = None

    for attempt in range(len(BACKOFF_SECONDS) + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return (response.text or "").strip()

        except Exception as e:
            last_error = e

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
You are a resume rewriting engine.

TASK:
Rewrite each sentence to improve clarity, strength, and impact.

RULES:
- Output ONLY valid JSON:
  {{"rewrites":[{{"id":0,"rewritten":"..."}}]}}
- One sentence per rewrite
- Keep ids unchanged
- Use ONLY given sentence + context
- You MAY rephrase and strengthen wording
- You MAY infer soft impact (e.g. improved efficiency, better UX)
- DO NOT invent numbers, tools, or experiences
- If no meaningful improvement is possible, return original
- NEVER output advice

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

    results = [e["sentence"] for e in entries]

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

            if "rewrites" not in parsed:
                raise ValueError("Missing rewrites key")

            rewrites = parsed["rewrites"]

            id_to_rewrite = {}
            for item in rewrites:
                if isinstance(item, dict) and "id" in item and "rewritten" in item:
                    id_to_rewrite[int(item["id"])] = str(item["rewritten"]).strip()

            # -------- Apply results --------
            for local_idx, original in enumerate(originals):
                global_idx = start + local_idx

                candidate = id_to_rewrite.get(local_idx, "")

                if _is_valid_rewrite(original, candidate):
                    results[global_idx] = candidate
                else:
                    results[global_idx] = original

        except Exception:
            for local_idx, original in enumerate(originals):
                results[start + local_idx] = original

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