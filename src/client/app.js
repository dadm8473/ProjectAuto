import {
  castLinkPulse,
  computeActiveLinks,
  createGame,
  mergeRelays,
  overclockRelay,
  serializeState,
  supplyRelay,
  swapRelays,
  tickGame,
  tryBuyShopItem,
  upgradeSupplyFocus,
  GAME_RULES,
  GRADES,
  NOISE_TYPES,
  RELAY_TYPES,
  SHOP
} from '../shared/game.js';
import { eventLabel } from '../shared/event_text.js';
import { applyRunToProfile, normalizeMetaProfile } from '../shared/meta.js';
import { buildRunHighlights, buildRunProgress } from '../shared/run_highlights.js';
import { VIEW_WIDTH, MIN_VIEW_HEIGHT, buildSceneLayout, computeCanvasViewport } from './render_layout.js';

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const stageWrap = document.querySelector('.stage-wrap');
const toast = document.querySelector('#toast');
const netStatus = document.querySelector('#netStatus');
const chargeMeter = document.querySelector('#chargeMeter');
const linkMeter = document.querySelector('#linkMeter');
const gemMeter = document.querySelector('#gemMeter');
const waveMeter = document.querySelector('#waveMeter');
const signalMeter = document.querySelector('#signalMeter');
const bossMeter = document.querySelector('#bossMeter');
const shopList = document.querySelector('#shopList');
const drawer = document.querySelector('#drawer');
const launchOverlay = document.querySelector('#launchOverlay');
const launchBotButton = document.querySelector('#launchBotButton');
const launchOnlineButton = document.querySelector('#launchOnlineButton');
const resultOverlay = document.querySelector('#resultOverlay');
const resultCode = document.querySelector('#resultCode');
const resultTitle = document.querySelector('#resultTitle');
const resultReason = document.querySelector('#resultReason');
const resultStats = document.querySelector('#resultStats');
const resultHighlights = document.querySelector('#resultHighlights');
const resultProgress = document.querySelector('#resultProgress');
const resultReward = document.querySelector('#resultReward');
const resultRetryButton = document.querySelector('#resultRetryButton');
const resultLobbyButton = document.querySelector('#resultLobbyButton');
const shopButton = document.querySelector('#shopButton');
const actionButtons = {
  supply: document.querySelector('#supplyButton'),
  merge: document.querySelector('#mergeButton'),
  pulse: document.querySelector('#pulseButton')
};

const artDirectionImage = new Image();
artDirectionImage.src = '/src/client/assets/generated/signal-relay-art-direction.png';
const playfieldImage = new Image();
playfieldImage.src = '/src/client/assets/generated/signal-relay-playfield-frame.png';
const relayAtlas = new Image();
relayAtlas.src = '/src/client/assets/generated/relay-unit-atlas.png';
const relayWorldSprites = new Image();
relayWorldSprites.src = '/src/client/assets/generated/relay-world-sprites.png';
const noiseWorldSprites = new Image();
noiseWorldSprites.src = '/src/client/assets/generated/noise-world-sprites.png';
const bossDisruptionAtlas = new Image();
bossDisruptionAtlas.src = '/src/client/assets/generated/boss-disruption-atlas.png';

const PROFILE_STORAGE_KEY = 'signal-relay-profile-v1';
const localPlayerId = `p${Math.floor(Math.random() * 9000) + 1000}`;
let metaProfile = loadMetaProfile();
let activeRunProfileGems = metaProfile.gems;
let onlineProfileSpentGems = 0;
let game = createProfiledGame({ mode: 'bot', seed: Date.now() % 100000 });
let online = false;
let socket = null;
let last = performance.now();
let selected = [];
let localBoardId = 'p1';
let runStarted = false;
let resultView = null;
let viewport = computeCanvasViewport();
let sceneLayout = buildSceneLayout(viewport.viewHeight);

function loadMetaProfile() {
  try {
    return normalizeMetaProfile(JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? 'null'));
  } catch {
    return normalizeMetaProfile(null);
  }
}

function saveMetaProfile() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(metaProfile));
  } catch {
    // Local profile storage is best-effort; gameplay must still work in private browsing.
  }
}

function applyProfileToGame(targetGame = game) {
  targetGame.resources.gems = Math.max(targetGame.resources.gems ?? 0, metaProfile.gems);
  targetGame.unlocks = [...new Set([...(targetGame.unlocks ?? []), ...metaProfile.unlocks])];
  targetGame.metaProfile = { ...(targetGame.metaProfile ?? {}), startingGems: metaProfile.gems };
  return targetGame;
}

function createProfiledGame(options) {
  return applyProfileToGame(createGame(options));
}

function syncProfileAfterPurchase(result) {
  const spentGems = Math.max(0, Math.floor(result?.spent?.gems ?? 0));
  const unlocks = result?.unlock ? [...metaProfile.unlocks, result.unlock] : metaProfile.unlocks;
  metaProfile = normalizeMetaProfile({
    ...metaProfile,
    gems: Math.max(0, metaProfile.gems - spentGems),
    unlocks
  });
  saveMetaProfile();
  buildShop();
}

function resultStateForProfile(state) {
  const result = {
    ...state.result,
    startingProfileGems: online ? activeRunProfileGems : (state.result.startingProfileGems ?? activeRunProfileGems),
    spent: {
      ...(state.result.spent ?? {}),
      gems: online ? onlineProfileSpentGems : (state.result.spent?.gems ?? 0)
    }
  };
  return { ...state, result };
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}

function currentState() {
  return game?.rng?.next ? serializeState(game) : game;
}

function send(action) {
  if (online && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(action));
    return true;
  }
  return false;
}

function closeSocket() {
  const activeSocket = socket;
  socket = null;
  activeSocket?.close();
}

function clearResultOverlay() {
  resultView = null;
  resultOverlay.hidden = true;
}

function setLaunchConnecting(connecting) {
  launchOverlay.dataset.state = connecting ? 'connecting' : 'idle';
  launchBotButton.disabled = connecting;
  launchOnlineButton.disabled = connecting;
  launchOnlineButton.textContent = connecting ? 'Matching...' : 'Online Match';
}

function resultCopyFor(code, won) {
  const copy = {
    win_signal_lock: ['MISSION CLEAR', 'Signal Lock', 'Signal loop stabilized.'],
    loss_signal_collapse: ['SIGNAL BROKEN', 'Signal Lost', 'The relay signal collapsed.'],
    loss_saturation: ['SATURATION LIMIT', 'Signal Lost', 'Noise saturation reached the limit.'],
    loss_boss_timer: ['BOSS BREACH', 'Signal Lost', 'Boss window expired.']
  };
  return copy[code] ?? [won ? 'MISSION CLEAR' : 'MISSION FAILED', won ? 'Signal Lock' : 'Signal Lost', 'Run complete.'];
}

function rewardSummaryText(summary) {
  if (!summary) return 'Wave rewards saved. Rebuild and retry.';
  const gemText = summary.totalGems >= 0 ? `+${summary.totalGems} G` : `${summary.totalGems} G`;
  const parts = [`+${summary.run.xp} XP`, gemText];
  if (summary.missions.length > 0) parts.push(`${summary.missions.length} missions`);
  if (summary.passRewards.length > 0) parts.push(`${summary.passRewards.length} pass rewards`);
  return parts.join(' · ');
}

function buildResultView(state, summary, highlights, progress) {
  const [code, title, reason] = resultCopyFor(state.result.code, state.won);
  return {
    code,
    title,
    reason,
    reward: rewardSummaryText(summary),
    highlights,
    progress,
    stats: [
      ['Wave', state.result.wave],
      ['Time', `${Math.floor(state.result.time)}s`],
      ['Kills', state.result.stats.kills],
      ['Profile', `${metaProfile.gems}G`]
    ]
  };
}

function resultToneClass(tone) {
  return ['charge', 'link', 'danger', 'gem'].includes(tone) ? `result-tone-${tone}` : 'result-tone-neutral';
}

function renderResultHighlights(items) {
  const nodes = items.map((item) => {
    const node = document.createElement('span');
    node.className = `result-highlight ${resultToneClass(item.tone)}`;
    const value = document.createElement('strong');
    const label = document.createElement('em');
    const detail = document.createElement('small');
    value.textContent = item.value;
    label.textContent = item.label;
    detail.textContent = item.detail;
    node.append(value, label, detail);
    return node;
  });
  resultHighlights.replaceChildren(...nodes);
}

function renderResultProgress(items) {
  const nodes = items.map((item) => {
    const node = document.createElement('span');
    const label = document.createElement('em');
    const value = document.createElement('strong');
    const detail = document.createElement('small');
    label.textContent = item.label;
    value.textContent = item.value;
    detail.textContent = item.detail;
    node.append(label, value, detail);
    return node;
  });
  resultProgress.replaceChildren(...nodes);
}

