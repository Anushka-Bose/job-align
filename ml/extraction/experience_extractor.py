import re
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

EXPERIENCE_SECTION_RE = re.compile(
    r"\b(experience|work experience|professional experience|employment|internship|internships)\b",
    re.IGNORECASE
)
NON_PROFESSIONAL_RE = re.compile(
    r"\b(projects?|education|academic|skills?|certifications?|achievements?|activities?)\b",
    re.IGNORECASE
)


def _to_float(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(token: str, today: Optional[date] = None) -> Optional[Tuple[int, int]]:
    today = today or date.today()
    text = token.strip().lower()
    if text in ("present", "current", "now"):
        return today.year, today.month

    year_match = re.search(r"\b(19|20)\d{2}\b", text)
    if not year_match:
        return None

    year = int(year_match.group(0))
    month = 1
    for name, number in MONTHS.items():
        if re.search(rf"\b{name}\b", text):
            month = number
            break
    return year, month


def _months_between(start: Tuple[int, int], end: Tuple[int, int]) -> int:
    start_year, start_month = start
    end_year, end_month = end
    months = (end_year - start_year) * 12 + (end_month - start_month)
    return max(0, months)


def _experience_level(years: float) -> str:
    if years < 0.5:
        return "entry_level"
    if years < 2:
        return "junior"
    if years < 5:
        return "mid_level"
    return "senior"


def _professional_context(text: str, start_index: int) -> bool:
    window = text[max(0, start_index - 350):start_index].lower()
    last_experience = max((m.start() for m in EXPERIENCE_SECTION_RE.finditer(window)), default=-1)
    last_non_professional = max((m.start() for m in NON_PROFESSIONAL_RE.finditer(window)), default=-1)
    return last_experience >= 0 and last_experience > last_non_professional


def extract_experience_years(resume_text: str, today: Optional[date] = None) -> Dict[str, Any]:
    """Extract likely professional experience years without calling an LLM."""
    today = today or date.today()
    text = re.sub(r"\s+", " ", (resume_text or "").lower())
    evidence: List[str] = []
    explicit_years: List[float] = []
    range_months = 0

    explicit_patterns = [
        r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience",
        r"experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)",
    ]
    for pattern in explicit_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            years = _to_float(match.group(1))
            if years > 0:
                explicit_years.append(years)
                evidence.append(match.group(0).strip())

    date_range_re = re.compile(
        r"((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2})"
        r"\s*(?:-|to|through|\u2013|\u2014)\s*"
        r"((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}|present|current|now)",
        re.IGNORECASE
    )
    for match in date_range_re.finditer(text):
        if not _professional_context(text, match.start()):
            continue
        start = _parse_date(match.group(1), today)
        end = _parse_date(match.group(2), today)
        if not start or not end:
            continue
        months = _months_between(start, end)
        if months > 0:
            range_months += months
            evidence.append(match.group(0).strip())

    inferred_years = round(range_months / 12, 1)
    years = max(explicit_years + [inferred_years, 0.0])

    return {
        "years": years,
        "professional_years": years,
        "level": _experience_level(years),
        "evidence": evidence[:5],
        "source": "rule_based",
        "note": "Counts professional work/internship experience only; academic projects are not counted as years."
    }


def extract_required_experience_years(job: Dict[str, Any]) -> Optional[float]:
    """Extract minimum years required from job text when present."""
    text = " ".join(
        str(job.get(key, "") or "")
        for key in ("title", "description", "requirements", "qualifications")
    ).lower()

    patterns = [
        r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience",
        r"minimum\s+(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)",
        r"at least\s+(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)",
        r"(\d+(?:\.\d+)?)\s*-\s*\d+(?:\.\d+)?\s*(?:years?|yrs?)",
    ]

    values = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            values.append(_to_float(match.group(1)))

    return min(values) if values else None


def experience_fit(candidate_years: float, required_years: Optional[float]) -> Dict[str, Any]:
    if required_years is None:
        return {
            "status": "not_specified",
            "required_years": None,
            "gap_years": 0.0,
            "score_multiplier": 1.0
        }

    gap = round(max(0.0, required_years - candidate_years), 1)
    if gap == 0:
        status = "meets"
        multiplier = 1.0
    elif gap <= 1:
        status = "slightly_below"
        multiplier = 0.92
    elif gap <= 3:
        status = "below"
        multiplier = 0.78
    else:
        status = "far_below"
        multiplier = 0.62

    return {
        "status": status,
        "required_years": required_years,
        "gap_years": gap,
        "score_multiplier": multiplier
    }
