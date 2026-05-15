export function buildRebootActionState(state, playerId = 'p1') {
  const actions = state.actionState?.[playerId] ?? {};
  const resources = state.resources?.[playerId] ?? { summon: 0, rescue: 0 };
  return {
    summon: {
      label: '소환',
      action: 'summon',
      enabled: Boolean(actions.summon),
      value: resources.summon,
      reason: actions.summon ? '소환 가능' : '소환 에너지 부족'
    },
    merge: {
      label: '합성',
      action: 'merge',
      enabled: Boolean(actions.merge),
      reason: actions.merge ? '합성 가능' : '1등급 2개 필요'
    },
    rescue: {
      label: '구원',
      action: 'rescue',
      enabled: Boolean(actions.rescue),
      value: resources.rescue,
      reason: actions.rescue ? '파트너 구원 가능' : '구원 충전 중'
    }
  };
}

export function commandForRebootAction(action) {
  if (action === 'summon') return { type: 'summon' };
  if (action === 'merge') return { type: 'merge' };
  if (action === 'rescue') return { type: 'rescue' };
  return { type: 'unknown' };
}
