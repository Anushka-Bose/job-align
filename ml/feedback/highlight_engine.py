from typing import List, Dict, Any
from ml.feedback.suggestion_engine import generate_suggestion

def generate_highlights(sentences: List[str], scores: List[float], missing_competencies: List[str], job_desc: str = "", top_chunks: List[str] = None) -> List[Dict[str, str]]:
    """Generate red/yellow/green highlights and semantic suggestions mapping."""
    if top_chunks is None:
        top_chunks = []
        
    highlights = []
    red_suggestions_count = 0
    
    for sentence, score in zip(sentences, scores):
        if score >= 0.65:
            label = "GREEN"
            suggestion = ""
        elif score >= 0.4:
            label = "YELLOW"
            suggestion = "This sentence is somewhat relevant but could be strengthened to better map to the job's core competencies."
        else:
            label = "RED"
            if red_suggestions_count < 3:
                suggestion = generate_suggestion(sentence, job_desc, missing_competencies, top_chunks)
                red_suggestions_count += 1
            else:
                suggestion = "Improve this sentence by adding measurable impact aligned with the job description."
            
        highlights.append({
            "text": sentence,
            "label": label,
            "suggestion": suggestion
        })
        
    return highlights
