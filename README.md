# JobAlign

JobAlign is an end-to-end AI hiring intelligence platform that improves hiring outcomes for both candidates and recruiters. It transforms unstructured resume data into actionable insights, maps candidate profiles to relevant opportunities, and supports recruiter decision-making with transparent, data-backed evaluations.

By combining a modern React frontend, an Express/MongoDB backend, and a Python NLP pipeline, JobAlign helps teams move from manual screening to faster, more consistent, and more explainable talent matching.

## Table of Contents

- [What JobAlign Does](#what-jobalign-does)
- [Core Capabilities](#core-capabilities)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Run the Application](#run-the-application)
- [API Highlights](#api-highlights)
- [ML Pipeline Responsibilities](#ml-pipeline-responsibilities)
- [Development Commands](#development-commands)
- [Maintainer](#maintainer)

## What JobAlign Does

JobAlign supports the full candidate-to-recruiter evaluation journey:

- **For candidates:** analyzes resumes, identifies strengths and gaps, and surfaces role recommendations aligned with skill profile and experience.
- **For recruiters:** provides ranked candidate views, structured fit signals, and authenticity checks to reduce screening time and improve confidence.
- **For both sides:** creates a more objective and explainable process through AI-assisted matching, scoring, and feedback.

## Core Capabilities

- Secure candidate and recruiter authentication.
- Resume PDF upload and text extraction.
- AI-assisted resume analysis, scoring, and skill extraction.
- Semantic job matching and personalized job feed generation.
- Sentence-level resume feedback with rewrite assistance.
- Recruiter candidate leaderboard and resume authenticity checks.
- Notification support for newly matched opportunities.

## System Architecture

```text
.
|-- frontend/              # React + Vite client application
|-- JobAlign_backend/      # Express API, auth, data models, and integrations
|-- ml/                    # Python NLP and matching pipeline
|-- requirements.txt       # Python dependencies
`-- README.md
```

## Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, Multer
- **ML/NLP:** Python, spaCy, Sentence Transformers, scikit-learn, PyMuPDF
- **External APIs:** Remotive jobs API
- **Optional AI Integration:** Google Generative AI

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- Python 3.10 or newer
- MongoDB connection string
- Git (recommended)

### Installation

From the repository root:

```bash
# 1) Install Python dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 2) Install backend dependencies
cd JobAlign_backend
npm install

# 3) Install frontend dependencies
cd ../frontend
npm install
```

## Environment Variables

Create `JobAlign_backend/.env`:

```env
PORT=3000
MONGO_DB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
DEFAULT_JOB_LOCATION=India
PYTHON_EXECUTABLE=python
GEMINI_API_KEY=your_gemini_api_key
```

Create `frontend/.env` (if frontend and backend are on different origins):

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Run the Application

Start the backend server:

```bash
cd JobAlign_backend
npm run dev
```

Start the frontend application:

```bash
cd ../frontend
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

## API Highlights

- `POST /api/auth/signup` - Register candidate or recruiter
- `POST /api/auth/login` - Authenticate and return token
- `POST /api/resume/upload` - Upload candidate resume PDF
- `GET /feed/:userId` - Retrieve personalized job feed
- `GET /api/recruiter/candidates/leaderboard` - List ranked candidates
- `POST /api/recruiter/candidates/:candidateId/scam-check` - Run authenticity check
- `GET /api/notifications` - Fetch notifications
- `PATCH /api/notifications/:notificationId/read` - Mark notification as read

Protected routes require a valid authorization token.

## ML Pipeline Responsibilities

The `ml/` module powers:

- Resume text extraction and cleaning
- Skill and competency extraction
- Experience estimation
- Semantic matching and similarity scoring
- Gap analysis and resume feedback generation

Backend integration is handled through `JobAlign_backend/services/pipelineService.js`.

## Development Commands

```bash
# Frontend (run from /frontend)
cd frontend
npm run dev
npm run build
npm run lint

# Backend (run from /JobAlign_backend)
cd ../JobAlign_backend
npm run dev
npm start

# Python setup (run from repository root)
cd ..
pip install -r requirements.txt
```

## Maintainer

Anushka Bose
