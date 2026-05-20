import { demoScene } from '../data/demo';
import type { SceneSpec, Stage } from '../types';

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
  try {
    const data = await postJson<{ scene: SceneSpec }>('/api/scene', { topic, stage_title, stage_goal });
    return data.scene;
  } catch {
    return demoScene;
  }
}

export async function askTutor(payload: unknown): Promise<{ answer: string; source: string }> {
  return postJson('/api/chat', payload);
}

export async function evaluateMastery(answers: Record<string, string>, scene: SceneSpec): Promise<{ score: number; feedback: string; gaps: string[]; source: string }> {
  return postJson('/api/mastery/evaluate', { answers, scene });
}

