"""
main.py - MoneyMind FastAPI Application Entry Point

Bootstraps the FastAPI app, configures CORS, loads ONNX models on startup,
and mounts all routers.
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator

import onnxruntime as ort
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Environment & logging
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("moneymind")

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Paths to ONNX model files (may not exist yet)
BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
RISK_ONNX_PATH = MODELS_DIR / "risk_model.onnx" if (MODELS_DIR / "risk_model.onnx").exists() else MODELS_DIR / "risk_classifier.onnx"
HYPE_ONNX_PATH = MODELS_DIR / "hype_model.onnx" if (MODELS_DIR / "hype_model.onnx").exists() else MODELS_DIR / "hype_classifier.onnx"
RISK_SCALER_PATH = MODELS_DIR / "risk_scaler.json"


def load_models_into_state(app: FastAPI) -> None:
    """Load ONNX models into app.state.models (with graceful fallback)."""
    models: dict[str, Any] = {"risk": None, "hype": None}
    scaler_params: dict[str, Any] = {}

    # --- Risk model ---
    risk_path = MODELS_DIR / "risk_model.onnx"
    if not risk_path.exists():
        risk_path = MODELS_DIR / "risk_classifier.onnx"

    if risk_path.exists():
        try:
            models["risk"] = ort.InferenceSession(
                str(risk_path),
                providers=["CPUExecutionProvider"],
            )
            logger.info("✅ Risk ONNX model loaded from %s", risk_path)
        except Exception as exc:
            logger.warning("⚠️  Failed to load risk ONNX model: %s", exc)
    else:
        logger.warning(
            "⚠️  Risk ONNX model not found in %s — running in fallback mode.",
            MODELS_DIR,
        )

    # --- Hype model ---
    hype_path = MODELS_DIR / "hype_model.onnx"
    if not hype_path.exists():
        hype_path = MODELS_DIR / "hype_classifier.onnx"

    if hype_path.exists():
        try:
            models["hype"] = ort.InferenceSession(
                str(hype_path),
                providers=["CPUExecutionProvider"],
            )
            logger.info("✅ Hype ONNX model loaded from %s", hype_path)
        except Exception as exc:
            logger.warning("⚠️  Failed to load hype ONNX model: %s", exc)
    else:
        logger.warning(
            "⚠️  Hype ONNX model not found in %s — running in fallback mode.",
            MODELS_DIR,
        )

    # --- Risk scaler params ---
    if RISK_SCALER_PATH.exists():
        try:
            with open(RISK_SCALER_PATH, "r", encoding="utf-8-sig") as fh:
                scaler_params = json.load(fh)
            logger.info("✅ Risk scaler params loaded.")
        except Exception as exc:
            logger.warning("⚠️  Failed to load risk scaler params: %s", exc)

    app.state.models = models
    app.state.scaler_params = scaler_params


# ---------------------------------------------------------------------------
# Lifespan: model loading on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Load ONNX models into app.state.models at startup (graceful fallback)."""
    load_models_into_state(app)
    logger.info(
        "🚀 MoneyMind API started — risk_model=%s, hype_model=%s",
        "loaded" if app.state.models["risk"] else "fallback",
        "loaded" if app.state.models["hype"] else "fallback",
    )

    yield  # Application runs here

    logger.info("👋 MoneyMind API shutting down.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FundBee API",
    description="Financial literacy backend — risk scoring, hype detection, and coaching.",
    version="0.1.0",
    lifespan=lifespan,
)

# Initialize immediately for test clients and direct imports
load_models_into_state(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from routers import coach, document, explain, hype, price, risk  # noqa: E402

app.include_router(explain.router, prefix="/explain", tags=["Explain"])
app.include_router(risk.router, prefix="/risk-score", tags=["Risk"])
app.include_router(hype.router, prefix="/hype-score", tags=["Hype"])
app.include_router(coach.router, prefix="/coach", tags=["Coach"])
app.include_router(price.router, prefix="/price", tags=["Price"])
app.include_router(price.router, prefix="/api/price", tags=["Price"])
app.include_router(document.router, prefix="/document", tags=["Document"])
app.include_router(document.router, prefix="/api/document", tags=["Document"])


# ---------------------------------------------------------------------------
# Root & health
# ---------------------------------------------------------------------------
@app.get("/", tags=["Meta"])
async def root() -> dict[str, str]:
    """API root — basic identification."""
    return {"name": "FundBee API", "version": "0.1.0", "status": "running"}


@app.get("/health", tags=["Meta"])
async def health() -> dict[str, Any]:
    """Health check — reports model load status."""
    models: dict[str, Any] = getattr(app.state, "models", {"risk": None, "hype": None})
    return {
        "status": "ok",
        "models": {
            "risk": "loaded" if models.get("risk") is not None else "fallback",
            "hype": "loaded" if models.get("hype") is not None else "fallback",
        },
    }
