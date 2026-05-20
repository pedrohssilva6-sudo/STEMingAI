from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google.oauth2 import service_account
from langchain_google_vertexai import ChatVertexAI


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "backend" / ".env")
load_dotenv(Path("/home/pedroh/Desktop/CorethicAI/backend/.env"))


def _get_credentials():
    gcp_json_str = os.getenv("GCP_SERVICE_ACCOUNT_JSON")
    if not gcp_json_str:
        return None
    try:
        if not gcp_json_str.strip().startswith("{"):
            gcp_json_str = base64.b64decode(gcp_json_str).decode("utf-8")
        return service_account.Credentials.from_service_account_info(
            json.loads(gcp_json_str),
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    except Exception as exc:
        logging.exception("Erro ao carregar GCP_SERVICE_ACCOUNT_JSON: %s", exc)
        return None


def get_model(model: str | None = None, temperature: float = 0.2, max_tokens: int | None = 1800):
    project = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION", "us-central1")
    model_name = model or os.getenv("VERTEX_FAST_MODEL", "gemini-2.5-flash-lite")
    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "75"))
    if not project:
        raise RuntimeError("GCP_PROJECT_ID nao configurado")
    return ChatVertexAI(
        model_name=model_name,
        temperature=temperature,
        project=project,
        location=location,
        credentials=_get_credentials(),
        max_output_tokens=max_tokens,
        max_retries=1,
        timeout=timeout,
    )


def invoke_text(prompt: str, *, deep: bool = False, temperature: float = 0.2, max_tokens: int | None = 1800) -> str:
    model = os.getenv("VERTEX_DEEP_MODEL", "gemini-2.5-pro") if deep else os.getenv("VERTEX_FAST_MODEL", "gemini-2.5-flash-lite")
    response = get_model(model, temperature=temperature, max_tokens=max_tokens).invoke(prompt)
    return str(response.content).strip()


def extract_json(text: str) -> Any:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    start = min([idx for idx in [cleaned.find("{"), cleaned.find("[")] if idx >= 0], default=-1)
    if start > 0:
        cleaned = cleaned[start:]
    end_obj = cleaned.rfind("}")
    end_arr = cleaned.rfind("]")
    end = max(end_obj, end_arr)
    if end >= 0:
        cleaned = cleaned[: end + 1]
    return json.loads(cleaned)

