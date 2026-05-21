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

export type EnvironmentSpec = {
  id: string;
  type:
    | 'freeCanvas2d'
    | 'euclideanPlane2d'
    | 'cartesianPlane2d'
    | 'physicsLab2d'
    | 'graphWorkspace'
    | 'dataSpace2d'
    | 'cellCrossSection2d'
    | 'chemicalContainer2d'
    | 'space3d';
  dimension: '2d' | '3d';
  coordinateSystem: 'screen' | 'cartesian' | 'polar' | 'graph' | 'region' | 'none';
  worldBounds?: { xMin: number; xMax: number; yMin: number; yMax: number; zMin?: number; zMax?: number };
  origin?: [number, number] | [number, number, number];
  scale?: { pixelsPerUnit?: number; unitLabel?: string };
  units?: Record<string, string>;
  orientation?: { xAxis?: [number, number, number?]; yAxis?: [number, number, number?]; zAxis?: [number, number, number?] };
  viewport?: { zoom: number; pan: [number, number]; camera?: 'orthographic' | 'perspective' };
  layers?: Array<{ id: string; name: string; zIndex: number; visible: boolean }>;
  rules?: string[];
  assumptions?: string[];
};

export type ModelContract = {
  domain: 'math' | 'physics' | 'chemistry' | 'biology' | 'computation' | 'statistics';
  concept: string;
  learningGoal: string;
  fidelityLevel: 'conceptual' | 'quantitative' | 'dynamic' | 'spatial' | 'high_fidelity_simplified';
  preserves: string[];
  assumptions: string[];
  limitations: string[];
  nonGoals: string[];
};

export type ShapeSpec = {
  id: string;
  environmentId: string;
  type: 'point2d' | 'segment2d' | 'bar' | 'circle' | 'polygon' | 'vector2d' | 'axis2d' | 'curve2d' | 'connector' | 'label' | 'particle2d' | 'region2d' | 'solid3dProjection';
  dimension: '2d' | '3d';
  transform?: {
    position?: [number, number] | [number, number, number];
    rotation?: number;
    scale?: [number, number] | [number, number, number];
    layerId?: string;
  };
  geometry?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  semantic?: {
    role?: string;
    domain?: 'math' | 'physics' | 'chemistry' | 'biology' | 'computation' | 'statistics';
    tags?: string[];
    explainable?: boolean;
  };
  interaction?: {
    draggable?: boolean;
    clickable?: boolean;
    selectable?: boolean;
  };
};

export type RelationSpecV2 = {
  id: string;
  environmentId: string;
  type: 'visual_connection' | 'functional_dependency' | 'geometric_relation' | 'conservation' | 'flow';
  from: string[];
  to?: string[];
  expression?: string;
  active: boolean;
  semantic?: { role?: string; explanationHint?: string };
};

export type InvariantSpecV2 = {
  id: string;
  statement: string;
  dependsOn: string[];
  status: 'active' | 'broken' | 'unknown';
  scope: 'currentModel' | 'idealizedModel' | 'domainRule';
};

export type VariableSpecV2 = {
  id: string;
  label: string;
  value: number | string | boolean;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type BuildCommand =
  | { type: 'createEnvironment'; environment: EnvironmentSpec }
  | { type: 'createShape'; shape: ShapeSpec }
  | { type: 'setTransform'; targetId: string; transform: ShapeSpec['transform'] }
  | { type: 'setProperty'; targetId: string; key: string; value: unknown; unit?: string }
  | { type: 'addRelation'; relation: RelationSpecV2 }
  | { type: 'removeRelation'; relationId: string; reason?: string }
  | { type: 'deriveInvariant'; invariant: InvariantSpecV2 }
  | { type: 'focusCamera'; environmentId: string; viewport: EnvironmentSpec['viewport'] }
  | { type: 'compareStates'; beforeStep: number; afterStep: number; label?: string }
  | { type: 'askPrediction'; prompt: string; expectedFocus?: string[] };

export type EngineSceneEvent = {
  id: string;
  step: number;
  command: BuildCommand;
  status: 'applied' | 'rejected' | 'repaired';
  timestamp: number;
  message?: string;
};

export type EngineSceneState = {
  id: string;
  title: string;
  modelContract: ModelContract;
  environments: Record<string, EnvironmentSpec>;
  shapes: Record<string, ShapeSpec>;
  variables: Record<string, VariableSpecV2>;
  relations: Record<string, RelationSpecV2>;
  constraints: Record<string, SceneConstraint>;
  invariants: Record<string, InvariantSpecV2>;
  currentStep: number;
  eventLog: EngineSceneEvent[];
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
  modelContract?: ModelContract;
  environments?: EnvironmentSpec[];
  buildCommands?: BuildCommand[];
};

export type SceneIssue = {
  severity: 'error' | 'warning';
  path: string;
  message: string;
};

export type SceneState = {
  scene: SceneSpec;
  engine: EngineSceneState;
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
