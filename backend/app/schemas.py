from pydantic import BaseModel, Field
from typing import Optional, List

class VendorInput(BaseModel):
    vendor_name: str = Field(min_length=2, max_length=200)
    email: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    bank_account_name: Optional[str] = None
