import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Atom,
  Bot,
  BrainCircuit,
  Check,
  CirclePause,
  CirclePlay,
  FlaskConical,
  GitBranch,
  Info,
  Layers,
  Maximize2,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  X
} from 'lucide-react';
import { demoScene } from './data/demo';
import { askTutor, evaluateMastery, generateScene, generateStages } from './services/api';
import { loadBlocks, saveBlocks } from './state/storage';
import { loadBlocksFromSupabase, saveBlockToSupabase } from './services/supabase';
import type { Block, ChatMessage, SceneEvent, SceneObject, SceneRelation, SceneSpec, Stage } from './types';

type DrawerTab = 'chat' | 'variables' | 'timeline' | 'inspector';
type Point = { x: number; y: number };

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Construa, arraste e compare. A IA organiza a estrutura; o motor executa objetos, relacoes, variaveis e eventos.'
  }
];

function defaultValues(scene: SceneSpec) {
  return Object.fromEntries(scene.variables.map((variable) => [variable.id, Number(variable.default ?? variable.min ?? 0)]));
}

function eventKey(event: SceneEvent) {
  return event.target ?? event.relation ?? '';
}

function visibleIds(scene: SceneSpec, step: number) {
  const events = scene.construction_events.slice(0, step + 1);
  const ids = new Set(events.map(eventKey).filter(Boolean));
  for (const event of events) {
    if (event.type === 'connect' && event.relation) {
      const relation = scene.relations.find((item) => item.id === event.relation);
      if (relation) {
        ids.add(relation.from);
        ids.add(relation.to);
      }
    }
  }
  return ids;
}

function relationEndpoints(objects: SceneObject[], relation: SceneRelation) {
  const from = objects.find((object) => object.id === relation.from);
  const to = objects.find((object) => object.id === relation.to);
  if (!from || !to) return null;
  return {
    x1: (from.x ?? 20) + (from.width ?? 20) / 2,
    y1: (from.y ?? 50) + (from.height ?? 12) / 2,
    x2: (to.x ?? 60) + (to.width ?? 20) / 2,
    y2: (to.y ?? 50) + (to.height ?? 12) / 2
  };
}

function resolveObjects(scene: SceneSpec, values: Record<string, number>, relationActive: boolean, positions: Record<string, Point>): SceneObject[] {
  const a = Number(values['A.value'] ?? 2);
  const k = Number(values.k ?? 3);
  return scene.objects.map((raw, index) => {
    const seeded = {
      ...raw,
      x: raw.x ?? 22 + (index % 4) * 16,
      y: raw.y ?? 24 + Math.floor(index / 4) * 18,
      width: raw.width ?? (raw.type === 'quantity' ? 20 : raw.type === 'relation_label' ? 18 : 12),
      height: raw.height ?? (raw.type === 'quantity' ? 8 : raw.type === 'relation_label' ? 10 : 12)
    };
    const positioned = positions[raw.id] ? { ...seeded, ...positions[raw.id] } : seeded;
    if (raw.id === 'A') return { ...positioned, value: a, width: Math.max(14, a * 3.8) };
    if (raw.id === 'B' && relationActive) return { ...positioned, value: Number((a * k).toFixed(2)), width: Math.max(14, a * k * 2.2) };
    return positioned;
  });
}

function clampPosition(object: SceneObject, next: Point): Point {
  const width = object.width ?? 14;
  const height = object.height ?? 10;
  return {
    x: Math.max(3, Math.min(97 - width, next.x)),
    y: Math.max(5, Math.min(95 - height, next.y))
  };
}

