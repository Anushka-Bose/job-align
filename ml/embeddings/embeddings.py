from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer
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
    return model.encode(text)

def embed_sentences(sentences: List[str]) -> np.ndarray:
    """Generate embeddings for a list of sentences."""
    model = get_model()
    return model.encode(sentences)

from sklearn.cluster import AgglomerativeClustering
from collections import defaultdict

def cluster_sentences(sentences: List[str], distance_threshold: float = 1.5) -> List[str]:
    """Group sentences semantically into pseudo-sections and return joined chunks."""
    if not sentences:
        return []
    if len(sentences) == 1:
        return sentences
        
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
