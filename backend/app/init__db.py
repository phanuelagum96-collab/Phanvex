
from app.database import Base, engine
from app.models import (
    Product,
    StockMovement,
    Sale,
    BusinessSettings,
    MpesaPayment,
)


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("Database tables initialized successfully.")
