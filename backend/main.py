from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import auth_routes, doc_routes, signature_routes, audit_routes
import os

os.makedirs("uploads", exist_ok=True)
os.makedirs("signed", exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Document Signature App - Jai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/signed", StaticFiles(directory="signed"), name="signed")

app.include_router(auth_routes.router)
app.include_router(doc_routes.router)
app.include_router(signature_routes.router)
app.include_router(audit_routes.router)

@app.get("/")
def home():
    return {"message": "Document Signature App Running - Jai"}
