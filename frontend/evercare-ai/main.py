from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are EverCare Assistant, a compassionate AI care companion
specialized in Alzheimer's disease support.

YOUR ROLE:
- Support patients with early-to-mid stage Alzheimer's and their caregivers
- Be warm, gentle, and use short simple sentences
- Never use complex medical jargon unless talking to a caregiver
- Always end with a simple follow-up question or suggestion

ACTIONS YOU CAN TRIGGER (include in suggestedAction field):
- OPEN_ASSESSMENT   → if they want a memory/cognitive test
- SHOW_ACTIVITIES   → if they ask about daily routines
- SHOW_MEDICATIONS  → if they ask about medications or reminders
- CONTACT_CAREGIVER → if distress is detected

ALWAYS respond in this exact JSON format, nothing else:
{
  "reply": "Your message here",
  "suggestedAction": null
}
"""

class MessageHistory(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[str] = None
    history: list[MessageHistory] = []

class ChatResponse(BaseModel):
    reply: str
    suggested_action: Optional[str] = None

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for m in request.history:
        messages.append({"role": m.role, "content": m.content})

    messages.append({
        "role": "user",
        "content": f"[Patient ID: {request.patient_id or 'unknown'}]\n{request.message}"
    })

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()

    # Extract JSON even if model wraps it in extra text
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)

    if json_match:
        try:
            parsed = json.loads(json_match.group())
            action = parsed.get("suggestedAction")
            if not action or action == "null":
                action = None
            return ChatResponse(
                reply=parsed.get("reply", raw),
                suggested_action=action
            )
        except json.JSONDecodeError:
            pass

    return ChatResponse(reply=raw)