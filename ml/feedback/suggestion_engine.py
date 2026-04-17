from typing import List

def generate_suggestion(sentence: str, missing_skills: List[str]) -> str:
    """Generate a suggestion for a red sentence based on missing skills."""
    if not missing_skills:
        return "Add more metrics or specific achievements to strengthen your impact."
        
    # Simple rule-based suggestion
    suggestion = (
        f"Consider revising this part to incorporate missing relevant skills "
        f"like: {', '.join(missing_skills[:3])}."
    )
    return suggestion
