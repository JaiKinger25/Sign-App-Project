from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document, Signature
from schemas import SignatureIn
from auth import get_current_user
from services.pdf_service import finalize_pdf
from utils.audit import add_audit

router = APIRouter(prefix="/api/signatures", tags=["Signatures"])

@router.post("")
def save_signature(data: SignatureIn, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == data.doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    sig = Signature(doc_id=data.doc_id, user_id=current_user.id, signer_name=data.signer_name, x=data.x, y=data.y, page=data.page, signature_image=data.signature_image)
    db.add(sig)
    db.commit()
    db.refresh(sig)
    add_audit(db, "SIGNATURE_PLACED", user_id=current_user.id, doc_id=doc.id, ip_address=request.client.host, details=f"x={data.x}, y={data.y}, page={data.page}")
    return {"message": "Signature saved", "signature": sig}

@router.get("/{doc_id}")
def get_signatures(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return db.query(Signature).filter(Signature.doc_id == doc_id).all()

@router.post("/finalize/{doc_id}")
def finalize(doc_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    signatures = db.query(Signature).filter(Signature.doc_id == doc_id).all()
    if not signatures:
        raise HTTPException(status_code=400, detail="Place at least one signature first")
    signed_path = finalize_pdf(doc, signatures)
    doc.signed_path = signed_path
    doc.status = "Signed"
    for sig in signatures:
        sig.status = "Signed"
    db.commit()
    add_audit(db, "PDF_FINALIZED", user_id=current_user.id, doc_id=doc.id, ip_address=request.client.host)
    return {"message": "PDF finalized", "signed_url": f"/api/docs/{doc_id}/signed"}
