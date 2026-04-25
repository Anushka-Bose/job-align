from typing import List, Dict, Any
import numpy as np
from ml.embeddings.embeddings import embed_sentences
from ml.matching.matcher import compute_similarity

def score_sentences(sentences: List[str], job_embedding: np.ndarray) -> List[float]:
    """Score each sentence against the job embedding for relevance."""
    if not sentences:
        return []
        
    sentence_embeddings = embed_sentences(sentences)
    
    scores = []
    for sent_emb in sentence_embeddings:
        score = compute_similarity(sent_emb, job_embedding)
        scores.append(score)
        
    return scores

def generate_suggestion(sentence: str, missing_skills: List[str]) -> str:
    """Generate a suggestion for a red sentence based on missing skills."""
    if not missing_skills:
        return "Add more metrics or specific achievements to strengthen your impact."
        
    # Simple rule-based suggestion
    suggestion = (
        f"Consider revising this part to incorporate missing relevant skills "
        f"like: {', '.join(missing_skills[:3])}."
    )
    return suggestion

def generate_highlights(sentences: List[str], scores: List[float], missing_skills: List[str]) -> List[Dict[str, str]]:
    """Generate red/yellow/green highlights and suggestions mapping.
    
    - score > 0.65 -> GREEN
    - 0.4 - 0.65 -> YELLOW
    - < 0.4 -> RED
    """
    highlights = []
    
    for sentence, score in zip(sentences, scores):
        word_count = len(sentence.split())
        
        # Filter out personal details, names, addresses by checking if it's very short or extremely low matching
        if word_count < 4 or score < 0.15:
            label = "NEUTRAL"
            suggestion = ""
        elif score > 0.65:
            label = "GREEN"
            suggestion = ""
        elif score >= 0.4:
            label = "YELLOW"
            suggestion = "This sentence is somewhat relevant but could be strengthened with more specifics."
        else:
            label = "RED"
            suggestion = generate_suggestion(sentence, missing_skills)
            
        highlights.append({
            "text": sentence,
            "label": label,
            "suggestion": suggestion
        })
        
    return highlights
