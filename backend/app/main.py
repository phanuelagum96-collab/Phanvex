from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import Product, StockMovement, Sale, BusinessSettings

from app.api.products import router as products_router
from app.api.stock_movements import router as stock_movements_router
from app.api.sales import router as sales_router
from app.api.dashboard import router as dashboard_router
from app.api.settings import router as settings_router
from app.api import mpesa

app = FastAPI(
    title="Phanvex API",
    description="Inventory and sales management backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router)
app.include_router(stock_movements_router)
app.include_router(sales_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(mpesa.router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Phanvex API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}