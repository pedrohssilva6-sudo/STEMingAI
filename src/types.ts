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
  type: string;
  label: string;
  value?: number;
  x?: number;
  y?: number;
  color?: string;
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

