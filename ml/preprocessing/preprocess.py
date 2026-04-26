import re
from typing import Dict, List
import fitz  # PyMuPDF
import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Spacy model 'en_core_web_sm' not found.")
    print("Please download it using: python -m spacy download en_core_web_sm")
    nlp = None

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

def chunk_sentences(text: str) -> List[str]:
    """Chunk text into sentences using spaCy."""
    if not nlp:
        # Simplistic fallback
        return [sent.strip() for sent in re.split(r'[.!?]\s+', text) if sent.strip()]
        
    doc = nlp(text)
    return [sent.text.strip() for sent in doc.sents if sent.text.strip()]

def extract_text(pdf_path: str) -> str:
    """Extract full raw text string from a PDF."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return ""

def split_sections(text: str) -> Dict[str, List[str]]:
    """Split resume text into predefined sections."""
    sections = {
        'skills': [],
        'projects': [],
        'experience': [],
        'education': [],
        'others': []
    }
    
    current_section = 'others'
    lines = text.split('\n')
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        lower_line = stripped.lower()
        
        # Heuristics for section headers
        if re.match(r'^(technical\s+)?skills?:?$', lower_line) or lower_line.startswith('skills'):
            current_section = 'skills'
            sections[current_section].append(stripped)
        elif re.match(r'^(personal\s+|academic\s+)?projects?:?$', lower_line) or lower_line.startswith('project'):
            current_section = 'projects'
            sections[current_section].append(stripped)
        elif re.match(r'^(work\s+|professional\s+)?experience?:?$', lower_line) or lower_line.startswith('experience') or lower_line.startswith('employment'):
            current_section = 'experience'
            sections[current_section].append(stripped)
        elif re.match(r'^(academic\s+)?education:?$', lower_line) or lower_line.startswith('education') or lower_line.startswith('academics'):
            current_section = 'education'
            sections[current_section].append(stripped)
        elif re.match(r'^(extra-?curricular|activities|hobbies):?$', lower_line):
            current_section = 'others'
            sections[current_section].append(stripped)
        else:
            sections[current_section].append(stripped)
            
    return sections
