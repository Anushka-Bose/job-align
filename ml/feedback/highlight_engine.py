from typing import List, Dict, Any
from ml.feedback.suggestion_engine import generate_suggestion

def generate_highlights(sentences: List[str], scores: List[float], missing_skills: List[str], job_desc: str = "") -> List[Dict[str, str]]:
    """Generate red/yellow/green highlights and suggestions mapping.
    
    - score > 0.65 -> GREEN
    - 0.4 - 0.65 -> YELLOW
    - < 0.4 -> RED
    """
    highlights = []
    
    for sentence, score in zip(sentences, scores):
        word_count = len(sentence.split())
        
        # Filter out personal details, names, addresses by checking if it's very short or extremely low matching
        if word_count < 4 or score < 0.15:
            label = "NEUTRAL"
            suggestion = ""
        elif score > 0.65:
            label = "GREEN"
            suggestion = ""
        elif score >= 0.4:
            label = "YELLOW"
            suggestion = "This sentence is somewhat relevant but could be strengthened with more specifics."
        else:
            label = "RED"
            suggestion = generate_suggestion(sentence, job_desc, missing_skills)
            
        highlights.append({
            "text": sentence,
            "label": label,
            "suggestion": suggestion
        })
        
    return highlights
