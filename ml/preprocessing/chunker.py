import spacy
from typing import List

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Spacy model 'en_core_web_sm' not found.")
    print("Please download it using: python -m spacy download en_core_web_sm")
    nlp = None

def chunk_sentences(text: str) -> List[str]:
    """Chunk text into sentences using spaCy."""
    if not nlp:
        # Simplistic fallback
        import re
        return [sent.strip() for sent in re.split(r'[.!?]\s+', text) if sent.strip()]
        
    doc = nlp(text)
    return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
