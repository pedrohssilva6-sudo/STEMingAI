from __future__ import annotations

import re
from typing import Any


ALLOWED_OBJECT_TYPES = {
    "quantity",
    "relation_label",
    "point",
    "segment",
    "polygon",
    "formula",
    "cell",
    "molecule",
    "atom",
    "chemical_element",
    "node",
    "text",
    "symbol",
    "vector",
    "solid_3d",
    "surface_3d",
}


def normalize_scene(scene: dict[str, Any], topic: str = "conceito", stage_goal: str = "") -> dict[str, Any]:
    scene = dict(scene or {})
    scene.setdefault("scene_id", f"scene_{slug(topic)}")
    scene.setdefault("version", "1.0")
    scene.setdefault("domain", infer_domain(topic, scene.get("domain", "")))
    scene.setdefault("engine", "hybrid")
    scene.setdefault("stage_goal", stage_goal or topic)
    scene.setdefault("model_limitations", ["Modelo educacional simplificado gerado por IA."])
    scene.setdefault("variables", [])
    scene.setdefault("constraints", [])
    scene.setdefault("operations", [])
    scene.setdefault("invariants", [])
    scene.setdefault("construction_events", [])
    scene.setdefault("click_explanations", {})

    objects = []
    for index, obj in enumerate(scene.get("objects") or []):
        if not isinstance(obj, dict):
            continue
        normalized = normalize_object(obj, index)
        objects.append(normalized)
    if not objects:
        objects = [
            {
                "id": "core_concept",
                "type": "symbol",
                "label": topic,
                "symbol": "∴",
                "x": 42,
                "y": 42,
                "width": 14,
                "height": 14,
                "color": "#38bdf8",
            }
        ]
    scene["objects"] = objects

    object_ids = {obj["id"] for obj in objects}
    scene["relations"] = normalize_relations(scene.get("relations") or [], object_ids)
    if not scene["construction_events"]:
        scene["construction_events"] = [
            *[{"type": "create_object", "target": obj["id"], "caption": f"Criar {obj['label']}."} for obj in objects],
            *[{"type": "connect", "relation": rel["id"], "caption": f"Conectar {rel['from']} a {rel['to']}."} for rel in scene["relations"]],
        ]
    scene["click_explanations"] = {
        **{obj["id"]: f"{obj['label']} participa do modelo como {obj['type']} situado no ambiente simulado." for obj in objects},
        **(scene.get("click_explanations") or {}),
    }
    scene["modelContract"] = normalize_contract(scene.get("modelContract"), scene, topic)
    scene["environments"] = normalize_environments(scene.get("environments"), scene)
    scene["buildCommands"] = normalize_build_commands(scene.get("buildCommands"), scene)
    return scene


