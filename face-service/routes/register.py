from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import json
from database.db import get_db, FaceEmbedding
from models.face_model import extract_embedding

router = APIRouter()

class FaceRegisterRequest(BaseModel):
    keycloak_id: str
    images: List[str]

@router.post("/face/register")
def register_face(request: FaceRegisterRequest, db=Depends(get_db)):
    embeddings = []
    failed_count = 0

    for i, img_b64 in enumerate(request.images):
        try:
            embedding = extract_embedding(img_b64)
            embeddings.append(embedding)
            print(f"✅ Image {i+1}: embedding extracted successfully")
        except Exception as e:
            failed_count += 1
            print(f"⚠️ Image {i+1}: skipped — {str(e)}")
            continue  # skip bad frames, don't fail entire request

    if len(embeddings) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract face from enough images. "
                   f"Got {len(embeddings)} valid frames out of {len(request.images)}. "
                   f"Please ensure good lighting and face the camera directly."
        )

    # Store embeddings
    existing = db.query(FaceEmbedding).filter_by(keycloak_id=request.keycloak_id).first()
    if existing:
        existing.embeddings_json = json.dumps(embeddings)
    else:
        record = FaceEmbedding(
            keycloak_id=request.keycloak_id,
            embeddings_json=json.dumps(embeddings)
        )
        db.add(record)

    db.commit()
    return {
        "message": "Face registered successfully",
        "embeddings_count": len(embeddings),
        "skipped": failed_count
    }