"""
OCR processor for shift schedule images.
From ShiftSync; Tesseract-based.
"""
import logging
from typing import List, Tuple
from PIL import Image, ImageFilter, ImageOps
import pytesseract
import re
from pathlib import Path

from app.models import Shift

logger = logging.getLogger("shiftpay")


class VaktplanProcessor:
    """Main processor for shift schedule OCR."""

    MONTH_NAMES = {
        "januar": 1, "februar": 2, "mars": 3, "april": 4,
        "mai": 5, "juni": 6, "juli": 7, "august": 8,
        "september": 9, "oktober": 10, "november": 11, "desember": 12,
    }

    def __init__(self, tesseract_path: str, language: str = "nor"):
        self.tesseract_path = tesseract_path
        self.language = language
        if not Path(tesseract_path).exists():
            raise FileNotFoundError(
                f"Tesseract not found at: {tesseract_path}. "
                "Install from https://github.com/UB-Mannheim/tesseract/wiki"
            )
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

    TESSERACT_CONFIG = "--psm 6 --oem 3"

    def process_image(self, image_path: str, debug: bool = False) -> Tuple[List[Shift], float, str]:
        image = self._improve_image(image_path)
        ocr_text = pytesseract.image_to_string(
            image, lang=self.language, config=self.TESSERACT_CONFIG
        )
        if debug:
            logger.debug("OCR text (first 200 chars): %s...", ocr_text[:200])
        shifts = self._extract_shifts(ocr_text, debug=debug)
        from app.ocr.confidence_scorer import calculate_confidence
        confidence = calculate_confidence(ocr_text, shifts)
        return shifts, confidence, ocr_text

    def _improve_image(self, image_path: str) -> Image.Image:
        image = Image.open(image_path)
        image = image.convert("L")
        width, height = image.size
        if width < 1500:
            image = image.resize((width * 2, height * 2), Image.LANCZOS)
        image = image.filter(ImageFilter.MedianFilter(size=3))
        image = ImageOps.autocontrast(image, cutoff=1)
        image = image.filter(ImageFilter.SHARPEN)
        threshold = self._otsu_threshold(image)
        image = image.point(lambda x: 0 if x < threshold else 255, "1")
        return image

    @staticmethod
    def _otsu_threshold(image: Image.Image) -> int:
        histogram = image.histogram()
        total = sum(histogram)
        weight_sum = sum(i * histogram[i] for i in range(256))
        cum_count = 0
        cum_weight = 0
        max_variance = 0
        threshold = 128
        for i in range(256):
            cum_count += histogram[i]
            if cum_count == 0:
                continue
            bg = cum_count
            fg = total - cum_count
            if fg == 0:
                break
            cum_weight += i * histogram[i]
            mean_bg = cum_weight / bg
            mean_fg = (weight_sum - cum_weight) / fg
            variance = bg * fg * (mean_bg - mean_fg) ** 2
            if variance > max_variance:
                max_variance = variance
                threshold = i
        return threshold

    def _extract_shifts(self, ocr_text: str, debug: bool = False) -> List[Shift]:
        text_lower = ocr_text.lower()
        month_year_pattern = r"(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember) (\d{4})"
        month_year_matches = list(re.finditer(month_year_pattern, text_lower))
        if not month_year_matches:
            return []
        sections = []
        for i, match in enumerate(month_year_matches):
            month_name, year = match.groups()
            month_num = self.MONTH_NAMES.get(month_name)
            if not month_num:
                continue
            start_pos = match.end()
            end_pos = month_year_matches[i + 1].start() if i + 1 < len(month_year_matches) else len(text_lower)
            sections.append({"month": month_num, "year": year, "start_pos": start_pos, "end_pos": end_pos, "month_name": month_name})
        shift_pattern = r"(?:mandag|tirsdag|onsdag|torsdag|fredag|l.rdag|.rdag|søndag|s.ndag)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s{0,20}(\d\s+\d|\d{1,2})"
        shift_matches = re.finditer(shift_pattern, text_lower)
        shifts = []
        seen_shifts = set()
        for match in shift_matches:
            start_hour, start_min, end_hour, end_min, day = match.groups()
            match_pos = match.start()
            try:
                sh, sm = int(start_hour), int(start_min)
                eh, em = int(end_hour), int(end_min)
                if not (0 <= sh <= 23 and 0 <= sm <= 59 and 0 <= eh <= 23 and 0 <= em <= 59):
                    continue
            except ValueError:
                continue
            current = next((s for s in sections if s["start_pos"] <= match_pos < s["end_pos"]), sections[0])
            day = day.replace(" ", "")
            try:
                day_int = int(day)
                if not (1 <= day_int <= 31):
                    continue
            except ValueError:
                continue
            date = f"{day.zfill(2)}.{str(current['month']).zfill(2)}.{current['year']}"
            start_time = f"{start_hour.zfill(2)}:{start_min}"
            end_time = f"{end_hour.zfill(2)}:{end_min}"
            shift_key = f"{date}_{start_time}_{end_time}"
            if shift_key in seen_shifts:
                continue
            seen_shifts.add(shift_key)
            shift_type = self._determine_shift_type(start_time, end_time)
            shifts.append(Shift(date=date, start_time=start_time, end_time=end_time, shift_type=shift_type, confidence=1.0))
        return shifts

    def _determine_shift_type(self, start_time: str, end_time: str) -> str:
        start_hour = int(start_time.split(":")[0])
        end_hour = int(end_time.split(":")[0])
        if start_hour >= 20 or start_hour < 6:
            if end_hour <= 10:
                return "natt"
        if 6 <= start_hour < 12:
            return "tidlig"
        if 12 <= start_hour < 16:
            return "mellom"
        if 16 <= start_hour < 22:
            return "kveld"
        return "natt"
