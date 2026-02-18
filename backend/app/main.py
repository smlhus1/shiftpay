"""
ShiftPay OCR API — stateless image-to-shifts.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import ocr
from app.config import settings
from app.security import limiter

logging.basicConfig(
    level=logging.DEBUG if settings.environment == "development" else logging.INFO,
    format="%(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("shiftpay")

app = FastAPI(
    title="ShiftPay API",
    description="Stateless OCR for shift schedule images",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    max_age=3600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    logger.error("Unhandled %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


@app.get("/")
async def root():
    return {
        "service": "ShiftPay API",
        "version": "0.1.0",
        "docs": "/docs" if settings.environment != "production" else None,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(ocr.router, prefix="/api", tags=["ocr"])
