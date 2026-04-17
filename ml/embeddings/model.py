from sentence_transformers import SentenceTransformer
from ml.config import EMBEDDING_MODEL_NAME

_model = None

def get_model() -> SentenceTransformer:
    """Load the sentence-transformer model once."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model
