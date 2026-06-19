# Document Signature App

Full-stack Document Signature App using FastAPI + React.

## Features
- Register and login with JWT
- Upload PDF
- Open PDF inside the app using login token
- Draw your own signature on a canvas
- Drag signature position on the PDF preview
- Save signature position
- Finalize signed PDF
- Open and download signed PDF
- Audit trail

## Backend
Open CMD:

```cmd
cd backend
py -3 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at:

```text
http://localhost:8000
```

## Frontend
Open another CMD:

```cmd
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Important if updating old ZIP
This version adds drawn signature storage. If you used the old ZIP and get a database column error, stop backend and delete this file:

```text
backend/signature_app.db
```

Then restart backend. You will register again and upload the PDF again.


V6 fixes: Typed Name now clears old drawn signature and signed PDF no longer prints extra date/time text under the signature.
