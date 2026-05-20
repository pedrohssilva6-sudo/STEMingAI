import type { Block, SceneSpec } from '../types';

export const demoScene: SceneSpec = {
  scene_id: 'proporcao_escala_intro',
  domain: 'matematica',
  stage_goal: 'Entender proporcao como conservacao de uma razao sob variacao de escala.',
  model_limitations: [
    'Modelo bidimensional simples.',
    'Nao representa incerteza de medicao.',
    'A relacao B = k * A e imposta como hipotese do modelo.'
  ],
  objects: [
    { id: 'A', type: 'quantity', label: 'Grandeza A', value: 2, x: 17, y: 62, color: '#38bdf8' },
    { id: 'B', type: 'quantity', label: 'Grandeza B', value: 6, x: 17, y: 36, color: '#f472b6' },
    { id: 'ratio_AB', type: 'relation_label', label: 'B/A = k', x: 61, y: 49, color: '#facc15' }
  ],
  variables: [
    { id: 'A.value', label: 'A', control: 'slider', min: 1, max: 10, step: 1, default: 2 },
    { id: 'k', label: 'k', control: 'slider', min: 1, max: 5, step: 0.5, default: 3 }
  ],
  relations: [{ id: 'r1', type: 'proportionality', label: 'B = k * A', from: 'A', to: 'B', rule: 'B.value = k * A.value' }],
  invariants: [{ id: 'inv1', description: 'A razao B/A permanece igual a k enquanto a relacao proporcional estiver ativa.' }],
  construction_events: [
    { type: 'create_object', target: 'A', caption: 'Criar a grandeza de entrada A.' },
    { type: 'create_object', target: 'B', caption: 'Criar a grandeza dependente B.' },
    { type: 'add_variable_control', target: 'k', caption: 'Adicionar k como fator de escala manipulavel.' },
    { type: 'connect', relation: 'r1', caption: 'Conectar B a A pela regra B = k * A.' },
    { type: 'highlight_invariant', target: 'inv1', caption: 'Destacar que B/A fica preservado como k.' },
    { type: 'compare_states', target: 'ratio_AB', caption: 'Comparar valores enquanto A varia.' }
  ],
  click_explanations: {
    A: 'A e a grandeza de entrada. Ao muda-la, B muda quando a relacao proporcional esta ativa.',
    B: 'B e a grandeza dependente. Seu valor e determinado por A multiplicado por k enquanto a conexao existe.',
    k: 'k controla o fator de escala. Ele define quantas vezes B acompanha A.',
    r1: 'Esta conexao sustenta a proporcionalidade. Se for removida, B deixa de ser obrigado a acompanhar A.',
    inv1: 'O invariante e a razao B/A. Ele vale apenas enquanto B = k * A estiver ativa.',
    ratio_AB: 'Este marcador transforma a relacao em uma leitura: a divisao B/A revela se a estrutura proporcional esta preservada.'
  }
};

export const demoBlock: Block = {
  id: 'demo-proporcao',
  title: 'Proporcao e escala',
  topic: 'Proporcao e escala',
  goal: 'Entender proporcionalidade como preservacao de razao sob variacao.',
  level: 'iniciante',
  status: 'em andamento',
  updatedAt: new Date().toISOString(),
  stages: [
    {
      id: 'proporcao-estrutura',
      title: 'Unidade, escala e dependencia',
      goal: 'Construir A, B e a relacao B = k * A para enxergar a razao preservada.',
      status: 'active',
      mastery_score: 0
    }
  ]
};

