
import base64
import logging
import os
import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import MpesaPayment, Product, Sale, StockMovement


# Load the .env file from the project root:
# StockPilot/.env
PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env", override=False)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mpesa", tags=["M-PESA"])


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def setting(name: str) -> str:
    value = os.getenv(name, "").strip()

    if not value:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Missing server configuration: {name}",
        )

    return value


def daraja_base_url() -> str:
    environment = os.getenv(
        "MPESA_ENVIRONMENT", "sandbox"
    ).strip().lower()

    if environment == "sandbox":
        return "https://sandbox.safaricom.co.ke"

    if environment == "production":
        return "https://api.safaricom.co.ke"

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="MPESA_ENVIRONMENT must be sandbox or production.",
    )


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------

class STKPushRequest(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    phone_number: str = Field(min_length=10, max_length=15)


def normalize_phone(phone_number: str) -> str:
    """Normalize common Kenyan mobile formats to 2547XXXXXXXX or 2541XXXXXXXX."""
    digits = re.sub(r"\D", "", phone_number)

    if digits.startswith("254") and len(digits) == 12:
        normalized = digits
    elif digits.startswith("0") and len(digits) == 10:
        normalized = "254" + digits[1:]
    elif len(digits) == 9 and digits.startswith(("7", "1")):
        normalized = "254" + digits
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a valid Kenyan mobile number, e.g. 0712345678.",
        )

    if not re.fullmatch(r"254[17]\d{8}", normalized):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a valid Kenyan mobile number.",
        )

    return normalized


def money(value: Any) -> Decimal:
    return Decimal(str(value)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


# ---------------------------------------------------------------------------
# Daraja authentication
# ---------------------------------------------------------------------------

async def get_access_token(client: httpx.AsyncClient) -> str:
    consumer_key = setting("MPESA_CONSUMER_KEY")
    consumer_secret = setting("MPESA_CONSUMER_SECRET")

    credentials = base64.b64encode(
        f"{consumer_key}:{consumer_secret}".encode("utf-8")
    ).decode("utf-8")

    url = (
        f"{daraja_base_url()}"
        "/oauth/v1/generate?grant_type=client_credentials"
    )

    try:
        response = await client.get(
            url,
            headers={"Authorization": f"Basic {credentials}"},
        )
    except httpx.HTTPError:
        logger.exception("Could not connect to Daraja OAuth endpoint")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to Daraja authentication service.",
        )

    if not response.is_success:
        logger.error(
            "Daraja OAuth failed: HTTP %s; response: %s",
            response.status_code,
            response.text[:2000],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Daraja authentication failed.",
                "daraja_status": response.status_code,
                "daraja_response": response.text[:2000],
            },
        )

    try:
        data = response.json()
        token = data.get("access_token")
    except ValueError:
        token = None

    if not token:
        logger.error("Daraja OAuth response did not contain an access token.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Daraja authentication returned an invalid response.",
        )

    return token


# ---------------------------------------------------------------------------
# Initiate STK Push
# ---------------------------------------------------------------------------

