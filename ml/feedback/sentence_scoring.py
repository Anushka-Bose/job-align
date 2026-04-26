from typing import List
import numpy as np
from ml.embeddings.embeddings import embed_sentences
from ml.matching.matcher import compute_similarity

def score_sentences(sentences: List[str], job_embedding: np.ndarray) -> List[float]:
    """Score each sentence against the job embedding for relevance."""
    if not sentences:
        return []
        
    sentence_embeddings = embed_sentences(sentences)
    
    scores = []
    for sent_emb in sentence_embeddings:
        score = compute_similarity(sent_emb, job_embedding)
        scores.append(score)
        
    return scores
