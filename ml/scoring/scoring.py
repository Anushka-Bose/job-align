from typing import List

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

def compute_skill_gap(resume_skills: List[str], job_skills: List[str]) -> List[str]:
    """Compute which job skills are missing from the resume skills."""
    resume_skills_lower = {skill.lower() for skill in resume_skills}
    missing_skills = []
    
    for skill in job_skills:
        if skill.lower() not in resume_skills_lower:
            missing_skills.append(skill)
            
    return missing_skills
