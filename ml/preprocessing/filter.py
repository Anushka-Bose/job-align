import re

PERSONAL_INFO_KEYWORDS = (
    "name", "dob", "date of birth", "address", "permanent address",
    "phone", "mobile", "email", "nationality", "gender",
    "marital status", "father", "mother", "passport", "aadhaar",
    "declaration", "signature"
)
def is_useful_sentence(sentence: str) -> bool:
    """Lightweight heuristic filtering."""
    if len(sentence.split()) < 5:
        return False
        
    s = sentence.lower().strip()
    
    ignore_keywords = [
        "father", "mother", "dob", "date of birth",
        "declaration", "signature", "permanent address"
    ]
    if any(k in s for k in ignore_keywords):
        return False
        
    # Removes short lines containing numbers (e.g., phone numbers, short addresses, dates)
    if any(char.isdigit() for char in s) and len(s) < 30:
        return False
        
    return True

def is_rewritable(sentence: str) -> bool:
    """Return True only for sentences safe and meaningful to rewrite."""
    if not sentence:
        return False
    text = sentence.strip()
    if len(text.split()) < 5:
        return False
    lowered = text.lower()
    if any(keyword in lowered for keyword in PERSONAL_INFO_KEYWORDS):
        return False
    core_chars = re.sub(r"\s+", "", text)
    if not core_chars:
        return False
    digit_ratio = sum(ch.isdigit() for ch in core_chars) / len(core_chars)
    if digit_ratio > 0.3 and len(text) < 30:
        return False
    return True
