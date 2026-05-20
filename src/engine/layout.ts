import type { SceneObject } from '../types';
import { primitiveFor } from './primitives';

export type Point = { x: number; y: number };

export function seedObjectLayout(object: SceneObject, index: number): SceneObject {
  const primitive = primitiveFor(object.type);
  return {
    ...object,
    x: object.x ?? 16 + (index % 5) * 15,
    y: object.y ?? 20 + Math.floor(index / 5) * 16,
    width: object.width ?? primitive.defaultSize.width,
    height: object.height ?? primitive.defaultSize.height
  };
}

export function clampPosition(object: SceneObject, next: Point): Point {
  const width = object.width ?? primitiveFor(object.type).defaultSize.width;
  const height = object.height ?? primitiveFor(object.type).defaultSize.height;
  return {
    x: Math.max(2, Math.min(98 - width, next.x)),
    y: Math.max(4, Math.min(96 - height, next.y))
  };
}

export function nudgeOverlaps(objects: SceneObject[]) {
  const placed: SceneObject[] = [];
  for (const object of objects) {
    let next = { ...object };
    let guard = 0;
    while (placed.some((item) => overlaps(item, next)) && guard < 20) {
      next = {
        ...next,
        x: Math.min(88, (next.x ?? 10) + 5),
        y: Math.min(88, (next.y ?? 10) + 4)
      };
      guard += 1;
    }
    placed.push(next);
  }
  return placed;
}

function overlaps(a: SceneObject, b: SceneObject) {
  const ax = a.x ?? 0;
  const ay = a.y ?? 0;
  const bx = b.x ?? 0;
  const by = b.y ?? 0;
  const aw = a.width ?? 10;
  const ah = a.height ?? 8;
  const bw = b.width ?? 10;
  const bh = b.height ?? 8;
  return ax < bx + bw + 2 && ax + aw + 2 > bx && ay < by + bh + 2 && ay + ah + 2 > by;
}

