from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import json
from database.db import get_db, FaceEmbedding
from models.face_model import extract_embedding, match_face

router = APIRouter()

class FaceVerifyRequest(BaseModel):
    image: str  # base64 image

class FaceVerifyByIdRequest(BaseModel):
    keycloak_id: str
    image: str

@router.post("/face/verify")
def verify_face(request: FaceVerifyByIdRequest, db=Depends(get_db)):
    record = db.query(FaceEmbedding).filter_by(keycloak_id=request.keycloak_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No face registered for this user")
    
    try:
        live_embedding = extract_embedding(request.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Face not detected: {str(e)}")
    
    stored_embeddings = json.loads(record.embeddings_json)
    result = match_face(live_embedding, stored_embeddings)
    
    return {
        "matched": result["matched"],
        "score": result["score"],
        "keycloak_id": request.keycloak_id
    }

@router.get("/face/has-face/{keycloak_id}")
def has_face(keycloak_id: str, db=Depends(get_db)):
    record = db.query(FaceEmbedding).filter_by(keycloak_id=keycloak_id).first()
    return {"hasFace": record is not None}