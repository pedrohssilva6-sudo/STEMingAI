import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, BrainCircuit, Check, ChevronLeft, CirclePause, CirclePlay, FlaskConical, GitBranch, PanelLeft, Plus, RotateCcw, Send, SlidersHorizontal, TestTube2 } from 'lucide-react';
import { demoScene } from './data/demo';
import { askTutor, evaluateMastery, generateScene, generateStages } from './services/api';
import { loadBlocks, saveBlocks } from './state/storage';
import type { Block, ChatMessage, SceneEvent, SceneObject, SceneSpec, Stage } from './types';

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Vamos construir a proporcao como estrutura: primeiro A, depois B, depois a conexao B = k * A e o invariante B/A.'
  }
];

function defaultValues(scene: SceneSpec) {
  return Object.fromEntries(scene.variables.map((variable) => [variable.id, variable.default ?? variable.min ?? 0]));
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

function computedObjects(scene: SceneSpec, values: Record<string, number>, relationActive: boolean): SceneObject[] {
  const a = Number(values['A.value'] ?? 2);
  const k = Number(values.k ?? 3);
  return scene.objects.map((object) => {
    if (object.id === 'A') return { ...object, value: a };
    if (object.id === 'B' && relationActive) return { ...object, value: Number((a * k).toFixed(2)) };
    return object;
  });
}

function App() {
  const [blocks, setBlocks] = useState<Block[]>(loadBlocks);
  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id ?? '');
  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? blocks[0];
  const [activeStage, setActiveStage] = useState<Stage>(activeBlock.stages[0]);
  const [scene, setScene] = useState<SceneSpec>(demoScene);
  const [values, setValues] = useState<Record<string, number>>(defaultValues(demoScene));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('A');
  const [relationActive, setRelationActive] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [newTopic, setNewTopic] = useState('Funcao como maquina entrada-transformacao-saida');
  const [newGoal, setNewGoal] = useState('Visualizar dependencia entre entrada, regra e saida.');
  const [level, setLevel] = useState('iniciante');
  const [creating, setCreating] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState('');

  const objects = useMemo(() => computedObjects(scene, values, relationActive), [scene, values, relationActive]);
  const ids = useMemo(() => visibleIds(scene, step), [scene, step]);
  const a = Number(values['A.value'] ?? 2);
  const k = Number(values.k ?? 3);
  const b = objects.find((object) => object.id === 'B')?.value ?? a * k;
  const ratio = a ? Number((Number(b) / a).toFixed(2)) : 0;

  useEffect(() => saveBlocks(blocks), [blocks]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current >= scene.construction_events.length - 1 ? current : current + 1));
    }, 1050);
    return () => window.clearInterval(timer);
  }, [playing, scene.construction_events.length]);

  async function openStage(block: Block, stage: Stage) {
    setActiveBlockId(block.id);
    setActiveStage(stage);
    setScene(demoScene);
    setValues(defaultValues(demoScene));
    setStep(0);
    setPlaying(true);
    setSelectedId('A');
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
      setActiveBlockId(block.id);
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
      setMessages((current) => [...current, { role: 'assistant', content: 'Nao consegui chamar a IA agora. Pela cena: a relacao ativa e o que preserva B/A como k.' }]);
    }
  }

  async function submitTest(event: FormEvent) {
    event.preventDefault();
    const result = await evaluateMastery(answers, scene);
    setTestResult(`Score ${result.score}/100. ${result.feedback}`);
    setBlocks((current) =>
      current.map((block) =>
        block.id === activeBlock.id
          ? { ...block, stages: block.stages.map((stage) => (stage.id === activeStage.id ? { ...stage, mastery_score: result.score, status: result.score >= 70 ? 'done' : 'active' } : stage)) }
          : block
      )
    );
  }

  function inspectorText() {
    if (selectedId === 'live') {
      return `Estado atual: A = ${a}, k = ${k}, B = ${b}. A leitura B/A = ${ratio} ${relationActive ? 'esta preservada pela relacao ativa.' : 'nao e obrigatoria porque a relacao foi removida.'}`;
    }
    return scene.click_explanations[selectedId] ?? 'Selecione um objeto, relacao, variavel ou invariante para ver seu papel local.';
  }

  return (
    <main className="app-shell">
      <aside className="dashboard">
        <div className="brand">
          <BrainCircuit />
          <div>
            <strong>STEMingAI</strong>
            <span>Laboratorio estrutural</span>
          </div>
        </div>

        <form className="create-block" onSubmit={createBlock}>
          <label>
            Assunto
            <input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} />
          </label>
          <label>
            Objetivo
            <textarea value={newGoal} onChange={(event) => setNewGoal(event.target.value)} />
          </label>
          <label>
            Nivel
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option>iniciante</option>
              <option>intermediario</option>
              <option>avancado</option>
            </select>
          </label>
          <button className="primary" disabled={creating}>
            <Plus size={18} /> {creating ? 'Gerando' : 'Criar bloco'}
          </button>
        </form>

        <section className="block-list">
          {blocks.map((block) => (
            <button key={block.id} className={`block-card ${block.id === activeBlock.id ? 'active' : ''}`} onClick={() => openStage(block, block.stages[0])}>
              <span>{block.title}</span>
              <small>{block.stages.filter((stage) => stage.status === 'done').length}/{block.stages.length} etapas dominadas</small>
            </button>
          ))}
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="ghost"><ChevronLeft size={18} /></button>
          <div>
            <strong>{activeBlock.title}</strong>
            <span>{activeStage.title}</span>
          </div>
          <button className="primary" onClick={() => setTestOpen(true)}><TestTube2 size={18} /> Teste</button>
        </header>

        <div className="stage-grid">
          <section className="chat-panel">
            <div className="panel-title"><Bot size={18} /> Tutor estrutural</div>
            <div className="messages">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                  {message.content}
                </div>
              ))}
            </div>
            <form className="chat-form" onSubmit={sendMessage}>
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Pergunte sobre a cena atual" />
              <button><Send size={18} /></button>
            </form>
          </section>

          <section className="simulation">
            <div className="aurora" />
            <div className="sim-toolbar">
              <button onClick={() => setPlaying((current) => !current)}>{playing ? <CirclePause size={18} /> : <CirclePlay size={18} />}</button>
              <button onClick={() => setStep((current) => Math.max(0, current - 1))}>Voltar</button>
              <button onClick={() => setStep((current) => Math.min(scene.construction_events.length - 1, current + 1))}>Avancar</button>
              <button onClick={() => { setStep(0); setRelationActive(true); }}><RotateCcw size={18} /> Reconstruir</button>
            </div>
            <svg className="scene-canvas" viewBox="0 0 100 100" role="img" aria-label="Simulacao estrutural">
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L7,3 z" fill="#ffffff" />
                </marker>
              </defs>
              {ids.has('r1') && relationActive && <line x1="28" y1="62" x2="28" y2="36" stroke="#ffffff" strokeWidth="1.2" markerEnd="url(#arrow)" className="relation-line" onClick={() => setSelectedId('r1')} />}
              {objects.map((object) => {
                if (!ids.has(object.id)) return null;
                if (object.type === 'relation_label') {
                  return <g key={object.id} onClick={() => setSelectedId(object.id)} className="clickable"><rect x={object.x} y={(object.y ?? 0) - 8} width="25" height="16" rx="3" fill="#111827" stroke={object.color} /><text x={(object.x ?? 0) + 12.5} y={(object.y ?? 0) + 1.5} textAnchor="middle">{relationActive ? `B/A = ${ratio}` : 'B/A livre'}</text></g>;
                }
                const width = Math.max(8, Number(object.value ?? 1) * 6);
                return <g key={object.id} onClick={() => setSelectedId(object.id)} className="clickable"><rect x={object.x} y={object.y} width={width} height="10" rx="2" fill={object.color} /><text x={object.x} y={(object.y ?? 0) - 3}>{object.label}: {object.value}</text></g>;
              })}
            </svg>
            <button className={`relation-toggle ${relationActive ? '' : 'off'}`} onClick={() => setRelationActive((current) => !current)}>
              <GitBranch size={18} /> {relationActive ? 'Remover relacao' : 'Reconectar relacao'}
            </button>
          </section>

          <aside className="side-panels">
            <section>
              <div className="panel-title"><SlidersHorizontal size={18} /> Variaveis</div>
              {scene.variables.map((variable) => (
                <label key={variable.id} className="slider-row" onClick={() => setSelectedId(variable.id === 'k' ? 'k' : 'A')}>
                  <span>{variable.label ?? variable.id}: {values[variable.id]}</span>
                  <input type="range" min={variable.min} max={variable.max} step={variable.step} value={values[variable.id] ?? 0} onChange={(event) => setValues((current) => ({ ...current, [variable.id]: Number(event.target.value) }))} />
                </label>
              ))}
            </section>
            <section>
              <div className="panel-title"><PanelLeft size={18} /> Inspector</div>
              <p>{inspectorText()}</p>
              <button className="ghost" onClick={() => setSelectedId('live')}>Ler estado atual</button>
            </section>
            <section>
              <div className="panel-title"><FlaskConical size={18} /> Limitacoes</div>
              {scene.model_limitations.map((item) => <p key={item} className="limit">{item}</p>)}
            </section>
          </aside>
        </div>

        <section className="timeline">
          {scene.construction_events.map((event, index) => (
            <button key={`${event.type}-${index}`} className={index <= step ? 'done' : ''} onClick={() => setStep(index)}>
              <span>{index + 1}</span>{event.caption ?? event.type}
            </button>
          ))}
        </section>
      </section>

      {testOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitTest}>
            <button type="button" className="close" onClick={() => setTestOpen(false)}>x</button>
            <h2>Teste de proficiencia</h2>
            <label>Qual elemento funciona como variavel de entrada?
              <select value={answers.q1 ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, q1: event.target.value }))}>
                <option value="">Selecione</option><option>Grandeza A</option><option>Grandeza B</option><option>Invariante B/A</option>
              </select>
            </label>
            <label>O que deixa de valer quando B = k * A e removida?
              <select value={answers.q2 ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, q2: event.target.value }))}>
                <option value="">Selecione</option><option>B precisa acompanhar A</option><option>A pode ser alterada</option><option>k existe no painel</option>
              </select>
            </label>
            <label>Explique o invariante.
              <textarea value={answers.q3 ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, q3: event.target.value }))} />
            </label>
            <button className="primary"><Check size={18} /> Avaliar dominio</button>
            {testResult && <p className="result">{testResult}</p>}
          </form>
        </div>
      )}
    </main>
  );
}

export default App;

