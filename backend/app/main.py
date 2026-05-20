from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .fallbacks import DEMO_TEST
from .vertex import extract_json, invoke_text, repair_json


app = FastAPI(title="STEMingAI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(__file__).resolve().parents[2]
DIST_DIR = ROOT_DIR / "dist"

SYSTEM_SCOPE = """
Voce e o tutor estrutural do STEMingAI. Ensine matematica, ciencias naturais e computacao por objetos,
variaveis, relacoes, operacoes, invariantes, eventos e limitacoes do modelo. Nao transforme a experiencia
em chatbot generico. Quando gerar JSON, retorne apenas JSON valido.
"""


class BlockRequest(BaseModel):
    topic: str
    goal: str
    level: str = "iniciante"


class SceneRequest(BaseModel):
    topic: str
    stage_title: str
    stage_goal: str


class ChatRequest(BaseModel):
    message: str
    scene: dict[str, Any] = Field(default_factory=dict)
    selected_id: str | None = None
    variables: dict[str, float | int | str | bool] = Field(default_factory=dict)
    relation_active: bool = True


class MasteryRequest(BaseModel):
    answers: dict[str, str]
    scene: dict[str, Any] = Field(default_factory=dict)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "stemingai-api"}


@app.post("/api/stages")
def generate_stages(payload: BlockRequest):
    prompt = f"""
{SYSTEM_SCOPE}
Crie 3 a 5 etapas conceituais para um bloco de aprendizagem estrutural.
Assunto: {payload.topic}
Objetivo: {payload.goal}
Nivel: {payload.level}
Responda como lista JSON de objetos com id, title, goal, status e mastery_score.
Restrinja ao escopo de exatas, ciencias naturais ou computacao.
"""
    try:
        stages = extract_json(invoke_text(prompt, max_tokens=1200))
        return {"stages": stages, "source": "vertex"}
    except Exception as exc:
        logging.warning("Fallback de etapas: %s", exc)
        stages = [
            {"id": f"estrutura-{payload.topic.lower().replace(' ', '-')}-1", "title": f"Elementos fundamentais de {payload.topic}", "goal": f"Identificar objetos, propriedades e variaveis centrais. Objetivo: {payload.goal}", "status": "active", "mastery_score": 0},
            {"id": f"relacoes-{payload.topic.lower().replace(' ', '-')}-2", "title": f"Relacoes e dependencias em {payload.topic}", "goal": "Construir conexoes, restricoes e hipoteses do modelo.", "status": "active", "mastery_score": 0},
            {"id": f"transformacoes-{payload.topic.lower().replace(' ', '-')}-3", "title": f"Transformacoes e invariantes em {payload.topic}", "goal": "Manipular variaveis e observar o que muda, o que permanece e o que quebra.", "status": "active", "mastery_score": 0},
        ]
        return {"stages": stages, "source": "fallback"}


@app.post("/api/scene")
def generate_scene(payload: SceneRequest):
    prompt = f"""
{SYSTEM_SCOPE}
Gere uma SceneSpec v1 para renderizacao deterministica no frontend.
Assunto: {payload.topic}
Etapa: {payload.stage_title}
Objetivo da etapa: {payload.stage_goal}
Schema obrigatorio:
scene_id, version, domain, engine, stage_goal, model_limitations[], objects[], variables[], relations[],
constraints[], operations[], invariants[], construction_events[], click_explanations{{}}.
Use objetos padronizados para o motor modular. Tipos aceitos no MVP:
quantity, relation_label, point, segment, polygon, formula, cell, molecule, atom, chemical_element, node, text, symbol, vector, solid_3d, surface_3d.
Cada objeto deve ter obrigatoriamente id, type e label. Campos opcionais por objeto: x, y, z, width, height, depth, radius, rotation, points[], vertices[], symbol, text, formula, charge, state, metadata.
Use x/y/width/height em porcentagem do canvas e evite sobreposicao inicial.
Engines aceitos: geometry, graph, symbolic, physics, chemistry, biology, statistics, timeline, 3d, hybrid.
Use engine="hybrid" quando a cena combinar elementos 2D, 3D projetado, textos, formulas e simbolos. Use solid_3d/surface_3d para estruturas macro, orbitais, superficies, corpos, volumes, membranas ou geometrias espaciais simplificadas.
Relacoes aceitas: proportionality, dependency, chemical_bond, force, field, flow, edge, contains, equivalence, correspondence.
Constraints declaram hipoteses do modelo. Operations declaram transformacoes manipulaveis pelo usuario.
Eventos permitidos: create_object, set_property, connect, disconnect, transform, highlight_invariant,
add_variable_control, simulate_step, remove_object, compare_states.
Inclua posicoes x/y percentuais nos objetos quando fizer sentido.
Retorne somente JSON.
"""
    try:
        raw = invoke_text(prompt, deep=True, temperature=0.15, max_tokens=5200)
        try:
            scene = extract_json(raw)
        except Exception:
            scene = repair_json(raw, "Corrija esta SceneSpec v1 truncada ou invalida mantendo o assunto, objetos, relacoes, constraints, operations e eventos.")
        return {"scene": scene, "source": "vertex"}
    except Exception as exc:
        logging.warning("Fallback de SceneSpec: %s", exc)
        raise HTTPException(status_code=502, detail=f"Falha ao gerar SceneSpec com Vertex AI: {exc}") from exc


