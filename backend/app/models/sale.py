from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"), nullable=False, index=True
    )

    quantity: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    unit_price: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    total_amount: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    payment_method: Mapped[str] = mapped_column(
        String(30), nullable=False, default="cash"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    product = relationship("Product", back_populates="sales")