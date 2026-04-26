def is_useful_sentence(sentence: str) -> bool:
    """Lightweight heuristic filtering."""
    if len(sentence.split()) < 5:
        return False
        
    s = sentence.lower().strip()
    
    ignore_keywords = [
        "father", "mother", "dob", "date of birth",
        "declaration", "signature", "permanent address"
    ]
    if any(k in s for k in ignore_keywords):
        return False
        
    # Removes short lines containing numbers (e.g., phone numbers, short addresses, dates)
    if any(char.isdigit() for char in s) and len(s) < 30:
        return False
        
    return True
