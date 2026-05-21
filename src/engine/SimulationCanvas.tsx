import { PointerEvent, RefObject } from 'react';
import type { SceneObject, SceneRelation, SceneState } from '../types';
import { relationEndpoints } from './executor';
import { RenderSceneObject } from './renderers2d';

export type SimulationCanvasProps = {
  state: SceneState;
  svgRef: RefObject<SVGSVGElement | null>;
  relationActive: boolean;
  selectedId: string;
  draggingId: string | null;
  onMove: (event: PointerEvent<SVGSVGElement>) => void;
  onStopDrag: () => void;
  onObjectPointerDown: (event: PointerEvent<SVGGElement>, object: SceneObject) => void;
  onSelectObject: (object: SceneObject) => void;
  onSelectRelation: (relation: SceneRelation, point: { x: number; y: number }) => void;
};

export function SimulationCanvas({
  state,
  svgRef,
  relationActive,
  selectedId,
  draggingId,
  onMove,
  onStopDrag,
  onObjectPointerDown,
  onSelectObject,
  onSelectRelation
}: SimulationCanvasProps) {
  const visibleObjects = state.objects.filter((object) => state.visibleIds.has(object.id));
  const ratio = state.measurements.ratio_AB;

  return (
    <svg ref={svgRef} className="world-canvas" viewBox="0 0 100 100" onPointerMove={onMove} onPointerUp={onStopDrag} onPointerLeave={onStopDrag}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#ffffff" /></marker>
      </defs>
      <g className="grid-lines">
        {Array.from({ length: 10 }).map((_, index) => <line key={index} x1={index * 10} y1="0" x2={index * 10} y2="100" />)}
        {Array.from({ length: 10 }).map((_, index) => <line key={`h-${index}`} x1="0" y1={index * 10} x2="100" y2={index * 10} />)}
      </g>
      <EnvironmentOverlay state={state} />
      {state.scene.relations.map((relation) => {
        if (!state.visibleIds.has(relation.id) || !relationActive) return null;
        const endpoints = relationEndpoints(state.objects, relation);
        if (!endpoints) return null;
        const point = { x: (endpoints.x1 + endpoints.x2) / 2, y: (endpoints.y1 + endpoints.y2) / 2 };
        return (
          <g key={relation.id} className="relation-group" onClick={() => onSelectRelation(relation, point)}>
            <line {...endpoints} markerEnd="url(#arrow)" />
            <text x={point.x} y={point.y - 2} textAnchor="middle">{relation.label ?? relation.type}</text>
          </g>
        );
      })}
      {visibleObjects.map((object) => (
        <RenderSceneObject
          key={object.id}
          object={object}
          selected={selectedId === object.id}
          dragging={draggingId === object.id}
          label={object.id === 'ratio_AB' ? (relationActive ? `B/A = ${ratio}` : 'B/A livre') : `${object.label}${object.value !== undefined ? `: ${object.value}` : ''}`}
          onPointerDown={onObjectPointerDown}
          onSelect={onSelectObject}
        />
      ))}
    </svg>
  );
}

function EnvironmentOverlay({ state }: { state: SceneState }) {
  const environment = Object.values(state.engine.environments)[0];
  if (!environment) return null;

  if (environment.type === 'cartesianPlane2d' || environment.type === 'euclideanPlane2d') {
    return (
      <g className="environment-overlay">
        <line x1="5" y1="50" x2="95" y2="50" />
        <line x1="50" y1="5" x2="50" y2="95" />
        <text x="92" y="48">x</text>
        <text x="52" y="8">y</text>
      </g>
    );
  }

  if (environment.type === 'cellCrossSection2d') {
    return (
      <g className="environment-overlay">
        <ellipse cx="50" cy="52" rx="38" ry="30" />
        <text x="50" y="18" textAnchor="middle">corte celular</text>
      </g>
    );
  }

  if (environment.type === 'chemicalContainer2d') {
    return (
      <g className="environment-overlay">
        <rect x="8" y="12" width="84" height="76" rx="4" />
        <text x="50" y="10" textAnchor="middle">recipiente químico</text>
      </g>
    );
  }

  if (environment.type === 'space3d') {
    return (
      <g className="environment-overlay pseudo-3d">
        <polygon points="18,72 62,72 82,54 38,54" />
        <line x1="18" y1="72" x2="18" y2="24" />
        <line x1="62" y1="72" x2="62" y2="24" />
        <line x1="82" y1="54" x2="82" y2="16" />
        <text x="74" y="52">z</text>
      </g>
    );
  }

  return (
    <g className="environment-overlay">
      <rect x="4" y="6" width="92" height="88" rx="3" />
      <text x="7" y="10">{environment.type}</text>
    </g>
  );
}
