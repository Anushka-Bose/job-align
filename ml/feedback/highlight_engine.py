from typing import Dict, List, Optional

RED_THRESHOLD = 0.28
GREEN_THRESHOLD = 0.58

LOW_VALUE_TERMS = (
    "recitation", "art competition", "school magazine",
    "nationality", "languages known", "interests"
)


def _fallback_red_suggestion(sentence: str, missing_competencies: List[str]) -> str:
    lowered = sentence.lower()
    if any(term in lowered for term in LOW_VALUE_TERMS):
        return (
            "Deprioritize or remove this line for the target role unless you can "
            "connect it to a clear technical contribution, leadership result, or measurable impact."
        )

    focus = ", ".join(str(item) for item in missing_competencies[:3] if str(item).strip())
    if focus:
        return (
            "This line is weak for the target role. Add stronger evidence of "
            f"{focus} with a clear action, relevant skill, and concrete result."
        )
    return (
        "This line is weak for the target role. Rewrite it with a clear action, "
        "role-relevant skill, and measurable outcome."
    )


def _yellow_suggestion() -> str:
    return (
        "This line is partly relevant. Make the contribution clearer by naming "
        "the job-relevant skill and the result it produced."
    )


def generate_highlights(
    sentences: List[str],
    scores: List[float],
    missing_competencies: List[str],
    job_desc: str = "",
    top_chunks: Optional[List[str]] = None,
    suggestion_map: Optional[Dict[int, str]] = None,
    rewritable_flags: Optional[List[bool]] = None
) -> List[Dict[str, str]]:
    """Generate resume highlights with red entries carrying actionable suggestions."""
    top_chunks = top_chunks or []
    suggestion_map = suggestion_map or {}
    rewritable_flags = rewritable_flags or [True] * len(sentences)

    highlights = []
    red_suggestions_count = 0
    
    for idx, (sentence, score) in enumerate(zip(sentences, scores)):
        if not rewritable_flags[idx]:
            continue

        if score >= GREEN_THRESHOLD:
            label = "GREEN"
            suggestion = ""
        elif score >= RED_THRESHOLD:
            label = "YELLOW"
            suggestion = _yellow_suggestion()
        else:
            label = "RED"
            suggestion = suggestion_map.get(idx, "")
            if not suggestion and red_suggestions_count < 3 and rewritable_flags[idx]:
                from ml.feedback.suggestion_engine import generate_suggestion
                suggestion = generate_suggestion(sentence, job_desc, missing_competencies, top_chunks)
                red_suggestions_count += 1
            if not suggestion or suggestion.strip().lower() == sentence.strip().lower():
                suggestion = _fallback_red_suggestion(sentence, missing_competencies)
            
        highlights.append({
            "text": sentence,
            "label": label,
            "color": label.lower(),
            "suggestion": suggestion
        })
        
    return highlights
