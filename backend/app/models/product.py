from sqlalchemy import String, Integer, Float, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    sku: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Other",
        server_default=text("'Other'"),
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
        nullable=False,
    )

    minimum: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        server_default=text("5"),
    )

    price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    stock_movements = relationship(
        "StockMovement",
        back_populates="product",
    )

    sales = relationship(
        "Sale",
        back_populates="product",
    )