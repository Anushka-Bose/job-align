import re

def clean_text(text: str) -> str:
    """Clean the text: lowercase, remove junk symbols, and extra whitespace."""
    if not text:
        return ""
    
    # Lowercase
    text = text.lower()
    
    # Remove junk symbols (keep basic punctuation and words)
    text = re.sub(r'[^\w\s.,;:!?()-]', ' ', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text
