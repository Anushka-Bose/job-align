from typing import List, Union
import numpy as np
from ml.embeddings.model import get_model

def embed_text(text: str) -> np.ndarray:
    """Generate embedding for a single piece of text."""
    model = get_model()
    return model.encode(text)

def embed_sentences(sentences: List[str]) -> np.ndarray:
    """Generate embeddings for a list of sentences."""
    model = get_model()
    return model.encode(sentences)
