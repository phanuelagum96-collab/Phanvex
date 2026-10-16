from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from models.settings import BusinessSettings
from app.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_settings(db: Session) -> BusinessSettings:
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.id == 1)
        .first()
    )

    if settings is None:
        settings = BusinessSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.get("/", response_model=SettingsResponse)
def read_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("/", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
):
    settings = get_or_create_settings(db)

    for field, value in payload.model_dump().items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    return settings