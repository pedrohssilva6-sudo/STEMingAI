import type { Block } from '../types';

const KEY = 'stemingai.blocks.v1';

export function loadBlocks(): Block[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Block[];
    return parsed.filter((block) => block.id !== 'demo-proporcao');
  } catch {
    return [];
  }
}

export function saveBlocks(blocks: Block[]) {
  localStorage.setItem(KEY, JSON.stringify(blocks));
}