@router.post("/stk-push", status_code=status.HTTP_200_OK)
async def initiate_stk_push(
    payment_request: STKPushRequest,
    db: Session = Depends(get_db),
):
    product = db.get(Product, payment_request.product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    if product.quantity < payment_request.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock available.",
        )

    phone_number = normalize_phone(payment_request.phone_number)

    amount_decimal = money(
        Decimal(str(product.price)) * payment_request.quantity
    )

    # Daraja STK Push expects an integer KES amount.
    amount = int(
        amount_decimal.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )

    if amount < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The payment amount must be at least KSh 1.",
        )

    payment = MpesaPayment(
        product_id=product.id,
        quantity=payment_request.quantity,
        phone_number=phone_number,
        amount=float(amount),
        status="initiating",
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    try:
        shortcode = setting("MPESA_SHORTCODE")
        passkey = setting("MPESA_PASSKEY")
        callback_url = setting("MPESA_CALLBACK_URL")

        # Do not silently fall back to CustomerBuyGoodsOnline.
        transaction_type = setting("MPESA_TRANSACTION_TYPE")

        logger.info(
            "M-PESA environment: %s",
            os.getenv("MPESA_ENVIRONMENT", "sandbox").strip().lower(),
        )
        logger.info(
            "M-PESA transaction type: %s",
            transaction_type,
        )

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        password = base64.b64encode(
            f"{shortcode}{passkey}{timestamp}".encode("utf-8")
        ).decode("utf-8")

        async with httpx.AsyncClient(timeout=30.0) as client:
            token = await get_access_token(client)

            payload = {
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": transaction_type,
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": shortcode,
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url,
                "AccountReference": f"PHANVEX-{payment.id}",
                "TransactionDesc": "Phanvex product purchase",
            }

            try:
                response = await client.post(
                    f"{daraja_base_url()}/mpesa/stkpush/v1/processrequest",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
            except httpx.HTTPError:
                logger.exception(
                    "Network error during Daraja STK Push for payment ID %s",
                    payment.id,
                )

                payment.status = "failed"
                payment.result_description = (
                    "Could not connect to Daraja STK Push service."
                )
                db.commit()

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Could not connect to Daraja STK Push service.",
                )

        if not response.is_success:
            logger.error(
                "Daraja STK Push failed for payment ID %s: "
                "HTTP %s; response: %s",
                payment.id,
                response.status_code,
                response.text[:2000],
            )

            payment.status = "failed"
            payment.result_description = (
                f"Daraja HTTP {response.status_code}: "
                f"{response.text[:1000]}"
            )
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": "Daraja STK Push request failed.",
                    "payment_id": payment.id,
                    "daraja_status": response.status_code,
                    "daraja_response": response.text[:2000],
                },
            )

        try:
            data = response.json()
        except ValueError:
            logger.error(
                "Daraja returned invalid JSON for payment ID %s",
                payment.id,
            )

            payment.status = "failed"
            payment.result_description = "Invalid response from Daraja."
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Daraja returned an invalid STK Push response.",
            )

        response_code = str(data.get("ResponseCode", ""))

        if response_code != "0":
            description = str(
                data.get("ResponseDescription")
                or data.get("errorMessage")
                or "Daraja did not accept the STK Push request."
            )

            logger.error(
                "Daraja rejected STK Push for payment ID %s: %s",
                payment.id,
                description[:1000],
            )

            payment.status = "failed"
            payment.result_description = description[:1000]
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": "Daraja rejected the STK Push request.",
                    "payment_id": payment.id,
                    "daraja_response": data,
                },
            )

        payment.checkout_request_id = data.get("CheckoutRequestID")
        payment.merchant_request_id = data.get("MerchantRequestID")
        payment.status = "pending"
        payment.result_description = data.get("ResponseDescription")

        db.commit()
        db.refresh(payment)

        return {
            "payment_id": payment.id,
            "status": payment.status,
            "amount": payment.amount,
            "checkout_request_id": payment.checkout_request_id,
            "merchant_request_id": payment.merchant_request_id,
            "message": (
                data.get("CustomerMessage")
                or data.get("ResponseDescription")
                or "STK Push request accepted. Check your phone."
            ),
        }

    except HTTPException:
        raise

    except Exception:
        db.rollback()

        logger.exception(
            "Unexpected error while initiating M-PESA payment ID %s",
            payment.id,
        )

        try:
            failed_payment = db.get(MpesaPayment, payment.id)

            if failed_payment and failed_payment.status == "initiating":
                failed_payment.status = "failed"
                failed_payment.result_description = (
                    "Unexpected error while initiating payment."
                )
                db.commit()

        except Exception:
            db.rollback()
            logger.exception(
                "Could not update failed payment ID %s",
                payment.id,
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not initiate the M-PESA payment.",
        )


# ---------------------------------------------------------------------------
# Daraja callback
# ---------------------------------------------------------------------------

