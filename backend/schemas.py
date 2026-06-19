from pydantic import BaseModel, EmailStr
from datetime import datetime

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class SignatureIn(BaseModel):
    doc_id: int
    signer_name: str
    x: float
    y: float
    page: int = 1
    signature_image: str | None = None

class DocumentOut(BaseModel):
    id: int
    filename: str
    status: str
    created_at: datetime
    signed_path: str | None = None

class SignatureOut(BaseModel):
    id: int
    doc_id: int
    signer_name: str
    x: float
    y: float
    page: int
    status: str
    created_at: datetime
