from __future__ import annotations

import re
from typing import Any


def build_conceptual_scene(topic: str, stage_title: str, stage_goal: str) -> dict[str, Any]:
    domain, engine, environment_type, object_type = infer_domain(topic)
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_") or "concept"
    env_id = f"env_{slug}"

    objects = [
        {
            "id": "core_concept",
            "type": object_type,
            "label": topic[:48],
            "x": 38,
            "y": 38,
            "width": 24,
            "height": 14,
            "color": "#38bdf8",
            "metadata": {"role": "core_concept"},
        },
        {
            "id": "properties",
            "type": "text",
            "label": "propriedades",
            "text": "propriedades",
            "x": 10,
            "y": 24,
            "width": 20,
            "height": 8,
            "color": "#facc15",
            "metadata": {"role": "properties"},
        },
        {
            "id": "relations",
            "type": "text",
            "label": "relações",
            "text": "relações",
            "x": 70,
            "y": 24,
            "width": 18,
            "height": 8,
            "color": "#a78bfa",
            "metadata": {"role": "relations"},
        },
        {
            "id": "invariants",
            "type": "symbol",
            "label": "invariantes",
            "symbol": "≡",
            "x": 72,
            "y": 66,
            "width": 12,
            "height": 12,
            "color": "#22c55e",
            "metadata": {"role": "invariants"},
        },
        {
            "id": "question",
            "type": "text",
            "label": "pergunta estrutural",
            "text": "o que muda?",
            "x": 12,
            "y": 68,
            "width": 22,
            "height": 8,
            "color": "#fb7185",
            "metadata": {"role": "prediction_prompt"},
        },
    ]

    relations = [
        {"id": "rel_properties", "type": "dependency", "label": "possui", "from": "core_concept", "to": "properties", "active": True},
        {"id": "rel_relations", "type": "dependency", "label": "conecta", "from": "core_concept", "to": "relations", "active": True},
        {"id": "rel_invariants", "type": "dependency", "label": "preserva", "from": "core_concept", "to": "invariants", "active": True},
        {"id": "rel_question", "type": "dependency", "label": "testa", "from": "core_concept", "to": "question", "active": True},
    ]

    build_commands = [
        {
            "type": "createEnvironment",
            "environment": {
                "id": env_id,
                "type": environment_type,
                "dimension": "2d",
                "coordinateSystem": "screen",
                "worldBounds": {"xMin": 0, "xMax": 100, "yMin": 0, "yMax": 100},
                "origin": [0, 0],
                "scale": {"pixelsPerUnit": 1, "unitLabel": "u"},
                "viewport": {"zoom": 1, "pan": [0, 0], "camera": "orthographic"},
                "layers": [{"id": "main", "name": "Main", "zIndex": 1, "visible": True}],
                "rules": ["fallback_conceptual_model", "objects_exist_in_environment"],
                "assumptions": ["Cena conceitual local gerada porque a IA falhou ou retornou JSON inválido."],
            },
        }
    ]
    for obj in objects:
        build_commands.append(
            {
                "type": "createShape",
                "shape": {
                    "id": obj["id"],
                    "environmentId": env_id,
                    "type": "label" if obj["type"] in {"text", "symbol"} else "region2d",
                    "dimension": "2d",
                    "transform": {"position": [obj["x"], obj["y"]], "layerId": "main"},
                    "geometry": {"width": obj.get("width"), "height": obj.get("height")},
                    "properties": {"label": obj["label"], "text": obj.get("text"), "color": obj.get("color")},
                    "semantic": {"role": obj["metadata"]["role"], "domain": domain, "explainable": True},
                    "interaction": {"draggable": True, "clickable": True, "selectable": True},
                },
            }
        )
    for rel in relations:
        build_commands.append(
            {
                "type": "addRelation",
                "relation": {
                    "id": rel["id"],
                    "environmentId": env_id,
                    "type": "visual_connection",
                    "from": [rel["from"]],
                    "to": [rel["to"]],
                    "active": True,
                    "semantic": {"role": rel["label"]},
                },
            }
        )

    return {
        "scene_id": f"fallback_{slug}",
        "version": "1.0",
        "domain": domain,
        "engine": engine,
        "stage_goal": stage_goal or stage_title,
        "model_limitations": [
            "Fallback conceitual local: preserva estrutura didática, não fidelidade científica detalhada.",
            "Use o chat para pedir refinamento quando a IA estiver disponível.",
        ],
        "modelContract": {
            "domain": domain,
            "concept": topic,
            "learningGoal": stage_goal or stage_title,
            "fidelityLevel": "conceptual",
            "preserves": ["objetos centrais", "relações conceituais", "perguntas de manipulação"],
            "assumptions": ["modelo estrutural simplificado"],
            "limitations": ["não contém cálculos específicos do domínio"],
            "nonGoals": ["não é simulação científica de alta fidelidade"],
        },
        "environments": [build_commands[0]["environment"]],
        "objects": objects,
        "variables": [],
        "relations": relations,
        "constraints": [
            {
                "id": "fallback_scope",
                "type": "dependency",
                "targets": ["core_concept"],
                "description": "A cena é uma estrutura inicial que deve ser refinada por comandos da IA.",
            }
        ],
        "operations": [
            {"id": "op_refine", "type": "transform", "target": "core_concept", "description": "Refinar a cena com novos objetos e relações."}
        ],
        "invariants": [{"id": "inv_structure", "description": "Todo conceito é analisado por objetos, propriedades, relações e invariantes."}],
        "construction_events": [
            *[{"type": "create_object", "target": obj["id"], "caption": f"Criar {obj['label']}."} for obj in objects],
            *[{"type": "connect", "relation": rel["id"], "caption": f"Conectar {rel['from']} a {rel['to']}."} for rel in relations],
            {"type": "highlight_invariant", "target": "inv_structure", "caption": "Destacar a estrutura comum do modelo."},
        ],
        "click_explanations": {
            "core_concept": f"Este é o conceito central desta etapa: {topic}. A cena foi situada em um ambiente {environment_type}.",
            "properties": "Propriedades são grandezas, estados ou atributos que podem ser manipulados.",
            "relations": "Relações conectam objetos e tornam a cena um modelo, não apenas um desenho.",
            "invariants": "Invariantes indicam o que deve permanecer preservado enquanto o modelo é manipulado.",
            "question": "Esta pergunta força previsão: antes de manipular, o usuário deve antecipar o que muda.",
        },
        "buildCommands": build_commands,
    }


def infer_domain(topic: str) -> tuple[str, str, str, str]:
    normalized = topic.lower()
    if any(term in normalized for term in ["célula", "celula", "gene", "proteína", "proteina", "biologia"]):
        return "biology", "biology", "cellCrossSection2d", "cell"
    if any(term in normalized for term in ["molécula", "molecula", "átomo", "atomo", "química", "quimica", "reação", "reacao"]):
        return "chemistry", "chemistry", "chemicalContainer2d", "molecule"
    if any(term in normalized for term in ["força", "forca", "movimento", "energia", "velocidade", "fisica", "física"]):
        return "physics", "physics", "physicsLab2d", "vector"
    if any(term in normalized for term in ["grafo", "algoritmo", "computação", "computacao", "estado"]):
        return "computation", "graph", "graphWorkspace", "node"
    if any(term in normalized for term in ["estatística", "estatistica", "probabilidade", "amostra"]):
        return "statistics", "statistics", "dataSpace2d", "quantity"
    if any(term in normalized for term in ["triângulo", "triangulo", "geometria", "vetor", "função", "funcao"]):
        return "math", "geometry", "euclideanPlane2d", "polygon"
    return "math", "hybrid", "freeCanvas2d", "symbol"

