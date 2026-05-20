import type { PointerEvent } from 'react';
import type { SceneObject } from '../types';

export type ObjectRendererProps = {
  object: SceneObject;
  selected: boolean;
  dragging: boolean;
  label: string;
  onPointerDown: (event: PointerEvent<SVGGElement>, object: SceneObject) => void;
  onSelect: (object: SceneObject) => void;
};

export function RenderSceneObject({ object, selected, dragging, label, onPointerDown, onSelect }: ObjectRendererProps) {
  const x = object.x ?? 50;
  const y = object.y ?? 50;
  const width = object.width ?? 14;
  const height = object.height ?? 10;
  const color = object.color ?? '#38bdf8';
  const common = {
    onPointerDown: (event: PointerEvent<SVGGElement>) => onPointerDown(event, object),
    onClick: () => onSelect(object),
    className: `scene-object ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`
  };

  if (object.type === 'cell') {
    return (
      <g key={object.id} {...common}>
        <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} fill={color} opacity=".84" />
        <circle cx={x + width / 2} cy={y + height / 2} r="2.2" fill="#111827" />
        <text x={x + width / 2} y={y - 2} textAnchor="middle">{label}</text>
      </g>
    );
  }

  if (object.type === 'atom' || object.type === 'chemical_element') {
    const radius = object.radius ?? Math.min(width, height) / 2;
    return (
      <g key={object.id} {...common}>
        <circle cx={x + radius} cy={y + radius} r={radius} fill={color} />
        <text x={x + radius} y={y + radius + 1.6} textAnchor="middle" className="atom-symbol">{object.symbol ?? object.label.slice(0, 2)}</text>
        <text x={x + radius} y={y - 3} textAnchor="middle">{object.label}</text>
      </g>
    );
  }

  if (object.type === 'molecule') {
    return (
      <g key={object.id} {...common}>
        <circle cx={x + 5} cy={y + 7} r="4.6" fill="#60a5fa" />
        <circle cx={x + 14} cy={y + 3.8} r="3.2" fill="#f8fafc" />
        <circle cx={x + 14} cy={y + 10.2} r="3.2" fill="#f8fafc" />
        <line x1={x + 8} y1={y + 6} x2={x + 12} y2={y + 4} stroke="#dbeafe" />
        <line x1={x + 8} y1={y + 8} x2={x + 12} y2={y + 10} stroke="#dbeafe" />
        <text x={x + 9} y={y - 3} textAnchor="middle">{label}</text>
      </g>
    );
  }

  if (object.type === 'formula') {
    return (
      <g key={object.id} {...common}>
        <rect x={x} y={y} width={Math.max(width, 18)} height={height} rx="2.5" fill="#111827" stroke={color} />
        <text x={x + Math.max(width, 18) / 2} y={y + height / 2 + 1.5} textAnchor="middle">{object.formula ?? label}</text>
      </g>
    );
  }

  if (object.type === 'text') {
    return (
      <g key={object.id} {...common}>
        <rect x={x} y={y} width={Math.max(width, 18)} height={height} rx="2.5" fill="rgba(15,23,42,.72)" stroke={color} strokeDasharray="1.4 1.2" />
        <text x={x + Math.max(width, 18) / 2} y={y + height / 2 + 1.5} textAnchor="middle">{object.text ?? label}</text>
      </g>
    );
  }

  if (object.type === 'symbol') {
    return (
      <g key={object.id} {...common}>
        <circle cx={x + width / 2} cy={y + height / 2} r={Math.min(width, height) / 2} fill="#0f172a" stroke={color} strokeWidth=".8" />
        <text x={x + width / 2} y={y + height / 2 + 1.7} textAnchor="middle" className="large-symbol">{object.symbol ?? object.text ?? label}</text>
      </g>
    );
  }

  if (object.type === 'vector') {
    return (
      <g key={object.id} {...common}>
        <line x1={x} y1={y + height / 2} x2={x + width} y2={y + height / 2} stroke={color} strokeWidth="1.2" markerEnd="url(#arrow)" />
        <text x={x + width / 2} y={y - 2} textAnchor="middle">{label}</text>
      </g>
    );
  }

  if (object.type === 'solid_3d') {
    const depth = object.depth ?? 5;
    const dx = depth * 0.7;
    const dy = -depth * 0.55;
    return (
      <g key={object.id} {...common} className={`${common.className} pseudo-3d`}>
        <polygon points={`${x},${y} ${x + width},${y} ${x + width + dx},${y + dy} ${x + dx},${y + dy}`} fill={color} opacity=".58" />
        <polygon points={`${x + width},${y} ${x + width},${y + height} ${x + width + dx},${y + height + dy} ${x + width + dx},${y + dy}`} fill={color} opacity=".36" />
        <rect x={x} y={y} width={width} height={height} rx="1.8" fill={color} opacity=".74" />
        <polyline points={`${x},${y} ${x + dx},${y + dy} ${x + width + dx},${y + dy} ${x + width},${y}`} fill="none" stroke="#e0f2fe" strokeWidth=".35" />
        <text x={x + width / 2} y={y - 3} textAnchor="middle">{label}</text>
      </g>
    );
  }

  if (object.type === 'surface_3d') {
    const top = y + height * 0.25;
    const mid = y + height * 0.55;
    const bottom = y + height * 0.85;
    return (
      <g key={object.id} {...common} className={`${common.className} pseudo-3d`}>
        <path d={`M ${x} ${mid} C ${x + width * .25} ${top}, ${x + width * .55} ${bottom}, ${x + width} ${mid}`} fill="none" stroke={color} strokeWidth="1.2" />
        <path d={`M ${x} ${bottom} C ${x + width * .28} ${mid}, ${x + width * .62} ${top}, ${x + width} ${bottom}`} fill="none" stroke="#e0f2fe" strokeWidth=".45" opacity=".7" />
        <text x={x + width / 2} y={y - 2} textAnchor="middle">{label}</text>
      </g>
    );
  }

  if (object.type === 'polygon' && object.points?.length) {
    const points = object.points.map((point) => `${x + point.x},${y + point.y}`).join(' ');
    return (
      <g key={object.id} {...common}>
        <polygon points={points} fill={color} opacity=".32" stroke={color} strokeWidth=".9" />
        <text x={x + 8} y={y - 2}>{label}</text>
      </g>
    );
  }

  if (object.type === 'point') {
    return (
      <g key={object.id} {...common}>
        <circle cx={x + 2} cy={y + 2} r="2.2" fill={color} />
        <text x={x + 3} y={y - 2}>{label}</text>
      </g>
    );
  }

  if (object.type === 'relation_label') {
    return (
      <g key={object.id} {...common}>
        <rect x={x} y={y} width={width} height={height} rx="2.8" fill="#090b16" stroke={color} strokeWidth=".8" />
        <text x={x + width / 2} y={y + height / 2 + 1.3} textAnchor="middle">{label}</text>
      </g>
    );
  }

  return (
    <g key={object.id} {...common}>
      <rect x={x} y={y} width={width} height={height} rx="2.6" fill={color} />
      <text x={x + width / 2} y={y - 2} textAnchor="middle">{label}</text>
    </g>
  );
}
