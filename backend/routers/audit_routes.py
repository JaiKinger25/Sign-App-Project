from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document, AuditLog
from auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])

@router.get("/{doc_id}")
def audit_logs(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return db.query(AuditLog).filter(AuditLog.doc_id == doc_id).order_by(AuditLog.id.desc()).all()
