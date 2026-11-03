
import json
from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def generate_vendor_report(vendor):
    """Generate a PDF risk assessment report for one vendor."""

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#172554"),
        spaceAfter=8,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1D4ED8"),
        spaceBefore=12,
        spaceAfter=7,
    ))

    styles.add(ParagraphStyle(
        name="SmallText",
        parent=styles["BodyText"],
        fontSize=9,
        leading=13,
    ))

    story = []

    def safe(value):
        if value is None or str(value).strip() == "":
            return "Not provided"
        return str(value)

    def paragraph(value):
        # Escape text so vendor-supplied characters cannot break PDF markup.
        from xml.sax.saxutils import escape
        return Paragraph(escape(safe(value)), styles["SmallText"])

    # Header
    story.append(Paragraph("VendorIQ", styles["ReportTitle"]))
    story.append(Paragraph(
        "Vendor Onboarding & Risk Assessment Report",
        styles["Heading2"]
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        f"Report generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')}",
        styles["SmallText"]
    ))
    story.append(Spacer(1, 12))

    # Risk category derived from the score
    risk_score = int(vendor.get("risk_score") or 0)

    if risk_score >= 60:
        risk_category = "HIGH"
    elif risk_score >= 30:
        risk_category = "MEDIUM"
    else:
        risk_category = "LOW"

    # Vendor information
    story.append(Paragraph("1. Vendor Information", styles["SectionHeading"]))

    vendor_rows = [
        ["Field", "Details"],
        ["Vendor Name", safe(vendor.get("vendor_name"))],
        ["Email", safe(vendor.get("email"))],
        ["Country", safe(vendor.get("country"))],
        ["Tax ID", safe(vendor.get("tax_id"))],
        ["Bank Account Name", safe(vendor.get("bank_account_name"))],
    ]

    vendor_table = Table(vendor_rows, colWidths=[48 * mm, 112 * mm])
    vendor_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#EFF6FF")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(vendor_table)

    # Risk assessment
    story.append(Paragraph("2. Risk Assessment", styles["SectionHeading"]))

    risk_rows = [
        ["Metric", "Result"],
        ["Risk Score", f"{risk_score}/100"],
        ["Risk Category", risk_category],
        ["Approval Status", safe(vendor.get("status"))],
    ]

    risk_table = Table(risk_rows, colWidths=[48 * mm, 112 * mm])
    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(risk_table)

    # Findings
    story.append(Paragraph("3. Risk Findings", styles["SectionHeading"]))

    findings = vendor.get("findings", [])

    if isinstance(findings, str):
        try:
            findings = json.loads(findings)
        except (json.JSONDecodeError, TypeError):
            findings = []

    if not isinstance(findings, list):
        findings = []

    if findings:
        for index, finding in enumerate(findings, start=1):
            if isinstance(finding, dict):
                issue = finding.get("issue", "Risk finding")
                severity = finding.get("severity", "Not specified")
                description = finding.get("description", "")
                story.append(Paragraph(
                    f"{index}. {safe(issue)} — {safe(severity)}",
                    styles["BodyText"]
                ))
                if description:
                    story.append(Paragraph(
                        safe(description), styles["SmallText"]
                    ))
            else:
                story.append(Paragraph(
                    f"{index}. {safe(finding)}",
                    styles["SmallText"]
                ))
            story.append(Spacer(1, 5))
    else:
        story.append(Paragraph(
            "No risk findings were recorded.",
            styles["SmallText"]
        ))

    # Uploaded documents
    story.append(Paragraph("4. Uploaded Documents", styles["SectionHeading"]))

    documents = vendor.get("documents", [])

    if isinstance(documents, str):
        try:
            documents = json.loads(documents)
        except (json.JSONDecodeError, TypeError):
            documents = []

    if documents:
        for document in documents:
            story.append(Paragraph(
                f"- {safe(document)}",
                styles["SmallText"]
            ))
    else:
        story.append(Paragraph(
            "No uploaded documents were recorded.",
            styles["SmallText"]
        ))

    # Follow-up recommendation
    story.append(Paragraph(
        "5. Recommended Follow-up",
        styles["SectionHeading"]
    ))

    follow_up = vendor.get("follow_up")

    if follow_up:
        story.append(Paragraph(safe(follow_up), styles["SmallText"]))
    else:
        story.append(Paragraph(
            "No follow-up recommendation was recorded.",
            styles["SmallText"]
        ))

    story.append(Spacer(1, 18))
    story.append(Paragraph(
        "Disclaimer: This report reflects the information and configured "
        "validation rules recorded in VendorIQ. It does not independently "
        "verify tax registrations, bank accounts, or vendor identity.",
        styles["SmallText"]
    ))

    doc.build(story)
    buffer.seek(0)

    return buffer
