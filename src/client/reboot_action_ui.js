const BOSS_DECISION_START = 92;
const BOSS_DECISION_END = 102;
const RESCUE_DANGER_CUE = 70;
const SUMMON_COACH_END = 16;
const MERGE_COACH_END = 64;

export function isCriticalRebootAction({ actionKey, current, localBoardId, enabled }) {
  if (!enabled) return false;
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const bossDecisionWindow = current.now >= BOSS_DECISION_START && current.now < BOSS_DECISION_END;
  const partnerDanger = current.boards[partner]?.danger ?? 0;
  if (actionKey === 'rescue') return partnerDanger >= RESCUE_DANGER_CUE;
  return bossDecisionWindow && (actionKey === 'summon' || actionKey === 'merge');
}

export function buildCombatCoachCue({ current, localBoardId, actions }) {
  if (current.result) return '';
  const board = current.boards[localBoardId] ?? current.boards.p1;
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const partnerDanger = current.boards[partner]?.danger ?? 0;
  if (actions.rescue?.enabled && partnerDanger >= RESCUE_DANGER_CUE) return 'rescue';
  if (actions.merge?.enabled && current.now < MERGE_COACH_END) return 'merge';
  if (actions.summon?.enabled && current.now < SUMMON_COACH_END && (board.units?.length ?? 0) === 0) return 'summon';
  return '';
}
