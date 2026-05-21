import type {
  BuildCommand,
  EngineSceneEvent,
  EngineSceneState,
  EnvironmentSpec,
  InvariantSpecV2,
  ModelContract,
  RelationSpecV2,
  ShapeSpec,
  VariableSpecV2
} from '../types';

export function createEmptyEngineState(params: {
  id: string;
  title: string;
  modelContract: ModelContract;
  currentStep?: number;
}): EngineSceneState {
  return {
    id: params.id,
    title: params.title,
    modelContract: params.modelContract,
    environments: {},
    shapes: {},
    variables: {},
    relations: {},
    constraints: {},
    invariants: {},
    currentStep: params.currentStep ?? -1,
    eventLog: []
  };
}

export function applyCommands(initial: EngineSceneState, commands: BuildCommand[], maxStep = commands.length - 1): EngineSceneState {
  let state: EngineSceneState = { ...initial, eventLog: [] };
  const last = Math.min(maxStep, commands.length - 1);
  for (let index = 0; index <= last; index += 1) {
    const result = applyCommand(state, commands[index], index);
    state = result.state;
  }
  return { ...state, currentStep: last };
}

export function applyCommand(state: EngineSceneState, command: BuildCommand, step: number) {
  try {
    const next = reduceCommand(state, command);
    return {
      state: {
        ...next,
        eventLog: [...state.eventLog, event(command, step, 'applied')]
      },
      status: 'applied' as const
    };
  } catch (error) {
    return {
      state: {
        ...state,
        eventLog: [...state.eventLog, event(command, step, 'rejected', error instanceof Error ? error.message : 'Command rejected')]
      },
      status: 'rejected' as const
    };
  }
}

function reduceCommand(state: EngineSceneState, command: BuildCommand): EngineSceneState {
  if (command.type === 'createEnvironment') {
    return { ...state, environments: { ...state.environments, [command.environment.id]: command.environment } };
  }
  if (command.type === 'createShape') {
    ensureEnvironment(state, command.shape.environmentId);
    return { ...state, shapes: { ...state.shapes, [command.shape.id]: command.shape } };
  }
  if (command.type === 'setTransform') {
    const shape = ensureShape(state, command.targetId);
    return {
      ...state,
      shapes: {
        ...state.shapes,
        [shape.id]: { ...shape, transform: { ...shape.transform, ...command.transform } }
      }
    };
  }
  if (command.type === 'setProperty') {
    const shape = ensureShape(state, command.targetId);
    return {
      ...state,
      shapes: {
        ...state.shapes,
        [shape.id]: {
          ...shape,
          properties: { ...shape.properties, [command.key]: command.value, ...(command.unit ? { [`${command.key}Unit`]: command.unit } : {}) }
        }
      }
    };
  }
  if (command.type === 'bindProperty') {
    const shape = ensureShape(state, command.targetId);
    return {
      ...state,
      shapes: {
        ...state.shapes,
        [shape.id]: {
          ...shape,
          properties: {
            ...shape.properties,
            [`${command.key}Binding`]: {
              expression: command.expression,
              variables: command.variables ?? []
            }
          }
        }
      }
    };
  }
  if (command.type === 'addRelation') {
    ensureEnvironment(state, command.relation.environmentId);
    for (const id of [...command.relation.from, ...(command.relation.to ?? [])]) {
      ensureShape(state, id);
    }
    return { ...state, relations: { ...state.relations, [command.relation.id]: command.relation } };
  }
  if (command.type === 'addConstraint') {
    return { ...state, constraints: { ...state.constraints, [command.constraint.id]: command.constraint } };
  }
  if (command.type === 'removeRelation') {
    const relations = { ...state.relations };
    delete relations[command.relationId];
    return {
      ...state,
      relations,
      invariants: Object.fromEntries(
        Object.entries(state.invariants).map(([id, invariant]) => [
          id,
          invariant.dependsOn.includes(command.relationId) ? { ...invariant, status: 'broken' as const } : invariant
        ])
      )
    };
  }
  if (command.type === 'deriveInvariant') {
    return { ...state, invariants: { ...state.invariants, [command.invariant.id]: command.invariant } };
  }
  if (command.type === 'focusCamera') {
    const environment = ensureEnvironment(state, command.environmentId);
    return {
      ...state,
      environments: {
        ...state.environments,
        [environment.id]: { ...environment, viewport: command.viewport }
      }
    };
  }
  if (command.type === 'compareStates' || command.type === 'askPrediction') {
    return state;
  }
  return state;
}

function ensureEnvironment(state: EngineSceneState, id: string): EnvironmentSpec {
  const environment = state.environments[id];
  if (!environment) throw new Error(`Environment ${id} does not exist`);
  return environment;
}

function ensureShape(state: EngineSceneState, id: string): ShapeSpec {
  const shape = state.shapes[id];
  if (!shape) throw new Error(`Shape ${id} does not exist`);
  return shape;
}

function event(command: BuildCommand, step: number, status: EngineSceneEvent['status'], message?: string): EngineSceneEvent {
  return {
    id: `evt_${step}_${command.type}`,
    step,
    command,
    status,
    timestamp: Date.now(),
    message
  };
}

export function variableFromValue(id: string, value: number | string | boolean, label = id): VariableSpecV2 {
  return { id, label, value };
}

export function relationToCommand(relation: RelationSpecV2): BuildCommand {
  return { type: 'addRelation', relation };
}

export function invariantToCommand(invariant: InvariantSpecV2): BuildCommand {
  return { type: 'deriveInvariant', invariant };
}
