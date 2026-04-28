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
const actionButtons = {
  supply: document.querySelector('#supplyButton'),
  merge: document.querySelector('#mergeButton'),
  swap: document.querySelector('#swapButton'),
  focus: document.querySelector('#focusButton'),
  pulse: document.querySelector('#pulseButton'),
  overclock: document.querySelector('#overclockButton')
};

const artDirectionImage = new Image();
artDirectionImage.src = '/src/client/assets/generated/signal-relay-art-direction.png';
const playfieldImage = new Image();
playfieldImage.src = '/src/client/assets/generated/signal-relay-playfield-frame.png';
const relayAtlas = new Image();
relayAtlas.src = '/src/client/assets/generated/relay-unit-atlas.png';
const noiseEnemyAtlas = new Image();
noiseEnemyAtlas.src = '/src/client/assets/generated/noise-enemy-atlas.png';
const bossDisruptionAtlas = new Image();
bossDisruptionAtlas.src = '/src/client/assets/generated/boss-disruption-atlas.png';

const localPlayerId = `p${Math.floor(Math.random() * 9000) + 1000}`;
const VIEW_WIDTH = 390;
const VIEW_HEIGHT = 500;
let game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
let online = false;
let socket = null;
let last = performance.now();
let selected = [];
let localBoardId = 'p1';

const boardRects = {
  p2: { x: 18, y: 64, w: 354, h: 126 },
  p1: { x: 18, y: 354, w: 354, h: 126 }
};

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

function localAction(action) {
  let result = { ok: false, reason: 'Unknown action.' };
  if (action.type === 'supply') result = supplyRelay(game, { playerId: localBoardId });
  if (action.type === 'merge') result = mergeRelays(game, { playerId: localBoardId, slotIds: selected });
  if (action.type === 'swap') {
    if (selected.length < 2) result = { ok: false, reason: 'Select two sockets.' };
    else result = swapRelays(game, { playerId: localBoardId, from: selected[0], to: selected[1] });
  }
  if (action.type === 'focus') result = upgradeSupplyFocus(game, { playerId: localBoardId });
  if (action.type === 'pulse') result = castLinkPulse(game, { playerId: localBoardId });
  if (action.type === 'overclock') {
    const slot = selected.at(-1);
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
  if (result.ok && action.type === 'overclock') showToast('Overclock armed.');
  if (result.ok && action.type === 'buy') showToast('Unlocked.');
}

function command(action) {
  if (send({ ...action, slotIds: selected, from: selected[0], to: selected[1], slot: selected.at(-1) })) return;
  localAction(action);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT
  };
}

