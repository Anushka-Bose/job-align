import os
import re
import json

# Load .env
from dotenv import load_dotenv
load_dotenv()
from google import genai

# Optional imports
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None


SECTION_HEADERS = [
    "experience", "work history", "employment",
    "education", "skills", "projects",
    "certifications", "summary", "objective"
]


# ---------------- TEXT EXTRACTION ---------------- #
def extract_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    if ext == '.pdf':
        if PyPDF2 is None:
            return "ERROR: PyPDF2 not installed"

        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + " "
        except Exception as e:
            return f"ERROR reading PDF: {e}"

    elif ext in ['.docx', '.doc']:
        if docx is None:
            return "ERROR: python-docx not installed"

        try:
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + " "
        except Exception as e:
            return f"ERROR reading DOCX: {e}"

    elif ext == '.txt':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            return f"ERROR reading TXT: {e}"

    else:
        return "ERROR: Unsupported file format"

    return text


# ---------------- BASIC CHECKS ---------------- #
def check_essential_info(text):
    email = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))
    phone = bool(re.search(r'\+?\d[\d \-\(\)\.]{8,15}\d', text))
    links = bool(re.search(r'https?://[^\s]+|www\.[^\s]+', text))
    return email, phone, links


def check_structure(text):
    found = []
    for header in SECTION_HEADERS:
        if re.search(r'\b' + header + r'\b', text):
            found.append(header)
    return found


# ---------------- LLM ANALYSIS ---------------- #

def analyze_with_llm(text):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY not found in .env"}

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
You are an expert technical recruiter and fraud analyst.

Analyze the resume and return ONLY JSON:

{{
    "ai_generated_percentage": 0-100,
    "ai_risk_level": "LOW/MEDIUM/HIGH",
    "ai_reasoning": "short reason",
    "scam_risk_level": "LOW/MEDIUM/HIGH",
    "scam_indicators": [],
    "scam_reasoning": "short reason"
}}

Resume:
\"\"\"
{text[:3000]}
\"\"\"
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        result = response.text.strip()

        if result.startswith(""):
            result = result.replace("json", "").replace("```", "").strip()

        return json.loads(result)

    except Exception as e:
        return {"error": str(e)}

# ---------------- MAIN PIPELINE ---------------- #
def run_pipeline(file_path):
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    text = extract_text(file_path)

    if not text or text.startswith("ERROR"):
        return {"error": text}

    total_words = len(text.split())

    email, phone, links = check_essential_info(text)
    sections = check_structure(text.lower())

    llm_result = analyze_with_llm(text)

    return {
        "total_words": total_words,
        "contact_info": {
            "email": email,
            "phone": phone,
            "links": links
        },
        "sections_found": sections,
        "llm_analysis": llm_result
    }


# ---------------- DIRECT TEST ---------------- #
if __name__ == "__main__":
    file_path = r"D:\job-align\ml\data\raw\ai_resume_test.pdf"

    result = run_pipeline(file_path)
    print(json.dumps(result, indent=2))