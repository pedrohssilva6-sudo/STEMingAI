export type DomainKit = {
  id: string;
  label: string;
  engines: string[];
  objectTypes: string[];
  relationTypes: string[];
  operations: string[];
  invariants: string[];
};

export const DOMAIN_KITS: DomainKit[] = [
  {
    id: 'mathematics',
    label: 'Matematica',
    engines: ['geometry', 'symbolic', 'statistics', 'graph'],
    objectTypes: ['quantity', 'point', 'segment', 'polygon', 'formula', 'node', 'relation_label'],
    relationTypes: ['proportionality', 'equivalence', 'dependency', 'correspondence'],
    operations: ['scale', 'translate', 'rotate', 'measure', 'transform'],
    invariants: ['ratio', 'area', 'angle', 'equivalence', 'sum']
  },
  {
    id: 'physics',
    label: 'Fisica',
    engines: ['physics', 'geometry', 'timeline'],
    objectTypes: ['quantity', 'point', 'segment', 'formula', 'node'],
    relationTypes: ['force', 'field', 'dependency', 'flow'],
    operations: ['step', 'measure', 'transform', 'bind'],
    invariants: ['energy_idealized', 'momentum_idealized', 'charge', 'mass']
  },
  {
    id: 'chemistry',
    label: 'Quimica',
    engines: ['chemistry', 'geometry', 'timeline'],
    objectTypes: ['atom', 'chemical_element', 'molecule', 'quantity', 'formula', 'relation_label'],
    relationTypes: ['chemical_bond', 'dependency', 'equivalence', 'flow'],
    operations: ['bind', 'unbind', 'measure', 'transform'],
    invariants: ['atom_count', 'charge', 'mass_idealized']
  },
  {
    id: 'biology',
    label: 'Biologia',
    engines: ['biology', 'graph', 'timeline'],
    objectTypes: ['cell', 'node', 'quantity', 'formula', 'molecule'],
    relationTypes: ['flow', 'contains', 'dependency', 'edge'],
    operations: ['step', 'bind', 'measure', 'transform'],
    invariants: ['homeostasis_range', 'conservation', 'network_structure']
  },
  {
    id: 'computing',
    label: 'Computacao',
    engines: ['graph', 'timeline', 'symbolic'],
    objectTypes: ['node', 'formula', 'quantity', 'relation_label'],
    relationTypes: ['edge', 'dependency', 'contains', 'correspondence'],
    operations: ['step', 'bind', 'transform'],
    invariants: ['state', 'ordering', 'complexity_class']
  },
  {
    id: 'statistics',
    label: 'Estatistica',
    engines: ['statistics', 'graph'],
    objectTypes: ['quantity', 'node', 'formula', 'relation_label'],
    relationTypes: ['dependency', 'correspondence', 'flow'],
    operations: ['measure', 'step', 'transform'],
    invariants: ['sample_size', 'total_frequency', 'mean_relation']
  }
];

export function kitForDomain(domain: string) {
  const normalized = domain.toLowerCase();
  return DOMAIN_KITS.find((kit) => normalized.includes(kit.id) || normalized.includes(kit.label.toLowerCase())) ?? DOMAIN_KITS[0];
}