function localAction(action) {
  let result = { ok: false, reason: 'Unknown action.' };
  if (action.type === 'supply') result = supplyRelay(game, { playerId: localBoardId });
  if (action.type === 'merge') result = mergeRelays(game, { playerId: localBoardId, slotIds: action.slotIds ?? selected });
  if (action.type === 'swap') {
    if (action.from === undefined || action.to === undefined) result = { ok: false, reason: 'Select two sockets.' };
    else result = swapRelays(game, { playerId: localBoardId, from: action.from, to: action.to });
  }
  if (action.type === 'focus') result = upgradeSupplyFocus(game, { playerId: localBoardId });
  if (action.type === 'pulse') result = castLinkPulse(game, { playerId: localBoardId });
  if (action.type === 'overclock') {
    const slot = action.slot ?? selected.at(-1);
    result = slot === undefined ? { ok: false, reason: 'Select one Relay.' } : overclockRelay(game, { playerId: localBoardId, slot });
  }
  if (action.type === 'buy') result = tryBuyShopItem(game, { itemId: action.itemId });
  if (!result.ok) showToast(result.reason);
  if (result.ok && ['merge', 'swap', 'overclock'].includes(action.type)) selected = [];
  if (result.ok && action.type === 'supply') showToast(RELAY_TYPES[result.relay.relayId].name);
  if (result.ok && action.type === 'merge') showToast(`${RELAY_TYPES[result.relay.relayId].name} T${result.relay.tier}`);
  if (result.ok && action.type === 'swap') showToast('Signal geometry shifted.');
  if (result.ok && action.type === 'focus') showToast('Supply focus raised.');
  if (result.ok && action.type === 'pulse') {
    const saved = game.effects.some((effect) => effect.type === 'link_pulse_save');
    showToast(saved ? 'Saved by Link Pulse' : 'Link Pulse');
  }
  if (result.ok && action.type === 'overclock') showToast('Overdrive armed.');
  if (result.ok && action.type === 'buy') {
    syncProfileAfterPurchase(result);
    showToast('Unlocked.');
  }
}

function prepareAction(action) {
  const state = currentState();
  if (action.type !== 'merge') {
    return {
      ...action,
      slotIds: selected,
      from: selected[0],
      to: selected[1],
      slot: selected.at(-1)
    };
  }
  const mergeSlots = state.actionState?.[localBoardId]?.merge.slots ?? autoMergeSlots(state, localBoardId);
  return { ...action, slotIds: mergeSlots };
}

function autoMergeSlots(state, playerId = localBoardId) {
  return state.actionState?.[playerId]?.merge.slots ?? [];
}

function mergeCueSlots(state, playerId = localBoardId) {
  const merge = state.actionState?.[playerId]?.merge;
  const slots = merge?.available ? autoMergeSlots(state, playerId) : state.actionState?.[playerId]?.merge.previewSlots ?? [];
  return slots.length >= GAME_RULES.mergeCount - 1 ? slots : [];
}

function command(action) {
  if (!runStarted || resultView) return;
  const prepared = prepareAction(action);
  const onlineAction = {
    ...prepared,
    ...(action.type === 'buy' ? { profile: { gems: metaProfile.gems, unlocks: metaProfile.unlocks } } : {})
  };
  if (send(onlineAction)) return;
  localAction(prepared);
}

function hideLaunchOverlay() {
  setLaunchConnecting(false);
  clearResultOverlay();
  launchOverlay.hidden = true;
  runStarted = true;
  last = performance.now();
}

function showLaunchOverlay() {
  runStarted = false;
  online = false;
  closeSocket();
  setLaunchConnecting(false);
  clearResultOverlay();
  selected = [];
  localBoardId = 'p1';
  activeRunProfileGems = metaProfile.gems;
  onlineProfileSpentGems = 0;
  game = createProfiledGame({ mode: 'bot', seed: Date.now() % 100000 });
  netStatus.textContent = 'BOT CO-OP';
  launchOverlay.hidden = false;
}

function startBotRun() {
  online = false;
  closeSocket();
  setLaunchConnecting(false);
  clearResultOverlay();
  selected = [];
  localBoardId = 'p1';
  activeRunProfileGems = metaProfile.gems;
  onlineProfileSpentGems = 0;
  game = createProfiledGame({ mode: 'bot', seed: Date.now() % 100000 });
  netStatus.textContent = 'BOT CO-OP';
  hideLaunchOverlay();
}

function syncResultOverlay(state) {
  if (runStarted && state.over && state.result && !resultView) {
    const settledState = resultStateForProfile(state);
    const { profile, summary } = applyRunToProfile(metaProfile, settledState);
    metaProfile = profile;
    saveMetaProfile();
    applyProfileToGame(game);
    buildShop();
    const highlights = buildRunHighlights(settledState, summary);
    const progress = buildRunProgress(summary, metaProfile);
    resultView = buildResultView(settledState, summary, highlights, progress);
  }
  if (!resultView) {
    resultOverlay.hidden = true;
    return;
  }
  resultOverlay.hidden = false;
  resultCode.textContent = resultView.code;
  resultTitle.textContent = resultView.title;
  resultReason.textContent = resultView.reason;
  resultReward.textContent = resultView.reward;
  renderResultHighlights(resultView.highlights);
  renderResultProgress(resultView.progress);
  const statNodes = resultView.stats.map(([label, value]) => {
    const item = document.createElement('span');
    const valueNode = document.createElement('strong');
    item.append(label, valueNode);
    valueNode.textContent = value;
    return item;
  });
  resultStats.replaceChildren(...statNodes);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * viewport.viewWidth,
    y: ((event.clientY - rect.top) / rect.height) * viewport.viewHeight
  };
}

function slotAt(point) {
  const entries = [
    [partnerId(localBoardId), sceneLayout.boardRects.p2],
    [localBoardId, sceneLayout.boardRects.p1]
  ];
  for (const [playerId, rect] of entries) {
    if (point.x < rect.x || point.x > rect.x + rect.w || point.y < rect.y || point.y > rect.y + rect.h) continue;
    const col = Math.floor((point.x - rect.x) / (rect.w / 4));
    const row = Math.floor((point.y - rect.y) / (rect.h / 3));
    return { playerId, index: row * 4 + col };
  }
  return null;
}

function partnerId(playerId) {
  return playerId === 'p1' ? 'p2' : 'p1';
}

function displayRectForBoard(playerId) {
  return playerId === localBoardId ? sceneLayout.boardRects.p1 : sceneLayout.boardRects.p2;
}

function boardSlotRect(rect, index) {
  const cw = rect.w / 4;
  const ch = rect.h / 3;
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: rect.x + col * cw + 7, y: rect.y + row * ch + 6, w: cw - 14, h: ch - 12 };
}

function coverImage(image, x, y, w, h, alpha = 1) {
  if (!image.complete || image.naturalWidth === 0) return false;
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.globalAlpha = 1;
  return true;
}

function drawAtlasCell(image, columns, rows, index, x, y, w, h, alpha = 1) {
  if (!image.complete || image.naturalWidth === 0) return false;
  const cellW = image.naturalWidth / columns;
  const cellH = image.naturalHeight / rows;
  const col = index % columns;
  const row = Math.floor(index / columns);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, col * cellW, row * cellH, cellW, cellH, x, y, w, h);
  ctx.restore();
  return true;
}

function drawBackground(state) {
  ctx.fillStyle = '#061010';
  ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);
  const usedImage = coverImage(playfieldImage, 0, 0, VIEW_WIDTH, viewport.viewHeight, 0.18) || coverImage(artDirectionImage, 0, 0, VIEW_WIDTH, viewport.viewHeight, 0.14);
  if (!usedImage) {
    const gradient = ctx.createLinearGradient(0, 0, VIEW_WIDTH, viewport.viewHeight);
    gradient.addColorStop(0, '#101312');
    gradient.addColorStop(0.46, '#17251f');
    gradient.addColorStop(1, '#231619');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);
  }
  ctx.fillStyle = 'rgba(2, 5, 6, 0.62)';
  ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);

  const boardGlow = ctx.createLinearGradient(0, 56, 0, viewport.viewHeight - 16);
  boardGlow.addColorStop(0, 'rgba(88, 215, 255, 0.06)');
  boardGlow.addColorStop(0.5, 'rgba(244, 201, 93, 0.04)');
  boardGlow.addColorStop(1, 'rgba(88, 215, 255, 0.08)');
  ctx.fillStyle = boardGlow;
  ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);

  const vignette = ctx.createRadialGradient(195, viewport.viewHeight * 0.5, 74, 195, viewport.viewHeight * 0.5, 330);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.16)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);

  ctx.fillStyle = 'rgba(245, 240, 220, 0.05)';
  ctx.fillRect(18, 59, 354, 1);
}

