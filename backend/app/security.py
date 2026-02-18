"""Rate limiting and file validation."""
import hashlib
import logging
from typing import Optional

from fastapi import Request, HTTPException, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.models import ALLOWED_MIME_TYPES

logger = logging.getLogger("shiftpay")


def _key_func(request: Request) -> str:
    ip = get_remote_address(request)
    ua = request.headers.get("user-agent", "unknown")
    return f"{ip}:{hashlib.sha256(ua.encode()).hexdigest()[:8]}"


limiter = Limiter(
    key_func=_key_func,
    enabled=settings.environment != "development",
)


def _magic_signatures() -> dict[str, list[str]]:
    return {
        "image/jpeg": ["ffd8ffe0", "ffd8ffe1", "ffd8ffe2", "ffd8ffe3"],
        "image/png": ["89504e47"],
    }


async def validate_file(file: UploadFile) -> bytes:
    """Validate uploaded file: size, type, magic bytes. Returns content."""
    content = await file.read()
    size = len(content)
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max: {settings.max_file_size_mb}MB",
        )
    if size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    content_type = (file.content_type or "").strip().lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type: {content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    if len(content) < 4:
        raise HTTPException(status_code=400, detail="File too small")
    header = content[:4].hex()
    sigs = _magic_signatures().get(content_type, [])
    if not any(header.startswith(s) for s in sigs):
        raise HTTPException(
            status_code=400,
            detail="File signature does not match declared type.",
        )
    return content
