from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.register import router as register_router
from routes.verify import router as verify_router

app = FastAPI(title="EverCare Face Recognition Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(register_router)
app.include_router(verify_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "face-recognition"}