function drawStageChrome(state) {
  const pressure = Math.max(
    1 - Math.max(0, Math.min(1, state.signal.integrity / GAME_RULES.signalMax)),
    Math.max(0, Math.min(1, state.saturation.count / state.saturation.limit))
  );
  const accent = state.boss.active ? '#f4c95d' : pressure > 0.48 ? '#ff6f59' : '#58d7ff';
  ctx.save();

  const leftRail = ctx.createLinearGradient(0, 0, 32, 0);
  leftRail.addColorStop(0, 'rgba(0, 0, 0, 0.46)');
  leftRail.addColorStop(0.42, 'rgba(88, 215, 255, 0.08)');
  leftRail.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftRail;
  ctx.fillRect(0, 56, 38, viewport.viewHeight - 74);
  const rightRail = ctx.createLinearGradient(VIEW_WIDTH, 0, VIEW_WIDTH - 32, 0);
  rightRail.addColorStop(0, 'rgba(0, 0, 0, 0.46)');
  rightRail.addColorStop(0.42, 'rgba(244, 201, 93, 0.08)');
  rightRail.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightRail;
  ctx.fillRect(VIEW_WIDTH - 38, 56, 38, viewport.viewHeight - 74);

  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = 'rgba(245, 240, 220, 0.11)';
  ctx.lineWidth = 1;
  for (let y = 78; y < viewport.viewHeight - 42; y += 38) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(22, y + 8);
    ctx.moveTo(VIEW_WIDTH - 10, y);
    ctx.lineTo(VIEW_WIDTH - 22, y + 8);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 9;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  const brackets = [
    [14, 62, 28, 0, 0, 28],
    [VIEW_WIDTH - 14, 62, -28, 0, 0, 28],
    [14, viewport.viewHeight - 16, 28, 0, 0, -28],
    [VIEW_WIDTH - 14, viewport.viewHeight - 16, -28, 0, 0, -28]
  ];
  for (const [x, y, dx, dy, vx, vy] of brackets) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.moveTo(x, y);
    ctx.lineTo(x + vx, y + vy);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.05)';
  ctx.fillRect(18, 59, 354, 1);
  ctx.fillRect(18, viewport.viewHeight - 19, 354, 1);
  ctx.restore();
}

