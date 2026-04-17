def compute_resume_score(skill_match: float, similarity_score: float) -> int:
    """Compute overall resume score out of 100.
    
    Formula: 0.6 * skill_match + 0.4 * similarity
    """
    # Ensure inputs are bound to [0.0, 1.0]
    skill_match = max(0.0, min(1.0, skill_match))
    similarity_score = max(0.0, min(1.0, similarity_score))
    
    score = (0.6 * skill_match) + (0.4 * similarity_score)
    
    # Scale to 100
    return int(score * 100)
