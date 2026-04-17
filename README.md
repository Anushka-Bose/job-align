# job-align
A smart automation of hiring process from resume upload to correct job for specific user.
# Resume Intelligence Engine (ML Pipeline)

## Overview

This project implements a machine learning pipeline that analyzes resumes and matches them with relevant job descriptions using semantic understanding.

The system performs:

* Resume parsing
* Skill extraction
* Semantic job matching
* Skill gap analysis
* Resume scoring
* Sentence-level feedback (red/green highlighting with suggestions)

---

## Features

### 1. Resume Processing

* Extract text from PDF resumes
* Clean and preprocess text
* Split into sentences

### 2. Skill Extraction

* Hybrid approach:

  * Keyword detection
  * Semantic similarity using embeddings

### 3. Job Matching

* Uses transformer-based embeddings
* Computes cosine similarity
* Ranks jobs based on relevance

### 4. Skill Gap Analysis

* Compares resume skills with job requirements
* Identifies missing skills

### 5. Resume Scoring

* Score based on:

  * Skill match
  * Semantic similarity

### 6. Resume Feedback (Key Feature)

* Sentence-level evaluation:

  * GREEN → strong match
  * YELLOW → moderate
  * RED → weak/irrelevant
* Suggests improved versions of weak sentences

---

## Project Structure

```
ml/
│
├── preprocessing/
├── embeddings/
├── extraction/
├── matching/
├── scoring/
├── feedback/
│
├── api.py
├── pipeline.py
└── config.py
```

---

## Installation

### 1. Clone repository

```
git clone <your-repo-url>
cd <repo-folder>
```

### 2. Install dependencies

```
pip install -r requirements.txt
```

### 3. Install spaCy model

```
python -m spacy download en_core_web_sm
```

---

## Running the Application

### Start FastAPI server

```
uvicorn ml.api:app --reload
```

### Open API docs

```
http://127.0.0.1:8000/docs
```

---

## API Endpoints

### 1. Analyze Resume (Text)

**POST** `/analyze-text`

Input:

```
{
  "resume_text": "...",
  "jobs": [...]
}
```

---

### 2. Analyze Resume (PDF Upload)

**POST** `/analyze-pdf`

* Upload a PDF resume
* Returns full analysis

---

## Sample Output

```
{
  "resume_score": 84,
  "top_jobs": [
    {
      "title": "Machine Learning Engineer",
      "score": 0.89
    }
  ],
  "skill_gap": ["docker", "aws"],
  "highlights": [
    {
      "text": "Worked on projects",
      "label": "RED",
      "suggestion": "Built machine learning models using Python"
    }
  ]
}
```

---

## Tech Stack

* Python
* FastAPI
* spaCy
* Sentence Transformers
* Scikit-learn

---

## Key Concept

The system uses **semantic embeddings** instead of keyword matching, enabling:

* Better understanding of resume content
* More accurate job matching
* Intelligent feedback generation

---

## Future Improvements

* LLM-based suggestion engine
* Advanced skill graph
* Multi-job comparison
* Real-time recommendation system

---

## Author

Anushka Bose
