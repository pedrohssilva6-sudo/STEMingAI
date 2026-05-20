import type { SceneSpec, Stage, TutorResponse } from '../types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function generateStages(topic: string, goal: string, level: string): Promise<Stage[]> {
  const data = await postJson<{ stages: Stage[] }>('/api/stages', { topic, goal, level });
  return data.stages;
}

export async function generateScene(topic: string, stage_title: string, stage_goal: string): Promise<SceneSpec> {
  const data = await postJson<{ scene: SceneSpec }>('/api/scene', { topic, stage_title, stage_goal });
  return normalizeScene(data.scene);
}

export async function askTutor(payload: unknown): Promise<TutorResponse> {
  return postJson('/api/chat', payload);
}

export async function evaluateMastery(answers: Record<string, string>, scene: SceneSpec): Promise<{ score: number; feedback: string; gaps: string[]; source: string }> {
  return postJson('/api/mastery/evaluate', { answers, scene });
}

function normalizeScene(scene: SceneSpec): SceneSpec {
  return {
    ...scene,
    version: scene.version ?? '1.0',
    model_limitations: scene.model_limitations ?? ['Modelo gerado pela IA; conferir idealizacoes antes de usar como representacao quantitativa.'],
    objects: (scene.objects ?? []).map((object) => ({
      ...object,
      label: object.label ?? String(object.metadata?.name ?? object.metadata?.text ?? object.id)
    })),
    variables: scene.variables ?? [],
    relations: scene.relations ?? [],
    constraints: scene.constraints ?? [],
    operations: scene.operations ?? [],
    invariants: scene.invariants ?? [],
    construction_events: scene.construction_events ?? [],
    click_explanations: scene.click_explanations ?? {}
  };
}
