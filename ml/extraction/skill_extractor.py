from typing import List
import os
import json
from google import genai

# Setup Gemini model
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def extract_competencies(clusters: List[str]) -> dict:
    """Extract 6 Core Competencies dynamically using Gemini LLM over clustered resume chunks."""
    if not clusters:
        return {}
        
    combined_text = "\n\n".join(clusters)
    
    prompt = f"""
You are an expert ATS competency parser.
Analyze the following clustered pseudo-sections of a resume and score the candidate on 6 Core Competencies:
1. Impact (measurable results)
2. Problem Solving
3. Technical/Domain Depth
4. Communication
5. Leadership/Ownership
6. Analytical Thinking

Return ONLY a valid JSON dictionary where each key is the competency name, and the value is a score from 0-100 indicating the strength of evidence for that competency. Do not return markdown blocks. Example: {{"Impact": 80, "Leadership/Ownership": 45}}

Text:
"{combined_text[:6000]}"
"""
    try:
        response = client.models.generate_content(
            model="gemini-3.0-flash",
            contents=prompt
        )
        content = response.text.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        competencies = json.loads(content.strip())
        return competencies
    except Exception as e:
        print(f"Error extracting competencies via LLM: {e}")
        return {
            "Impact": 50, "Problem Solving": 50, "Technical/Domain Depth": 50,
            "Communication": 50, "Leadership/Ownership": 50, "Analytical Thinking": 50
        }
