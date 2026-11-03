
import json
import os
import uuid
from pathlib import Path

from fastapi import (
    FastAPI,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException
)
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .database import Base, engine, get_db
from .models import VendorRun
from .services import (
    extract_pdf_text,
    extract_with_gemini,
    validate_vendor,
    make_follow_up
)
from .report_service import generate_vendor_report


# ---------------- CONFIGURATION ----------------

load_dotenv()

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024

app = FastAPI(
    title="VendorIQ API",
    version="1.1.0"
)

origin = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ---------------- HELPER FUNCTIONS ----------------

def get_risk_category(score):
    """
    Calculate risk category based on risk score.
    """

    if score >= 60:
        return "HIGH"

    elif score >= 30:
        return "MEDIUM"

    return "LOW"


# ---------------- BASIC ROUTES ----------------

@app.get("/")
def root():
    return {
        "message": "VendorIQ API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }


# ---------------- PROCESS VENDOR WITH LIVE PROGRESS ----------------

@app.post("/api/vendors/process")
async def process_vendor(
    vendor_name: str = Form(...),
    email: str = Form(""),
    country: str = Form(""),
    tax_id: str = Form(""),
    bank_account_name: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """Process a vendor and stream genuine stage updates using SSE."""

    if len(vendor_name.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Vendor name must contain at least 2 characters."
        )

    async def event_stream():
        def send(event_name, payload):
            return (
                f"event: {event_name}\n"
                f"data: {json.dumps(payload, default=str)}\n\n"
            )

        saved_names = []
        combined_text = ""
        ai_result = {}
        document_issues = []
        stages = []

        def stage(name, status):
            stages.append({"name": name, "status": status})
            return send("stage", {"name": name, "status": status})

        try:
            yield stage("Submission received", "started")
            yield stage("Submission received", "completed")

            yield stage("Document validation", "started")
            if not files:
                document_issues.append("No supporting PDF document was uploaded")

            file_contents = []
            for upload in files:
                original_name = Path(upload.filename or "unnamed.pdf").name
                if not original_name.lower().endswith(".pdf"):
                    raise ValueError(f"{original_name}: only PDF files are supported.")
                content = await upload.read()
                if not content:
                    document_issues.append(f"{original_name}: uploaded file is empty")
                    continue
                if len(content) > MAX_FILE_SIZE:
                    raise ValueError(f"{original_name}: file exceeds the 10 MB limit.")
                file_contents.append((original_name, content))
            yield stage("Document validation", "completed")

            yield stage("PDF text extraction", "started")
            for original_name, content in file_contents:
                safe_name = f"{uuid.uuid4().hex}_{original_name}"
                path = UPLOAD_DIR / safe_name
                try:
                    path.write_bytes(content)
                except OSError as exc:
                    raise ValueError("Unable to save the uploaded PDF.") from exc
                saved_names.append(original_name)
                try:
                    extracted_text = extract_pdf_text(str(path))
                    if extracted_text.strip():
                        combined_text += (
                            f"\n\n--- DOCUMENT: {original_name} ---\n"
                            f"{extracted_text}"
                        )
                except ValueError as exc:
                    document_issues.append(f"{original_name}: {str(exc)}")
                except Exception as exc:
                    document_issues.append(
                        f"{original_name}: document processing failed"
                    )
                    print(f"PDF PROCESSING ERROR ({original_name}):", repr(exc))
            yield stage("PDF text extraction", "completed")

            yield stage("AI information extraction", "started")
            if combined_text.strip():
                ai_result = extract_with_gemini(combined_text)
            else:
                ai_result = {
                    "used_ai": False,
                    "message": "AI extraction was skipped because no readable PDF text was available."
                }
            yield stage(
                "AI information extraction",
                "completed" if ai_result.get("used_ai") else "skipped"
            )

            yield stage("Risk assessment", "started")
            form_data = {
                "vendor_name": vendor_name.strip(),
                "email": email.strip(),
                "country": country.strip(),
                "tax_id": tax_id.strip(),
                "bank_account_name": bank_account_name.strip()
            }
            existing = {
                r.tax_id.upper()
                for r in db.query(VendorRun)
                .filter(VendorRun.tax_id.isnot(None))
                .all()
                if r.tax_id
            }
            result = validate_vendor(
                form_data,
                existing,
                ai_result if ai_result.get("used_ai") else None,
                document_issues=document_issues
            )
            yield stage("Risk assessment", "completed")

            yield stage("Final decision and record saving", "started")
            follow_up = make_follow_up(form_data["vendor_name"], result["findings"])
            row = VendorRun(
                vendor_name=form_data["vendor_name"],
                email=form_data["email"],
                country=form_data["country"],
                tax_id=form_data["tax_id"],
                bank_account_name=form_data["bank_account_name"],
                document_names=json.dumps(saved_names),
                status=result["status"],
                risk_score=result["risk_score"],
                findings=json.dumps(result["findings"]),
                follow_up=follow_up
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            yield stage("Final decision and record saving", "completed")

            response_data = {
                "id": row.id,
                **result,
                "risk_category": get_risk_category(row.risk_score),
                "vendor": form_data,
                "documents": saved_names,
                "document_issues": document_issues,
                "ai_extraction": ai_result,
                "follow_up": follow_up,
                "stages": stages
            }
            yield send("result", response_data)
            yield send("complete", {"ok": True})

        except Exception as exc:
            db.rollback()
            print("VENDOR PROCESSING ERROR:", repr(exc))
            yield send("processing_error", {"detail": str(exc) or "Vendor processing failed."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ---------------- LIST ALL VENDORS ----------------

@app.get("/api/vendors")
def list_vendors(
    db: Session = Depends(get_db)
):

    rows = (
        db.query(VendorRun)
        .order_by(VendorRun.id.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "vendor_name": r.vendor_name,
            "email": r.email,
            "status": r.status,
            "risk_score": r.risk_score,

            "risk_category": get_risk_category(r.risk_score),

            "created_at": (
                r.created_at.isoformat()
                if r.created_at
                else None
            ),

            "findings": json.loads(
                r.findings or "[]"
            )
        }
        for r in rows
    ]


# ---------------- GET INDIVIDUAL VENDOR ----------------

@app.get("/api/vendors/{vendor_id}")
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):

    r = (
        db.query(VendorRun)
        .filter(VendorRun.id == vendor_id)
        .first()
    )

    if not r:
        raise HTTPException(
            status_code=404,
            detail="Vendor run not found."
        )

    return {
        "id": r.id,
        "vendor_name": r.vendor_name,
        "email": r.email,
        "country": r.country,
        "tax_id": r.tax_id,
        "bank_account_name": r.bank_account_name,
        "status": r.status,
        "risk_score": r.risk_score,

        "risk_category": get_risk_category(r.risk_score),

        "findings": json.loads(
            r.findings or "[]"
        ),

        "documents": json.loads(
            r.document_names or "[]"
        ),

        "follow_up": r.follow_up,

        "created_at": (
            r.created_at.isoformat()
            if r.created_at
            else None
        )
    }


# ---------------- DOWNLOAD VENDOR PDF REPORT ----------------

@app.get("/api/vendors/{vendor_id}/report")
def download_vendor_report(
    vendor_id: int,
    db: Session = Depends(get_db)
):

    vendor = (
        db.query(VendorRun)
        .filter(VendorRun.id == vendor_id)
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor record not found"
        )

    vendor_data = {
        "id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "email": vendor.email,
        "country": vendor.country,
        "tax_id": vendor.tax_id,
        "bank_account_name": vendor.bank_account_name,
        "status": vendor.status,
        "risk_score": vendor.risk_score,

        "findings": json.loads(
            vendor.findings or "[]"
        ),

        "documents": json.loads(
            vendor.document_names or "[]"
        ),

        "follow_up": vendor.follow_up,
    }

    pdf_buffer = generate_vendor_report(vendor_data)

    filename = f"VendorIQ_Report_{vendor.id}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        }
    )
