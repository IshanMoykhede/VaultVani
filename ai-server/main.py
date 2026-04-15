import os
import shutil
import uuid
import httpx
import fitz  # PyMuPDF
import cv2
import numpy as np
import easyocr
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Need to allow standard React/Vite development ports
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize easyocr reader globally so it does not reload on every request
# It might take a moment to download weights upon first execution
print("Loading EasyOCR models...")
reader = easyocr.Reader(['en'])
print("EasyOCR models loaded.")

class OcrResponse(BaseModel):
    cleaned_text: str

@app.post("/api/ocr", response_model=OcrResponse)
async def process_document(file: UploadFile = File(...)):
    # Reload dotenv dynamically in case the file was changed but server wasn't fully restarted
    load_dotenv()
    apikey = os.getenv("GROK_API_KEY")
    
    if not apikey:
        raise HTTPException(status_code=500, detail="Grok API key not configured in .env file")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    temp_path = os.path.join(temp_dir, unique_filename)
    
    try:
        # 1. Save uploaded file temporarily to disk
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Extract images from the uploaded PDF using PyMuPDF
        images = []
        raw_ocr_lines = []
        
        if file_extension == ".pdf":
            doc = fitz.open(temp_path)
            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=300) # High DPI for better OCR
                # Convert Pixmap to numpy array compatible with EasyOCR/OpenCV
                img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                if pix.n == 4: # RGBA -> RGB
                    img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
                
                # Perform OCR on the image
                results = reader.readtext(img, detail=1)
                
                raw_ocr_lines.append(f"--- Document Page {page_num + 1} ---")
                for (bbox, text, prob) in results:
                    raw_ocr_lines.append(f"Text: '{text}' (Confidence: {prob:.2f})")
            doc.close()
        else:
            # If the user directly uploads an image instead of a PDF
            results = reader.readtext(temp_path, detail=1)
            for (bbox, text, prob) in results:
                raw_ocr_lines.append(f"Text: '{text}' (Confidence: {prob:.2f})")
        
        raw_ocr_text = "\n".join(raw_ocr_lines)
        
        print("\n" + "="*50)
        print("RAW OCR EXTRACTION RESULT:")
        print("="*50)
        print(raw_ocr_text)
        print("="*50 + "\n")
        
        if not raw_ocr_text.strip():
            return OcrResponse(cleaned_text="")
        
        # 3. Call Grok LLM to contextualize the raw OCR outputs
        system_prompt = """
You are a careful Class 10th teacher who is an expert at cleaning messy OCR text from Indian official documents (Aadhaar card, PAN card, Voter ID, Driving License, Passport, etc.).

Your job is simple and strict:
1. Fix only obvious OCR errors (spelling mistakes, broken words like "NAM E" → "NAME", "FATH ER" → "FATHER", "Aadhar" → "Aadhaar", extra spaces, etc.).
2. Extract every important piece of information as key-value pairs.
3. Use clear, simple keys in snake_case (e.g. full_name, date_of_birth, aadhaar_number, pan_number, father_name, address, gender, etc.).
4. Output ONLY a single valid JSON object. No explanations, no markdown, no extra text at all.

Here is an example:

Raw OCR output:
Text: 'GOVERNMENT OF INDIA
AADHAAR
NAM E: RAHUL KUMAR
DOB: 15/ 08/ 1995
FATH ER: RAMESH KUMAR
AADHAAR NO: 1234 5678 9012
Address: 123, Main Road, Nashik, Maharashtra'

Clean JSON output:
{
  "document_type": "Aadhaar Card",
  "full_name": "Rahul Kumar",
  "date_of_birth": "15/08/1995",
  "father_name": "Ramesh Kumar",
  "aadhaar_number": "123456789012",
  "address": "123, Main Road, Nashik, Maharashtra"
}

Now do exactly the same for the new raw OCR text below. Remember: ONLY output valid JSON. No other words.
"""
        print("Sending raw OCR payload to Grok...")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {apikey}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant", # User is using Groq API
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Raw OCR output:\n{raw_ocr_text}"}
                    ],
                    "temperature": 0.1
                },
                timeout=90.0 # Extensive timeout since the context could be large
            )
            
            if response.status_code != 200:
                print(f"Grok API Error: {response.text}")
                raise HTTPException(status_code=502, detail="Failed to communicate with LLM API")
                
            data = response.json()
            cleaned_text = data["choices"][0]["message"]["content"].strip()
            print("Grok structured extraction complete.")
            
        return OcrResponse(cleaned_text=cleaned_text)
        
    except Exception as e:
        print(f"Process failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 4. Strictly enforce file deletion to preserve privacy
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
