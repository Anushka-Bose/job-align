from typing import List
import os
import json
import re
import time
from google import genai

# Setup Gemini model
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
BACKOFF_SECONDS = [5, 10, 20]
EXPECTED_KEYS = [
    "Impact",
    "Problem Solving",
    "Technical/Domain Depth",
    "Communication",
    "Leadership/Ownership",
    "Analytical Thinking",
]

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

def _clamp(score: float) -> int:
    return int(max(0, min(100, round(score))))

def _directional_fallback(clusters: List[str]) -> dict:
    text = " ".join(clusters)
    words = text.split()
    num_words = max(1, len(words))
    num_chars = max(1, len(text))
    num_sentences = max(1, text.count(".") + text.count("!") + text.count("?"))
    unique_ratio = len(set(words)) / num_words
    digit_ratio = sum(ch.isdigit() for ch in text) / num_chars
    avg_words_per_sentence = num_words / num_sentences

    fallback = {
        "Impact": _clamp(35 + (digit_ratio * 80) + min(avg_words_per_sentence, 20)),
        "Problem Solving": _clamp(40 + (unique_ratio * 35) + min(num_sentences, 15)),
        "Technical/Domain Depth": _clamp(38 + (unique_ratio * 40) + min(num_words / 25, 18)),
        "Communication": _clamp(45 + min(avg_words_per_sentence * 1.4, 25)),
        "Leadership/Ownership": _clamp(30 + min(num_sentences, 20) + (unique_ratio * 20)),
        "Analytical Thinking": _clamp(35 + (digit_ratio * 70) + (unique_ratio * 25)),
    }
    return fallback

def extract_competencies(clusters: List[str]) -> dict:
    """Extract 6 Core Competencies dynamically using Gemini LLM over clustered resume chunks."""
    if not clusters:
        return {}
        
    combined_text = "\n\n".join(clusters)
    
    prompt = f"""
You are an expert ATS competency parser.
Analyze the following clustered pseudo-sections of a resume and score the candidate on 6 Core Competencies:
1. Impact (measurable results)
2. Problem Solving
3. Technical/Domain Depth
4. Communication
5. Leadership/Ownership
6. Analytical Thinking

Return ONLY a valid JSON dictionary where each key is the competency name, and the value is a score from 0-100 indicating the strength of evidence for that competency. Do not return markdown blocks. Example: {{"Impact": 80, "Leadership/Ownership": 45}}

Text:
"{combined_text[:6000]}"
"""
    fallback = _directional_fallback(clusters)
    last_error = None
    for attempt in range(len(BACKOFF_SECONDS) + 1):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            content = _extract_json_block((response.text or "").strip())
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise ValueError("LLM competency output is not a JSON object")
            normalized = {}
            for key in EXPECTED_KEYS:
                raw_val = parsed.get(key, fallback[key])
                try:
                    normalized[key] = _clamp(float(raw_val))
                except Exception:
                    normalized[key] = fallback[key]
            return normalized
        except Exception as e:
            last_error = e
            if attempt >= len(BACKOFF_SECONDS):
                break
            time.sleep(BACKOFF_SECONDS[attempt])
    print(f"Error extracting competencies via LLM: {last_error}")
    return fallback
