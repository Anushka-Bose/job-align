import fitz  # PyMuPDF

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
