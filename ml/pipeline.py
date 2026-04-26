import sys
import os
from dotenv import load_dotenv

load_dotenv()

# Add the project root to sys.path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from typing import List, Dict, Any
from sklearn.metrics.pairwise import cosine_similarity

from ml.preprocessing.preprocess import clean_text, chunk_sentences, extract_text
from ml.preprocessing.filter import is_useful_sentence, is_rewritable
from ml.extraction.skill_extractor import extract_competencies
from ml.matching.matcher import match_jobs, get_top_chunks
from ml.scoring.scoring import compute_missing_competencies, compute_resume_score
from ml.embeddings.embeddings import embed_text, embed_sentences, cluster_sentences
from ml.feedback.suggestion_engine import generate_suggestions_batch

def run_pipeline(resume_text: str, jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Execute the full ML pipeline for resume intelligence."""
    MAX_REWRITES = 3

    # 1. Clean Text
    cleaned_resume = clean_text(resume_text)
    
    # 2. Chunk Sentences
    sentences = chunk_sentences(cleaned_resume)
    sentences = [s for s in sentences if is_useful_sentence(s)]
    if not sentences:
        return {"error": "No meaningful sentences found after filtering."}

    # 3. Rewritability filter (personal/irrelevant lines blocked from suggestion engine)
    rewritable_flags = [is_rewritable(s) for s in sentences]
    
    # 4. Compute sentence embeddings once
    sentence_embeddings = embed_sentences(sentences)
    if len(sentence_embeddings) == 0:
        return {"error": "Failed to compute sentence embeddings."}
    
    # 5. Cluster and Extract Competencies (Resume)
    resume_clusters = cluster_sentences(sentences, embeddings=sentence_embeddings)
    resume_competencies = extract_competencies(resume_clusters)
    
    # 6. Match Jobs
    matched_jobs = match_jobs(cleaned_resume, jobs)
    
    if not matched_jobs:
        return {"error": "No jobs provided or matched."}
        
    top_job = matched_jobs[0]
    
    # 7. Compute Competency Gap
    missing_competencies = compute_missing_competencies(resume_competencies)
    
    # 8. Score Resume
    resume_score = compute_resume_score(resume_competencies, top_job.get('similarity_score', 0.0))
    
    # 9. Score sentences against top job
    job_desc = top_job.get('description', '')
    job_emb = embed_text(clean_text(job_desc))
    sentence_scores = cosine_similarity(sentence_embeddings, job_emb.reshape(1, -1)).flatten().tolist()

    # 10. Identify weak + rewritable sentences and rewrite in batches with RAG context
    weak_candidates = [
        idx for idx, score in enumerate(sentence_scores)
        if score < 0.4 and rewritable_flags[idx]
    ]
    weak_candidates.sort(key=lambda i: sentence_scores[i])
    weak_indices = weak_candidates[:MAX_REWRITES]
    sentence_to_sentence_sims = cosine_similarity(sentence_embeddings, sentence_embeddings)

    rewrite_entries = []
    for idx in weak_indices:
        top_chunks = get_top_chunks(
            sentence_emb=sentence_embeddings[idx],
            all_sentence_embs=sentence_embeddings,
            sentences=sentences,
            k=3,
            precomputed_sims=sentence_to_sentence_sims[idx],
            source_index=idx
        )
        rewrite_entries.append({
            "sentence": sentences[idx],
            "job_desc": job_desc,
            "missing_competencies": missing_competencies,
            "top_chunks": top_chunks
        })
    rewritten_sentences = generate_suggestions_batch(rewrite_entries, batch_size=8) if rewrite_entries else []
    rewritten_map = {idx: rewritten_sentences[pos] for pos, idx in enumerate(weak_indices)}

    # 11. Merge outputs
    highlights = []
    for idx, (sentence, score) in enumerate(zip(sentences, sentence_scores)):
        if score >= 0.65:
            label = "GREEN"
            suggestion = ""
        elif score >= 0.4:
            label = "YELLOW"
            suggestion = "This sentence is somewhat relevant but could be strengthened with clearer contribution and impact."
        else:
            label = "RED"
            suggestion = rewritten_map.get(idx, "")
        highlights.append({
            "text": sentence,
            "label": label,
            "suggestion": suggestion
        })
    
    return {
        "resume_score": resume_score,
        "top_jobs": matched_jobs[:3],  # Return up to top 3 jobs matches
        "competencies": resume_competencies,
        "competency_gap": missing_competencies,
        "highlights": highlights
    }

def process_resume_pdf(pdf_path: str, jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract text from a PDF resume and run the pipeline."""
    if not os.path.exists(pdf_path):
        return {"error": f"PDF file not found at {pdf_path}"}
        
    resume_text = extract_text(pdf_path)
    if not resume_text.strip():
        return {"error": "Failed to extract text from PDF or PDF is empty."}
        
    return run_pipeline(resume_text, jobs)

if __name__ == "__main__":
    # Test the pipeline end-to-end with the uploaded resume
    pdf_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
        "ml", "data", "raw", "Anushka's Resume1.pdf"
    )
    
    dummy_jobs = [
        {
            "id": 1,
            "title": "Machine Learning Engineer",
            "description": "We are seeking a Machine Learning Engineer. Requirements: Python, Machine Learning, Deep Learning, AWS, and SQL.",
            "skills": ["python", "machine learning", "deep learning", "aws", "sql"]
        },
        {
            "id": 2,
            "title": "Data Scientist",
            "description": "Looking for a Data Scientist with strong Python, statistics, NLP, and SQL skills.",
            "skills": ["python", "statistics", "nlp", "sql"]
        }
    ]
    
    print(f"Running pipeline on {pdf_path}...")
    result = process_resume_pdf(pdf_path, dummy_jobs)
    print(json.dumps(result, indent=2))
