const BOSS_DECISION_START = 92;
const BOSS_DECISION_END = 102;
const RESCUE_DANGER_CUE = 70;

export function isCriticalRebootAction({ actionKey, current, localBoardId, enabled }) {
  if (!enabled) return false;
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const bossDecisionWindow = current.now >= BOSS_DECISION_START && current.now < BOSS_DECISION_END;
  const partnerDanger = current.boards[partner]?.danger ?? 0;
  if (actionKey === 'rescue') return partnerDanger >= RESCUE_DANGER_CUE;
  return bossDecisionWindow && (actionKey === 'summon' || actionKey === 'merge');
}