function App() {
  const [blocks, setBlocks] = useState<Block[]>(loadBlocks);
  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id ?? '');
  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? blocks[0];
  const [activeStage, setActiveStage] = useState<Stage>(activeBlock.stages[0]);
  const [scene, setScene] = useState<SceneSpec>(demoScene);
  const [values, setValues] = useState<Record<string, number>>(defaultValues(demoScene));
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('A');
  const [relationActive, setRelationActive] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [newTopic, setNewTopic] = useState('Moléculas de água e ligações');
  const [newGoal, setNewGoal] = useState('Visualizar objetos, relações, variáveis e limitações do modelo.');
  const [level, setLevel] = useState('iniciante');
  const [creating, setCreating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('chat');
  const [testOpen, setTestOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalPoint, setModalPoint] = useState<Point | null>({ x: 17, y: 62 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const objects = useMemo(() => resolveObjects(scene, values, relationActive, positions), [scene, values, relationActive, positions]);
  const ids = useMemo(() => visibleIds(scene, step), [scene, step]);
  const visibleObjects = objects.filter((object) => ids.has(object.id));
  const a = Number(values['A.value'] ?? 2);
  const k = Number(values.k ?? 3);
  const b = objects.find((object) => object.id === 'B')?.value ?? a * k;
  const ratio = a ? Number((Number(b) / a).toFixed(2)) : 0;

  useEffect(() => {
    loadBlocksFromSupabase().then((remoteBlocks) => {
      if (remoteBlocks?.length) {
        setBlocks(remoteBlocks);
        setActiveBlockId(remoteBlocks[0].id);
        setActiveStage(remoteBlocks[0].stages[0]);
      }
    });
  }, []);

  useEffect(() => saveBlocks(blocks), [blocks]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current >= scene.construction_events.length - 1 ? current : current + 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, scene.construction_events.length]);

  async function openStage(block: Block, stage: Stage) {
    setActiveBlockId(block.id);
    setActiveStage(stage);
    setScene(demoScene);
    setValues(defaultValues(demoScene));
    setPositions({});
    setStep(0);
    setPlaying(true);
    setSelectedId('A');
    setModalPoint({ x: 17, y: 62 });
    const nextScene = await generateScene(block.topic, stage.title, stage.goal);
    setScene(nextScene);
    setValues(defaultValues(nextScene));
  }

  async function createBlock(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const stages = await generateStages(newTopic, newGoal, level);
      const block: Block = {
        id: crypto.randomUUID(),
        title: newTopic,
        topic: newTopic,
        goal: newGoal,
        level,
        status: 'em andamento',
        stages: stages.map((stage, index) => ({ ...stage, status: index === 0 ? 'active' : stage.status })),
        updatedAt: new Date().toISOString()
      };
      setBlocks((current) => [block, ...current]);
      saveBlockToSupabase(block);
      await openStage(block, block.stages[0]);
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    setChatInput('');
    setMessages((current) => [...current, { role: 'user', content }]);
    try {
      const result = await askTutor({ message: content, scene, selected_id: selectedId, variables: values, relation_active: relationActive });
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, source: result.source }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'A IA nao respondeu agora. A cena continua manipulavel localmente.' }]);
    }
  }

  async function submitTest(event: FormEvent) {
    event.preventDefault();
    const result = await evaluateMastery(answers, scene);
    setTestResult(`Score ${result.score}/100. ${result.feedback}`);
    const updated = blocks.map((block) =>
      block.id === activeBlock.id
        ? { ...block, stages: block.stages.map((stage) => (stage.id === activeStage.id ? { ...stage, mastery_score: result.score, status: result.score >= 70 ? 'done' : 'active' } : stage)) }
        : block
    );
    setBlocks(updated);
    const changed = updated.find((block) => block.id === activeBlock.id);
    if (changed) saveBlockToSupabase(changed);
  }

  function svgPoint(event: PointerEvent<SVGSVGElement | SVGGElement>) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const bounds = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100
    };
  }

  function startDrag(event: PointerEvent<SVGGElement>, object: SceneObject) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(object.id);
    setSelectedId(object.id);
    setModalPoint({ x: object.x ?? 50, y: object.y ?? 50 });
  }

  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (!draggingId) return;
    const object = objects.find((item) => item.id === draggingId);
    if (!object) return;
    const point = svgPoint(event);
    const next = clampPosition(object, { x: point.x - (object.width ?? 14) / 2, y: point.y - (object.height ?? 10) / 2 });
    setPositions((current) => ({ ...current, [draggingId]: next }));
    setModalPoint(next);
  }

  function stopDrag() {
    setDraggingId(null);
  }

  function selectElement(id: string, point?: Point) {
    setSelectedId(id);
    setModalPoint(point ?? null);
  }

  function inspectorText() {
    if (selectedId === 'live') {
      return `Estado atual: A = ${a}, k = ${k}, B = ${b}. B/A = ${ratio} ${relationActive ? 'permanece preso a k pela relacao ativa.' : 'esta livre porque a relacao foi removida.'}`;
    }
    return scene.click_explanations[selectedId] ?? 'Este item ainda nao tem descricao contextual gerada. A cena aceita posicao, conexoes e variaveis mesmo assim.';
  }

  function renderObject(object: SceneObject) {
    const x = object.x ?? 50;
    const y = object.y ?? 50;
    const width = object.width ?? 14;
    const height = object.height ?? 10;
    const color = object.color ?? '#38bdf8';
    const selected = selectedId === object.id;
    const label = object.id === 'ratio_AB' ? (relationActive ? `B/A = ${ratio}` : 'B/A livre') : `${object.label}${object.value !== undefined ? `: ${object.value}` : ''}`;

    const common = {
      onPointerDown: (event: PointerEvent<SVGGElement>) => startDrag(event, object),
      onClick: () => selectElement(object.id, { x, y }),
      className: `scene-object ${selected ? 'selected' : ''} ${draggingId === object.id ? 'dragging' : ''}`
    };

    if (object.type === 'cell') {
      return <g key={object.id} {...common}><ellipse cx={x + 7} cy={y + 6} rx="9" ry="6.5" fill={color} opacity=".84" /><circle cx={x + 7} cy={y + 6} r="2.2" fill="#111827" /><text x={x + 7} y={y - 2} textAnchor="middle">{label}</text></g>;
    }
    if (object.type === 'atom' || object.type === 'chemical_element') {
      return <g key={object.id} {...common}><circle cx={x + 6} cy={y + 6} r="6" fill={color} /><text x={x + 6} y={y + 7.6} textAnchor="middle" className="atom-symbol">{object.symbol ?? object.label.slice(0, 2)}</text><text x={x + 6} y={y - 3} textAnchor="middle">{object.label}</text></g>;
    }
    if (object.type === 'molecule') {
      return <g key={object.id} {...common}><circle cx={x + 5} cy={y + 7} r="4.6" fill="#60a5fa" /><circle cx={x + 14} cy={y + 3.8} r="3.2" fill="#f8fafc" /><circle cx={x + 14} cy={y + 10.2} r="3.2" fill="#f8fafc" /><line x1={x + 8} y1={y + 6} x2={x + 12} y2={y + 4} stroke="#dbeafe" /><line x1={x + 8} y1={y + 8} x2={x + 12} y2={y + 10} stroke="#dbeafe" /><text x={x + 9} y={y - 3} textAnchor="middle">{label}</text></g>;
    }
    if (object.type === 'formula') {
      return <g key={object.id} {...common}><rect x={x} y={y} width={Math.max(width, 18)} height={height} rx="2.5" fill="#111827" stroke={color} /><text x={x + Math.max(width, 18) / 2} y={y + height / 2 + 1.5} textAnchor="middle">{object.formula ?? label}</text></g>;
    }
    if (object.type === 'polygon' && object.points?.length) {
      const points = object.points.map((point) => `${x + point.x},${y + point.y}`).join(' ');
      return <g key={object.id} {...common}><polygon points={points} fill={color} opacity=".32" stroke={color} strokeWidth=".9" /><text x={x + 8} y={y - 2}>{label}</text></g>;
    }
    if (object.type === 'relation_label') {
      return <g key={object.id} {...common}><rect x={x} y={y} width={width} height={height} rx="2.8" fill="#090b16" stroke={color} strokeWidth=".8" /><text x={x + width / 2} y={y + height / 2 + 1.3} textAnchor="middle">{label}</text></g>;
    }
    return <g key={object.id} {...common}><rect x={x} y={y} width={width} height={height} rx="2.6" fill={color} /><text x={x + width / 2} y={y - 2} textAnchor="middle">{label}</text></g>;
  }

  function drawerContent() {
    if (drawerTab === 'chat') {
      return <><div className="messages">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`message ${message.role}`}>{message.content}</div>)}</div><form className="chat-form" onSubmit={sendMessage}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Pergunte sobre a cena atual" /><button><Send size={18} /></button></form></>;
    }
    if (drawerTab === 'variables') {
      return <div className="drawer-section">{scene.variables.map((variable) => <label key={variable.id} className="slider-row"><span>{variable.label ?? variable.id}: {values[variable.id]}</span><input type="range" min={variable.min} max={variable.max} step={variable.step} value={values[variable.id] ?? 0} onChange={(event) => setValues((current) => ({ ...current, [variable.id]: Number(event.target.value) }))} /></label>)}<button className={`relation-toggle ${relationActive ? '' : 'off'}`} onClick={() => setRelationActive((current) => !current)}><GitBranch size={18} /> {relationActive ? 'Remover relacao' : 'Reconectar relacao'}</button></div>;
    }
    if (drawerTab === 'timeline') {
      return <div className="drawer-section timeline-list">{scene.construction_events.map((event, index) => <button key={`${event.type}-${index}`} className={index <= step ? 'done' : ''} onClick={() => setStep(index)}><span>{index + 1}</span>{event.caption ?? event.type}</button>)}</div>;
    }
    return <div className="drawer-section"><p>{inspectorText()}</p><button className="ghost" onClick={() => setSelectedId('live')}>Ler estado atual</button><h3>Limitacoes</h3>{scene.model_limitations.map((item) => <p key={item} className="limit">{item}</p>)}</div>;
  }

  return (
    <main className="lab-shell">
      <aside className="left-rail">
        <div className="brand">
          <BrainCircuit />
          <div><strong>STEMingAI</strong><span>Laboratorio estrutural</span></div>
        </div>
        <form className="create-block" onSubmit={createBlock}>
          <label>Assunto<input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} /></label>
          <label>Objetivo<textarea value={newGoal} onChange={(event) => setNewGoal(event.target.value)} /></label>
          <label>Nivel<select value={level} onChange={(event) => setLevel(event.target.value)}><option>iniciante</option><option>intermediario</option><option>avancado</option></select></label>
          <button className="primary" disabled={creating}><Plus size={18} /> {creating ? 'Gerando' : 'Criar bloco'}</button>
        </form>
        <section className="block-list">
          {blocks.map((block) => <button key={block.id} className={`block-card ${block.id === activeBlock.id ? 'active' : ''}`} onClick={() => openStage(block, block.stages[0])}><span>{block.title}</span><small>{block.stages.filter((stage) => stage.status === 'done').length}/{block.stages.length} etapas dominadas</small></button>)}
        </section>
      </aside>

      <section className="immersive-stage">
        <div className="aurora" />
        <header className="stage-head">
          <div><strong>{activeBlock.title}</strong><span>{activeStage.title}</span></div>
          <div className="engine-badge"><Atom size={17} /> Motor {scene.engine ?? '2d'} modular</div>
        </header>

        <div className="floating-toolbar">
          <button onClick={() => setPlaying((current) => !current)}>{playing ? <CirclePause size={18} /> : <CirclePlay size={18} />}</button>
          <button onClick={() => setStep((current) => Math.max(0, current - 1))}>Voltar</button>
          <button onClick={() => setStep((current) => Math.min(scene.construction_events.length - 1, current + 1))}>Avancar</button>
          <button onClick={() => { setStep(0); setRelationActive(true); setPositions({}); }}><RotateCcw size={18} /> Reconstruir</button>
        </div>

        <svg ref={svgRef} className="world-canvas" viewBox="0 0 100 100" onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerLeave={stopDrag}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#ffffff" /></marker>
          </defs>
          <g className="grid-lines">{Array.from({ length: 10 }).map((_, index) => <line key={index} x1={index * 10} y1="0" x2={index * 10} y2="100" />)}{Array.from({ length: 10 }).map((_, index) => <line key={`h-${index}`} x1="0" y1={index * 10} x2="100" y2={index * 10} />)}</g>
          {scene.relations.map((relation) => {
            if (!ids.has(relation.id) || !relationActive) return null;
            const endpoints = relationEndpoints(objects, relation);
            if (!endpoints) return null;
            return <g key={relation.id} className="relation-group" onClick={() => selectElement(relation.id, { x: (endpoints.x1 + endpoints.x2) / 2, y: (endpoints.y1 + endpoints.y2) / 2 })}><line {...endpoints} markerEnd="url(#arrow)" /><text x={(endpoints.x1 + endpoints.x2) / 2} y={(endpoints.y1 + endpoints.y2) / 2 - 2} textAnchor="middle">{relation.label ?? relation.type}</text></g>;
          })}
          {visibleObjects.map(renderObject)}
        </svg>

        {modalPoint && selectedId && (
          <div className="object-popover" style={{ left: `${Math.min(76, Math.max(18, modalPoint.x))}%`, top: `${Math.min(78, Math.max(12, modalPoint.y))}%` }}>
            <button onClick={() => setModalPoint(null)}><X size={14} /></button>
            <strong>{selectedId}</strong>
            <p>{inspectorText()}</p>
          </div>
        )}

        <div className="stage-caption">
          <Sparkles size={18} />
          <span>{scene.stage_goal}</span>
        </div>

        <button className="fab" onClick={() => setDrawerOpen(true)}><Settings2 size={24} /></button>
        <button className="test-fab" onClick={() => setTestOpen(true)}><TestTube2 size={21} /></button>
      </section>

      {drawerOpen && (
        <aside className="control-drawer">
          <header><strong>Paineis</strong><button onClick={() => setDrawerOpen(false)}><X size={18} /></button></header>
          <nav>
            <button className={drawerTab === 'chat' ? 'active' : ''} onClick={() => setDrawerTab('chat')}><MessageSquare size={18} /> Chat</button>
            <button className={drawerTab === 'variables' ? 'active' : ''} onClick={() => setDrawerTab('variables')}><SlidersHorizontal size={18} /> Variaveis</button>
            <button className={drawerTab === 'timeline' ? 'active' : ''} onClick={() => setDrawerTab('timeline')}><Layers size={18} /> Timeline</button>
            <button className={drawerTab === 'inspector' ? 'active' : ''} onClick={() => setDrawerTab('inspector')}><Info size={18} /> Inspector</button>
          </nav>
          {drawerContent()}
        </aside>
      )}

      {testOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitTest}>
            <button type="button" className="close" onClick={() => setTestOpen(false)}>x</button>
            <h2>Teste de proficiencia</h2>
            <label>Qual elemento funciona como variavel de entrada?<select value={answers.q1 ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, q1: event.target.value }))}><option value="">Selecione</option><option>Grandeza A</option><option>Grandeza B</option><option>Invariante B/A</option></select></label>
            <label>O que deixa de valer quando B = k * A e removida?<select value={answers.q2 ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, q2: event.target.value }))}><option value="">Selecione</option><option>B precisa acompanhar A</option><option>A pode ser alterada</option><option>k existe no painel</option></select></label>
            <label>Explique o invariante.<textarea value={answers.q3 ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, q3: event.target.value }))} /></label>
            <button className="primary"><Check size={18} /> Avaliar dominio</button>
            {testResult && <p className="result">{testResult}</p>}
          </form>
        </div>
      )}
    </main>
  );
}

export default App;
