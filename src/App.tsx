import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Atom,
  BrainCircuit,
  Check,
  CirclePause,
  CirclePlay,
  GitBranch,
  Info,
  Layers,
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
import { SimulationCanvas } from './engine/SimulationCanvas';
import { clampPosition, type Point } from './engine/layout';
import { defaultValues, executeScene } from './engine/executor';
import type { Block, ChatMessage, SceneObject, SceneRelation, SceneSpec, Stage } from './types';

type DrawerTab = 'chat' | 'variables' | 'timeline' | 'inspector';

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Construa, arraste e compare. A IA organiza a estrutura; o motor executa objetos, relacoes, variaveis e eventos.'
  }
];

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
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [userRelations, setUserRelations] = useState<SceneRelation[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const sceneWithUserRelations = useMemo<SceneSpec>(() => ({
    ...scene,
    relations: [...scene.relations, ...userRelations],
    construction_events: [
      ...scene.construction_events,
      ...userRelations.map((relation) => ({ type: 'connect', relation: relation.id, caption: `Conexao manual: ${relation.from} -> ${relation.to}` }))
    ],
    click_explanations: {
      ...scene.click_explanations,
      ...Object.fromEntries(userRelations.map((relation) => [relation.id, `Conexao manual criada pelo usuario entre ${relation.from} e ${relation.to}. Ela funciona como relacao exploratoria ate a IA ou um motor de dominio atribuir uma regra formal.`]))
    }
  }), [scene, userRelations]);
  const sceneState = useMemo(() => executeScene(sceneWithUserRelations, { values, relationActive, positions, step }), [sceneWithUserRelations, values, relationActive, positions, step]);
  const objects = sceneState.objects;
  const a = Number(values['A.value'] ?? 2);
  const k = Number(values.k ?? 3);
  const b = objects.find((object) => object.id === 'B')?.value ?? a * k;
  const ratio = sceneState.measurements.ratio_AB ?? (a ? Number((Number(b) / a).toFixed(2)) : 0);

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
      setStep((current) => (current >= sceneWithUserRelations.construction_events.length - 1 ? current : current + 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, sceneWithUserRelations.construction_events.length]);

  async function openStage(block: Block, stage: Stage) {
    setActiveBlockId(block.id);
    setActiveStage(stage);
    setScene(demoScene);
    setValues(defaultValues(demoScene));
    setPositions({});
    setStep(0);
    setPlaying(true);
    setSelectedId('A');
    setConnectFrom(null);
    setUserRelations([]);
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
      const result = await askTutor({ message: content, scene: sceneWithUserRelations, selected_id: selectedId, variables: values, relation_active: relationActive });
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, source: result.source }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'A IA nao respondeu agora. A cena continua manipulavel localmente.' }]);
    }
  }

  async function submitTest(event: FormEvent) {
    event.preventDefault();
    const result = await evaluateMastery(answers, sceneWithUserRelations);
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
    if (connectFrom && connectFrom !== id) {
      const relation: SceneRelation = {
        id: `manual_${connectFrom}_${id}_${Date.now()}`,
        type: 'dependency',
        label: 'conexao manual',
        from: connectFrom,
        to: id,
        active: true
      };
      setUserRelations((current) => [...current, relation]);
      setConnectFrom(null);
      setStep((current) => current + 1);
    }
    setSelectedId(id);
    setModalPoint(point ?? null);
  }

  function inspectorText() {
    if (selectedId === 'live') {
      return `Estado atual: A = ${a}, k = ${k}, B = ${b}. B/A = ${ratio} ${relationActive ? 'permanece preso a k pela relacao ativa.' : 'esta livre porque a relacao foi removida.'}`;
    }
    return scene.click_explanations[selectedId] ?? 'Este item ainda nao tem descricao contextual gerada. A cena aceita posicao, conexoes e variaveis mesmo assim.';
  }

  function drawerContent() {
    if (drawerTab === 'chat') {
      return <><div className="messages">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`message ${message.role}`}>{message.content}</div>)}</div><form className="chat-form" onSubmit={sendMessage}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Pergunte sobre a cena atual" /><button><Send size={18} /></button></form></>;
    }
    if (drawerTab === 'variables') {
      return <div className="drawer-section">{scene.variables.map((variable) => <label key={variable.id} className="slider-row"><span>{variable.label ?? variable.id}: {values[variable.id]}</span><input type="range" min={variable.min} max={variable.max} step={variable.step} value={values[variable.id] ?? 0} onChange={(event) => setValues((current) => ({ ...current, [variable.id]: Number(event.target.value) }))} /></label>)}<button className={`relation-toggle ${relationActive ? '' : 'off'}`} onClick={() => setRelationActive((current) => !current)}><GitBranch size={18} /> {relationActive ? 'Remover relacao' : 'Reconectar relacao'}</button></div>;
    }
    if (drawerTab === 'timeline') {
      return <div className="drawer-section timeline-list">{sceneState.scene.construction_events.map((event, index) => <button key={`${event.type}-${index}`} className={index <= step ? 'done' : ''} onClick={() => setStep(index)}><span>{index + 1}</span>{event.caption ?? event.type}</button>)}</div>;
    }
    return <div className="drawer-section"><p>{inspectorText()}</p><button className="ghost" onClick={() => setSelectedId('live')}>Ler estado atual</button><button className="ghost" onClick={() => setConnectFrom(selectedId)}>{connectFrom ? `Conectando a partir de ${connectFrom}` : 'Criar conexao a partir deste item'}</button><h3>Validacao</h3>{sceneState.issues.length ? sceneState.issues.map((issue) => <p key={`${issue.path}-${issue.message}`} className={`issue ${issue.severity}`}>{issue.path}: {issue.message}</p>) : <p className="issue ok">SceneSpec v1 valida para execucao local.</p>}<h3>Limitacoes</h3>{scene.model_limitations.map((item) => <p key={item} className="limit">{item}</p>)}</div>;
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
          <button onClick={() => setStep((current) => Math.min(sceneWithUserRelations.construction_events.length - 1, current + 1))}>Avancar</button>
          <button onClick={() => { setStep(0); setRelationActive(true); setPositions({}); }}><RotateCcw size={18} /> Reconstruir</button>
        </div>

        <SimulationCanvas
          state={sceneState}
          svgRef={svgRef}
          relationActive={relationActive}
          selectedId={selectedId}
          draggingId={draggingId}
          onMove={moveDrag}
          onStopDrag={stopDrag}
          onObjectPointerDown={startDrag}
          onSelectObject={(object) => selectElement(object.id, { x: object.x ?? 50, y: object.y ?? 50 })}
          onSelectRelation={(relation, point) => selectElement(relation.id, point)}
        />

        {modalPoint && selectedId && (
          <div className="object-popover" style={{ left: `${Math.min(76, Math.max(18, modalPoint.x))}%`, top: `${Math.min(78, Math.max(12, modalPoint.y))}%` }}>
            <button onClick={() => setModalPoint(null)}><X size={14} /></button>
            <strong>{selectedId}</strong>
            <p>{inspectorText()}</p>
          </div>
        )}

        <div className="stage-caption">
          <Sparkles size={18} />
          <span>{connectFrom ? `Modo conexao ativo: clique em outro objeto para conectar a ${connectFrom}.` : scene.stage_goal}</span>
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
