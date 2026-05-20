import { demoBlock } from '../data/demo';
import type { Block } from '../types';

const KEY = 'stemingai.blocks.v1';

export function loadBlocks(): Block[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return [demoBlock];
  }
  try {
    const parsed = JSON.parse(raw) as Block[];
    return parsed.length ? parsed : [demoBlock];
  } catch {
    return [demoBlock];
  }
}

export function saveBlocks(blocks: Block[]) {
  localStorage.setItem(KEY, JSON.stringify(blocks));
}

