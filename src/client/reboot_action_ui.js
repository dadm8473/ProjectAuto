import { REBOOT_RULES } from '../shared/reboot_content.js';

const BOSS_DECISION_START = 92;
const BOSS_DECISION_END = 102;
const RESCUE_DANGER_CUE = 70;
const SUMMON_COACH_END = 16;
const MERGE_COACH_END = 64;
const BASE_COMMAND_LABELS = {
  summon: '소환',
  merge: '합성',
  rescue: '구원'
};

function hasMergePotential(board) {
  const counts = new Map();
  for (const unit of board.units ?? []) {
    const grade = Number(unit.grade ?? 1);
    if (grade >= 2) continue;
    counts.set(grade, (counts.get(grade) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= REBOOT_RULES.merge.requiredSameGrade);
}

function summonCooldownLabel(current, localBoardId) {
  const cooldown = buildSummonCooldownState({ current, localBoardId, enabled: false });
  return cooldown.active ? `소환 ${cooldown.seconds}초` : '';
}

export function partnerDisplayName(current, partnerBoardId) {
  const partner = current.players?.find((player) => player.id === partnerBoardId);
  return partner?.name || (partner?.bot ? '린' : '파트너');
}

export function partnerDangerMeterLabel(current, partnerBoardId) {
  return '동료 위험';
}

export function partnerDangerAriaLabel(current, partnerBoardId, danger) {
  const label = partnerDisplayName(current, partnerBoardId);
  return label === '파트너' ? `파트너 위험도 ${danger}` : `파트너 ${label}의 위험도 ${danger}`;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function buildSummonCooldownState({ current, localBoardId, enabled = false } = {}) {
  const resources = current.resources?.[localBoardId] ?? { summon: 0 };
  if (enabled || current.result || (resources.summon ?? 0) >= REBOOT_RULES.summon.cost) {
    return { active: false, seconds: 0, progress: 1, phase: 'ready' };
  }
  const nextGrant = REBOOT_RULES.summon.grants.find((grant) => grant.at > current.now);
  if (!nextGrant) return { active: false, seconds: 0, progress: 1, phase: 'ready' };
  let previousGrant = null;
  for (const grant of REBOOT_RULES.summon.grants) {
    if (grant.at <= current.now) previousGrant = grant;
  }
  const startAt = previousGrant?.at ?? 0;
  const duration = Math.max(0.001, nextGrant.at - startAt);
  const progress = Number(clamp01((current.now - startAt) / duration).toFixed(2));
  return {
    active: true,
    seconds: Math.max(1, Math.ceil(nextGrant.at - current.now)),
    progress,
    phase: progress >= 0.72 ? 'readying' : 'charging'
  };
}

export function buildCombatActionExposure({ current, localBoardId, actions }) {
  const board = current.boards?.[localBoardId] ?? current.boards?.p1 ?? { units: [] };
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const partnerDanger = current.boards?.[partner]?.danger ?? 0;
  const merge = Boolean(actions.merge?.enabled) || hasMergePotential(board);
  const rescue = Boolean(actions.rescue?.enabled) || partnerDanger >= RESCUE_DANGER_CUE;
  let focus = 'summon';
  if (rescue && (partnerDanger >= RESCUE_DANGER_CUE || actions.rescue?.enabled)) focus = 'rescue';
  else if (merge && actions.merge?.enabled) focus = 'merge';
  else if (actions.summon?.enabled) focus = 'summon';
  else if (rescue) focus = 'rescue';
  else if (merge) focus = 'merge';
  const openCount = [true, merge, rescue].filter(Boolean).length;
  return { summon: true, merge, rescue, focus, openCount };
}

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
  const board = current.boards?.[localBoardId] ?? current.boards?.p1 ?? { units: [] };
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const partnerDanger = current.boards?.[partner]?.danger ?? 0;
  const bossDecisionWindow = current.now >= BOSS_DECISION_START && current.now < BOSS_DECISION_END;

  if (bossDecisionWindow && actions.rescue && partnerDanger >= RESCUE_DANGER_CUE) return '구원 우선';
  if (bossDecisionWindow && (actions.summon || actions.merge)) return '보스 대응';
  if (!actions.rescue && partnerDanger >= RESCUE_DANGER_CUE) return '구원 충전 중';
  if (actions.rescue) return '구원 가능';
  if (actions.merge) return '합성 가능';
  if (actions.summon) return (board.units?.length ?? 0) === 0 ? '첫 유닛 배치' : '';

  if ((resources.summon ?? 0) < REBOOT_RULES.summon.cost) {
    const nextGrant = REBOOT_RULES.summon.grants.find((grant) => grant.at > current.now);
    if (nextGrant) return `충전 ${Math.max(1, Math.ceil(nextGrant.at - current.now))}초`;
  }

  return '전투 중';
}

export function buildCombatStatusDisplay({ statusPrompt = '', bossWarning = false } = {}) {
  const showPrompt = Boolean(statusPrompt);
  const showBossWarning = Boolean(bossWarning) && !showPrompt;
  return {
    visible: showPrompt || showBossWarning,
    showPrompt,
    showBossWarning
  };
}

export function buildCombatCommandLabels({ current, localBoardId, actions, onlineWaiting = false }) {
  const labels = { ...BASE_COMMAND_LABELS };
  if (current.result || onlineWaiting || actions.summon?.enabled) return labels;
  const cooldown = summonCooldownLabel(current, localBoardId);
  if (cooldown) labels.summon = cooldown;
  return labels;
}
