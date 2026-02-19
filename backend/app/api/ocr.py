"""
Stateless OCR endpoint: accept image, return shifts. No storage.
"""
import asyncio
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import OcrResponse, Shift
from app.ocr.confidence_scorer import assign_individual_confidences, calculate_confidence
from app.ocr.processor import VaktplanProcessor
from app.ocr.vision_processor import VisionProcessor
from app.security import limiter, validate_file

logger = logging.getLogger("shiftpay")

router = APIRouter()


@router.post("/ocr", response_model=OcrResponse)
@limiter.limit("10/minute")
async def post_ocr(request: Request, file: UploadFile = File(...)):
    """
    Process a timesheet image. Returns extracted shifts and confidence.
    Stateless: nothing is stored.
    """
    try:
        content = await validate_file(file)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("File validation failed: %s", e)
        raise HTTPException(status_code=400, detail="File validation failed")

    suffix = Path(file.filename or "image").suffix.lower() or ".jpg"
    if suffix not in (".jpg", ".jpeg", ".png", ".pdf"):
        suffix = ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Try Claude Vision first if key is set
        if settings.anthropic_api_key:
            try:
                proc = VisionProcessor(api_key=settings.anthropic_api_key)
                shifts, confidence = await asyncio.to_thread(
                    proc.process_image, tmp_path, settings.environment == "development"
                )
                return OcrResponse(shifts=shifts, confidence=confidence, method="claude-vision")
            except Exception as e:
                logger.warning("Claude Vision failed, falling back to Tesseract: %s", e)

        # Tesseract
        processor = VaktplanProcessor(
            tesseract_path=settings.tesseract_path,
            language=settings.ocr_language,
        )
        shifts, confidence, ocr_text = await asyncio.to_thread(
            processor.process_image, tmp_path, settings.environment == "development"
        )
        if shifts:
            shifts = assign_individual_confidences(shifts, ocr_text)
            confidence = calculate_confidence(ocr_text, shifts)
        return OcrResponse(shifts=shifts, confidence=confidence, method="tesseract")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail="OCR engine not available") from e
    finally:
        Path(tmp_path).unlink(missing_ok=True)
