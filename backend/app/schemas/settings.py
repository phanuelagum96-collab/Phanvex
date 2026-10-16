from pydantic import BaseModel, ConfigDict, Field


class SettingsBase(BaseModel):
    business_name: str = Field(default="Phanvex", max_length=150)
    business_email: str = Field(default="", max_length=255)
    business_phone: str = Field(default="", max_length=50)
    business_address: str = Field(default="", max_length=255)

    low_stock_threshold: int = Field(default=10, ge=0)
    default_payment_method: str = Field(default="Cash", max_length=50)
    receipt_footer: str = Field(
        default="Thank you for your business."
    )

    email_notifications: bool = True
    low_stock_notifications: bool = True
    sales_notifications: bool = True


class SettingsUpdate(SettingsBase):
    pass


class SettingsResponse(SettingsBase):
    id: int

    model_config = ConfigDict(from_attributes=True)