import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

import models
import database
import schemas
import auth

app = FastAPI(title="AI Code Review API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
def on_startup():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("Database tables created successfully.")
    except Exception as e:
        print("Database connection failed, assuming mock setup or wait for DB:", e)


@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/refresh", response_model=schemas.Token)
def refresh_token(current_user: models.User = Depends(auth.get_current_user)):
    # Issue a new access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": current_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# Protected route example
@app.get("/api/protected-data")
def read_protected_data(current_user: models.User = Depends(auth.get_current_user)):
    return {"message": f"Hello {current_user.email}, you are authenticated and have access to this protected data."}

from pydantic import BaseModel
import re
import httpx
from google import genai
import json

class AnalyzeRequest(BaseModel):
    repoUrl: str

@app.post("/api/analyze")
async def analyze_repository(request: AnalyzeRequest, current_user: models.User = Depends(auth.get_current_user)):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
        
    client = genai.Client(api_key=api_key)
    
    match = re.search(r"github\.com/([^/]+)/([^/]+)", request.repoUrl)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub Repository URL")
    
    owner = match.group(1)
    repo = match.group(2).replace(".git", "")
    
    async with httpx.AsyncClient() as http_client:
        tree_response = await http_client.get(f"https://api.github.com/repos/{owner}/{repo}/contents")
        if tree_response.status_code != 200:
            raise HTTPException(status_code=tree_response.status_code, detail="Failed to fetch repository. Ensure it is public.")
            
        contents = tree_response.json()
        allowed_extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.cpp', '.c', '.rs', '.php', '.rb']
        
        file_candidates = [
            item for item in contents 
            if item.get("type") == "file" and any(item.get("name", "").endswith(ext) for ext in allowed_extensions)
        ][:5]
        
        if not file_candidates:
            raise HTTPException(status_code=400, detail="No recognizable code files found in the repository root.")
            
        file_contexts = []
        for file in file_candidates:
            file_res = await http_client.get(file["download_url"])
            if file_res.status_code == 200:
                file_contexts.append({"name": file["name"], "content": file_res.text})
                
    prompt = f"""You are a Senior Security Architect and Expert Code Reviewer.
I am providing you with the contents of {len(file_contexts)} files from the GitHub repository {owner}/{repo}.

YOUR TASKS:
1. Detect bugs, security vulnerabilities, bad coding practices, performance issues, and scalability problems.
2. Explain WHY each issue matters.
3. Suggest fixes with improved code snippets.
4. Categorize severity as Critical, High, Medium, or Low.
5. Provide overall scores (out of 100) for Security, Code Quality, and Maintainability.

REPO FILES:
"""

    for f in file_contexts:
        content_trunc = f["content"][:3000]
        prompt += f"--- FILE: {f['name']} ---\n{content_trunc} // Truncated if too long\n\n"

    prompt += """RESPOND STRICTLY IN THIS JSON FORMAT:
{
  "summary": {
    "securityScore": 85,
    "qualityScore": 70,
    "maintainabilityScore": 75,
    "overview": "A brief overall architectural review..."
  },
  "issues": [
    {
      "id": "uuid-or-random",
      "file": "filename",
      "type": "security|bug|performance|practice",
      "severity": "Critical|High|Medium|Low",
      "title": "Short title of issue",
      "description": "Detailed explanation of why it matters",
      "suggestedFix": "Code snippet showing the fix"
    }
  ]
}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        json_string = response.text
        # Cleanup json markdown block if present
        if json_string.startswith("```json"):
            json_string = json_string[7:]
        if json_string.endswith("```"):
            json_string = json_string[:-3]
            
        analysis_result = json.loads(json_string)
        return {
            "owner": owner,
            "repo": repo,
            "analysis": analysis_result
        }
    except Exception as e:
        print("Analysis error:", e)
        raise HTTPException(status_code=500, detail="Failed to parse AI response.")

