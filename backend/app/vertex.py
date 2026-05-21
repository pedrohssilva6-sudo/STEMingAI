from __future__ import annotations

import base64
import binascii
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
    raw_value = os.getenv("GCP_SERVICE_ACCOUNT_JSON")
    if not raw_value:
        return None
    try:
        service_account_info = _parse_service_account_json(raw_value)
        return service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    except Exception as exc:
        logging.error("Erro ao carregar GCP_SERVICE_ACCOUNT_JSON: %s", exc)
        return None


def _parse_service_account_json(raw_value: str) -> dict[str, Any]:
    value = raw_value.strip()
    if not value:
        raise ValueError("GCP_SERVICE_ACCOUNT_JSON esta vazio")

    if value.startswith("@"):
        return _load_service_account_file(value[1:])

    if value.startswith("/") or value.startswith("./") or value.startswith("../"):
        return _load_service_account_file(value)

    if value.startswith("{"):
        parsed = json.loads(value)
        return _validate_service_account_info(parsed, "GCP_SERVICE_ACCOUNT_JSON")

    try:
        unwrapped = json.loads(value)
        if isinstance(unwrapped, dict):
            return _validate_service_account_info(unwrapped, "GCP_SERVICE_ACCOUNT_JSON")
        if isinstance(unwrapped, str):
            return _parse_service_account_json(unwrapped)
    except json.JSONDecodeError:
        pass

    compact_value = "".join(value.split())
    try:
        decoded = base64.b64decode(compact_value, validate=True).decode("utf-8-sig")
    except (binascii.Error, UnicodeDecodeError) as exc:
        raise ValueError(
            "GCP_SERVICE_ACCOUNT_JSON deve ser o JSON puro da service account, "
            "um JSON escapado entre aspas, um base64 valido desse JSON, ou um caminho de arquivo"
        ) from exc

    parsed = json.loads(decoded)
    return _validate_service_account_info(parsed, "Base64 de GCP_SERVICE_ACCOUNT_JSON")


def _load_service_account_file(path_value: str) -> dict[str, Any]:
    path = Path(path_value).expanduser()
    parsed = json.loads(path.read_text(encoding="utf-8-sig"))
    return _validate_service_account_info(parsed, f"Arquivo de service account {path}")


def _validate_service_account_info(parsed: Any, source: str) -> dict[str, Any]:
    if not isinstance(parsed, dict):
        raise ValueError(f"{source} nao contem um objeto JSON")
    required = ["type", "project_id", "private_key", "client_email", "token_uri"]
    missing = [key for key in required if not parsed.get(key)]
    if missing:
        raise ValueError(f"{source} nao parece ser uma service account valida; faltando: {', '.join(missing)}")
    if parsed.get("type") != "service_account":
        raise ValueError(f"{source} precisa ter type=service_account")
    return parsed


def get_model(model: str | None = None, temperature: float = 0.2, max_tokens: int | None = 1800):
    project = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION", "us-central1")
    model_name = model or os.getenv("VERTEX_FAST_MODEL", "gemini-2.5-flash-lite")
    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "180"))
    if not project:
        raise RuntimeError("GCP_PROJECT_ID nao configurado")
    
    creds = _get_credentials()
    if not creds:
        logging.warning("Iniciando sem credenciais explicitas (tentando Application Default Credentials)")

    return ChatVertexAI(
        model_name=model_name,
        temperature=temperature,
        project=project,
        location=location,
        credentials=creds,
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


def repair_json(text: str, instruction: str = "Corrija para JSON valido.") -> Any:
    prompt = f"""
{instruction}
Retorne somente JSON valido, sem markdown e sem explicacao.
Conteudo a corrigir:
{text}
"""
    repaired = invoke_text(prompt, deep=True, temperature=0, max_tokens=5000)
    return extract_json(repaired)
