from typing import List
from ml.embeddings.embedder import embed_text
from ml.matching.similarity import compute_similarity

# Small seed list to prevent hardcoding big arrays
SEED_SKILLS = [
    "python", "java", "c++", "machine learning", "data science", 
    "deep learning", "nlp", "sql", "react", "node.js", 
    "aws", "docker", "kubernetes", "tensorflow", "pytorch",
    "html", "css", "javascript", "cloud computing"
]

def extract_skills(text: str, semantic_threshold: float = 0.6) -> List[str]:
    """Extract skills using simple keyword detection and semantic similarity."""
    text_lower = text.lower()
    extracted_skills = set()
    
    # 1. Simple keyword detection
    for skill in SEED_SKILLS:
        if skill in text_lower:
            extracted_skills.add(skill)
            
    # 2. Semantic detection 
    # If the text is short (like from a job skill list), we can embed and compare
    # for larger text (resume), this is simplistic but fits requirements.
    if text.strip():
        try:
            text_emb = embed_text(text)
            for skill in SEED_SKILLS:
                if skill not in extracted_skills:
                    skill_emb = embed_text(skill)
                    sim = compute_similarity(text_emb, skill_emb)
                    if sim > semantic_threshold:
                        extracted_skills.add(skill)
        except Exception as e:
            print(f"Embedding failed during skill extraction: {e}")
            
    return list(extracted_skills)
