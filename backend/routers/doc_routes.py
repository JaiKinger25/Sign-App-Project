import os, shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document
from auth import get_current_user
from utils.audit import add_audit

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/docs", tags=["Documents"])

@router.post("/upload")
def upload_pdf(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    safe_name = file.filename.replace(" ", "_")
    path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{safe_name}")
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    doc = Document(filename=file.filename, stored_path=path, owner_id=current_user.id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    add_audit(db, "DOCUMENT_UPLOADED", user_id=current_user.id, doc_id=doc.id, ip_address=request.client.host, details=file.filename)
    return {"message": "PDF uploaded", "document_id": doc.id}

@router.get("")
def list_docs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.owner_id == current_user.id).order_by(Document.id.desc()).all()
    return docs

@router.get("/{doc_id}")
def get_doc(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{doc_id}/file")
def view_pdf(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(doc.stored_path, media_type="application/pdf", filename=doc.filename)

@router.get("/{doc_id}/signed")
def signed_pdf(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc or not doc.signed_path:
        raise HTTPException(status_code=404, detail="Signed PDF not found")
    return FileResponse(doc.signed_path, media_type="application/pdf", filename=f"signed_{doc.filename}")