def normalize_object(obj: dict[str, Any], index: int) -> dict[str, Any]:
    raw_type = str(obj.get("type") or obj.get("kind") or "").strip()
    label = str(obj.get("label") or obj.get("name") or obj.get("id") or raw_type or f"Objeto {index + 1}")
    normalized_type = map_object_type(raw_type, label)
    metadata = dict(obj.get("metadata") or {})
    for key in ("properties", "attributes", "parameters"):
        if key in obj:
            metadata[key] = obj[key]
    return {
        **obj,
        "id": slug(str(obj.get("id") or label or f"obj_{index + 1}")),
        "type": normalized_type,
        "label": label,
        "x": number_or(obj.get("x"), 12 + (index % 4) * 20),
        "y": number_or(obj.get("y"), 18 + (index // 4) * 18),
        "width": number_or(obj.get("width"), default_size(normalized_type)[0]),
        "height": number_or(obj.get("height"), default_size(normalized_type)[1]),
        "color": obj.get("color") or default_color(normalized_type),
        "metadata": metadata,
    }


def normalize_relations(relations: list[Any], object_ids: set[str]) -> list[dict[str, Any]]:
    normalized = []
    for index, rel in enumerate(relations):
        if not isinstance(rel, dict):
            continue
        from_id = slug(str(rel.get("from") or rel.get("source") or ""))
        to_id = slug(str(rel.get("to") or rel.get("target") or ""))
        if from_id not in object_ids or to_id not in object_ids:
            continue
        rel_type = map_relation_type(str(rel.get("type") or "dependency"))
        normalized.append(
            {
                **rel,
                "id": slug(str(rel.get("id") or f"rel_{from_id}_{to_id}_{index}")),
                "type": rel_type,
                "label": rel.get("label") or rel_type,
                "from": from_id,
                "to": to_id,
                "active": rel.get("active", True),
            }
        )
    return normalized


def normalize_contract(contract: Any, scene: dict[str, Any], topic: str) -> dict[str, Any]:
    if not isinstance(contract, dict):
        contract = {}
    domain = infer_contract_domain(str(contract.get("domain") or scene.get("domain") or topic))
    return {
        "domain": domain,
        "concept": contract.get("concept") or topic,
        "learningGoal": contract.get("learningGoal") or scene.get("stage_goal") or topic,
        "fidelityLevel": contract.get("fidelityLevel") if contract.get("fidelityLevel") in {"conceptual", "quantitative", "dynamic", "spatial", "high_fidelity_simplified"} else "conceptual",
        "preserves": contract.get("preserves") or [item.get("description", "") for item in scene.get("invariants", []) if isinstance(item, dict)],
        "assumptions": contract.get("assumptions") or scene.get("model_limitations", []),
        "limitations": contract.get("limitations") or scene.get("model_limitations", []),
        "nonGoals": contract.get("nonGoals") or ["nao representa simulacao cientifica completa"],
    }


def normalize_environments(environments: Any, scene: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(environments, list) and environments:
        return environments
    env_type = infer_environment(str(scene.get("domain", "")), str(scene.get("engine", "")))
    return [
        {
            "id": f"{scene['scene_id']}_env",
            "type": env_type,
            "dimension": "3d" if scene.get("engine") == "3d" else "2d",
            "coordinateSystem": "cartesian" if env_type in {"euclideanPlane2d", "cartesianPlane2d"} else "screen",
            "worldBounds": {"xMin": 0, "xMax": 100, "yMin": 0, "yMax": 100, "zMin": 0, "zMax": 100},
            "origin": [0, 0],
            "scale": {"pixelsPerUnit": 1, "unitLabel": "u"},
            "viewport": {"zoom": 1, "pan": [0, 0], "camera": "perspective" if scene.get("engine") == "3d" else "orthographic"},
            "layers": [{"id": "main", "name": "Main", "zIndex": 1, "visible": True}],
            "rules": ["objects_exist_in_environment", "timeline_is_replayable"],
            "assumptions": scene.get("model_limitations", []),
        }
    ]


def normalize_build_commands(commands: Any, scene: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(commands, list) and commands:
        return commands

    env = scene["environments"][0]
    output: list[dict[str, Any]] = [{"type": "createEnvironment", "environment": env}]
    for obj in scene["objects"]:
        output.append(
            {
                "type": "createShape",
                "shape": {
                    "id": obj["id"],
                    "environmentId": env["id"],
                    "type": shape_type_for(obj["type"]),
                    "dimension": "3d" if obj.get("z") is not None or obj.get("depth") is not None else "2d",
                    "transform": {"position": [obj.get("x", 0), obj.get("y", 0)], "layerId": "main"},
                    "geometry": {
                        "width": obj.get("width"),
                        "height": obj.get("height"),
                        "depth": obj.get("depth"),
                        "radius": obj.get("radius"),
                        "points": obj.get("points"),
                        "vertices": obj.get("vertices"),
                    },
                    "properties": {
                        "label": obj.get("label"),
                        "value": obj.get("value"),
                        "color": obj.get("color"),
                        "symbol": obj.get("symbol"),
                        "text": obj.get("text"),
                        "formula": obj.get("formula"),
                        "metadata": obj.get("metadata", {}),
                    },
                    "semantic": {"role": obj.get("metadata", {}).get("role", obj["type"]), "domain": scene["modelContract"]["domain"], "explainable": True},
                    "interaction": {"draggable": True, "clickable": True, "selectable": True},
                },
            }
        )
    for rel in scene["relations"]:
        output.append(
            {
                "type": "addRelation",
                "relation": {
                    "id": rel["id"],
                    "environmentId": env["id"],
                    "type": "functional_dependency" if rel.get("rule") else "visual_connection",
                    "from": [rel["from"]],
                    "to": [rel["to"]],
                    "expression": rel.get("rule"),
                    "active": rel.get("active", True),
                    "semantic": {"role": rel.get("type"), "explanationHint": rel.get("label")},
                },
            }
        )
    for constraint in scene.get("constraints", []):
        if isinstance(constraint, dict) and constraint.get("id"):
            output.append({"type": "addConstraint", "constraint": constraint})
    for invariant in scene.get("invariants", []):
        if isinstance(invariant, dict):
            output.append(
                {
                    "type": "deriveInvariant",
                    "invariant": {
                        "id": invariant.get("id", "invariant"),
                        "statement": invariant.get("description", invariant.get("statement", "")),
                        "dependsOn": [rel["id"] for rel in scene["relations"]],
                        "status": "active",
                        "scope": "currentModel",
                    },
                }
            )
    return output


def shape_type_for(object_type: str) -> str:
    return {
        "quantity": "bar",
        "point": "point2d",
        "segment": "segment2d",
        "polygon": "polygon",
        "vector": "vector2d",
        "solid_3d": "solid3dProjection",
        "surface_3d": "solid3dProjection",
        "atom": "particle2d",
        "chemical_element": "particle2d",
        "molecule": "particle2d",
        "cell": "region2d",
    }.get(object_type, "label")


def map_object_type(raw_type: str, label: str) -> str:
    normalized = slug(raw_type)
    label_norm = slug(label)
    if normalized in ALLOWED_OBJECT_TYPES:
        return normalized
    if any(term in normalized + "_" + label_norm for term in ["cilindro", "pistao", "pistao", "motor", "volume"]):
        return "solid_3d"
    if any(term in normalized + "_" + label_norm for term in ["vetor", "forca", "velocidade", "aceleracao"]):
        return "vector"
    if any(term in normalized + "_" + label_norm for term in ["combustivel", "molecula", "molecule"]):
        return "molecule"
    if any(term in normalized + "_" + label_norm for term in ["atomo", "atom"]):
        return "atom"
    if any(term in normalized + "_" + label_norm for term in ["celula", "organel", "nucleo", "mitocondria"]):
        return "cell"
    if any(term in normalized + "_" + label_norm for term in ["formula", "equacao"]):
        return "formula"
    return "symbol"


def map_relation_type(raw_type: str) -> str:
    normalized = slug(raw_type)
    if normalized in {"proportionality", "dependency", "chemical_bond", "force", "field", "flow", "edge", "contains", "equivalence", "correspondence"}:
        return normalized
    if any(term in normalized for term in ["dentro", "topo", "conecta", "liga"]):
        return "contains"
    if any(term in normalized for term in ["fluxo", "flow"]):
        return "flow"
    return "dependency"


def infer_domain(topic: str, fallback: str) -> str:
    normalized = (topic + " " + fallback).lower()
    if any(term in normalized for term in ["bio", "célula", "celula"]):
        return "biology"
    if any(term in normalized for term in ["quim", "chem", "mol", "átomo", "atomo"]):
        return "chemistry"
    if any(term in normalized for term in ["fis", "phys", "motor", "força", "forca", "energia"]):
        return "physics"
    if any(term in normalized for term in ["grafo", "algoritmo", "comput"]):
        return "computation"
    if any(term in normalized for term in ["estat", "prob"]):
        return "statistics"
    return fallback or "math"


def infer_contract_domain(domain: str) -> str:
    inferred = infer_domain(domain, domain)
    if inferred == "computation":
        return "computation"
    if inferred in {"physics", "chemistry", "biology", "statistics", "math"}:
        return inferred
    return "math"


def infer_environment(domain: str, engine: str) -> str:
    normalized = (domain + " " + engine).lower()
    if "bio" in normalized or "cell" in normalized:
        return "cellCrossSection2d"
    if "chem" in normalized or "quim" in normalized:
        return "chemicalContainer2d"
    if "physics" in normalized or "fis" in normalized:
        return "physicsLab2d"
    if "graph" in normalized or "comp" in normalized:
        return "graphWorkspace"
    if "stat" in normalized:
        return "dataSpace2d"
    if "geometry" in normalized:
        return "euclideanPlane2d"
    if "3d" in normalized:
        return "space3d"
    return "freeCanvas2d"


def default_size(object_type: str) -> tuple[int, int]:
    if object_type in {"text", "formula", "relation_label"}:
        return 22, 8
    if object_type in {"solid_3d", "surface_3d"}:
        return 20, 16
    if object_type in {"atom", "chemical_element", "symbol"}:
        return 12, 12
    return 16, 10


def default_color(object_type: str) -> str:
    return {
        "solid_3d": "#38bdf8",
        "surface_3d": "#a78bfa",
        "molecule": "#60a5fa",
        "cell": "#22c55e",
        "vector": "#fb7185",
        "symbol": "#facc15",
    }.get(object_type, "#38bdf8")


def number_or(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9_]+", "_", value.lower()).strip("_")
