import os
from google import genai
from typing import List

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_suggestion(sentence: str, job_desc: str, missing_competencies: List[str], top_chunks: List[str]) -> str:
    chunks_text = "\n".join(top_chunks)
    prompt = f"""
You are an expert resume optimizer.

Given:
Target Sentence to Improve: "{sentence}"
Job Description: "{job_desc}"
Missing Core Competencies in Resume: {missing_competencies}
Top Relevant Resume Chunks (For Grounding/Context):
"{chunks_text}"

Task:
Rewrite the Target Sentence to:
- Be more semantically relevant to the job description.
- Weave in aspects of the Missing Core Competencies (like "Impact" or "Leadership").
- STRICTLY use facts and context from the Top Relevant Resume Chunks. Do not hallucinate fake technologies or experiences.
- Make it flow naturally.

Return ONLY the improved sentence.
"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error generating suggestion: {e}")
        return "Improve this sentence by adding measurable impact aligned with the job description."
