from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class BillingSettings(BaseModel):
    id: Optional[int] = None
    vat: Decimal
    discount: Decimal
    updated_at: Optional[str] = None

class BillingSettingsUpdate(BaseModel):
    vat: Decimal
    discount: Decimal

class BillingSettingsResponse(BaseModel):
    success: bool
    data: BillingSettings
    message: str
