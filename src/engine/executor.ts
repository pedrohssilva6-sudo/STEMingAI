import type { SceneObject, SceneRelation, SceneSpec, SceneState } from '../types';
import { nudgeOverlaps, seedObjectLayout, type Point } from './layout';
import { validateSceneSpec } from './validator';

export type RuntimeControls = {
  values: Record<string, number>;
  relationActive: boolean;
  positions: Record<string, Point>;
  step: number;
};

export function defaultValues(scene: SceneSpec) {
  return Object.fromEntries(scene.variables.map((variable) => [variable.id, Number(variable.default ?? variable.min ?? 0)]));
}

export function visibleIdsFor(scene: SceneSpec, step: number) {
  const events = scene.construction_events.slice(0, step + 1);
  const ids = new Set(events.map((event) => event.target ?? event.relation ?? '').filter(Boolean));
  for (const event of events) {
    if (event.type === 'connect' && event.relation) {
      const relation = scene.relations.find((item) => item.id === event.relation);
      if (relation) {
        ids.add(relation.from);
        ids.add(relation.to);
      }
    }
  }
  return ids;
}

export function executeScene(scene: SceneSpec, controls: RuntimeControls): SceneState {
  const issues = validateSceneSpec(scene);
  const seeded = scene.objects.map(seedObjectLayout).map((object) => {
    const positioned = controls.positions[object.id] ? { ...object, ...controls.positions[object.id] } : object;
    return applyDeterministicRules(positioned, controls.values, controls.relationActive);
  });
  const objects = nudgeOverlaps(seeded);
  const visibleIds = visibleIdsFor(scene, controls.step);
  const measurements = measureScene(objects, scene.relations, controls);

  return { scene, objects, visibleIds, issues, measurements };
}

export function relationEndpoints(objects: SceneObject[], relation: SceneRelation) {
  const from = objects.find((object) => object.id === relation.from);
  const to = objects.find((object) => object.id === relation.to);
  if (!from || !to) return null;
  return {
    x1: (from.x ?? 20) + (from.width ?? 20) / 2,
    y1: (from.y ?? 50) + (from.height ?? 12) / 2,
    x2: (to.x ?? 60) + (to.width ?? 20) / 2,
    y2: (to.y ?? 50) + (to.height ?? 12) / 2
  };
}

function applyDeterministicRules(object: SceneObject, values: Record<string, number>, relationActive: boolean): SceneObject {
  const a = Number(values['A.value'] ?? object.value ?? 2);
  const k = Number(values.k ?? 3);
  if (object.id === 'A') return { ...object, value: a, width: Math.max(14, a * 3.8) };
  if (object.id === 'B' && relationActive) return { ...object, value: Number((a * k).toFixed(2)), width: Math.max(14, a * k * 2.2) };
  return object;
}

function measureScene(objects: SceneObject[], relations: SceneRelation[], controls: RuntimeControls) {
  const measurements: Record<string, number | string> = {};
  const a = Number(controls.values['A.value'] ?? objects.find((object) => object.id === 'A')?.value ?? 0);
  const b = Number(objects.find((object) => object.id === 'B')?.value ?? 0);
  if (a && b) measurements.ratio_AB = Number((b / a).toFixed(2));

  for (const relation of relations) {
    const endpoints = relationEndpoints(objects, relation);
    if (!endpoints) continue;
    const dx = endpoints.x2 - endpoints.x1;
    const dy = endpoints.y2 - endpoints.y1;
    measurements[`${relation.id}.distance`] = Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
  }
  return measurements;
}

