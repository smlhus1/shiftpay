"""Pydantic models for OCR request/response."""
from typing import Literal, List
from pydantic import BaseModel, Field

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"]

MIME_TO_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


class Shift(BaseModel):
    """A single work shift."""
    date: str = Field(..., pattern=r"^\d{2}\.\d{2}\.\d{4}$", description="DD.MM.YYYY")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM")
    shift_type: Literal["tidlig", "mellom", "kveld", "natt"]
    confidence: float = Field(..., ge=0.0, le=1.0)


class OcrResponse(BaseModel):
    """Response from OCR processing."""
    shifts: List[Shift]
    confidence: float = Field(..., ge=0.0, le=1.0)
    method: Literal["tesseract", "vision"]
