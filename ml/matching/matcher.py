import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any
from ml.embeddings.embeddings import embed_text

def compute_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Compute cosine similarity between two vectors using sklearn."""
    # Ensure vectors are 2D arrays (1, n_features) for sklearn
    if vec1.ndim == 1:
        vec1 = vec1.reshape(1, -1)
    if vec2.ndim == 1:
        vec2 = vec2.reshape(1, -1)
        
    sim = cosine_similarity(vec1, vec2)
    return float(sim[0][0])

def match_jobs(resume_text: str, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Embed resume and jobs, compute similarity, and return sorted jobs."""
    if not resume_text or not jobs:
        return []
        
    resume_emb = embed_text(resume_text)
    
    scored_jobs = []
    for job in jobs:
        job_emb = embed_text(job.get('description', ''))
        score = compute_similarity(resume_emb, job_emb)
        
        job_result = job.copy()
        job_result['similarity_score'] = score
        scored_jobs.append(job_result)
        
    # Sort descending by similarity score
    scored_jobs.sort(key=lambda x: x['similarity_score'], reverse=True)
    return scored_jobs
