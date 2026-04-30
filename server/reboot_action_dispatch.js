import {
  castLinkPulse,
  mergeRelays,
  serializeState,
  supplyRelay,
  swapRelays,
  upgradeSupplyFocus
} from '../src/shared/game.js';

const REBOOT_ACTIONS = new Set(['summon', 'merge', 'rescue']);
const LEGACY_ACTIONS = new Set(['supply', 'swap', 'focus', 'chance', 'pulse', 'boost', 'overclock']);

function isRebootGame(game) {
  return typeof game?.runId === 'string' && game.runId.startsWith('reboot-');
}

function rejectRebootAction() {
  return { ok: false, reason: '리부트 전투에서는 사용하지 않습니다.' };
}

function rejectCombatShop() {
  return { ok: false, reason: '전투 중에는 상점 사용 불가.' };
}

export function dispatchBattleAction({ game, action, boardPlayer }) {
  if (isRebootGame(game)) {
    if (action.type === 'buy') return rejectCombatShop();
    if (!REBOOT_ACTIONS.has(action.type)) {
      if (LEGACY_ACTIONS.has(action.type)) return rejectRebootAction();
      return { ok: false, reason: '알 수 없는 행동.' };
    }
    if (action.type === 'summon') return supplyRelay(game, { playerId: boardPlayer });
    if (action.type === 'merge') return mergeRelays(game, { playerId: boardPlayer, slotIds: action.slotIds ?? [] });
    if (action.type === 'rescue') return castLinkPulse(game, { playerId: boardPlayer });
  }

  if (action.type === 'supply' || action.type === 'summon') return supplyRelay(game, { playerId: boardPlayer });
  if (action.type === 'merge') return mergeRelays(game, { playerId: boardPlayer, slotIds: action.slotIds ?? [] });
  if (action.type === 'swap') return swapRelays(game, { playerId: boardPlayer, from: action.from, to: action.to });
  if (action.type === 'focus' || action.type === 'chance') return upgradeSupplyFocus(game, { playerId: boardPlayer });
  if (action.type === 'pulse' || action.type === 'boost' || action.type === 'rescue') return castLinkPulse(game, { playerId: boardPlayer });
  return { ok: false, reason: '알 수 없는 행동.' };
}

export function serializedUnchanged(before, game) {
  return JSON.stringify(before) === JSON.stringify(serializeState(game));
}