@app.post("/api/chat")
def chat(payload: ChatRequest):
    compact_scene = {
        "scene_id": payload.scene.get("scene_id"),
        "stage_goal": payload.scene.get("stage_goal"),
        "relations": payload.scene.get("relations", []),
        "invariants": payload.scene.get("invariants", []),
        "selected_id": payload.selected_id,
        "variables": payload.variables,
        "relation_active": payload.relation_active,
    }
    prompt = f"""
{SYSTEM_SCOPE}
Estado atual da cena:
{json.dumps(compact_scene, ensure_ascii=False)}
Pergunta do usuario: {payload.message}
Responda como JSON valido com este formato:
{{
  "answer": "resposta em portugues para o usuario",
  "actions": []
}}
Use actions apenas quando o usuario pedir para alterar a simulacao ou quando a melhor resposta for demonstrar algo.
Actions permitidas:
- add_object: {{"type":"add_object","object":{{SceneObject}}}}
- update_object: {{"type":"update_object","id":"objeto","patch":{{...}}}}
- remove_object: {{"type":"remove_object","id":"objeto"}}
- add_relation: {{"type":"add_relation","relation":{{SceneRelation}}}}
- remove_relation: {{"type":"remove_relation","id":"relacao"}}
- set_variable: {{"type":"set_variable","id":"variavel","value":numero}}
- replace_scene: {{"type":"replace_scene","scene":{{SceneSpec v1 completo}}}}
SceneObject em actions tambem deve usar os tipos aceitos e conter id, type, label, x e y. Se quiser representar organela, use type="cell" com label da organela e metadata.kind="organelle". Se o usuario pedir 3D, use solid_3d, surface_3d, atom ou molecule com depth/z/rotation quando fizer sentido.
Nao repita mensagens prontas. Responda ao pedido especifico e considere selected_id, variables e relation_active.
"""
    try:
        raw = invoke_text(prompt, max_tokens=1600)
        try:
            parsed = extract_json(raw)
            return {
                "answer": parsed.get("answer", raw),
                "actions": parsed.get("actions", []),
                "source": "vertex",
            }
        except Exception:
            return {"answer": raw, "actions": [], "source": "vertex"}
    except Exception as exc:
        logging.warning("Fallback de chat: %s", exc)
        raise HTTPException(status_code=502, detail=f"Falha ao conversar com Vertex AI: {exc}") from exc


@app.get("/api/mastery/demo")
def demo_mastery():
    return DEMO_TEST


@app.post("/api/mastery/evaluate")
def evaluate_mastery(payload: MasteryRequest):
    objective_score = 0
    if payload.answers.get("q1") == "Grandeza A":
        objective_score += 35
    if payload.answers.get("q2") == "B precisa acompanhar A":
        objective_score += 35
    explanation = payload.answers.get("q3", "")
    prompt = f"""
{SYSTEM_SCOPE}
Avalie a resposta explicativa abaixo de 0 a 30 pontos. Retorne JSON com explanation_score, feedback e gaps[].
Resposta: {explanation}
Critério: deve mencionar dependencia B = k*A, razao B/A e condicao de a relacao estar ativa.
"""
    try:
        result = extract_json(invoke_text(prompt, max_tokens=700))
        explanation_score = int(result.get("explanation_score", 0))
        total = min(100, objective_score + explanation_score)
        return {"score": total, "feedback": result.get("feedback", ""), "gaps": result.get("gaps", []), "source": "vertex"}
    except Exception as exc:
        logging.warning("Fallback de avaliacao: %s", exc)
        text = explanation.lower()
        explanation_score = 30 if all(term in text for term in ["b/a", "relacao"]) else 15 if explanation else 0
        total = min(100, objective_score + explanation_score)
        return {
            "score": total,
            "feedback": "A avaliacao objetiva foi feita localmente. Reforce a conexao entre regra, razao e invariante.",
            "gaps": [] if total >= 70 else ["Explique explicitamente quando a razao deixa de ser preservada."],
            "source": "fallback",
        }


if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        target = DIST_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(DIST_DIR / "index.html")
