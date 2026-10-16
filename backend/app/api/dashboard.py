from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.sale import Sale


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Return the main inventory and sales statistics."""

    total_products = (
        db.query(func.count(Product.id)).scalar() or 0
    )

    total_units_in_stock = (
        db.query(func.coalesce(func.sum(Product.quantity), 0)).scalar()
        or 0
    )

    low_stock_products = (
        db.query(func.count(Product.id))
        .filter(Product.quantity <= 5)
        .scalar()
        or 0
    )

    total_sales = (
        db.query(func.count(Sale.id)).scalar() or 0
    )

    total_revenue = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
        or 0
    )

    return {
        "total_products": total_products,
        "total_units_in_stock": total_units_in_stock,
        "low_stock_products": low_stock_products,
        "total_sales": total_sales,
        "total_revenue": float(total_revenue),
    }


@router.get("/sales-chart", response_model=dict)
def get_sales_chart(
    period: Literal["Weekly", "Monthly", "Yearly"] = Query(
        default="Weekly"
    ),
    db: Session = Depends(get_db),
):
    """Return recorded sales grouped by the selected time period."""

    today = date.today()

    if period == "Weekly":
        # Monday through Sunday of the current week.
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)

        labels = [
            (start_date + timedelta(days=i)).strftime("%a")
            for i in range(7)
        ]

        label_dates = [
            start_date + timedelta(days=i)
            for i in range(7)
        ]

        average_label = "Average per day"

    elif period == "Monthly":
        # All days in the current calendar month, grouped by week.
        start_date = today.replace(day=1)

        if today.month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, today.month + 1, 1)

        end_date = next_month - timedelta(days=1)

        number_of_weeks = ((end_date.day - 1) // 7) + 1
        labels = [
            f"Week {i + 1}" for i in range(number_of_weeks)
        ]

        label_dates = [
            start_date + timedelta(days=i * 7)
            for i in range(number_of_weeks)
        ]

        average_label = "Average per week"

    else:
        # January through December of the current calendar year.
        start_date = date(today.year, 1, 1)
        end_date = date(today.year, 12, 31)

        labels = [
            date(today.year, month, 1).strftime("%b")
            for month in range(1, 13)
        ]

        label_dates = [
            date(today.year, month, 1)
            for month in range(1, 13)
        ]

        average_label = "Average per month"

    start_datetime = datetime.combine(start_date, time.min)
    end_datetime = datetime.combine(
        end_date + timedelta(days=1), time.min
    )

    sales_records = (
        db.query(Sale.created_at, Sale.total_amount)
        .filter(Sale.created_at >= start_datetime)
        .filter(Sale.created_at < end_datetime)
        .all()
    )

    sales_totals = {label: 0.0 for label in labels}

    for created_at, amount in sales_records:
        if created_at is None:
            continue

        sale_date = created_at.date()

        if period == "Weekly":
            if start_date <= sale_date <= end_date:
                index = (sale_date - start_date).days
                label = labels[index]
            else:
                continue

        elif period == "Monthly":
            if start_date <= sale_date <= end_date:
                index = (sale_date.day - 1) // 7
                label = labels[index]
            else:
                continue

        else:
            if sale_date.year == today.year:
                label = labels[sale_date.month - 1]
            else:
                continue

        sales_totals[label] += float(amount or 0)

    chart_data = [
        {
            "label": label,
            "sales": round(sales_totals[label], 2),
        }
        for label in labels
    ]

    total_revenue = sum(sales_totals.values())
    number_of_periods = len(labels)
    average_revenue = (
        total_revenue / number_of_periods
        if number_of_periods
        else 0
    )

    return {
        "period": period,
        "data": chart_data,
        "total": round(total_revenue, 2),
        "average": round(average_revenue, 2),
        "average_label": average_label,
    }