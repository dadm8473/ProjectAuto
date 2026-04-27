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

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
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

const artDirectionImage = new Image();
artDirectionImage.src = '/src/client/assets/generated/signal-relay-art-direction.png';
const relayAtlas = new Image();
relayAtlas.src = '/src/client/assets/generated/relay-unit-atlas.png';

const localPlayerId = `p${Math.floor(Math.random() * 9000) + 1000}`;
let game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
let online = false;
let socket = null;
let last = performance.now();
let selected = [];

const boardRects = {
  p2: { x: 18, y: 74, w: 354, h: 108 },
  p1: { x: 18, y: 362, w: 354, h: 108 }
};

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
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
  if (action.type === 'supply') result = supplyRelay(game, { playerId: 'p1' });
  if (action.type === 'merge') result = mergeRelays(game, { playerId: 'p1', slotIds: selected });
  if (action.type === 'swap') {
    if (selected.length < 2) result = { ok: false, reason: 'Select two sockets.' };
    else result = swapRelays(game, { playerId: 'p1', from: selected[0], to: selected[1] });
  }
  if (action.type === 'focus') result = upgradeSupplyFocus(game, { playerId: 'p1' });
  if (action.type === 'pulse') result = castLinkPulse(game, { playerId: 'p1' });
  if (action.type === 'overclock') {
    const slot = selected.at(-1);
    result = slot === undefined ? { ok: false, reason: 'Select one Relay.' } : overclockRelay(game, { playerId: 'p1', slot });
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
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function slotAt(point) {
  for (const [playerId, rect] of Object.entries(boardRects)) {
    if (point.x < rect.x || point.x > rect.x + rect.w || point.y < rect.y || point.y > rect.y + rect.h) continue;
    const col = Math.floor((point.x - rect.x) / (rect.w / 4));
    const row = Math.floor((point.y - rect.y) / (rect.h / 3));
    return { playerId, index: row * 4 + col };
  }
  return null;
}

function boardSlotRect(rect, index) {
  const cw = rect.w / 4;
  const ch = rect.h / 3;
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: rect.x + col * cw + 7, y: rect.y + row * ch + 7, w: cw - 14, h: ch - 14 };
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

function drawBackground(state) {
  const usedImage = coverImage(artDirectionImage, 0, 0, 390, 500, 0.24);
  if (!usedImage) {
    const gradient = ctx.createLinearGradient(0, 0, 390, 500);
    gradient.addColorStop(0, '#101312');
    gradient.addColorStop(0.46, '#17251f');
    gradient.addColorStop(1, '#231619');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 390, 500);
  }
  ctx.fillStyle = 'rgba(7, 10, 12, 0.7)';
  ctx.fillRect(0, 0, 390, 500);
  ctx.fillStyle = 'rgba(15, 22, 20, 0.58)';
  ctx.fillRect(0, 0, 390, 500);

  ctx.strokeStyle = 'rgba(245, 240, 220, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 24; y < 500; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(390, y + 11);
    ctx.stroke();
  }

  ctx.fillStyle = '#f5f0dc';
  ctx.font = '900 18px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(state.title.toUpperCase(), 18, 35);
  ctx.font = '800 10px system-ui';
  ctx.fillStyle = '#8ee6d2';
  ctx.fillText(state.mode === 'bot' ? 'BOT CO-OP' : 'ONLINE CO-OP', 20, 52);
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

