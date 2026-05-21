import type { EngineSceneState, ExplanationContext } from '../types';

export function buildExplanationContext(params: {
  clickedId: string;
  stageGoal: string;
  engine: EngineSceneState;
  userQuestion?: string;
}): ExplanationContext {
  const environment = Object.values(params.engine.environments)[0];
  const shape = params.engine.shapes[params.clickedId];
  const relation = params.engine.relations[params.clickedId];
  const invariant = params.engine.invariants[params.clickedId];
  const clickedKind: ExplanationContext['clickedKind'] = shape
    ? 'shape'
    : relation
      ? 'relation'
      : invariant
        ? 'invariant'
        : environment?.id === params.clickedId
          ? 'environment'
          : 'variable';

  return {
    clickedId: params.clickedId,
    clickedKind,
    stageGoal: params.stageGoal,
    environment,
    shape,
    activeRelations: Object.values(params.engine.relations).filter((item) => item.active),
    activeInvariants: Object.values(params.engine.invariants).filter((item) => item.status === 'active'),
    recentEvents: params.engine.eventLog.slice(-6),
    userQuestion: params.userQuestion
  };
}

