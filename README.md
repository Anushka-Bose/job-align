# JobAlign

JobAlign is an end-to-end AI hiring intelligence platform that improves hiring outcomes for both candidates and recruiters. It transforms unstructured resume data into actionable insights, maps candidate profiles to relevant opportunities, and supports recruiter decision-making with transparent, data-backed evaluations.


## Table of Contents

- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Run the Application](#run-the-application)
- [Expected Output](#expected-output)
- [Technology Stack](#technology-stack)
- [API Highlights](#api-highlights)
- [Feature Map](#feature-map)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Contact](#contact)

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- Python 3.10+
- MongoDB connection string
- PowerShell on Windows

### Installation

Clone and move into the project:

```bash
git clone https://github.com/Anushka-Bose/job-align.git
cd job-align
```

Then run:

```bash
# 1) Create and activate Python virtual environment
python -m venv .venv
.venv\Scripts\Activate

# 2) Install Python dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 3) Install backend dependencies
cd JobAlign_backend
npm install

# 4) Install frontend dependencies
cd ../frontend
npm install
```

If PowerShell blocks activation scripts, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate again:

```powershell
.venv\Scripts\Activate
```

## Configuration

Create `JobAlign_backend/.env`:

```env
PORT=3000
MONGO_DB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
DEFAULT_JOB_LOCATION=India
PYTHON_EXECUTABLE=python
GEMINI_API_KEY=your_gemini_api_key
```

Optional variables:

```env
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
EMAIL_FROM=no-reply@example.com
MIN_NOTIFICATION_MATCH_SCORE=70
SCAM_FILTER_USE_LLM=true
SCAM_FILTER_MODEL=gemini
SCAM_FILTER_DEBUG=false
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Run the Application

Use two terminals from repository root.

Terminal 1 (backend):

```bash
cd JobAlign_backend
npm run dev
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

Frontend URL: `http://localhost:5173`

## Expected Output

After startup, verify:

- Backend logs show MongoDB connection success and server running on port `3000`.
- Frontend logs show Vite ready and local URL `http://localhost:5173`.
- Opening `http://localhost:5173` loads the JobAlign landing page.
- `GET http://localhost:3000/health` returns:

```json
{"status":"OK","message":"JobAlign backend is live"}
```

## Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, Multer
- **ML/NLP:** Python, spaCy, Sentence Transformers, scikit-learn, PyMuPDF
- **Integrations:** Remotive Jobs API, optional Google Generative AI support

## API Highlights

- `POST /api/auth/signup` - Register candidate or recruiter
- `POST /api/auth/login` - Authenticate and return JWT
- `POST /api/resume/upload` - Upload and process candidate resume
- `GET /feed/:userId` - Retrieve personalized candidate feed
- `GET /api/recruiter/candidates/leaderboard` - Retrieve ranked candidates
- `POST /api/recruiter/candidates/:candidateId/scam-check` - Run authenticity check
- `GET /api/notifications` - Get current user notifications
- `PATCH /api/notifications/:notificationId/read` - Mark notification as read

Protected endpoints require `Authorization: Bearer <token>`.

## Feature Map

| Feature | Problem It Solves | Primary Implementation Area |
|---|---|---|
| Role-based authentication | Separates candidate and recruiter workflows securely | `frontend/src/pages/Login.jsx`, `JobAlign_backend/routes/authRoute.js` |
| Resume PDF upload | Converts unstructured resume files into processable input | `frontend/src/pages/ResumeUpload.jsx`, `JobAlign_backend/routes/resumeRoute.js` |
| Resume analysis and scoring | Gives measurable quality and competency insights | `ml/pipeline.py`, `JobAlign_backend/services/pipelineService.js` |
| Personalized job feed | Reduces manual job search effort with relevance ranking | `frontend/src/pages/Jobs.jsx`, `JobAlign_backend/routes/feedRoute.js` |
| Recruiter leaderboard | Speeds shortlisting with ranked candidate visibility | `JobAlign_backend/routes/recruiterRoute.js` |
| Scam/authenticity check | Helps recruiters detect suspicious resume patterns | `JobAlign_backend/services/scamService.js`, `ml/scam_filtering/scam.py` |
| Notifications | Alerts users to newly matched opportunities | `frontend/src/components/Navbar.jsx`, `JobAlign_backend/routes/notificationRoute.js` |

## Architecture

JobAlign uses a 3-layer architecture:

- **Frontend (`frontend/`)**: React UI, route protection, and API modules.
- **Backend (`JobAlign_backend/`)**: Express APIs, middleware, data models, scheduler, and service orchestration.
- **ML Layer (`ml/`)**: Python NLP pipeline for extraction, scoring, matching, and feedback.

Data flow:

```text
Frontend -> Express API -> MongoDB
                    |
                    -> Python pipeline -> structured analysis -> API response
```

## File Structure

```text
job-align/
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   `-- pages/
|   `-- package.json
|-- JobAlign_backend/
|   |-- controllers/
|   |-- middlewares/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- app.js
|   |-- server.js
|   `-- package.json
|-- ml/
|   |-- preprocessing/
|   |-- extraction/
|   |-- matching/
|   |-- scoring/
|   |-- feedback/
|   |-- scam_filtering/
|   `-- pipeline.py
|-- requirements.txt
`-- README.md
```

## Contact

Anushka Bose  
Email: `anushkabose001@gmail.com`

Project Link: https://github.com/Anushka-Bose/job-align