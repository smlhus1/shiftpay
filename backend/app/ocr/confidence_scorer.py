"""
Confidence scoring for OCR results.
From ShiftSync.
"""
import re
from datetime import datetime
from typing import List

from app.models import Shift


def calculate_confidence(ocr_text: str, extracted_shifts: List[Shift]) -> float:
    score = 0.0
    if re.search(r"\b(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+\d{4}", ocr_text.lower()):
        score += 0.25
    if len(extracted_shifts) > 0:
        score += 0.25
    if len(ocr_text) > 0:
        clean_chars = len(re.findall(r"[a-zA-ZæøåÆØÅ0-9\s:.-]", ocr_text))
        score += (clean_chars / len(ocr_text)) * 0.30
    if len(extracted_shifts) > 0:
        valid = sum(1 for s in extracted_shifts if _validate_shift(s))
        score += (valid / len(extracted_shifts)) * 0.20
    return min(max(score, 0.0), 1.0)


def _validate_shift(shift: Shift) -> bool:
    try:
        parts = shift.date.split(".")
        if len(parts) != 3:
            return False
        day, month, year = map(int, parts)
        if not (1 <= day <= 31 and 1 <= month <= 12):
            return False
        start_parts = shift.start_time.split(":")
        end_parts = shift.end_time.split(":")
        if len(start_parts) != 2 or len(end_parts) != 2:
            return False
        sh, sm = int(start_parts[0]), int(start_parts[1])
        eh, em = int(end_parts[0]), int(end_parts[1])
        if not (0 <= sh < 24 and 0 <= sm < 60 and 0 <= eh < 24 and 0 <= em < 60):
            return False
        if shift.shift_type not in ("tidlig", "mellom", "kveld", "natt"):
            return False
        if not (0.0 <= shift.confidence <= 1.0):
            return False
        return True
    except (ValueError, AttributeError):
        return False


def assign_individual_confidences(shifts: List[Shift], ocr_text: str) -> List[Shift]:
    for shift in shifts:
        conf = 0.7
        if shift.date.replace(".", "") in ocr_text.replace(" ", ""):
            conf += 0.1
        if re.search(rf"{re.escape(shift.start_time)}\s*-\s*{re.escape(shift.end_time)}", ocr_text):
            conf += 0.1
        shift.confidence = min(max(conf, 0.0), 1.0)
    return shifts