function drawBoardConnectors(state) {
  const { boardRects, loop } = sceneLayout;
  const pressure = Math.max(
    1 - Math.max(0, Math.min(1, state.signal.integrity / GAME_RULES.signalMax)),
    Math.max(0, Math.min(1, state.saturation.count / state.saturation.limit))
  );
  const accent = state.boss.active || pressure > 0.55 ? '#ff6f59' : '#58d7ff';
  const partner = boardRects.p2;
  const player = boardRects.p1;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.74;
  ctx.shadowColor = accent;
  ctx.shadowBlur = state.boss.active ? 14 : 8;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;

  const lanes = [
    [partner.x + 40, partner.y + partner.h, loop.cx - 86, loop.cy - loop.ry * 0.72, loop.cx - 58, loop.cy - 38],
    [partner.x + partner.w - 40, partner.y + partner.h, loop.cx + 86, loop.cy - loop.ry * 0.72, loop.cx + 58, loop.cy - 38],
    [player.x + 40, player.y, loop.cx - 86, loop.cy + loop.ry * 0.72, loop.cx - 58, loop.cy + 38],
    [player.x + player.w - 40, player.y, loop.cx + 86, loop.cy + loop.ry * 0.72, loop.cx + 58, loop.cy + 38]
  ];
  for (const [sx, sy, cx, cy, ex, ey] of lanes) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(245, 240, 220, 0.22)';
  for (const [sx, sy, cx, cy, ex, ey] of lanes) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRunSpine(state) {
  const { boardRects, loop } = sceneLayout;
  const top = boardRects.p2.y + boardRects.p2.h + 8;
  const bottom = boardRects.p1.y - 8;
  const x = loop.cx;
  const pulse = (state.now * 0.7) % 1;

  ctx.save();
  ctx.strokeStyle = 'rgba(245, 240, 220, 0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 10]);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 7; i += 1) {
    const t = (i / 7 + pulse) % 1;
    const y = top + (bottom - top) * t;
    const hot = t > 0.42 && t < 0.58;
    ctx.globalAlpha = hot ? 0.72 : 0.32;
    ctx.shadowColor = hot || state.boss.active ? '#f4c95d' : '#58d7ff';
    ctx.shadowBlur = hot ? 11 : 5;
    ctx.fillStyle = hot || state.boss.active ? '#f4c95d' : '#58d7ff';
    ctx.beginPath();
    ctx.arc(x, y, hot ? 3.5 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.9;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = state.boss.active ? '#ff6f59' : '#8ee6d2';
  ctx.font = '950 9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(state.boss.active ? 'DUAL WINDOW' : 'SYNC LINK', x, Math.max(top + 12, loop.cy - loop.ry - 12));
  ctx.restore();
}

function drawMetalPlate(x, y, w, h, radius, accent) {
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, 'rgba(34, 42, 39, 0.92)');
  gradient.addColorStop(0.48, 'rgba(12, 18, 18, 0.88)');
  gradient.addColorStop(1, 'rgba(5, 8, 9, 0.94)');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = 'rgba(245, 240, 220, 0.13)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, w - 6, h - 6, Math.max(3, radius - 3));
  ctx.stroke();
}

function syncCanvasScale() {
  const stageRect = stageWrap.getBoundingClientRect();
  viewport = computeCanvasViewport({ stageWidth: stageRect.width || VIEW_WIDTH, stageHeight: stageRect.height || MIN_VIEW_HEIGHT });
  sceneLayout = buildSceneLayout(viewport.viewHeight);
  const nextStyleWidth = `${viewport.displayWidth}px`;
  const nextStyleHeight = `${viewport.displayHeight}px`;
  if (canvas.style.width !== nextStyleWidth) canvas.style.width = nextStyleWidth;
  if (canvas.style.height !== nextStyleHeight) canvas.style.height = nextStyleHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(1, Math.round(viewport.displayWidth * pixelRatio));
  const nextHeight = Math.max(1, Math.round(viewport.displayHeight * pixelRatio));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(canvas.width / viewport.viewWidth, 0, 0, canvas.height / viewport.viewHeight, 0, 0);
}

function eventArtIndex(event) {
  if (event.type === 'boss_orchid_heatroot') return 0;
  if (event.type === 'boss_mirror_linkbreak') return 1;
  if (event.type === 'boss_origin_spore') return 2;
  return -1;
}

function drawEventFeed(state) {
  const event = [...(state.eventLog ?? [])].reverse().find((item) => eventLabel(item));
  if (!event) return;
  const label = eventLabel(event);
  const artIndex = eventArtIndex(event);
  const hasBossArt = artIndex >= 0 && bossDisruptionAtlas.complete && bossDisruptionAtlas.naturalWidth > 0;
  const y = sceneLayout.eventBanner.y;
  const banner = hasBossArt ? { x: 18, y, w: 354, h: 48, r: 10 } : { x: 18, y: y + 4, w: 354, h: 18, r: 8 };
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 8, 0.76)';
  ctx.strokeStyle = 'rgba(244, 201, 93, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(banner.x, banner.y, banner.w, banner.h, banner.r);
  ctx.fill();
  ctx.stroke();
  if (hasBossArt) {
    const cellW = bossDisruptionAtlas.naturalWidth / 3;
    const cellH = bossDisruptionAtlas.naturalHeight;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(banner.x + 1, banner.y + 1, banner.w - 2, banner.h - 2, banner.r - 1);
    ctx.clip();
    const scale = Math.max((banner.w - 2) / cellW, (banner.h - 2) / cellH);
    const drawW = cellW * scale;
    const drawH = cellH * scale;
    ctx.globalAlpha = 0.78;
    ctx.drawImage(bossDisruptionAtlas, artIndex * cellW, 0, cellW, cellH, banner.x + 1 + (banner.w - 2 - drawW) / 2, banner.y + 1 + (banner.h - 2 - drawH) / 2, drawW, drawH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(5, 7, 8, 0.42)';
    ctx.fillRect(banner.x + 1, banner.y + 1, banner.w - 2, banner.h - 2);
    ctx.fillStyle = 'rgba(5, 7, 8, 0.58)';
    ctx.fillRect(banner.x + 1, banner.y + banner.h - 19, banner.w - 2, 18);
    ctx.restore();
  }
  ctx.fillStyle = event.type.startsWith('boss') ? '#f4c95d' : event.type === 'run_finished' ? '#ff6f59' : '#8ee6d2';
  ctx.font = hasBossArt ? '900 11px system-ui' : '850 10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(label.toUpperCase(), banner.x + 9, banner.y + banner.h - (hasBossArt ? 6 : 5));
  ctx.restore();
}

function drawTrackLaneMarkers(state) {
  const { track, loop } = sceneLayout;
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 240, 220, 0.09)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const inset = 14 + i * 8;
    ctx.beginPath();
    ctx.ellipse(loop.cx, loop.cy, loop.rx - inset, Math.max(24, loop.ry - inset * 0.42), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    const progress = (i / 18 + state.now * 0.018) % 1;
    const pos = noisePosition({ progress, lane: i % 2 });
    const next = noisePosition({ progress: (progress + 0.01) % 1, lane: i % 2 });
    const angle = Math.atan2(next.y - pos.y, next.x - pos.x);
    const hot = progress > 0.68 || state.boss.active;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.globalAlpha = hot ? 0.64 : 0.38;
    ctx.fillStyle = hot ? 'rgba(255, 111, 89, 0.72)' : 'rgba(88, 215, 255, 0.6)';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = hot ? 8 : 4;
    ctx.beginPath();
    ctx.roundRect(-5, -2, 10, 4, 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowColor = 'rgba(88, 215, 255, 0.24)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(5, 7, 8, 0.52)';
  ctx.strokeStyle = 'rgba(88, 215, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(track.x + 16, track.y + track.h - 29, 64, 17, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8ee6d2';
  ctx.font = '850 9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('LIVE LOOP', track.x + 48, track.y + track.h - 17);
  ctx.restore();
}

function drawTrack(state) {
  ctx.save();
  const { track, loop } = sceneLayout;
  drawMetalPlate(track.x, track.y, track.w, track.h, 22, 'rgba(244, 201, 93, 0.2)');

  const statusX = track.x + 36;
  const statusW = track.w - 72;
  const signalRatio = Math.max(0, Math.min(1, state.signal.integrity / GAME_RULES.signalMax));
  const saturationRatio = Math.max(0, Math.min(1, state.saturation.count / state.saturation.limit));
  ctx.fillStyle = 'rgba(2, 5, 6, 0.62)';
  ctx.beginPath();
  ctx.roundRect(statusX, track.y + 14, statusW, 8, 4);
  ctx.fill();
  ctx.fillStyle = signalRatio < 0.36 ? '#ff6f59' : '#58d7ff';
  ctx.beginPath();
  ctx.roundRect(statusX, track.y + 14, statusW * signalRatio, 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(2, 5, 6, 0.62)';
  ctx.beginPath();
  ctx.roundRect(statusX, track.y + 26, statusW, 5, 3);
  ctx.fill();
  ctx.fillStyle = saturationRatio > 0.66 ? '#ff6f59' : '#f4c95d';
  ctx.beginPath();
  ctx.roundRect(statusX, track.y + 26, statusW * saturationRatio, 5, 3);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.ellipse(loop.cx, loop.cy, loop.rx, loop.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 240, 220, 0.12)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.ellipse(loop.cx, loop.cy, loop.rx, loop.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 111, 89, 0.42)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(255, 111, 89, 0.72)';
  ctx.beginPath();
  ctx.ellipse(loop.cx, loop.cy, loop.rx, loop.ry, 0, Math.PI * 0.72, Math.PI * 1.38);
  ctx.stroke();
  ctx.shadowColor = 'rgba(88, 215, 255, 0.5)';
  ctx.strokeStyle = 'rgba(88, 215, 255, 0.78)';
  ctx.beginPath();
  ctx.ellipse(loop.cx, loop.cy, loop.rx, loop.ry, 0, Math.PI * 1.38, Math.PI * 2.72);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(245, 240, 220, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 11]);
  ctx.beginPath();
  ctx.ellipse(loop.cx, loop.cy, loop.rx, loop.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  drawTrackLaneMarkers(state);

  drawAtlasCell(relayWorldSprites.complete && relayWorldSprites.naturalWidth > 0 ? relayWorldSprites : relayAtlas, 4, 5, 19, loop.cx - 30, loop.cy - 33, 60, 60, 0.86);

  ctx.fillStyle = 'rgba(88, 215, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(loop.cx, loop.cy, 43 + Math.sin(state.now * 3) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 201, 93, 0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(loop.cx, loop.cy, 35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '950 19px system-ui';
  ctx.textAlign = 'center';
  if (state.wave.name) {
    ctx.font = '900 9px system-ui';
    ctx.fillStyle = '#f4c95d';
    ctx.fillText(state.wave.name.toUpperCase(), loop.cx, loop.cy - 25);
  }
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '950 19px system-ui';
  ctx.fillText(`WAVE ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`, loop.cx, loop.cy - 4);
  ctx.font = '850 11px system-ui';
  ctx.fillStyle = state.boss.active ? '#ff6f59' : '#8ee6d2';
  ctx.fillText(state.boss.active ? `BOSS ${Math.ceil(state.boss.timer)}s` : `SIGNAL ${Math.ceil(state.signal.integrity)}`, loop.cx, loop.cy + 15);
  if (state.boss.active) {
    const bossRatio = Math.max(0, Math.min(1, state.boss.timer / state.boss.limit));
    ctx.shadowColor = 'rgba(255, 111, 89, 0.7)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(5, 7, 8, 0.72)';
    ctx.beginPath();
    ctx.roundRect(track.x + 52, track.y + track.h - 23, track.w - 104, 11, 6);
    ctx.fill();
    ctx.fillStyle = bossRatio < 0.35 ? '#ff6f59' : '#f4c95d';
    ctx.beginPath();
    ctx.roundRect(track.x + 52, track.y + track.h - 23, (track.w - 104) * bossRatio, 11, 6);
    ctx.fill();
    ctx.fillStyle = '#f5f0dc';
    ctx.font = '950 10px system-ui';
    ctx.fillText('BOSS WINDOW', loop.cx, track.y + track.h - 28);
    ctx.shadowBlur = 0;
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function noisePosition(noise) {
  const p = noise.progress % 1;
  const angle = Math.PI * 0.96 + p * Math.PI * 2;
  const laneOffset = noise.lane === 0 ? -7 : 7;
  const { loop } = sceneLayout;
  const rx = loop.rx + laneOffset;
  const ry = loop.ry + laneOffset * 0.32;
  return { x: loop.cx + Math.cos(angle) * rx, y: loop.cy + Math.sin(angle) * ry };
}

function noiseHeading(noise) {
  const current = noisePosition(noise);
  const next = noisePosition({ ...noise, progress: (noise.progress + 0.006) % 1 });
  return Math.atan2(next.y - current.y, next.x - current.x);
}

function drawAmbientNoise(state) {
  const atlas = noiseWorldSprites.complete && noiseWorldSprites.naturalWidth > 0 ? noiseWorldSprites : null;
  if (state.noise.length > 0 || !atlas) return;
  const previews = [
    { type: 'flicker', progress: (state.now * 0.022) % 1, lane: 0 },
    { type: 'crawler', progress: (0.08 + state.now * 0.018) % 1, lane: 1 },
    { type: 'splitter', progress: (0.17 + state.now * 0.016) % 1, lane: 0 }
  ];
  ctx.save();
  for (const item of previews) {
    const spec = NOISE_TYPES[item.type];
    const pos = noisePosition(item);
    drawAtlasCell(atlas, 4, 2, spec.atlasIndex ?? 0, pos.x - 17, pos.y - 17, 34, 34, 0.46);
  }
  ctx.restore();
}

function drawNoiseFallback(noise, pos, spec, iconSize) {
  const threat = Math.max(0, noise.progress - 0.62) / 0.38;
  ctx.save();
  ctx.shadowColor = spec.color;
  ctx.shadowBlur = 10 + threat * 10;
  ctx.fillStyle = spec.color;
  ctx.globalAlpha = noise.type === 'boss' ? 0.9 : 0.78;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, iconSize * (noise.type === 'boss' ? 0.34 : 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.22 + threat * 0.18;
  ctx.strokeStyle = spec.color;
  ctx.lineWidth = noise.type === 'boss' ? 4 : 2;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, iconSize * (0.38 + threat * 0.08), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawNoiseWake(noise, pos, spec, iconSize) {
  ctx.save();
  const wakeColor = noise.type === 'boss' ? '#ff6f59' : spec.color;
  for (let i = 1; i <= 5; i += 1) {
    const progress = (noise.progress - i * 0.014 + 1) % 1;
    const trail = noisePosition({ progress, lane: noise.lane });
    ctx.globalAlpha = Math.max(0.04, 0.22 - i * 0.032);
    ctx.fillStyle = wakeColor;
    ctx.shadowColor = wakeColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(trail.x, trail.y + iconSize * 0.18, iconSize * (0.22 - i * 0.014), iconSize * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = noise.type === 'boss' ? 0.44 : 0.3;
  ctx.shadowColor = wakeColor;
  ctx.shadowBlur = noise.type === 'boss' ? 15 : 8;
  ctx.strokeStyle = wakeColor;
  ctx.lineWidth = noise.type === 'boss' ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + iconSize * 0.24, iconSize * 0.44, iconSize * 0.15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawNoiseGrounding(noise, pos, spec, iconSize, threat) {
  ctx.save();
  const wakeColor = noise.type === 'boss' ? '#ff6f59' : spec.color;
  const heading = noiseHeading(noise);
  ctx.translate(pos.x, pos.y + iconSize * 0.27);
  ctx.rotate(heading);
  ctx.globalAlpha = noise.type === 'boss' ? 0.52 : 0.36 + threat * 0.16;
  ctx.fillStyle = noise.type === 'boss' ? 'rgba(255, 111, 89, 0.52)' : 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 0, iconSize * 0.42, iconSize * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = noise.type === 'boss' ? 0.38 : 0.2 + threat * 0.16;
  ctx.strokeStyle = wakeColor;
  ctx.shadowColor = wakeColor;
  ctx.shadowBlur = noise.type === 'boss' ? 16 : 9;
  ctx.lineWidth = noise.type === 'boss' ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, iconSize * 0.5, iconSize * 0.17, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawNoiseSprite(noise, pos, spec, iconSize) {
  const atlas = noiseWorldSprites.complete && noiseWorldSprites.naturalWidth > 0 ? noiseWorldSprites : null;
  if (!atlas) {
    drawNoiseFallback(noise, pos, spec, iconSize);
    return;
  }

  const atlasIndex = spec.atlasIndex ?? 0;
  const cellW = atlas.naturalWidth / 4;
  const cellH = atlas.naturalHeight / 2;
  const col = atlasIndex % 4;
  const row = Math.floor(atlasIndex / 4);
  const heading = noiseHeading(noise);
  const pulse = Math.sin(game.now * (noise.type === 'boss' ? 5 : 8) + noise.progress * 18);
  const hover = pulse * (noise.type === 'boss' ? 1.4 : 2.2);
  const squash = 1 + pulse * (noise.type === 'boss' ? 0.018 : 0.035);

  ctx.save();
  ctx.translate(pos.x, pos.y + hover);
  ctx.rotate(heading);
  ctx.scale(1 + (squash - 1) * 0.4, 1 / squash);
  ctx.shadowColor = spec.color;
  ctx.shadowBlur = noise.type === 'boss' ? 20 : 10;
  ctx.drawImage(atlas, col * cellW, row * cellH, cellW, cellH, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = noise.type === 'boss' ? 0.28 : 0.16;
  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.ellipse(iconSize * 0.12, 0, iconSize * 0.16, iconSize * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawNoise(state) {
  drawAmbientNoise(state);
  for (const noise of state.noise) {
    const pos = noisePosition(noise);
    const spec = NOISE_TYPES[noise.type];
    const iconSize = noise.type === 'boss' ? 78 : Math.max(38, noise.radius * 5);
    const threat = Math.max(0, noise.progress - 0.72) / 0.28;
    drawNoiseWake(noise, pos, spec, iconSize);
    drawNoiseGrounding(noise, pos, spec, iconSize, threat);
    drawNoiseSprite(noise, pos, spec, iconSize);
    if (threat > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.4, threat * 0.5);
      ctx.strokeStyle = noise.type === 'boss' ? '#f4c95d' : '#ff6f59';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.lineWidth = noise.type === 'boss' ? 3 : 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, iconSize * (0.44 + threat * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (noise.type === 'boss') {
      ctx.strokeStyle = '#f4c95d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 37, 0, Math.PI * 2);
      ctx.stroke();
    }
    const hpRatio = Math.max(0, noise.hp / noise.maxHp);
    if (noise.type === 'boss' || hpRatio < 0.98) {
      ctx.fillStyle = 'rgba(5, 7, 8, 0.72)';
      ctx.fillRect(pos.x - 16, pos.y - iconSize / 2 - 7, 32, 4);
      ctx.fillStyle = noise.type === 'boss' ? '#ff6f59' : '#f4c95d';
      ctx.fillRect(pos.x - 16, pos.y - iconSize / 2 - 7, 32 * hpRatio, 4);
    }
  }
}

function drawRelayTierHalo(relay, x, y, size) {
  const spec = RELAY_TYPES[relay.relayId];
  const tierBoost = Math.max(0, relay.tier - 1);
  const gradeOrder = Object.keys(GRADES);
  const gradeBoost = gradeOrder.indexOf(relay.grade) / Math.max(1, gradeOrder.length - 1);
  const glow = Math.min(1, 0.18 + tierBoost * 0.16 + gradeBoost * 0.22);

  ctx.save();
  ctx.globalAlpha = glow;
  ctx.shadowColor = spec.palette;
  ctx.shadowBlur = 12 + tierBoost * 5;
  ctx.strokeStyle = relay.tier > 1 ? spec.palette : 'rgba(245, 240, 220, 0.24)';
  ctx.lineWidth = relay.tier > 1 ? 2.8 : 1.3;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * (0.39 + tierBoost * 0.035), 0, Math.PI * 2);
  ctx.stroke();
  if (relay.tier > 1) {
    for (let i = 0; i < Math.min(4, relay.tier); i += 1) {
      const angle = game.now * 1.7 + i * (Math.PI * 2 / Math.min(4, relay.tier));
      ctx.fillStyle = spec.palette;
      ctx.beginPath();
      ctx.arc(x + size / 2 + Math.cos(angle) * size * 0.42, y + size / 2 + Math.sin(angle) * size * 0.42, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRelayIcon(relay, x, y, size) {
  const spec = RELAY_TYPES[relay.relayId];
  const atlas = relayWorldSprites.complete && relayWorldSprites.naturalWidth > 0 ? relayWorldSprites : relayAtlas;
  const cellW = atlas.naturalWidth / 4;
  const cellH = atlas.naturalHeight / 5;
  const col = spec.atlasIndex % 4;
  const row = Math.floor(spec.atlasIndex / 4);
  if (atlas.complete && atlas.naturalWidth > 0) {
    ctx.drawImage(atlas, col * cellW, row * cellH, cellW, cellH, x, y, size, size);
  } else {
    ctx.fillStyle = spec.palette;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  if (relay.overclockUntil > game.now) {
    ctx.strokeStyle = '#ff6f59';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (relay.linkPulseUntil > game.now) {
    ctx.strokeStyle = '#58d7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function slotCenter(rect, index) {
  const slot = boardSlotRect(rect, index);
  return { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 };
}

function effectTargetPosition(state, effect) {
  const liveNoise = state.noise.find((item) => item.id === effect.targetId);
  if (liveNoise) return noisePosition(liveNoise);
  if (Number.isFinite(effect.targetProgress)) {
    return noisePosition({ progress: effect.targetProgress, lane: effect.targetLane ?? 0 });
  }
  return { ...sceneLayout.loop };
}

function relayCenterById(state, effect) {
  const playerId = effect.playerId ?? localBoardId;
  const board = state.boards[playerId];
  const directSlot = Number.isInteger(effect.slot) ? effect.slot : -1;
  const slot = directSlot >= 0 ? directSlot : board?.slots.findIndex((relay) => relay?.id === effect.unitId) ?? -1;
  if (slot < 0) return null;
  return slotCenter(displayRectForBoard(playerId), slot);
}

function drawAttackBeam(state, effect, alpha) {
  const from = relayCenterById(state, effect);
  if (!from) return false;
  const to = effectTargetPosition(state, effect);
  const spec = RELAY_TYPES[effect.relayId];
  const color = spec?.palette ?? effect.targetColor ?? '#58d7ff';
  const impactRadius = 8 + (1 - alpha) * 10;

  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.28 + alpha * 0.9);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.lineCap = 'round';
  ctx.lineWidth = effect.targetType === 'boss' ? 6 : 4;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.globalAlpha = Math.min(1, 0.34 + alpha * 0.55);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#f5f0dc';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.globalAlpha = Math.min(1, 0.5 + alpha * 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(to.x, to.y, impactRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5f0dc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(to.x, to.y, impactRadius + 4, 0, Math.PI * 2);
  ctx.stroke();

  drawProjectileSignature(state, effect, from, to, spec, alpha);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#f5f0dc';
  ctx.font = effect.damage >= 100 ? '950 15px system-ui' : '950 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(String(effect.damage), to.x, to.y - 22 - (1 - alpha) * 14);
  ctx.restore();
  return true;
}

function drawProjectileSignature(state, effect, from, to, spec, alpha) {
  if (!spec) return;
  const color = spec.palette;
  const tag = spec.tags?.[0] ?? 'Beam';
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / length;
  const ny = dy / length;
  const travel = (state.now * 8 + (effect.damage ?? 0) * 0.017) % 1;

  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.36 + alpha * 0.42);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;

  if (tag === 'Pulse') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i += 1) {
      ctx.globalAlpha = Math.max(0.08, alpha * (0.42 - i * 0.08));
      ctx.beginPath();
      ctx.arc(to.x, to.y, 10 + i * 9 + (1 - alpha) * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (tag === 'Field') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.PI / 6 + i * Math.PI / 3 + state.now * 0.8;
      const x = to.x + Math.cos(angle) * 18;
      const y = to.y + Math.sin(angle) * 12;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (tag === 'Sink' || tag === 'Repair') {
    ctx.strokeStyle = tag === 'Repair' ? '#95d5b2' : color;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i += 1) {
      const t = (travel + i * 0.22) % 1;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      ctx.globalAlpha = Math.max(0.12, alpha * (0.5 - i * 0.06));
      ctx.beginPath();
      ctx.moveTo(x + nx * 8, y + ny * 8);
      ctx.lineTo(x - ny * 4, y + nx * 4);
      ctx.lineTo(x - nx * 8, y - ny * 8);
      ctx.lineTo(x + ny * 4, y - nx * 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawRewardFlyout(effect, to, alpha) {
  const charge = effect.rewardCharge ?? 0;
  const link = effect.rewardLink ?? 0;
  if (charge <= 0 && link <= 0) return;
  const lift = (1 - alpha) * 24;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.15);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#f4c95d';
  ctx.font = '950 10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`+${charge}C`, to.x - 11, to.y - 32 - lift);
  if (link > 0) {
    ctx.fillStyle = '#58d7ff';
    ctx.fillText(`+${link}L`, to.x + 18, to.y - 32 - lift);
  }
  ctx.restore();
}

function drawDeathBurst(effect, alpha) {
  const to = effectTargetPosition({ noise: [] }, effect);
  const color = effect.targetColor ?? (effect.targetType === 'boss' ? '#ff6f59' : '#f4c95d');
  const radius = effect.targetType === 'boss' ? 34 : 18;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.15);
  ctx.shadowColor = color;
  ctx.shadowBlur = effect.targetType === 'boss' ? 22 : 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = effect.targetType === 'boss' ? 4 : 2.5;
  ctx.beginPath();
  ctx.arc(to.x, to.y, radius + (1 - alpha) * 24, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  for (let i = 0; i < 9; i += 1) {
    const angle = (Math.PI * 2 * i) / 9 + (effect.targetProgress ?? 0) * Math.PI;
    const length = radius * 0.8 + (1 - alpha) * 26;
    const x = to.x + Math.cos(angle) * length;
    const y = to.y + Math.sin(angle) * length * 0.68;
    ctx.beginPath();
    ctx.arc(x, y, effect.targetType === 'boss' ? 3.2 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRewardFlyout(effect, to, alpha);
  ctx.restore();
}

function drawSlotPulse(state, effect, alpha, color) {
  const center = relayCenterById(state, effect);
  if (!center) return false;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.25);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 18 + (1 - alpha) * 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return true;
}

function drawPulseCoolingWave(state, effect, alpha) {
  const rect = displayRectForBoard(effect.targetPlayerId ?? partnerId(effect.playerId ?? localBoardId));
  const color = effect.type === 'link_pulse_save' ? '#f4c95d' : '#58d7ff';
  ctx.save();
  ctx.globalAlpha = Math.min(0.88, alpha * 1.15);
  ctx.shadowColor = color;
  ctx.shadowBlur = effect.type === 'link_pulse_save' ? 22 : 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = effect.type === 'link_pulse_save' ? 3.2 : 2.2;
  ctx.beginPath();
  ctx.roundRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 10);
  ctx.stroke();
  ctx.globalAlpha = Math.min(0.32, alpha * 0.42);
  const waveY = rect.y + rect.h * (0.18 + (1 - alpha) * 0.64);
  ctx.fillStyle = color;
  ctx.fillRect(rect.x + 10, waveY, rect.w - 20, 3);
  ctx.restore();
}

function drawOverdriveBurst(state, effect, alpha) {
  const rect = displayRectForBoard(effect.playerId ?? localBoardId);
  const center = Number.isInteger(effect.slot) ? slotCenter(rect, effect.slot) : { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const color = effect.source === 'link_pulse' ? '#58d7ff' : '#f4c95d';
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.28);
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 22 + (1 - alpha) * 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = Math.min(0.32, alpha * 0.52);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, 10);
  ctx.fill();
  ctx.restore();
}

function drawLinks(board, rect, now) {
  const links = computeActiveLinks(board, now);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const link of links) {
    const a = slotCenter(rect, link.a);
    const b = slotCenter(rect, link.b);
    ctx.strokeStyle = 'rgba(88, 215, 255, 0.58)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(244, 201, 93, 0.66)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 5;
  }
}

function drawMergeReadyCue(state, playerId, rect) {
  const slots = mergeCueSlots(state, playerId);
  if (playerId !== localBoardId || slots.length < GAME_RULES.mergeCount - 1) return;
  const complete = slots.length >= GAME_RULES.mergeCount;
  const centers = slots.map((index) => slotCenter(rect, index));
  const pulse = (complete ? 0.72 : 0.42) + Math.sin(state.now * (complete ? 7.5 : 5.5)) * (complete ? 0.2 : 0.12);

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.shadowColor = '#f4c95d';
  ctx.shadowBlur = complete ? 18 : 10;
  ctx.strokeStyle = complete ? 'rgba(244, 201, 93, 0.86)' : 'rgba(244, 201, 93, 0.48)';
  ctx.lineWidth = complete ? 3 : 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (complete) {
    ctx.beginPath();
    centers.forEach((center, index) => {
      if (index === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  for (const index of slots) {
    const slot = boardSlotRect(rect, index);
    ctx.lineWidth = complete ? 2.4 : 1.8;
    ctx.strokeStyle = complete ? '#f4c95d' : 'rgba(244, 201, 93, 0.66)';
    ctx.beginPath();
    ctx.roundRect(slot.x + 2, slot.y + 2, slot.w - 4, slot.h - 4, 8);
    ctx.stroke();
    if (!complete) {
      const center = slotCenter(rect, index);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 17 + Math.sin(state.now * 4.5 + index) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSocketGlyph(slot, index, color, alpha = 1) {
  const cx = slot.x + slot.w / 2;
  const cy = slot.y + slot.h / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoard(state, playerId) {
  const rect = displayRectForBoard(playerId);
  const board = state.boards[playerId];
  const isMine = playerId === localBoardId;
  const heatPeak = board.heatPeak ?? 0;
  const border = heatPeak >= 90 ? '#ff6f59' : isMine ? '#58d7ff' : '#95d5b2';
  const readySlots = mergeCueSlots(state, playerId);

  drawMetalPlate(rect.x, rect.y, rect.w, rect.h, 10, heatPeak >= 90 ? 'rgba(255, 111, 89, 0.7)' : isMine ? 'rgba(88, 215, 255, 0.72)' : 'rgba(149, 213, 178, 0.62)');
  ctx.strokeStyle = border;
  ctx.lineWidth = heatPeak >= 90 ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
  ctx.stroke();

  ctx.strokeStyle = isMine ? 'rgba(88, 215, 255, 0.22)' : 'rgba(149, 213, 178, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '900 12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(isMine ? 'YOUR RELAYS' : 'PARTNER RELAYS', rect.x, rect.y - 12);
  ctx.fillStyle = heatPeak >= 90 ? '#ff6f59' : '#f4c95d';
  ctx.textAlign = 'right';
  ctx.fillText(`HEAT ${Math.floor(heatPeak)}`, rect.x + rect.w, rect.y - 12);
  ctx.shadowBlur = 0;

  drawLinks(board, rect, state.now);
  drawMergeReadyCue(state, playerId, rect);

  board.slots.forEach((relay, index) => {
    const slot = boardSlotRect(rect, index);
    const selectedSlot = isMine && selected.includes(index);
    const mergeReadySlot = isMine && readySlots.includes(index);
    const anchor = index === board.anchorIndex;
    const tileGradient = ctx.createLinearGradient(slot.x, slot.y, slot.x, slot.y + slot.h);
    tileGradient.addColorStop(0, selectedSlot || mergeReadySlot ? 'rgba(244, 201, 93, 0.26)' : anchor ? 'rgba(244, 201, 93, 0.15)' : 'rgba(245, 240, 220, 0.09)');
    tileGradient.addColorStop(1, 'rgba(4, 6, 7, 0.44)');
    ctx.fillStyle = tileGradient;
    ctx.strokeStyle = selectedSlot || mergeReadySlot ? '#f4c95d' : anchor ? 'rgba(244, 201, 93, 0.5)' : 'rgba(245, 240, 220, 0.13)';
    ctx.lineWidth = selectedSlot ? 3 : mergeReadySlot ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 7);
    ctx.fill();
    ctx.stroke();
    if (relay) {
      const spec = RELAY_TYPES[relay.relayId];
      const iconSize = 48;
      drawRelayTierHalo(relay, slot.x + slot.w / 2 - iconSize / 2, slot.y + slot.h / 2 - iconSize / 2 - 3, iconSize);
      drawRelayIcon(relay, slot.x + slot.w / 2 - iconSize / 2, slot.y + slot.h / 2 - iconSize / 2 - 3, iconSize);
      ctx.fillStyle = 'rgba(2, 4, 5, 0.62)';
      ctx.beginPath();
      ctx.roundRect(slot.x + 3, slot.y + 3, 25, 13, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(slot.x + slot.w - 30, slot.y + 3, 27, 13, 5);
      ctx.fill();
      ctx.fillStyle = GRADES[relay.grade].color;
      ctx.font = '900 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`T${relay.tier}`, slot.x + 15, slot.y + 13);
      ctx.fillStyle = relay.heat >= 90 ? '#ff6f59' : '#f5f0dc';
      ctx.fillText(Math.floor(relay.heat), slot.x + slot.w - 16, slot.y + 13);
      ctx.fillStyle = '#f5f0dc';
      ctx.font = '800 8px system-ui';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(spec.name.split(' ')[0], slot.x + slot.w / 2, slot.y + slot.h - 4);
      ctx.shadowBlur = 0;
    } else {
      drawSocketGlyph(slot, index, anchor ? '#f4c95d' : isMine ? '#58d7ff' : '#95d5b2', anchor ? 0.46 : 0.18);
      if (anchor || index === GAME_RULES.supplyPlacementPriority[0]) {
        drawAtlasCell(relayAtlas, 4, 5, anchor ? 12 : 0, slot.x + slot.w / 2 - 17, slot.y + slot.h / 2 - 18, 34, 34, 0.16);
      }
    }
  });
}

function drawEffects(state) {
  for (const effect of state.effects) {
    const alpha = Math.max(0, Math.min(1, effect.ttl));
    if (effect.type === 'hit') {
      drawAttackBeam(state, effect, alpha);
    } else if (effect.type === 'death_burst') {
      drawDeathBurst(effect, alpha);
    } else if (effect.type === 'link_pulse' || effect.type === 'link_pulse_save') {
      const { loop } = sceneLayout;
      drawPulseCoolingWave(state, effect, alpha);
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 1.35);
      ctx.shadowColor = effect.type === 'link_pulse_save' ? '#f4c95d' : '#58d7ff';
      ctx.shadowBlur = effect.type === 'link_pulse_save' ? 22 : 16;
      ctx.strokeStyle = effect.type === 'link_pulse_save' ? '#f4c95d' : '#58d7ff';
      ctx.lineWidth = effect.type === 'link_pulse_save' ? 5 : 3;
      ctx.beginPath();
      ctx.arc(loop.cx, loop.cy, 24 + (1 - alpha) * 96, 0, Math.PI * 2);
      ctx.stroke();
      if (effect.type === 'link_pulse_save') {
        ctx.fillStyle = '#f4c95d';
        ctx.font = '900 17px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('SAVED BY LINK PULSE', loop.cx, loop.cy + 4);
      }
      ctx.restore();
    } else if (effect.type === 'supply' || effect.type === 'merge') {
      drawSlotPulse(state, effect, alpha, effect.type === 'merge' ? '#f4c95d' : '#58d7ff');
      const center = relayCenterById(state, effect);
      if (effect.type === 'merge' && center) drawRewardFlyout(effect, center, alpha);
    } else if (effect.type === 'repair') {
      drawSlotPulse(state, effect, alpha, '#95d5b2');
    } else if (effect.type === 'overclock') {
      drawOverdriveBurst(state, effect, alpha);
    } else {
      const { loop } = sceneLayout;
      const color = effect.type === 'merge' ? '#f4c95d' : effect.type === 'overclock' || effect.type === 'shutdown' ? '#ff6f59' : '#8ee6d2';
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 1.35);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(loop.cx, loop.cy, 36 + (1 - alpha) * 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawThreatTelemetry(state) {
  const leading = [...state.noise].sort((a, b) => b.progress - a.progress)[0] ?? null;
  const { track } = sceneLayout;
  const danger = leading ? Math.max(0, leading.progress - 0.58) / 0.42 : 0;
  const x = VIEW_WIDTH - 126;
  const y = track.y + 42;
  const panelAlpha = state.noise.length > 0 ? 0.78 : 0.5;

  ctx.save();
  ctx.globalAlpha = panelAlpha;
  ctx.shadowColor = danger > 0.55 || state.boss.active ? 'rgba(255, 111, 89, 0.45)' : 'rgba(88, 215, 255, 0.28)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(4, 7, 8, 0.74)';
  ctx.strokeStyle = danger > 0.55 || state.boss.active ? 'rgba(255, 111, 89, 0.52)' : 'rgba(88, 215, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, 104, 44, 10);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = danger > 0.55 || state.boss.active ? '#ff6f59' : '#8ee6d2';
  ctx.font = '950 9px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(state.boss.active ? 'BOSS THREAT' : 'THREAT', x + 10, y + 14);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '950 15px system-ui';
  ctx.fillText(String(state.noise.length).padStart(2, '0'), x + 10, y + 33);
  ctx.fillStyle = '#a8b4a7';
  ctx.font = '850 9px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(leading ? `${Math.round(leading.progress * 100)}%` : 'CLEAR', x + 94, y + 33);

  if (leading) {
    const pos = noisePosition(leading);
    ctx.globalAlpha = 0.64;
    ctx.strokeStyle = danger > 0.55 ? '#ff6f59' : '#58d7ff';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 42);
    ctx.lineTo(pos.x, pos.y - 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawPressureFrame(state) {
  const signalPressure = 1 - Math.max(0, Math.min(1, state.signal.integrity / GAME_RULES.signalMax));
  const saturationPressure = Math.max(0, Math.min(1, state.saturation.count / state.saturation.limit));
  const bossPressure = state.boss.active ? Math.max(0.2, 1 - state.boss.timer / state.boss.limit) : 0;
  const pressure = Math.max(signalPressure, saturationPressure, bossPressure);
  if (pressure < 0.34) return;

  const pulse = 0.68 + Math.sin(state.now * (state.boss.active ? 8 : 5)) * 0.22;
  const alpha = Math.min(0.52, (pressure - 0.25) * pulse);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = state.boss.active ? '#f4c95d' : '#ff6f59';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, VIEW_WIDTH - 12, viewport.viewHeight - 12);
  ctx.globalAlpha = Math.min(0.36, alpha * 0.7);
  const dangerGradient = ctx.createLinearGradient(0, 0, 0, viewport.viewHeight);
  dangerGradient.addColorStop(0, state.boss.active ? 'rgba(244, 201, 93, 0.26)' : 'rgba(255, 111, 89, 0.3)');
  dangerGradient.addColorStop(0.34, 'rgba(0, 0, 0, 0)');
  dangerGradient.addColorStop(0.66, 'rgba(0, 0, 0, 0)');
  dangerGradient.addColorStop(1, 'rgba(255, 111, 89, 0.2)');
  ctx.fillStyle = dangerGradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);
  ctx.restore();
}

function screenShakeOffset(state) {
  const power = state.effects.reduce((max, effect) => {
    if (effect.type === 'death_burst' && effect.targetType === 'boss') return Math.max(max, 2.8 * Math.max(0, effect.ttl));
    if (effect.type === 'boss_execute') return Math.max(max, 2.2 * Math.max(0, effect.ttl));
    if (effect.type === 'overclock') return Math.max(max, 1.9 * Math.max(0, effect.ttl));
    if (effect.type === 'link_pulse_save') return Math.max(max, 1.8 * Math.max(0, effect.ttl));
    if (effect.type === 'loop_complete') return Math.max(max, 1.6 * Math.max(0, effect.ttl));
    if (effect.type === 'death_burst') return Math.max(max, 0.85 * Math.max(0, effect.ttl));
    return max;
  }, 0);
  if (power <= 0.01) return { x: 0, y: 0 };
  return {
    x: Math.sin(state.now * 71) * power,
    y: Math.cos(state.now * 53) * power * 0.62
  };
}

function render() {
  syncCanvasScale();
  const state = currentState();
  drawBackground(state);
  const shake = screenShakeOffset(state);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawStageChrome(state);
  drawBoardConnectors(state);
  drawRunSpine(state);
  drawBoard(state, partnerId(localBoardId));
  drawTrack(state);
  drawNoise(state);
  drawEventFeed(state);
  drawThreatTelemetry(state);
  drawBoard(state, localBoardId);
  drawEffects(state);
  drawPressureFrame(state);
  ctx.restore();

  if (state.over) {
    ctx.fillStyle = 'rgba(2, 4, 5, 0.82)';
    ctx.fillRect(0, 0, VIEW_WIDTH, viewport.viewHeight);
  }
}

function setActionButton(button, label, enabled, reason = '', accessibleLabel = label) {
  button.textContent = label;
  button.disabled = !enabled;
  button.title = reason;
  button.setAttribute('aria-disabled', String(!enabled));
  button.setAttribute('aria-label', accessibleLabel);
}

function updateActionButtons(state) {
  const actions = state.actionState?.[localBoardId];
  if (!actions) return;
  setActionButton(actionButtons.supply, 'Supply', actions.supply.available, actions.supply.reason, 'Supply relay');
  actionButtons.supply.dataset.hot = String(actions.supply.available);
  setActionButton(
    actionButtons.merge,
    'Merge',
    actions.merge.available,
    actions.merge.reason,
    'Merge relays'
  );
  actionButtons.merge.dataset.hot = String(actions.merge.available);
  const pulseLabel = actions.linkPulse.cooldownRemaining > 0 ? `${Math.ceil(actions.linkPulse.cooldownRemaining)}s` : 'Pulse';
  const pulseAccessibleLabel = actions.linkPulse.cooldownRemaining > 0
    ? `Link Pulse ${Math.ceil(actions.linkPulse.cooldownRemaining)} seconds`
    : 'Link Pulse';
  setActionButton(actionButtons.pulse, pulseLabel, actions.linkPulse.available, actions.linkPulse.reason, pulseAccessibleLabel);
  actionButtons.pulse.dataset.ready = String(actions.linkPulse.available);
  actionButtons.pulse.dataset.clutch = String(actions.linkPulse.clutch);
}

function updateHud() {
  const state = currentState();
  chargeMeter.textContent = `C ${Math.floor(state.resources.charge)}`;
  linkMeter.textContent = `L ${Math.floor(state.resources.linkEnergy)}`;
  gemMeter.textContent = `G ${online ? metaProfile.gems : Math.floor(state.resources.gems)}`;
  waveMeter.textContent = `Wave ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`;
  signalMeter.textContent = `Signal ${Math.ceil(state.signal.integrity)} / Sat ${Math.floor(state.saturation.count)}`;
  bossMeter.textContent = state.boss.active ? `Boss ${Math.ceil(state.boss.timer)}s` : 'Boss --';
  updateActionButtons(state);
  syncResultOverlay(state);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (runStarted && !online) tickGame(game, dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

function buildShop() {
  shopList.innerHTML = [
    buildShopSection('UNLOCKS', SHOP.items.map((item) => {
      const owned = item.grant.cosmetic ? metaProfile.unlocks.includes(item.grant.cosmetic) : false;
      return `
    <div class="row" ${owned ? 'data-claimed="true"' : 'data-claimed="false"'}>
      <div><strong>${item.name}</strong><span>${item.description}</span></div>
      <button data-buy="${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : `${item.price.gems} G`}</button>
    </div>
    `;
    }).join('')),
    buildShopSection('MISSIONS', SHOP.dailyMissions.map((mission) => `
    <div class="mission-row" ${metaProfile.claimedMissions.includes(mission.id) ? 'data-claimed="true"' : 'data-claimed="false"'}>
      <div><strong>${mission.text}</strong><span>${metaProfile.claimedMissions.includes(mission.id) ? 'Reward claimed' : `Reward ${mission.reward.gems} G`}</span></div>
      <span>${metaProfile.claimedMissions.includes(mission.id) ? 'Done' : 'Daily'}</span>
    </div>
    `).join('')),
    buildShopSection('SEASON TRACK', SHOP.pass.tiers.map((tier, index) => `
    <div class="track-row" ${metaProfile.claimedPassTiers.includes(index) ? 'data-claimed="true"' : 'data-claimed="false"'}>
      <div><strong>${SHOP.pass.name} ${index + 1}</strong><span>${tier.xp} XP reward track</span></div>
      <span>${metaProfile.claimedPassTiers.includes(index) ? 'Claimed' : tier.grant.gems ? `${tier.grant.gems} G` : 'Skin'}</span>
    </div>
    `).join(''))
  ].join('');
  shopList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => command({ type: 'buy', itemId: button.dataset.buy }));
  });
}

function buildShopSection(title, body) {
  return `<section class="shop-section"><strong>${title}</strong>${body}</section>`;
}

function connectOnline() {
  if (socket?.readyState === WebSocket.OPEN) {
    hideLaunchOverlay();
    return;
  }
  if (socket?.readyState === WebSocket.CONNECTING) return;
  setLaunchConnecting(true);
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const activeSocket = new WebSocket(`${protocol}//${location.host}/ws`);
  socket = activeSocket;
  netStatus.textContent = 'CONNECTING';
  activeSocket.addEventListener('open', () => {
    if (socket !== activeSocket) return;
    online = true;
    selected = [];
    activeRunProfileGems = metaProfile.gems;
    onlineProfileSpentGems = 0;
    netStatus.textContent = 'ONLINE CO-OP';
    hideLaunchOverlay();
    activeSocket.send(JSON.stringify({ type: 'join', playerId: localPlayerId, name: 'Player', profile: { gems: metaProfile.gems, unlocks: metaProfile.unlocks } }));
  });
  activeSocket.addEventListener('message', (event) => {
    if (socket !== activeSocket) return;
    const message = JSON.parse(event.data);
    if (message.type === 'state') {
      if (message.boardPlayer && message.boardPlayer !== localBoardId) selected = [];
      localBoardId = message.boardPlayer ?? localBoardId;
      game = message.state;
    }
    if (message.type === 'action_result' && message.actionType === 'buy' && message.result?.ok) {
      onlineProfileSpentGems += Math.max(0, Math.floor(message.result.spent?.gems ?? 0));
      syncProfileAfterPurchase(message.result);
    }
    if (message.type === 'error') showToast(message.reason);
  });
  activeSocket.addEventListener('close', () => {
    if (socket !== activeSocket) return;
    socket = null;
    online = false;
    setLaunchConnecting(false);
    if (!runStarted) {
      netStatus.textContent = 'BOT CO-OP';
      showToast('Online unavailable.');
      return;
    }
    if (resultView) return;
    localBoardId = 'p1';
    netStatus.textContent = 'BOT CO-OP';
    showToast('Bot co-op resumed.');
    game = createProfiledGame({ mode: 'bot', seed: Date.now() % 100000 });
    runStarted = true;
  });
}

canvas.addEventListener('pointerdown', (event) => {
  if (!runStarted || resultView) return;
  const hit = slotAt(canvasPoint(event));
  if (!hit || hit.playerId !== localBoardId) return;
  const relay = game.boards[localBoardId].slots[hit.index];
  if (!relay) return;
  if (selected.includes(hit.index)) selected = selected.filter((index) => index !== hit.index);
  else selected = [...selected, hit.index].slice(-3);
  const names = selected.map((index) => RELAY_TYPES[game.boards[localBoardId].slots[index]?.relayId]?.name).filter(Boolean);
  if (names.length > 0) showToast(names.join(' + '));
});

actionButtons.supply.addEventListener('click', () => command({ type: 'supply' }));
actionButtons.merge.addEventListener('click', () => command({ type: 'merge' }));
actionButtons.pulse.addEventListener('click', () => command({ type: 'pulse' }));
launchBotButton.addEventListener('click', startBotRun);
launchOnlineButton.addEventListener('click', connectOnline);
resultRetryButton.addEventListener('click', startBotRun);
resultLobbyButton.addEventListener('click', showLaunchOverlay);
shopButton.addEventListener('click', () => {
  drawer.hidden = false;
});
document.querySelector('#closeDrawer').addEventListener('click', () => {
  drawer.hidden = true;
});

buildShop();
requestAnimationFrame(loop);