@router.post("/callback")
async def mpesa_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        body = await request.json()
    except Exception:
        logger.exception("M-PESA callback did not contain valid JSON")
        return {"ResultCode": 0, "ResultDesc": "Callback received"}

    callback = (
        body.get("Body", {})
        .get("stkCallback", {})
    )

    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = callback.get("ResultCode")
    result_description = callback.get("ResultDesc", "")

    if not checkout_request_id:
        logger.error("M-PESA callback is missing CheckoutRequestID")
        return {"ResultCode": 0, "ResultDesc": "Callback received"}

    try:
        statement = (
            select(MpesaPayment)
            .where(
                MpesaPayment.checkout_request_id == checkout_request_id
            )
            .with_for_update()
        )

        payment = db.scalars(statement).first()

        if payment is None:
            logger.error(
                "No payment found for callback CheckoutRequestID %s",
                checkout_request_id,
            )
            return {"ResultCode": 0, "ResultDesc": "Callback received"}

        # Avoid creating duplicate sales from repeated callbacks.
        if payment.status in ("success", "failed"):
            return {
                "ResultCode": 0,
                "ResultDesc": "Callback already processed",
            }

        payment.result_code = str(result_code)
        payment.result_description = str(result_description)[:1000]

        if str(result_code) != "0":
            payment.status = "failed"
            db.commit()
            return {"ResultCode": 0, "ResultDesc": "Callback processed"}

        metadata_items = (
            callback.get("CallbackMetadata", {}).get("Item", [])
        )

        metadata = {
            item.get("Name"): item.get("Value")
            for item in metadata_items
            if isinstance(item, dict) and item.get("Name")
        }

        receipt_number = metadata.get("MpesaReceiptNumber")
        callback_amount = metadata.get("Amount")
        callback_phone = metadata.get("PhoneNumber")

        if not receipt_number or callback_amount is None:
            payment.status = "review"
            payment.result_description = (
                "Successful callback is missing receipt or amount metadata."
            )
            db.commit()
            return {"ResultCode": 0, "ResultDesc": "Callback received"}

        if money(callback_amount) != money(payment.amount):
            payment.status = "review"
            payment.result_description = (
                "Callback amount does not match the recorded payment amount."
            )
            db.commit()
            return {"ResultCode": 0, "ResultDesc": "Callback received"}

        if callback_phone is not None:
            if str(callback_phone) != payment.phone_number:
                payment.status = "review"
                payment.result_description = (
                    "Callback phone number does not match the payment."
                )
                db.commit()
                return {"ResultCode": 0, "ResultDesc": "Callback received"}

        product_statement = (
            select(Product)
            .where(Product.id == payment.product_id)
            .with_for_update()
        )

        product = db.scalars(product_statement).first()

        if product is None:
            payment.status = "review"
            payment.result_description = (
                "Product not found while processing successful payment."
            )
            db.commit()
            return {"ResultCode": 0, "ResultDesc": "Callback received"}

        if product.quantity < payment.quantity:
            payment.status = "review"
            payment.result_description = (
                "Payment succeeded, but there is insufficient stock. "
                "Manual reconciliation is required."
            )
            db.commit()
            return {"ResultCode": 0, "ResultDesc": "Callback received"}

        unit_price = (
            money(payment.amount) / Decimal(payment.quantity)
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        sale = Sale(
            product_id=product.id,
            quantity=payment.quantity,
            unit_price=float(unit_price),
            total_amount=float(money(payment.amount)),
            payment_method="mpesa",
        )

        movement = StockMovement(
            product_id=product.id,
            movement_type="stock_out",
            quantity=payment.quantity,
            reason=f"M-PESA sale recorded: {payment.quantity} units",
        )

        product.quantity -= payment.quantity
        db.add_all([sale, movement])
        db.flush()

        payment.sale_id = sale.id
        payment.mpesa_receipt_number = str(receipt_number)
        payment.status = "success"
        payment.result_description = "Payment completed successfully."

        db.commit()

        return {"ResultCode": 0, "ResultDesc": "Callback processed"}

    except Exception:
        db.rollback()

        logger.exception(
            "Error processing M-PESA callback for checkout ID %s",
            checkout_request_id,
        )

        # Any payment requiring local reconciliation should be investigated.
        return {"ResultCode": 0, "ResultDesc": "Callback received"}


# ---------------------------------------------------------------------------
# Payment status endpoint
# ---------------------------------------------------------------------------

@router.get("/status/{payment_id}")
def get_payment_status(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.get(MpesaPayment, payment_id)

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found.",
        )

    return {
        "payment_id": payment.id,
        "status": payment.status,
        "amount": payment.amount,
        "sale_id": payment.sale_id,
        "receipt_number": payment.mpesa_receipt_number,
        "message": payment.result_description,
    }
