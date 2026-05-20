import type { SceneIssue, SceneSpec } from '../types';
import { kitForDomain } from './domainKits';
import { primitiveByType } from './primitives';

const REQUIRED_EVENTS = new Set([
  'create_object',
  'set_property',
  'connect',
  'disconnect',
  'transform',
  'highlight_invariant',
  'add_variable_control',
  'simulate_step',
  'remove_object',
  'compare_states'
]);

export function validateSceneSpec(scene: SceneSpec): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const objectIds = new Set(scene.objects.map((object) => object.id));
  const relationIds = new Set(scene.relations.map((relation) => relation.id));
  const kit = kitForDomain(scene.domain);

  if (!scene.scene_id) issues.push(error('scene_id', 'SceneSpec precisa de scene_id.'));
  if (!scene.model_limitations?.length) issues.push(error('model_limitations', 'Declare as limitacoes do modelo.'));
  if (!scene.objects?.length) issues.push(error('objects', 'A cena precisa de pelo menos um objeto.'));

  scene.objects.forEach((object, index) => {
    if (!primitiveByType.has(object.type)) {
      issues.push(warn(`objects.${index}.type`, `Tipo "${object.type}" ainda nao tem renderer dedicado; sera renderizado como no generico.`));
    }
    if (!kit.objectTypes.includes(object.type) && primitiveByType.has(object.type)) {
      issues.push(warn(`objects.${index}.type`, `Tipo "${object.type}" nao pertence ao kit principal de ${kit.label}, mas pode ser usado como apoio.`));
    }
    if (!object.id || !object.label) issues.push(error(`objects.${index}`, 'Objeto precisa de id e label.'));
  });

  scene.relations.forEach((relation, index) => {
    if (!objectIds.has(relation.from)) issues.push(error(`relations.${index}.from`, `Origem "${relation.from}" nao existe.`));
    if (!objectIds.has(relation.to)) issues.push(error(`relations.${index}.to`, `Destino "${relation.to}" nao existe.`));
    if (!kit.relationTypes.includes(relation.type)) {
      issues.push(warn(`relations.${index}.type`, `Relacao "${relation.type}" nao e nativa do kit ${kit.label}; sera tratada genericamente.`));
    }
  });

  scene.construction_events.forEach((event, index) => {
    if (!REQUIRED_EVENTS.has(event.type)) issues.push(warn(`construction_events.${index}.type`, `Evento "${event.type}" nao e padronizado.`));
    if (event.target && !objectIds.has(event.target) && !scene.invariants.some((item) => item.id === event.target)) {
      issues.push(warn(`construction_events.${index}.target`, `Target "${event.target}" nao aponta para objeto/invariante conhecido.`));
    }
    if (event.relation && !relationIds.has(event.relation)) {
      issues.push(error(`construction_events.${index}.relation`, `Relacao "${event.relation}" nao existe.`));
    }
  });

  return issues;
}

function error(path: string, message: string): SceneIssue {
  return { severity: 'error', path, message };
}

function warn(path: string, message: string): SceneIssue {
  return { severity: 'warning', path, message };
}

