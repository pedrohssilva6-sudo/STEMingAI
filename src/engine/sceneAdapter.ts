import type {
  BuildCommand,
  EnvironmentSpec,
  ModelContract,
  RelationSpecV2,
  SceneObject,
  SceneRelation,
  SceneSpec,
  ShapeSpec
} from '../types';
import { createEmptyEngineState, applyCommands } from './commandRuntime';

export function sceneToEngineState(scene: SceneSpec, step: number) {
  const commands = scene.buildCommands?.length ? scene.buildCommands : legacySceneToCommands(scene);
  const initial = createEmptyEngineState({
    id: scene.scene_id,
    title: scene.stage_goal,
    modelContract: scene.modelContract ?? defaultModelContract(scene)
  });
  return applyCommands(initial, commands, Math.min(step, commands.length - 1));
}

export function legacySceneToCommands(scene: SceneSpec): BuildCommand[] {
  const environment = scene.environments?.[0] ?? defaultEnvironment(scene);
  const commands: BuildCommand[] = [{ type: 'createEnvironment', environment }];

  for (const object of scene.objects) {
    commands.push({ type: 'createShape', shape: objectToShape(object, environment.id, scene.domain) });
  }

  for (const relation of scene.relations) {
    commands.push({ type: 'addRelation', relation: relationToV2(relation, environment.id) });
  }

  for (const invariant of scene.invariants) {
    commands.push({
      type: 'deriveInvariant',
      invariant: {
        id: invariant.id,
        statement: invariant.description,
        dependsOn: scene.relations.map((relation) => relation.id),
        status: 'active',
        scope: 'currentModel'
      }
    });
  }

  return commands;
}

export function defaultEnvironment(scene: SceneSpec): EnvironmentSpec {
  return {
    id: `${scene.scene_id}_env`,
    type: environmentTypeFor(scene),
    dimension: scene.engine === '3d' ? '3d' : '2d',
    coordinateSystem: scene.engine === 'graph' ? 'graph' : scene.engine === 'geometry' ? 'cartesian' : 'screen',
    worldBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100, zMin: 0, zMax: 100 },
    origin: [0, 0],
    scale: { pixelsPerUnit: 1, unitLabel: 'u' },
    viewport: { zoom: 1, pan: [0, 0], camera: scene.engine === '3d' ? 'perspective' : 'orthographic' },
    layers: [{ id: 'main', name: 'Main', zIndex: 1, visible: true }],
    rules: ['objects_exist_in_environment', 'commands_are_replayable'],
    assumptions: scene.model_limitations
  };
}

function environmentTypeFor(scene: SceneSpec): EnvironmentSpec['type'] {
  const domain = scene.domain.toLowerCase();
  if (scene.engine === '3d') return 'space3d';
  if (scene.engine === 'graph') return 'graphWorkspace';
  if (scene.engine === 'physics') return 'physicsLab2d';
  if (scene.engine === 'statistics') return 'dataSpace2d';
  if (domain.includes('bio') || domain.includes('cel')) return 'cellCrossSection2d';
  if (domain.includes('chem') || domain.includes('quim')) return 'chemicalContainer2d';
  if (scene.engine === 'geometry') return 'euclideanPlane2d';
  return 'freeCanvas2d';
}

function objectToShape(object: SceneObject, environmentId: string, domain: string): ShapeSpec {
  return {
    id: object.id,
    environmentId,
    type: shapeTypeFor(object),
    dimension: object.z !== undefined || object.depth !== undefined ? '3d' : '2d',
    transform: {
      position: object.z !== undefined ? [object.x ?? 0, object.y ?? 0, object.z] : [object.x ?? 0, object.y ?? 0],
      rotation: object.rotation?.z,
      scale: [1, 1],
      layerId: 'main'
    },
    geometry: {
      width: object.width,
      height: object.height,
      depth: object.depth,
      radius: object.radius,
      points: object.points,
      vertices: object.vertices
    },
    properties: {
      label: object.label,
      value: object.value,
      color: object.color,
      symbol: object.symbol,
      text: object.text,
      formula: object.formula,
      metadata: object.metadata
    },
    semantic: {
      role: String(object.metadata?.role ?? object.type),
      domain: normalizeDomain(domain),
      tags: [object.type],
      explainable: true
    },
    interaction: { draggable: true, clickable: true, selectable: true }
  };
}

function shapeTypeFor(object: SceneObject): ShapeSpec['type'] {
  if (object.type === 'quantity') return 'bar';
  if (object.type === 'point') return 'point2d';
  if (object.type === 'segment') return 'segment2d';
  if (object.type === 'polygon') return 'polygon';
  if (object.type === 'vector') return 'vector2d';
  if (object.type === 'formula' || object.type === 'text' || object.type === 'symbol' || object.type === 'relation_label') return 'label';
  if (object.type === 'solid_3d' || object.type === 'surface_3d') return 'solid3dProjection';
  if (object.type === 'atom' || object.type === 'chemical_element' || object.type === 'molecule') return 'particle2d';
  if (object.type === 'cell') return 'region2d';
  return 'label';
}

function relationToV2(relation: SceneRelation, environmentId: string): RelationSpecV2 {
  return {
    id: relation.id,
    environmentId,
    type: relation.rule ? 'functional_dependency' : relation.type === 'flow' ? 'flow' : 'visual_connection',
    from: [relation.from],
    to: [relation.to],
    expression: relation.rule,
    active: relation.active ?? true,
    semantic: { role: relation.type, explanationHint: relation.label }
  };
}

function defaultModelContract(scene: SceneSpec): ModelContract {
  return {
    domain: normalizeDomain(scene.domain),
    concept: scene.stage_goal,
    learningGoal: scene.stage_goal,
    fidelityLevel: scene.engine === '3d' || scene.engine === 'hybrid' ? 'spatial' : 'conceptual',
    preserves: scene.invariants.map((invariant) => invariant.description),
    assumptions: scene.model_limitations,
    limitations: scene.model_limitations,
    nonGoals: ['nao representa a realidade completa', 'nao substitui simulador cientifico de alta fidelidade']
  };
}

function normalizeDomain(domain: string): ModelContract['domain'] {
  const normalized = domain.toLowerCase();
  if (normalized.includes('fis') || normalized.includes('phys')) return 'physics';
  if (normalized.includes('qu') || normalized.includes('chem')) return 'chemistry';
  if (normalized.includes('bio') || normalized.includes('cel')) return 'biology';
  if (normalized.includes('comp') || normalized.includes('alg')) return 'computation';
  if (normalized.includes('stat') || normalized.includes('estat')) return 'statistics';
  return 'math';
}