function drawTrack(state) {
  ctx.save();
  ctx.fillStyle = 'rgba(12, 16, 18, 0.72)';
  ctx.strokeStyle = 'rgba(244, 201, 93, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(20, 203, 350, 128, 22);
  ctx.fill();
  ctx.stroke();

  const loop = { x: 48, y: 226, w: 294, h: 66 };
  ctx.strokeStyle = 'rgba(92, 216, 196, 0.22)';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.roundRect(loop.x, loop.y, loop.w, loop.h, 26);
  ctx.stroke();
  ctx.strokeStyle = '#58d7ff';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(244, 201, 93, 0.18)';
  ctx.beginPath();
  ctx.arc(195, 260, 40 + Math.sin(state.now * 3) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 201, 93, 0.74)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(195, 260, 32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f5f0dc';
  ctx.font = '950 22px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`, 195, 255);
  ctx.font = '850 11px system-ui';
  ctx.fillStyle = state.boss.active ? '#ff6f59' : '#8ee6d2';
  ctx.fillText(state.boss.active ? `BOSS ${Math.ceil(state.boss.timer)}s` : `SIGNAL ${Math.ceil(state.signal.integrity)}`, 195, 275);
  ctx.restore();
}

function noisePosition(noise) {
  const left = 49;
  const top = noise.lane === 0 ? 226 : 244;
  const w = 292;
  const h = 48;
  const p = noise.progress % 1;
  if (p < 0.25) return { x: left + (p / 0.25) * w, y: top };
  if (p < 0.5) return { x: left + w, y: top + ((p - 0.25) / 0.25) * h };
  if (p < 0.75) return { x: left + w - ((p - 0.5) / 0.25) * w, y: top + h };
  return { x: left, y: top + h - ((p - 0.75) / 0.25) * h };
}

function drawNoise(state) {
  for (const noise of state.noise) {
    const pos = noisePosition(noise);
    const spec = NOISE_TYPES[noise.type];
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, noise.radius, 0, Math.PI * 2);
    ctx.fill();
    if (noise.type === 'boss') {
      ctx.strokeStyle = '#f4c95d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, noise.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(5, 7, 8, 0.7)';
    ctx.fillRect(pos.x - 20, pos.y - noise.radius - 12, 40, 5);
    ctx.fillStyle = noise.type === 'boss' ? '#ff6f59' : '#f5f0dc';
    ctx.fillRect(pos.x - 20, pos.y - noise.radius - 12, 40 * Math.max(0, noise.hp / noise.maxHp), 5);
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
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const link of links) {
    const a = slotCenter(rect, link.a);
    const b = slotCenter(rect, link.b);
    ctx.strokeStyle = 'rgba(88, 215, 255, 0.48)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(244, 201, 93, 0.58)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.lineWidth = 4;
  }
}

function drawBoard(state, playerId) {
  const rect = boardRects[playerId];
  const board = state.boards[playerId];
  const isMine = playerId === 'p1';
  const heatPeak = board.heatPeak ?? 0;
  const border = heatPeak >= 90 ? '#ff6f59' : isMine ? '#58d7ff' : '#95d5b2';

  ctx.fillStyle = isMine ? 'rgba(20, 44, 42, 0.72)' : 'rgba(38, 31, 28, 0.74)';
  ctx.strokeStyle = border;
  ctx.lineWidth = heatPeak >= 90 ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f5f0dc';
  ctx.font = '900 12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(isMine ? 'YOUR RELAYS' : 'PARTNER RELAYS', rect.x, rect.y - 12);
  ctx.fillStyle = heatPeak >= 90 ? '#ff6f59' : '#f4c95d';
  ctx.textAlign = 'right';
  ctx.fillText(`HEAT ${Math.floor(heatPeak)}`, rect.x + rect.w, rect.y - 12);

  drawLinks(board, rect, state.now);

  board.slots.forEach((relay, index) => {
    const slot = boardSlotRect(rect, index);
    const selectedSlot = isMine && selected.includes(index);
    const anchor = index === board.anchorIndex;
    ctx.fillStyle = selectedSlot ? 'rgba(244, 201, 93, 0.22)' : anchor ? 'rgba(244, 201, 93, 0.12)' : 'rgba(245, 240, 220, 0.06)';
    ctx.strokeStyle = selectedSlot ? '#f4c95d' : anchor ? 'rgba(244, 201, 93, 0.5)' : 'rgba(245, 240, 220, 0.13)';
    ctx.lineWidth = selectedSlot ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 8);
    ctx.fill();
    ctx.stroke();
    if (relay) {
      const spec = RELAY_TYPES[relay.relayId];
      drawRelayIcon(relay, slot.x + 4, slot.y + 2, Math.min(slot.w, slot.h) - 6);
      ctx.fillStyle = GRADES[relay.grade].color;
      ctx.font = '900 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`T${relay.tier}`, slot.x + 12, slot.y + 13);
      ctx.fillStyle = relay.heat >= 90 ? '#ff6f59' : '#f5f0dc';
      ctx.fillText(Math.floor(relay.heat), slot.x + slot.w - 13, slot.y + 13);
      ctx.fillStyle = '#f5f0dc';
      ctx.font = '800 8px system-ui';
      ctx.fillText(spec.name.split(' ')[0], slot.x + slot.w / 2, slot.y + slot.h - 4);
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
  const state = serializeState(game);
  drawBackground(state);
  drawCanvasHud(state);
  drawBoard(state, 'p2');
  drawTrack(state);
  drawNoise(state);
  drawBoard(state, 'p1');
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
  }
}

function updateHud() {
  chargeMeter.textContent = `C ${Math.floor(game.resources.charge)}`;
  linkMeter.textContent = `L ${Math.floor(game.resources.linkEnergy)}`;
  gemMeter.textContent = `G ${Math.floor(game.resources.gems)}`;
  waveMeter.textContent = `Wave ${Math.min(game.wave.index + 1, GAME_RULES.maxWave)}`;
  signalMeter.textContent = `Signal ${Math.ceil(game.signal.integrity)} / Sat ${Math.floor(game.saturation.count)}`;
  bossMeter.textContent = game.boss.active ? `Boss ${Math.ceil(game.boss.timer)}s` : 'Boss --';
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
    if (message.type === 'state') game = message.state;
    if (message.type === 'error') showToast(message.reason);
  });
  socket.addEventListener('close', () => {
    online = false;
    netStatus.textContent = 'BOT CO-OP';
    showToast('Bot co-op resumed.');
    game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
  });
}

canvas.addEventListener('pointerdown', (event) => {
  const hit = slotAt(canvasPoint(event));
  if (!hit || hit.playerId !== 'p1') return;
  const relay = game.boards.p1.slots[hit.index];
  if (!relay) return;
  if (selected.includes(hit.index)) selected = selected.filter((index) => index !== hit.index);
  else selected = [...selected, hit.index].slice(-3);
  const names = selected.map((index) => RELAY_TYPES[game.boards.p1.slots[index]?.relayId]?.name).filter(Boolean);
  if (names.length > 0) showToast(names.join(' + '));
});

document.querySelector('#supplyButton').addEventListener('click', () => command({ type: 'supply' }));
document.querySelector('#mergeButton').addEventListener('click', () => command({ type: 'merge' }));
document.querySelector('#swapButton').addEventListener('click', () => command({ type: 'swap' }));
document.querySelector('#focusButton').addEventListener('click', () => command({ type: 'focus' }));
document.querySelector('#pulseButton').addEventListener('click', () => command({ type: 'pulse' }));
document.querySelector('#overclockButton').addEventListener('click', () => command({ type: 'overclock' }));
document.querySelector('#botButton').addEventListener('click', () => {
  online = false;
  socket?.close();
  selected = [];
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
