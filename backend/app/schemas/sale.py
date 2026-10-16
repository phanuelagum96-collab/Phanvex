
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PaymentMethod = Literal["cash", "mpesa"]


class SaleCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    payment_method: PaymentMethod = "cash"


class SaleResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    total_amount: float
    payment_method: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