function slotAt(point) {
  const entries = [
    [partnerId(localBoardId), boardRects.p2],
    [localBoardId, boardRects.p1]
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
  return playerId === localBoardId ? boardRects.p1 : boardRects.p2;
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
  const usedImage = coverImage(playfieldImage, 0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0.88) || coverImage(artDirectionImage, 0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0.66);
  if (!usedImage) {
    const gradient = ctx.createLinearGradient(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    gradient.addColorStop(0, '#101312');
    gradient.addColorStop(0.46, '#17251f');
    gradient.addColorStop(1, '#231619');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  ctx.fillStyle = 'rgba(2, 5, 6, 0.24)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const vignette = ctx.createRadialGradient(195, 250, 74, 195, 250, 310);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '900 18px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(state.title.toUpperCase(), 18, 35);
  ctx.font = '800 10px system-ui';
  ctx.fillStyle = '#8ee6d2';
  ctx.fillText(state.mode === 'bot' ? 'BOT CO-OP' : 'ONLINE CO-OP', 20, 52);
  ctx.shadowBlur = 0;
}

function syncCanvasScale() {
  const stageRect = stageWrap.getBoundingClientRect();
  const displayScale = Math.min((stageRect.width || VIEW_WIDTH) / VIEW_WIDTH, (stageRect.height || VIEW_HEIGHT) / VIEW_HEIGHT);
  const displayWidth = Math.max(1, Math.floor(VIEW_WIDTH * displayScale));
  const displayHeight = Math.max(1, Math.floor(VIEW_HEIGHT * displayScale));
  const nextStyleWidth = `${displayWidth}px`;
  const nextStyleHeight = `${displayHeight}px`;
  if (canvas.style.width !== nextStyleWidth) canvas.style.width = nextStyleWidth;
  if (canvas.style.height !== nextStyleHeight) canvas.style.height = nextStyleHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(1, Math.round(displayWidth * pixelRatio));
  const nextHeight = Math.max(1, Math.round(displayHeight * pixelRatio));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(canvas.width / VIEW_WIDTH, 0, 0, canvas.height / VIEW_HEIGHT, 0, 0);
}

function drawPill(x, y, w, label, value, color) {
  ctx.fillStyle = 'rgba(245, 240, 220, 0.06)';
  ctx.strokeStyle = 'rgba(245, 240, 220, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 28, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '900 9px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 8, y + 11);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '900 12px system-ui';
  ctx.fillText(String(value), x + 8, y + 23);
}

function drawCanvasHud(state) {
  drawPill(195, 18, 54, 'CHG', Math.floor(state.resources.charge), '#f4c95d');
  drawPill(253, 18, 54, 'LINK', Math.floor(state.resources.linkEnergy), '#58d7ff');
  drawPill(311, 18, 61, 'GEM', Math.floor(state.resources.gems), '#95d5b2');
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
  const banner = hasBossArt ? { x: 18, y: 189, w: 354, h: 48, r: 10 } : { x: 18, y: 193, w: 354, h: 18, r: 8 };
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

function drawTrack(state) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 9, 0.08)';
  ctx.strokeStyle = 'rgba(244, 201, 93, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(20, 203, 350, 128, 22);
  ctx.fill();
  ctx.stroke();

  const cx = 195;
  const cy = 265;
  const rx = 132;
  const ry = 57;
  ctx.strokeStyle = 'rgba(8, 12, 13, 0.32)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 111, 89, 0.54)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.72, Math.PI * 1.38);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(88, 215, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.38, Math.PI * 2.72);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 240, 220, 0.2)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 11]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  drawAtlasCell(relayAtlas, 4, 5, 19, 165, 232, 60, 60, 0.86);

  ctx.fillStyle = 'rgba(88, 215, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, 43 + Math.sin(state.now * 3) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 201, 93, 0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '950 19px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`, cx, cy - 4);
  ctx.font = '850 11px system-ui';
  ctx.fillStyle = state.boss.active ? '#ff6f59' : '#8ee6d2';
  ctx.fillText(state.boss.active ? `BOSS ${Math.ceil(state.boss.timer)}s` : `SIGNAL ${Math.ceil(state.signal.integrity)}`, cx, cy + 15);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function noisePosition(noise) {
  const p = noise.progress % 1;
  const angle = Math.PI * 0.96 + p * Math.PI * 2;
  const laneOffset = noise.lane === 0 ? -7 : 7;
  const rx = 132 + laneOffset;
  const ry = 57 + laneOffset * 0.32;
  return { x: 195 + Math.cos(angle) * rx, y: 265 + Math.sin(angle) * ry };
}

function drawAmbientNoise(state) {
  if (state.noise.length > 0 || !noiseEnemyAtlas.complete || noiseEnemyAtlas.naturalWidth === 0) return;
  const previews = [
    { type: 'flicker', progress: (state.now * 0.022) % 1, lane: 0 },
    { type: 'crawler', progress: (0.08 + state.now * 0.018) % 1, lane: 1 },
    { type: 'splitter', progress: (0.17 + state.now * 0.016) % 1, lane: 0 }
  ];
  ctx.save();
  for (const item of previews) {
    const spec = NOISE_TYPES[item.type];
    const pos = noisePosition(item);
    drawAtlasCell(noiseEnemyAtlas, 4, 2, spec.atlasIndex ?? 0, pos.x - 14, pos.y - 14, 28, 28, 0.38);
  }
  ctx.restore();
}

function drawNoise(state) {
  drawAmbientNoise(state);
  for (const noise of state.noise) {
    const pos = noisePosition(noise);
    const spec = NOISE_TYPES[noise.type];
    const iconSize = noise.type === 'boss' ? 66 : Math.max(32, noise.radius * 4);
    if (noiseEnemyAtlas.complete && noiseEnemyAtlas.naturalWidth > 0) {
      const atlasIndex = spec.atlasIndex ?? 0;
      const cellW = noiseEnemyAtlas.naturalWidth / 4;
      const cellH = noiseEnemyAtlas.naturalHeight / 2;
      const col = atlasIndex % 4;
      const row = Math.floor(atlasIndex / 4);
      ctx.drawImage(noiseEnemyAtlas, col * cellW, row * cellH, cellW, cellH, pos.x - iconSize / 2, pos.y - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, noise.radius, 0, Math.PI * 2);
      ctx.fill();
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

function drawRelayIcon(relay, x, y, size) {
  const spec = RELAY_TYPES[relay.relayId];
  const cellW = relayAtlas.naturalWidth / 4;
  const cellH = relayAtlas.naturalHeight / 5;
  const col = spec.atlasIndex % 4;
  const row = Math.floor(spec.atlasIndex / 4);
  if (relayAtlas.complete && relayAtlas.naturalWidth > 0) {
    ctx.drawImage(relayAtlas, col * cellW, row * cellH, cellW, cellH, x, y, size, size);
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

  const panelGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  panelGradient.addColorStop(0, isMine ? 'rgba(21, 56, 54, 0.54)' : 'rgba(44, 36, 31, 0.52)');
  panelGradient.addColorStop(1, 'rgba(6, 10, 11, 0.64)');
  ctx.fillStyle = panelGradient;
  ctx.strokeStyle = border;
  ctx.lineWidth = heatPeak >= 90 ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
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

  board.slots.forEach((relay, index) => {
    const slot = boardSlotRect(rect, index);
    const selectedSlot = isMine && selected.includes(index);
    const anchor = index === board.anchorIndex;
    const tileGradient = ctx.createLinearGradient(slot.x, slot.y, slot.x, slot.y + slot.h);
    tileGradient.addColorStop(0, selectedSlot ? 'rgba(244, 201, 93, 0.26)' : anchor ? 'rgba(244, 201, 93, 0.15)' : 'rgba(245, 240, 220, 0.09)');
    tileGradient.addColorStop(1, 'rgba(4, 6, 7, 0.44)');
    ctx.fillStyle = tileGradient;
    ctx.strokeStyle = selectedSlot ? '#f4c95d' : anchor ? 'rgba(244, 201, 93, 0.5)' : 'rgba(245, 240, 220, 0.13)';
    ctx.lineWidth = selectedSlot ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 7);
    ctx.fill();
    ctx.stroke();
    if (relay) {
      const spec = RELAY_TYPES[relay.relayId];
      const iconSize = 43;
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
    ctx.globalAlpha = Math.min(1, alpha * 1.8);
    if (effect.type === 'hit') {
      const noise = state.noise.find((item) => item.id === effect.targetId);
      if (noise) {
        const pos = noisePosition(noise);
        ctx.fillStyle = RELAY_TYPES[effect.relayId]?.palette ?? '#f5f0dc';
        ctx.font = '900 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(String(effect.damage), pos.x, pos.y - 22 - alpha * 12);
      }
    } else if (effect.type === 'link_pulse' || effect.type === 'link_pulse_save') {
      ctx.strokeStyle = effect.type === 'link_pulse_save' ? '#f4c95d' : '#58d7ff';
      ctx.lineWidth = effect.type === 'link_pulse_save' ? 5 : 3;
      ctx.beginPath();
      ctx.arc(195, 342, 24 + (1 - alpha) * 96, 0, Math.PI * 2);
      ctx.stroke();
      if (effect.type === 'link_pulse_save') {
        ctx.fillStyle = '#f4c95d';
        ctx.font = '900 17px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('SAVED BY LINK PULSE', 195, 343);
      }
    } else {
      const color = effect.type === 'merge' ? '#f4c95d' : effect.type === 'overclock' || effect.type === 'shutdown' ? '#ff6f59' : '#8ee6d2';
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(195, 260, 36 + (1 - alpha) * 54, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function render() {
  syncCanvasScale();
  const state = currentState();
  drawBackground(state);
  drawCanvasHud(state);
  drawBoard(state, partnerId(localBoardId));
  drawTrack(state);
  drawNoise(state);
  drawEventFeed(state);
  drawBoard(state, localBoardId);
  drawEffects(state);

  if (state.over) {
    ctx.fillStyle = 'rgba(5, 7, 8, 0.78)';
    ctx.fillRect(0, 0, 390, 500);
    ctx.fillStyle = state.won ? '#95d5b2' : '#ff6f59';
    ctx.font = '950 34px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.won ? 'SIGNAL LOCK' : 'SIGNAL LOST', 195, 242);
    ctx.fillStyle = '#f5f0dc';
    ctx.font = '850 13px system-ui';
    ctx.fillText(state.resultReason ?? '', 195, 270);
    if (state.result) {
      ctx.fillStyle = '#8ee6d2';
      ctx.font = '850 11px system-ui';
      ctx.fillText(`WAVE ${state.result.wave}  ${Math.floor(state.result.time)}s`, 195, 292);
    }
  }
}

function setActionButton(button, label, enabled, reason = '') {
  button.textContent = label;
  button.disabled = !enabled;
  button.title = reason;
}

function updateActionButtons(state) {
  const actions = state.actionState?.[localBoardId];
  if (!actions) return;
  const selectedCount = selected.length;
  setActionButton(actionButtons.supply, `Supply ${actions.supply.cost}C`, actions.supply.available, actions.supply.reason);
  setActionButton(
    actionButtons.merge,
    `Merge ${selectedCount}/3`,
    actions.merge.available && selectedCount === 3,
    selectedCount < 3 ? 'Select three matching Relays.' : actions.merge.reason
  );
  setActionButton(
    actionButtons.swap,
    `Swap ${actions.swap.charges}S`,
    actions.swap.available && selectedCount >= 2,
    selectedCount < 2 ? 'Select two Relays.' : actions.swap.reason
  );
  setActionButton(actionButtons.focus, `Focus ${actions.focus.cost}C`, actions.focus.available, actions.focus.reason);
  const pulseLabel = actions.linkPulse.cooldownRemaining > 0 ? `Pulse ${Math.ceil(actions.linkPulse.cooldownRemaining)}s` : `Pulse ${actions.linkPulse.cost}L`;
  setActionButton(actionButtons.pulse, pulseLabel, actions.linkPulse.available, actions.linkPulse.reason);
  actionButtons.pulse.dataset.ready = String(actions.linkPulse.available);
  const overclockLabel = actions.overclock.activeRemaining > 0 ? `OC ${Math.ceil(actions.overclock.activeRemaining)}s` : 'Overclock';
  setActionButton(
    actionButtons.overclock,
    overclockLabel,
    actions.overclock.available && selectedCount >= 1,
    selectedCount < 1 ? 'Select one Relay.' : actions.overclock.reason
  );
}

function updateHud() {
  const state = currentState();
  chargeMeter.textContent = `C ${Math.floor(state.resources.charge)}`;
  linkMeter.textContent = `L ${Math.floor(state.resources.linkEnergy)}`;
  gemMeter.textContent = `G ${Math.floor(state.resources.gems)}`;
  waveMeter.textContent = `Wave ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`;
  signalMeter.textContent = `Signal ${Math.ceil(state.signal.integrity)} / Sat ${Math.floor(state.saturation.count)}`;
  bossMeter.textContent = state.boss.active ? `Boss ${Math.ceil(state.boss.timer)}s` : 'Boss --';
  updateActionButtons(state);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!online) tickGame(game, dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

function buildShop() {
  shopList.innerHTML = SHOP.items.map((item) => `
    <div class="row">
      <div><strong>${item.name}</strong><span>${item.description}</span></div>
      <button data-buy="${item.id}">${item.price.gems} G</button>
    </div>
  `).join('') + SHOP.dailyMissions.map((mission) => `
    <div class="row">
      <div><strong>${mission.text}</strong><span>Reward ${mission.reward.gems} G</span></div>
      <span>Daily</span>
    </div>
  `).join('') + SHOP.pass.tiers.map((tier, index) => `
    <div class="row">
      <div><strong>${SHOP.pass.name} ${index + 1}</strong><span>${tier.xp} XP reward track</span></div>
      <span>${tier.grant.gems ? `${tier.grant.gems} G` : 'Skin'}</span>
    </div>
  `).join('');
  shopList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => command({ type: 'buy', itemId: button.dataset.buy }));
  });
}

function connectOnline() {
  if (socket?.readyState === WebSocket.OPEN) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${location.host}/ws`);
  netStatus.textContent = 'CONNECTING';
  socket.addEventListener('open', () => {
    online = true;
    selected = [];
    netStatus.textContent = 'ONLINE CO-OP';
    socket.send(JSON.stringify({ type: 'join', playerId: localPlayerId, name: 'Player' }));
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'state') {
      if (message.boardPlayer && message.boardPlayer !== localBoardId) selected = [];
      localBoardId = message.boardPlayer ?? localBoardId;
      game = message.state;
    }
    if (message.type === 'error') showToast(message.reason);
  });
  socket.addEventListener('close', () => {
    online = false;
    localBoardId = 'p1';
    netStatus.textContent = 'BOT CO-OP';
    showToast('Bot co-op resumed.');
    game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
  });
}

canvas.addEventListener('pointerdown', (event) => {
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
actionButtons.swap.addEventListener('click', () => command({ type: 'swap' }));
actionButtons.focus.addEventListener('click', () => command({ type: 'focus' }));
actionButtons.pulse.addEventListener('click', () => command({ type: 'pulse' }));
actionButtons.overclock.addEventListener('click', () => command({ type: 'overclock' }));
document.querySelector('#botButton').addEventListener('click', () => {
  online = false;
  socket?.close();
  selected = [];
  localBoardId = 'p1';
  game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
  netStatus.textContent = 'BOT CO-OP';
});
document.querySelector('#onlineButton').addEventListener('click', connectOnline);
document.querySelector('#shopButton').addEventListener('click', () => {
  drawer.hidden = false;
});
document.querySelector('#closeDrawer').addEventListener('click', () => {
  drawer.hidden = true;
});

buildShop();
requestAnimationFrame(loop);
