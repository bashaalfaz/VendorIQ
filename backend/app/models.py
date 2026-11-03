from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.sql import func
from .database import Base

class VendorRun(Base):
    __tablename__ = "vendor_runs"
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True)
    country = Column(String(100), nullable=True)
    tax_id = Column(String(100), nullable=True)
    bank_account_name = Column(String(200), nullable=True)
    document_names = Column(Text, nullable=True)
    status = Column(String(30), nullable=False)
    risk_score = Column(Float, default=0)
    findings = Column(Text, nullable=False)
    follow_up = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
