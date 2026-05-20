export type Stage = {
  id: string;
  title: string;
  goal: string;
  status: 'active' | 'locked' | 'done' | string;
  mastery_score: number;
  scene?: SceneSpec;
  scene_source?: string;
};

export type Block = {
  id: string;
  title: string;
  topic: string;
  goal: string;
  level: string;
  status: string;
  stages: Stage[];
  updatedAt: string;
};

export type SceneObject = {
  id: string;
  type:
    | 'quantity'
    | 'relation_label'
    | 'point'
    | 'segment'
    | 'polygon'
    | 'formula'
    | 'cell'
    | 'molecule'
    | 'atom'
    | 'chemical_element'
    | 'node'
    | 'text'
    | 'symbol'
    | 'vector'
    | 'solid_3d'
    | 'surface_3d'
    | string;
  label: string;
  value?: number;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  radius?: number;
  depth?: number;
  rotation?: { x?: number; y?: number; z?: number };
  points?: { x: number; y: number; label?: string }[];
  vertices?: { x: number; y: number; z?: number; label?: string }[];
  symbol?: string;
  text?: string;
  formula?: string;
  charge?: string;
  state?: string;
  color?: string;
  metadata?: Record<string, unknown>;
};

export type SceneConstraint = {
  id: string;
  type: 'fixed_distance' | 'fixed_angle' | 'conservation' | 'boundary' | 'dependency' | string;
  target?: string;
  targets?: string[];
  value?: number | string | boolean;
  expression?: string;
  description?: string;
};

export type SceneOperation = {
  id: string;
  type: 'translate' | 'scale' | 'rotate' | 'bind' | 'unbind' | 'step' | 'measure' | 'transform' | string;
  target?: string;
  targets?: string[];
  params?: Record<string, number | string | boolean>;
  description?: string;
};

export type SceneVariable = {
  id: string;
  label?: string;
  control: 'slider' | 'number' | 'toggle' | string;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
};

export type SceneRelation = {
  id: string;
  type:
    | 'proportionality'
    | 'dependency'
    | 'chemical_bond'
    | 'force'
    | 'field'
    | 'flow'
    | 'edge'
    | 'contains'
    | 'equivalence'
    | 'correspondence'
    | string;
  label?: string;
  from: string;
  to: string;
  rule?: string;
  active?: boolean;
  strength?: number;
  metadata?: Record<string, unknown>;
};

export type SceneEvent = {
  type: string;
  target?: string;
  relation?: string;
  caption?: string;
};

export type SceneSpec = {
  scene_id: string;
  domain: string;
  engine?: 'geometry' | 'graph' | 'symbolic' | 'physics' | 'chemistry' | 'biology' | 'statistics' | 'timeline' | '2d' | '3d' | 'hybrid';
  version?: '1.0' | string;
  stage_goal: string;
  model_limitations: string[];
  objects: SceneObject[];
  variables: SceneVariable[];
  relations: SceneRelation[];
  constraints?: SceneConstraint[];
  operations?: SceneOperation[];
  invariants: { id: string; description: string }[];
  construction_events: SceneEvent[];
  click_explanations: Record<string, string>;
};

export type SceneIssue = {
  severity: 'error' | 'warning';
  path: string;
  message: string;
};

export type SceneState = {
  scene: SceneSpec;
  objects: SceneObject[];
  visibleIds: Set<string>;
  issues: SceneIssue[];
  measurements: Record<string, number | string>;
};

export type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  source?: string;
};

export type SceneAction =
  | { type: 'add_object'; object: SceneObject; explanation?: string }
  | { type: 'update_object'; id: string; patch: Partial<SceneObject>; explanation?: string }
  | { type: 'remove_object'; id: string; explanation?: string }
  | { type: 'add_relation'; relation: SceneRelation; explanation?: string }
  | { type: 'remove_relation'; id: string; explanation?: string }
  | { type: 'set_variable'; id: string; value: number; explanation?: string }
  | { type: 'replace_scene'; scene: SceneSpec; explanation?: string };

export type TutorResponse = {
  answer: string;
  source: string;
  actions?: SceneAction[];
};
