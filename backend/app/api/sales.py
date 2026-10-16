from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Product, Sale, StockMovement
from app.schemas.sale import SaleCreate, SaleResponse


router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post(
    "/",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
):
    try:
        with db.begin():
            # Retrieve and lock the product row where supported.
            statement = (
                select(Product)
                .where(Product.id == sale_data.product_id)
                .with_for_update()
            )

            product = db.scalars(statement).first()


            if sale_data.payment_method == "mpesa":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Use the M-PESA STK Push endpoint for M-PESA payments.",
                )


            if product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found.",
                )

            if product.quantity < sale_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient stock available.",
                )

            # Calculate the sale using the current product price.
            unit_price = product.price
            total_amount = round(
                unit_price * sale_data.quantity, 2
            )

            # Reduce available stock.
            product.quantity -= sale_data.quantity

            # Create the sale record.
            sale = Sale(
                product_id=product.id,
                quantity=sale_data.quantity,
                unit_price=unit_price,
                total_amount=total_amount,
                payment_method=sale_data.payment_method,
            )

            # Record the corresponding stock movement.
            movement = StockMovement(
                product_id=product.id,
                movement_type="stock_out",
                quantity=sale_data.quantity,
                reason=f"Sale recorded: {sale_data.quantity} units",
            )

            db.add_all([sale, movement])
            db.flush()

        # The transaction commits when the with block exits.
        db.refresh(sale)
        return sale

    except HTTPException:
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not record the sale.",
        )


@router.get("/", response_model=list[SaleResponse])
def list_sales(db: Session = Depends(get_db)):
    statement = select(Sale).order_by(Sale.created_at.desc())
    return db.scalars(statement).all()


@router.get("/summary")
def sales_summary(db: Session = Depends(get_db)):
    statement = select(
        func.count(Sale.id),
        func.coalesce(func.sum(Sale.quantity), 0),
        func.coalesce(func.sum(Sale.total_amount), 0),
    )

    result = db.execute(statement).one()

    return {
        "total_sales": result[0],
        "units_sold": result[1],
        "total_revenue": round(float(result[2]), 2),
    }