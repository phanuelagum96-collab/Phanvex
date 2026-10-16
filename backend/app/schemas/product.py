from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    sku: str = Field(min_length=1, max_length=50)
    category: str = Field(default="Other", min_length=1, max_length=100)
    quantity: int = Field(default=0, ge=0)
    minimum: int = Field(default=5, ge=0)
    price: float = Field(gt=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    sku: str | None = Field(default=None, min_length=1, max_length=50)
    category: str | None = Field(
        default=None, min_length=1, max_length=100
    )
    quantity: int | None = Field(default=None, ge=0)
    minimum: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    quantity: int
    minimum: int
    price: float

    model_config = ConfigDict(from_attributes=True)