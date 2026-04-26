import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any, Optional
from ml.embeddings.embeddings import embed_text

_job_embedding_cache: Dict[str, np.ndarray] = {}

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
        job_desc = job.get('description', '') or ''
        if job_desc in _job_embedding_cache:
            job_emb = _job_embedding_cache[job_desc]
        else:
            job_emb = embed_text(job_desc)
            _job_embedding_cache[job_desc] = job_emb
        score = compute_similarity(resume_emb, job_emb)
        
        job_result = job.copy()
        job_result['similarity_score'] = score
        scored_jobs.append(job_result)
        
    # Sort descending by similarity score
    scored_jobs.sort(key=lambda x: x['similarity_score'], reverse=True)
    return scored_jobs

def get_top_chunks(
    sentence_emb: np.ndarray,
    all_sentence_embs: np.ndarray,
    sentences: List[str],
    k: int = 3,
    precomputed_sims: Optional[np.ndarray] = None,
    source_index: Optional[int] = None
) -> List[str]:
    """Return top-k semantically nearest unique sentences for grounding."""
    if (
        sentence_emb is None or
        all_sentence_embs is None or
        len(sentences) == 0 or
        len(all_sentence_embs) == 0
    ):
        return []
    if precomputed_sims is not None and len(precomputed_sims) == len(sentences):
        sims = precomputed_sims
    else:
        if sentence_emb.ndim == 1:
            sentence_emb = sentence_emb.reshape(1, -1)
        sims = cosine_similarity(sentence_emb, all_sentence_embs)[0]
    ranked_indices = np.argsort(sims)[::-1]
    top_chunks: List[str] = []
    seen = set()
    for idx in ranked_indices:
        if source_index is not None and idx == source_index:
            continue
        s = sentences[idx].strip()
        key = s.lower()
        if not s or key in seen:
            continue
        top_chunks.append(s)
        seen.add(key)
        if len(top_chunks) >= k:
            break
    return top_chunks
