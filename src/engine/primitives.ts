import type { SceneObject } from '../types';

export type PrimitiveDefinition = {
  type: SceneObject['type'];
  label: string;
  domains: string[];
  defaultSize: { width: number; height: number };
  interaction: {
    draggable: boolean;
    connectable: boolean;
    inspectable: boolean;
    measurable: boolean;
  };
  required?: string[];
};

export const UNIVERSAL_PRIMITIVES: PrimitiveDefinition[] = [
  {
    type: 'quantity',
    label: 'Grandeza',
    domains: ['mathematics', 'physics', 'chemistry', 'biology', 'statistics'],
    defaultSize: { width: 18, height: 8 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true }
  },
  {
    type: 'point',
    label: 'Ponto',
    domains: ['mathematics', 'physics', 'geometry'],
    defaultSize: { width: 4, height: 4 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true }
  },
  {
    type: 'segment',
    label: 'Segmento',
    domains: ['mathematics', 'geometry', 'physics'],
    defaultSize: { width: 18, height: 3 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true }
  },
  {
    type: 'polygon',
    label: 'Poligono',
    domains: ['mathematics', 'geometry'],
    defaultSize: { width: 18, height: 16 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true },
    required: ['points']
  },
  {
    type: 'formula',
    label: 'Formula',
    domains: ['mathematics', 'physics', 'chemistry', 'computing'],
    defaultSize: { width: 22, height: 9 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: false }
  },
  {
    type: 'node',
    label: 'No',
    domains: ['computing', 'biology', 'graph', 'systems'],
    defaultSize: { width: 12, height: 12 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: false }
  },
  {
    type: 'atom',
    label: 'Atomo',
    domains: ['chemistry', 'physics'],
    defaultSize: { width: 12, height: 12 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true },
    required: ['symbol']
  },
  {
    type: 'chemical_element',
    label: 'Elemento quimico',
    domains: ['chemistry'],
    defaultSize: { width: 12, height: 12 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true },
    required: ['symbol']
  },
  {
    type: 'molecule',
    label: 'Molecula',
    domains: ['chemistry', 'biology'],
    defaultSize: { width: 20, height: 14 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: true }
  },
  {
    type: 'cell',
    label: 'Celula',
    domains: ['biology'],
    defaultSize: { width: 20, height: 14 },
    interaction: { draggable: true, connectable: true, inspectable: true, measurable: false }
  },
  {
    type: 'relation_label',
    label: 'Rotulo de relacao',
    domains: ['universal'],
    defaultSize: { width: 20, height: 10 },
    interaction: { draggable: true, connectable: false, inspectable: true, measurable: false }
  }
];

export const primitiveByType = new Map(UNIVERSAL_PRIMITIVES.map((primitive) => [primitive.type, primitive]));

export function primitiveFor(type: string) {
  return primitiveByType.get(type) ?? primitiveByType.get('node')!;
}

