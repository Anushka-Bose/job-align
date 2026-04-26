from typing import List
from ml.embeddings.embeddings import embed_text
from ml.matching.matcher import compute_similarity

def compute_resume_score(competency_scores: dict, similarity_score: float) -> int:
    """Compute overall resume score out of 100 based on competencies and vectors.
    
    Formula: 0.5 * avg_competency_score + 0.5 * similarity_score
    """
    if not competency_scores:
        avg_comp = 0.5
    else:
        avg_comp = sum(competency_scores.values()) / len(competency_scores) / 100.0
        
    avg_comp = max(0.0, min(1.0, avg_comp))
    similarity_score = max(0.0, min(1.0, similarity_score))
    
    score = (0.5 * avg_comp) + (0.5 * similarity_score)
    return int(score * 100)

def compute_missing_competencies(competency_scores: dict, threshold: int = 60) -> List[str]:
    """Identify weak competencies (below threshold)."""
    weak_competencies = []
    for comp, score in competency_scores.items():
        if score < threshold:
            weak_competencies.append(comp)
            
    # Default fallback to ensure we prompt for impact if everything is magically high but not perfect
    if not weak_competencies:
        weak_competencies.append("Impact")
        
    return weak_competencies
