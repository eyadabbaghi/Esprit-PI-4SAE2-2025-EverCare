import cv2
import numpy as np
import base64
import os
from deepface import DeepFace
from scipy.spatial.distance import cosine

DEFAULT_MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.78"))

def decode_image(base64_str: str) -> np.ndarray:
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_bytes = base64.b64decode(base64_str)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

def extract_embedding(base64_img: str) -> list:
    img = decode_image(base64_img)

    if img is None:
        raise ValueError("Could not decode image from base64")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Try with enforce_detection=True first
    try:
        result = DeepFace.represent(
            img_path=img_rgb,
            model_name="Facenet512",
            enforce_detection=True,
            detector_backend="opencv"
        )
        return result[0]["embedding"]
    except Exception:
        pass

    # Fallback: try different detector backends
    for backend in ["retinaface", "mtcnn", "ssd"]:
        try:
            result = DeepFace.represent(
                img_path=img_rgb,
                model_name="Facenet512",
                enforce_detection=True,
                detector_backend=backend
            )
            return result[0]["embedding"]
        except Exception:
            continue

    # Last resort: enforce_detection=False
    # Still extracts a meaningful embedding if face is roughly visible
    result = DeepFace.represent(
        img_path=img_rgb,
        model_name="Facenet512",
        enforce_detection=False,
        detector_backend="opencv"
    )
    return result[0]["embedding"]

def compute_similarity(embedding1: list, embedding2: list) -> float:
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    similarity = 1 - cosine(vec1, vec2)
    return float(similarity)

def match_face(live_embedding: list, stored_embeddings: list, threshold=DEFAULT_MATCH_THRESHOLD) -> dict:
    best_score = 0.0
    for stored in stored_embeddings:
        score = compute_similarity(live_embedding, stored)
        if score > best_score:
            best_score = score
    return {
        "matched": best_score >= threshold,
        "score": best_score
    }
