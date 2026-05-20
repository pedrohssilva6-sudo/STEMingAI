# STEMingAI

Prototipo web do Laboratorio Vivo de Aprendizagem Estrutural, adaptado do escopo original pensado para Google AI Studio.

## O que esta implementado

- Dashboard de blocos com persistencia em `localStorage`.
- Criacao de bloco com geracao de etapas via Vertex AI.
- Workspace de etapa com chat lateral, simulacao SVG, painel de variaveis, inspector, timeline e teste de proficiencia.
- Motor `SceneSpec v0` no frontend: objetos, relacoes, invariantes, eventos de construcao e explicacoes contextuais.
- Demo funcional de `Proporcao e escala`.
- Backend FastAPI usando `langchain-google-vertexai`, com os mesmos nomes de variaveis do CorethicAI.
- Fallback deterministico quando Vertex AI falha ou ainda nao esta configurado.

## Vertex AI

O backend carrega variaveis nesta ordem:

1. `.env` na raiz do STEMingAI.
2. `backend/.env` no STEMingAI.
3. `/home/pedroh/Desktop/CorethicAI/backend/.env`.

Variaveis esperadas:

```bash
GCP_PROJECT_ID="seu-projeto-gcp"
GCP_LOCATION="us-central1"
GCP_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
VERTEX_FAST_MODEL="gemini-2.5-flash-lite"
VERTEX_DEEP_MODEL="gemini-2.5-pro"
VITE_SUPABASE_URL="https://tydtxkngmtkzpigenvwp.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_Bwu_auaTtXHQmhnTVIXFGw_YKpD795n"
```

Para habilitar persistencia remota de blocos, execute o SQL em `supabase/schema.sql` no SQL Editor do Supabase. Se a tabela ainda nao existir, o app cai automaticamente para `localStorage`.

## Deploy em um unico Web Service no Render

Use **Web Service**. O FastAPI serve a API e tambem os arquivos gerados em `dist/`.

Build command:

```bash
npm install && npm run build && pip install -r backend/requirements.txt
```

Start command:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Configure no Render as variaveis de ambiente do Vertex AI listadas acima.

## Rodar localmente

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8008
```

Se `python3 -m venv` falhar no Ubuntu/Debian, instale antes `python3.12-venv` ou use o ambiente Python do projeto que ja tenha as dependencias do `backend/requirements.txt`.

## Build

```bash
npm run build
python3 -m py_compile backend/app/*.py
```

## Preparacao para GitHub

A pasta ainda nao foi inicializada como repositório porque o remoto sera informado depois. Quando o repo existir:

```bash
git init
git add .
git commit -m "Initial STEMingAI prototype"
git remote add origin <repo>
git push -u origin main
```
