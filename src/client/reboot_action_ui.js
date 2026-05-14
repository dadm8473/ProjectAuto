import { REBOOT_RULES } from '../shared/reboot_content.js';

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

export function buildCombatStatusPrompt({ current, localBoardId, onlineWaiting = false }) {
  if (current.result) return '전투 완료';
  if (onlineWaiting) return '파트너 대기';
  const actions = current.actionState?.[localBoardId] ?? {};
  const resources = current.resources?.[localBoardId] ?? { summon: 0, rescue: 0 };
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const partnerDanger = current.boards?.[partner]?.danger ?? 0;

  if (actions.rescue && partnerDanger >= RESCUE_DANGER_CUE) return '구원 가능';
  if (actions.merge) return '합성 가능';
  if (actions.summon) return '소환 가능';

  if ((resources.summon ?? 0) < REBOOT_RULES.summon.cost) {
    const nextGrant = REBOOT_RULES.summon.grants.find((grant) => grant.at > current.now);
    if (nextGrant) return `충전 ${Math.max(1, Math.ceil(nextGrant.at - current.now))}초`;
  }

  return '전투 중';
}
