import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def compute_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Compute cosine similarity between two vectors using sklearn."""
    # Ensure vectors are 2D arrays (1, n_features) for sklearn
    if vec1.ndim == 1:
        vec1 = vec1.reshape(1, -1)
    if vec2.ndim == 1:
        vec2 = vec2.reshape(1, -1)
        
    sim = cosine_similarity(vec1, vec2)
    return float(sim[0][0])
