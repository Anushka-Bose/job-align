import re

PERSONAL_INFO_KEYWORDS = (
    "resume name", "contact no", "contact number", "dob", "date of birth",
    "address", "address for correspondence", "permanent address",
    "phone", "mobile", "email", "e-mail", "mail id", "nationality", "gender",
    "marital status", "father", "mother", "passport", "aadhaar",
    "declaration", "signature", "languages known"
)

LOW_VALUE_PROFILE_KEYWORDS = (
    "interests:", "hobbies:", "languages known", "nationality:",
    "fluent in", "conversant in", "recitation competition",
    "art competition", "school magazine", "illustration lead"
)

RESUME_SECTION_HEADERS = (
    "academic background", "skills", "domain skill", "soft skill",
    "projects", "seminars", "co-curricular activities",
    "extra-curricular activities", "achievements"
)
ACTION_TERMS = (
    "built", "developed", "integrated", "implemented", "deployed",
    "created", "designed", "led", "managed", "optimized", "trained"
)
SCHOOL_ONLY_RE = re.compile(r"\b(school|isc|icse|cbse|cisce)\b")
DEGREE_OR_TECH_RE = re.compile(
    r"\b(b\.?\s?tech|bachelor|masters?|m\.?\s?tech|degree|computer science|engineering|python|java|sql|machine learning|data)\b"
)

EMAIL_RE = re.compile(r"[\w.+-]+@?[\w-]+\.(?:com|edu|in|org|net)")
PHONE_RE = re.compile(r"(?:\+?\d[\s-]?){8,}")
ADDRESS_RE = re.compile(r"\b(?:kolkata|delhi|mumbai|bangalore|bengaluru|pune|chennai|hyderabad|pin|pincode)\b")

def _personal_info_score(text: str) -> int:
    lowered = text.lower()
    score = 0
    score += sum(1 for keyword in PERSONAL_INFO_KEYWORDS if keyword in lowered)
    score += 1 if EMAIL_RE.search(lowered) else 0
    score += 1 if PHONE_RE.search(lowered) else 0
    score += 1 if ADDRESS_RE.search(lowered) else 0
    return score

def _strip_section_prefix(sentence: str) -> str:
    text = sentence.strip()
    lowered = text.lower()
    for header in RESUME_SECTION_HEADERS:
        if lowered.startswith(header):
            return text[len(header):].strip(" :-")
    return text

def is_useful_sentence(sentence: str) -> bool:
    """Lightweight heuristic filtering."""
    sentence = _strip_section_prefix(sentence)
    if len(sentence.split()) < 4:
        return False
        
    s = sentence.lower().strip()

    if _personal_info_score(s) >= 1:
        return False

    if any(k in s for k in LOW_VALUE_PROFILE_KEYWORDS):
        return False

    if SCHOOL_ONLY_RE.search(s) and not DEGREE_OR_TECH_RE.search(s):
        return False
        
    # Removes short lines containing numbers (e.g., phone numbers, short addresses, dates)
    if any(char.isdigit() for char in s) and len(s) < 35:
        return False
        
    return True

def is_rewritable(sentence: str) -> bool:
    """Return True only for sentences safe and meaningful to rewrite."""
    if not sentence:
        return False
    original_lowered = sentence.strip().lower()
    text = _strip_section_prefix(sentence)
    if len(text.split()) < 5:
        return False
    lowered = text.lower()
    if _personal_info_score(lowered) >= 1:
        return False
    if any(keyword in lowered for keyword in LOW_VALUE_PROFILE_KEYWORDS):
        return False
    if (
        original_lowered.startswith(("projects", "projects seminars")) and
        not any(term in lowered for term in ACTION_TERMS)
    ):
        return False
    core_chars = re.sub(r"\s+", "", text)
    if not core_chars:
        return False
    digit_ratio = sum(ch.isdigit() for ch in core_chars) / len(core_chars)
    if digit_ratio > 0.3 and len(text) < 30:
        return False
    return True
