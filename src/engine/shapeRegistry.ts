import type { EnvironmentSpec, ShapeDefinition, ShapeSpec } from '../types';

export const SHAPE_REGISTRY: Record<ShapeSpec['type'], ShapeDefinition> = {
  point2d: {
    type: 'point2d',
    environments: ['euclideanPlane2d', 'cartesianPlane2d', 'freeCanvas2d'],
    properties: ['position', 'label', 'draggable'],
    operations: ['create', 'move', 'highlight', 'measure'],
    defaultGeometry: { radius: 2.2 }
  },
  segment2d: {
    type: 'segment2d',
    environments: ['euclideanPlane2d', 'cartesianPlane2d', 'freeCanvas2d'],
    properties: ['start', 'end', 'length'],
    operations: ['create', 'move', 'highlight', 'measure', 'connect'],
    defaultGeometry: { width: 18, height: 3 }
  },
  bar: {
    type: 'bar',
    environments: ['freeCanvas2d', 'cartesianPlane2d', 'dataSpace2d'],
    properties: ['value', 'width', 'unit', 'partitions'],
    operations: ['create', 'move', 'scale', 'measure', 'update'],
    defaultGeometry: { width: 18, height: 8 }
  },
  circle: {
    type: 'circle',
    environments: ['euclideanPlane2d', 'cartesianPlane2d', 'freeCanvas2d'],
    properties: ['center', 'radius'],
    operations: ['create', 'move', 'scale', 'measure'],
    defaultGeometry: { radius: 6 }
  },
  polygon: {
    type: 'polygon',
    environments: ['euclideanPlane2d', 'cartesianPlane2d', 'freeCanvas2d'],
    properties: ['vertices', 'sides', 'area'],
    operations: ['create', 'move', 'scale', 'measure'],
    defaultGeometry: { points: [{ x: 0, y: 10 }, { x: 8, y: 0 }, { x: 16, y: 10 }] }
  },
  vector2d: {
    type: 'vector2d',
    environments: ['physicsLab2d', 'cartesianPlane2d', 'freeCanvas2d'],
    properties: ['origin', 'components', 'magnitude', 'direction'],
    operations: ['create', 'move', 'scale', 'rotate', 'measure'],
    defaultGeometry: { width: 20, height: 8 }
  },
  axis2d: {
    type: 'axis2d',
    environments: ['cartesianPlane2d', 'dataSpace2d'],
    properties: ['range', 'ticks', 'unit'],
    operations: ['create', 'move', 'update'],
    defaultGeometry: { width: 80, height: 1 }
  },
  curve2d: {
    type: 'curve2d',
    environments: ['cartesianPlane2d', 'dataSpace2d'],
    properties: ['expression', 'samples'],
    operations: ['create', 'highlight', 'measure', 'update'],
    defaultGeometry: { samples: [] }
  },
  connector: {
    type: 'connector',
    environments: ['freeCanvas2d', 'graphWorkspace', 'cellCrossSection2d', 'chemicalContainer2d'],
    properties: ['from', 'to', 'direction', 'label'],
    operations: ['create', 'connect', 'highlight'],
    defaultGeometry: {}
  },
  label: {
    type: 'label',
    environments: ['freeCanvas2d', 'euclideanPlane2d', 'cartesianPlane2d', 'physicsLab2d', 'graphWorkspace', 'dataSpace2d', 'cellCrossSection2d', 'chemicalContainer2d', 'space3d'],
    properties: ['text', 'anchor', 'layer'],
    operations: ['create', 'move', 'update', 'highlight'],
    defaultGeometry: { width: 22, height: 8 }
  },
  particle2d: {
    type: 'particle2d',
    environments: ['chemicalContainer2d', 'physicsLab2d', 'cellCrossSection2d', 'freeCanvas2d'],
    properties: ['position', 'radius', 'charge', 'state'],
    operations: ['create', 'move', 'connect', 'measure'],
    defaultGeometry: { radius: 5 }
  },
  region2d: {
    type: 'region2d',
    environments: ['cellCrossSection2d', 'freeCanvas2d', 'chemicalContainer2d'],
    properties: ['boundary', 'contains', 'state'],
    operations: ['create', 'move', 'highlight', 'measure'],
    defaultGeometry: { width: 20, height: 14 }
  },
  solid3dProjection: {
    type: 'solid3dProjection',
    environments: ['space3d', 'freeCanvas2d', 'physicsLab2d', 'chemicalContainer2d'],
    properties: ['position', 'depth', 'rotation', 'volume'],
    operations: ['create', 'move', 'scale', 'rotate', 'measure'],
    defaultGeometry: { width: 18, height: 16, depth: 5 }
  }
};

export function shapeDefinition(type: ShapeSpec['type']) {
  return SHAPE_REGISTRY[type] ?? SHAPE_REGISTRY.label;
}

export function shapeSupportsEnvironment(shapeType: ShapeSpec['type'], environmentType: EnvironmentSpec['type']) {
  const definition = shapeDefinition(shapeType);
  return definition.environments.includes(environmentType);
}

