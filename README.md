# VendorIQ — AI Vendor Onboarding MVP

## Prerequisites
- Python 3.10+
- Node.js 18+
- npm

## 1. Backend
Open a terminal:
```bash
cd backend
python -m venv venv
```
Windows PowerShell:
```powershell
.\venv\Scripts\Activate.ps1
```
Windows CMD:
```cmd
venv\Scripts\activate
```
Then:
```bash
pip install -r requirements.txt
copy .env.example .env
```
Optionally add your Gemini API key to `backend/.env`.
Run:
```bash
uvicorn app.main:app --reload
```
Backend docs: http://127.0.0.1:8000/docs

## 2. Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL, usually http://localhost:5173.

## 3. Demo test cases
1. Approved: name `Acme Components Pvt Ltd`, tax ID `29ABCDE1234F1Z5`, bank account name exactly `Acme Components Pvt Ltd`, email `accounts@acme.example`.
2. Pending: use a different bank account holder name or omit tax ID.
3. Duplicate: submit the same tax ID a second time. The current demo engine flags a duplicate tax ID as REJECTED.

## Important limitations
- This is a case-study prototype, not a production KYC or compliance product.
- Tax IDs are checked for presence and rough length only; no government registry verification occurs.
- Bank account ownership is not independently verified.
- Gemini extraction is optional and requires a valid API key. Manual form processing works without it.
- PDF uploads are stored locally in `backend/uploads`; do not upload real personal or banking data.
- For a production system, add authentication, authorization, encrypted object storage, malware scanning, file retention/deletion controls, audit logging, human approval, and verified external checks.
