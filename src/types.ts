export type Stage = {
  id: string;
  title: string;
  goal: string;
  status: 'active' | 'locked' | 'done' | string;
  mastery_score: number;
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
  type: 'quantity' | 'relation_label' | 'point' | 'segment' | 'polygon' | 'formula' | 'cell' | 'molecule' | 'atom' | 'chemical_element' | 'node' | string;
  label: string;
  value?: number;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: { x: number; y: number; label?: string }[];
  symbol?: string;
  formula?: string;
  charge?: string;
  state?: string;
  color?: string;
  metadata?: Record<string, unknown>;
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
  type: string;
  label?: string;
  from: string;
  to: string;
  rule?: string;
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
  engine?: '2d' | '3d' | 'hybrid';
  stage_goal: string;
  model_limitations: string[];
  objects: SceneObject[];
  variables: SceneVariable[];
  relations: SceneRelation[];
  invariants: { id: string; description: string }[];
  construction_events: SceneEvent[];
  click_explanations: Record<string, string>;
};

export type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  source?: string;
};
