from typing import List, Union, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize
from ml.config import EMBEDDING_MODEL_NAME

_model = None

def get_model() -> SentenceTransformer:
    """Load the sentence-transformer model once."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model

def embed_text(text: str) -> np.ndarray:
    """Generate embedding for a single piece of text."""
    model = get_model()
    vec = model.encode(text, convert_to_numpy=True)
    if vec.ndim == 1:
        vec = vec.reshape(1, -1)
    return normalize(vec, axis=1)[0]

def embed_sentences(sentences: List[str]) -> np.ndarray:
    """Generate embeddings for a list of sentences."""
    model = get_model()
    if not sentences:
        return np.array([])
    mat = model.encode(sentences, convert_to_numpy=True)
    if mat.ndim == 1:
        mat = mat.reshape(1, -1)
    return normalize(mat, axis=1)

from sklearn.cluster import AgglomerativeClustering
from collections import defaultdict

def cluster_sentences(
    sentences: List[str],
    distance_threshold: float = 1.5,
    embeddings: Optional[np.ndarray] = None
) -> List[str]:
    """Group sentences semantically into pseudo-sections and return joined chunks."""
    if not sentences:
        return []
    if len(sentences) == 1:
        return sentences
        
    if embeddings is None or len(embeddings) != len(sentences):
        embeddings = embed_sentences(sentences)
    
    clustering_model = AgglomerativeClustering(
        n_clusters=None, 
        distance_threshold=distance_threshold, 
        metric='euclidean', 
        linkage='ward'
    )
    clustering_model.fit(embeddings)
    
    clusters = defaultdict(list)
    for sentence, label in zip(sentences, clustering_model.labels_):
        clusters[label].append(sentence)
        
    return [" ".join(cluster_sents) for cluster_sents in clusters.values()]
