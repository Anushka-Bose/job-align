from typing import List

def compute_skill_gap(resume_skills: List[str], job_skills: List[str]) -> List[str]:
    """Compute which job skills are missing from the resume skills."""
    resume_skills_lower = {skill.lower() for skill in resume_skills}
    missing_skills = []
    
    for skill in job_skills:
        if skill.lower() not in resume_skills_lower:
            missing_skills.append(skill)
            
    return missing_skills
