from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class StockMovementCreate(BaseModel):
    product_id: int = Field(gt=0)
    movement_type: Literal["stock_in", "stock_out"]
    quantity: int = Field(gt=0)
    reason: str = Field(min_length=1, max_length=200)


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    movement_type: str
    quantity: int
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)