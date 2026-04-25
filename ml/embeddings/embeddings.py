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
