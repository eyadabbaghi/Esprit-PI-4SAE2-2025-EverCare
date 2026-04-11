from sqlalchemy import create_engine, Column, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json

DATABASE_URL = "mysql+pymysql://root:@localhost:3306/EverCaredb"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"
    keycloak_id = Column(String(255), primary_key=True)
    embeddings_json = Column(Text, nullable=False)  # JSON array of embedding arrays

Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()