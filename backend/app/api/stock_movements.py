from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Product, StockMovement
from app.schemas.stock_movement import (
    StockMovementCreate,
    StockMovementResponse,
)

router = APIRouter(
    prefix="/stock-movements",
    tags=["Stock Movements"],
)


@router.post(
    "/",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_stock_movement(
    movement_data: StockMovementCreate,
    db: Session = Depends(get_db),
):
    product = db.get(Product, movement_data.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    if movement_data.movement_type == "stock_out":
        if product.quantity < movement_data.quantity:
            raise HTTPException(
                status_code=400,
                detail="Insufficient stock available.",
            )

        product.quantity -= movement_data.quantity

    else:
        product.quantity += movement_data.quantity

    movement = StockMovement(**movement_data.model_dump())
    db.add(movement)

    try:
        db.commit()
        db.refresh(movement)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the stock movement.",
        )

    return movement


@router.get(
    "/",
    response_model=list[StockMovementResponse],
)
def list_stock_movements(
    db: Session = Depends(get_db),
):
    statement = (
        select(StockMovement)
        .order_by(StockMovement.created_at.desc())
    )

    return db.scalars(statement).all()