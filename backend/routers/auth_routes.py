from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import RegisterIn, LoginIn
from auth import hash_password, verify_password, create_access_token, get_current_user
from utils.audit import add_audit

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register")
def register(data: RegisterIn, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=data.name, email=data.email, password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    add_audit(db, "USER_REGISTERED", user_id=user.id, ip_address=request.client.host)
    return {"message": "Registration successful", "user": {"id": user.id, "name": user.name, "email": user.email}}

@router.post("/login")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    add_audit(db, "USER_LOGIN", user_id=user.id, ip_address=request.client.host)
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.name, "email": user.email}}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}
