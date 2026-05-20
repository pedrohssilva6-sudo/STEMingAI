# Scene Engine v1

O motor do STEMingAI usa uma abordagem tipo LEGO: a IA nao desenha livremente a tela. Ela monta uma `SceneSpec` declarativa com pecas padronizadas, e o sistema valida, executa e renderiza.

## 1. SceneSpec v1

Campos centrais:

- `objects`: pecas visuais/manipulaveis.
- `variables`: controles alteraveis pelo usuario.
- `relations`: vinculos entre objetos.
- `constraints`: hipoteses e restricoes do modelo.
- `operations`: transformacoes disponiveis.
- `invariants`: propriedades preservadas sob certas condicoes.
- `construction_events`: linha temporal de construcao.
- `click_explanations`: explicacao contextual por item.

## 2. Primitivas universais

Arquivo: `src/engine/primitives.ts`

Primitivas iniciais:

- `quantity`
- `point`
- `segment`
- `polygon`
- `formula`
- `node`
- `atom`
- `chemical_element`
- `molecule`
- `cell`
- `relation_label`

## 3. Kits de dominio

Arquivo: `src/engine/domainKits.ts`

Kits iniciais:

- `mathematics`
- `physics`
- `chemistry`
- `biology`
- `computing`
- `statistics`

Cada kit declara tipos de objeto, relacoes, operacoes e invariantes esperados.

## 4. Validacao

Arquivo: `src/engine/validator.ts`

O validador checa referencias quebradas, tipos fora do kit, eventos desconhecidos e ausencia de limitacoes do modelo. Erros bloqueiam confianca; avisos permitem renderizacao generica.

## 5. Execucao deterministica

Arquivo: `src/engine/executor.ts`

O executor resolve:

- objetos visiveis pela timeline;
- posicoes alteradas por drag;
- regras deterministicas implementadas;
- medicoes locais, como razao e distancia;
- issues de validacao.

## 6. Renderizacao 2D

Arquivos:

- `src/engine/SimulationCanvas.tsx`
- `src/engine/renderers2d.tsx`

Cada tipo de objeto tem um renderer 2D. Tipos desconhecidos caem em renderer generico.

## 7. Interacao

A interacao atual suporta:

- arrastar objetos;
- selecionar objetos e relacoes;
- abrir popover contextual;
- manipular variaveis;
- ativar/desativar relacao proporcional;
- avançar/voltar/reconstruir eventos.

## 8. Expansao

Proximos motores devem entrar como modulos, sem mudar a IA:

- `geometryEngine`
- `chemistryEngine`
- `biologyEngine`
- `physicsEngine`
- `symbolicEngine`
- `graphEngine`
- `statisticsEngine`
- `threeDEngine`

Cada motor deve receber a mesma `SceneSpec v1` e declarar quais tipos, relacoes, constraints e operations executa.

