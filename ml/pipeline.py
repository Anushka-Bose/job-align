import sys
import os
from dotenv import load_dotenv

load_dotenv()

# Add the project root to sys.path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from typing import List, Dict, Any

from ml.preprocessing.preprocess import clean_text, chunk_sentences, extract_text
from ml.preprocessing.filter import filter_relevant_lines, is_useful_sentence
from ml.extraction.skill_extractor import extract_skills
from ml.matching.matcher import match_jobs
from ml.scoring.scoring import compute_skill_gap, compute_resume_score
from ml.embeddings.embeddings import embed_text
from ml.feedback.sentence_scoring import score_sentences
from ml.feedback.highlight_engine import generate_highlights

def run_pipeline(resume_text: str, jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Execute the full ML pipeline for resume intelligence."""
    # 1. Clean Text
    cleaned_resume = clean_text(resume_text)
    
    # 2. Chunk Sentences
    sentences = chunk_sentences(cleaned_resume)
    sentences = [s for s in sentences if is_useful_sentence(s)]
    
    # print("Sentences after filtering:", len(sentences))
    # for s in sentences[:5]:
    #     print(s)
    
    # 3. Extract Skills (Resume)
    resume_skills = extract_skills(cleaned_resume)
    
    # 4. Match Jobs
    matched_jobs = match_jobs(cleaned_resume, jobs)
    
    if not matched_jobs:
        return {"error": "No jobs provided or matched."}
        
    top_job = matched_jobs[0]
    
    # Need to extract job skills (either provided or extracted from description)
    if 'skills' in top_job and top_job['skills']:
        job_skills = top_job['skills']
    else:
        top_job_desc_clean = clean_text(top_job.get('description', ''))
        job_skills = extract_skills(top_job_desc_clean)
        
    # 5. Compute Skill Gap
    missing_skills = compute_skill_gap(resume_skills, job_skills)
    
    # 6. Score Resume
    if not job_skills:
        skill_match_frac = 1.0 # default if job has no specific skills
    else:
        # Use semantic gap result instead of exact intersection
        matched_count = len(job_skills) - len(missing_skills)
        skill_match_frac = max(0.0, matched_count / len(job_skills))
        
    resume_score = compute_resume_score(skill_match_frac, top_job.get('similarity_score', 0.0))
    
    # 7. Generate Highlights
    job_desc = top_job.get('description', '')
    job_emb = embed_text(clean_text(job_desc))
    sentence_scores = score_sentences(sentences, job_emb)
    highlights = generate_highlights(sentences, sentence_scores, missing_skills[:3], job_desc)
    
    return {
        "resume_score": resume_score,
        "top_jobs": matched_jobs[:3],  # Return up to top 3 jobs matches
        "skill_gap": missing_skills,
        "highlights": highlights
    }

def process_resume_pdf(pdf_path: str, jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract text from a PDF resume and run the pipeline."""
    if not os.path.exists(pdf_path):
        return {"error": f"PDF file not found at {pdf_path}"}
        
    resume_text = extract_text(pdf_path)
    if not resume_text.strip():
        return {"error": "Failed to extract text from PDF or PDF is empty."}
        
    return run_pipeline(resume_text, jobs)

if __name__ == "__main__":
    # Test the pipeline end-to-end with the uploaded resume
    pdf_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
        "ml", "data", "raw", "Anushka's Resume1.pdf"
    )
    
    dummy_jobs = [
        {
            "id": 1,
            "title": "Machine Learning Engineer",
            "description": "We are seeking a Machine Learning Engineer. Requirements: Python, Machine Learning, Deep Learning, AWS, and SQL.",
            "skills": ["python", "machine learning", "deep learning", "aws", "sql"]
        },
        {
            "id": 2,
            "title": "Data Scientist",
            "description": "Looking for a Data Scientist with strong Python, statistics, NLP, and SQL skills.",
            "skills": ["python", "statistics", "nlp", "sql"]
        }
    ]
    
    print(f"Running pipeline on {pdf_path}...")
    result = process_resume_pdf(pdf_path, dummy_jobs)
    print(json.dumps(result, indent=2))
