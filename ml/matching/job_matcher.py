from typing import List, Dict, Any
from ml.embeddings.embedder import embed_text
from ml.matching.similarity import compute_similarity

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
