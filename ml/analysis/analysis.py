import json
import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

class EliteResumeAnalyzer:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file.")
            
        self.client = genai.Client(api_key=api_key)
        # Try the versioned name which is more stable across SDK updates
        self.model_id = "gemini-2.0-flash"

    def analyze(self, resume_text, target_job="Software Engineer"):
        # We move the config inside to ensure it's fresh per call
        sys_instr = "You are a professional HR auditor. Return ONLY a JSON object."
        
        prompt = f"""
        Analyze this resume for the role of '{target_job}'. 
        User Context: 3rd Semester CS Student with a 9.72 SGPA. 
        
        Resume Text: {resume_text}
        
        Return JSON:
        {{
          "cv_score": 85,
          "wrong_parts": ["Example part"],
          "extracted_skills": {{"technical": ["Java"], "soft": ["Leadership"]}},
          "skill_gap": ["Docker"],
          "key_highlights": ["9.72 SGPA"],
          "verdict": "Shortlist"
        }}
        """

        for attempt in range(3):
            try:
                # IMPORTANT: In the new SDK, some versions prefer 'models/gemini-1.5-flash'
                # and some prefer 'gemini-1.5-flash'. We will try the most standard one.
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=sys_instr,
                        response_mime_type="application/json"
                    )
                )
                return json.loads(response.text)
            except Exception as e:
                if "429" in str(e):
                    time.sleep(2 ** attempt)
                    continue
                # If 404 persists, let's try to auto-correct the model name
                if "404" in str(e) and "models/" not in self.model_id:
                    self.model_id = f"models/{self.model_id}"
                    continue
                return {"error": f"API Error: {str(e)}"}
        
        return {"error": "Max retries exceeded."}

if __name__ == "__main__":
    analyzer = EliteResumeAnalyzer()
    test_resume = "Anushka Bose. 9.72 SGPA. Heritage Institute. Java, C, Spring. Project: Fit Club AI."
    result = analyzer.analyze(test_resume, "Backend Developer")
    print(json.dumps(result, indent=2))