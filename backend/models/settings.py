from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    business_name: Mapped[str] = mapped_column(
        String(150), default="Phanvex"
    )
    business_email: Mapped[str] = mapped_column(
        String(255), default=""
    )
    business_phone: Mapped[str] = mapped_column(
        String(50), default=""
    )
    business_address: Mapped[str] = mapped_column(
        String(255), default=""
    )

    low_stock_threshold: Mapped[int] = mapped_column(
        Integer, default=10
    )
    default_payment_method: Mapped[str] = mapped_column(
        String(50), default="Cash"
    )
    receipt_footer: Mapped[str] = mapped_column(
        Text, default="Thank you for your business."
    )

    email_notifications: Mapped[bool] = mapped_column(
        Boolean, default=True
    )
    low_stock_notifications: Mapped[bool] = mapped_column(
        Boolean, default=True
    )
    sales_notifications: Mapped[bool] = mapped_column(
        Boolean, default=True
    )