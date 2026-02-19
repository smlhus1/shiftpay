"""
Claude Vision-based OCR processor for shift schedules.
Uses Anthropic Messages API (Haiku 4.5).
"""
import base64
import io
import json
import logging
from pathlib import Path
from typing import List, Tuple

from anthropic import Anthropic, APIError, RateLimitError
from pydantic import ValidationError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
from PIL import Image

from app.config import settings
from app.models import Shift

logger = logging.getLogger("shiftpay")

SUPPORTED_MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

SYSTEM_MESSAGE = (
    "Du er en presis OCR-assistent spesialisert på norske vaktplaner. "
    "Din oppgave er å ekstrahere vakter fra bilder av arbeidsplaner. "
    "Du returnerer ALLTID valid JSON. Hvis du ikke kan lese bildet eller finner ingen vakter, "
    'returner {"shifts": [], "notes": "beskrivelse av problemet"}. '
    "Vær EKSTREMT nøyaktig med tall - skill mellom 1/7, 3/8, 6/0 osv."
)

USER_PROMPT = """Ekstraher ALLE vakter fra denne vaktplanen.

Returner JSON med denne strukturen:
{
    "shifts": [
        {
            "date": "DD.MM.YYYY",
            "start_time": "HH:MM",
            "end_time": "HH:MM",
            "shift_type": "tidlig|mellom|kveld|natt",
            "confidence": 0.0-1.0
        }
    ],
    "notes": null
}

Regler for shift_type (basert på starttid):
- "tidlig": 06:00-11:59
- "mellom": 12:00-15:59
- "kveld": 16:00-21:59
- "natt": 22:00-05:59 eller krysser midnatt

Datoformat ALLTID DD.MM.YYYY. Tidsformat ALLTID HH:MM. Returner BARE JSON."""


class VisionProcessor:
    MAX_RAW_SIZE = 2 * 1024 * 1024
    MAX_DIMENSION = 2048

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("Anthropic API key is required for Vision processing")
        self.client = Anthropic(api_key=api_key)

    def process_image(self, image_path: str, debug: bool = False) -> Tuple[List[Shift], float]:
        image_data, mime_type = self._encode_image(image_path)
        try:
            data = self._call_vision_api(image_data, mime_type, debug)
            shifts_data = data.get("shifts", [])
            shifts = []
            for shift_data in shifts_data:
                try:
                    conf = min(max(float(shift_data.get("confidence", 0.85)), 0.0), 1.0)
                    shifts.append(Shift(
                        date=shift_data["date"],
                        start_time=shift_data["start_time"],
                        end_time=shift_data["end_time"],
                        shift_type=shift_data["shift_type"],
                        confidence=conf,
                    ))
                except (KeyError, ValueError, ValidationError):
                    continue
            overall = sum(s.confidence for s in shifts) / len(shifts) if shifts else 0.0
            return shifts, overall
        except json.JSONDecodeError as e:
            raise ValueError(f"Vision API returned invalid JSON: {e}") from e
        except (RateLimitError, APIError) as e:
            raise ValueError(f"Vision API unavailable after retries: {e}") from e

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((RateLimitError, APIError)),
        reraise=True,
    )
    def _call_vision_api(self, image_data: str, mime_type: str, debug: bool) -> dict:
        response = self.client.messages.create(
            model=settings.anthropic_model,
            max_tokens=4000,
            system=SYSTEM_MESSAGE,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": USER_PROMPT},
                    ],
                },
            ],
        )
        if not response.content or response.content[0].type != "text":
            raise ValueError("Vision API returned empty or non-text response")
        content = response.content[0].text
        if not content or not content.strip():
            raise ValueError("Vision API returned empty response")
        return json.loads(content)

    def _encode_image(self, image_path: str) -> Tuple[str, str]:
        path = Path(image_path)
        mime_type = SUPPORTED_MIME_TYPES.get(path.suffix.lower(), "image/jpeg")
        if path.stat().st_size > self.MAX_RAW_SIZE:
            image = Image.open(image_path)
            if max(image.size) > self.MAX_DIMENSION:
                image.thumbnail((self.MAX_DIMENSION, self.MAX_DIMENSION), Image.LANCZOS)
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=85, optimize=True)
            buf.seek(0)
            return base64.b64encode(buf.read()).decode("utf-8"), "image/jpeg"
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8"), mime_type
