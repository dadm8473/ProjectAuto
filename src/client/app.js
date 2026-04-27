import {
  castPartnerBoost,
  createGame,
  mergeUnits,
  serializeState,
  summonUnit,
  tickGame,
  tryBuyShopItem,
  upgradeSummonOdds,
  GAME_RULES,
  HEROES,
  RARITIES,
  SHOP
} from '../shared/game.js';

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const toast = document.querySelector('#toast');
const netStatus = document.querySelector('#netStatus');
const goldMeter = document.querySelector('#goldMeter');
const manaMeter = document.querySelector('#manaMeter');
const gemMeter = document.querySelector('#gemMeter');
const waveMeter = document.querySelector('#waveMeter');
const pressureMeter = document.querySelector('#pressureMeter');
const bossMeter = document.querySelector('#bossMeter');
const shopList = document.querySelector('#shopList');
const drawer = document.querySelector('#drawer');

const localPlayerId = `p${Math.floor(Math.random() * 9000) + 1000}`;
let game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
let online = false;
let socket = null;
let last = performance.now();
let selected = [];

const boardRects = {
  p2: { x: 18, y: 56, w: 354, h: 172 },
  p1: { x: 18, y: 476, w: 354, h: 172 }
};

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 1800);
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
  if (action.type === 'summon') result = summonUnit(game, { playerId: 'p1' });
  if (action.type === 'merge') result = mergeUnits(game, { playerId: 'p1', slotIds: selected });
  if (action.type === 'chance') result = upgradeSummonOdds(game, { playerId: 'p1' });
  if (action.type === 'boost') result = castPartnerBoost(game, { playerId: 'p1' });
  if (action.type === 'buy') result = tryBuyShopItem(game, { itemId: action.itemId });
  if (!result.ok) showToast(result.reason);
  if (result.ok && action.type === 'merge') selected = [];
  if (result.ok && action.type === 'summon') showToast(`${HEROES[result.unit.hero].name}!`);
  if (result.ok && action.type === 'chance') showToast('Summon odds improved.');
  if (result.ok && action.type === 'boost') showToast('Partner boosted.');
  if (result.ok && action.type === 'buy') showToast('Purchased.');
}

function command(action) {
  if (send({ ...action, slotIds: selected })) return;
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
  return { x: rect.x + col * cw + 7, y: rect.y + row * ch + 6, w: cw - 14, h: ch - 12 };
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 720);
  gradient.addColorStop(0, '#171629');
  gradient.addColorStop(0.42, '#132635');
  gradient.addColorStop(1, '#21172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 390, 720);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  for (let y = 26; y < 720; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(390, y + 14);
    ctx.stroke();
  }
}

function drawTrack(state) {
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(28, 258, 334, 168, 28);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#55606e';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.roundRect(52, 282, 286, 120, 20);
  ctx.stroke();
  ctx.strokeStyle = '#ffcf5a';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#f7f4e9';
  ctx.font = '900 20px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`Wave ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`, 195, 318);
  ctx.font = '800 12px system-ui';
  ctx.fillStyle = '#aeb8c4';
  ctx.fillText('Enemies loop until pressure hits 100', 195, 340);
}

function enemyPosition(enemy) {
  const left = 52;
  const top = enemy.lane === 0 ? 282 : 310;
  const w = 286;
  const h = 92;
  const p = enemy.progress % 1;
  if (p < 0.25) return { x: left + (p / 0.25) * w, y: top };
  if (p < 0.5) return { x: left + w, y: top + ((p - 0.25) / 0.25) * h };
  if (p < 0.75) return { x: left + w - ((p - 0.5) / 0.25) * w, y: top + h };
  return { x: left, y: top + h - ((p - 0.75) / 0.25) * h };
}

function drawEnemies(state) {
  for (const enemy of state.enemies) {
    const pos = enemyPosition(enemy);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(pos.x - 18, pos.y - enemy.radius - 10, 36, 4);
    ctx.fillStyle = enemy.type === 'boss' ? '#d0a2ff' : '#f7f4e9';
    ctx.fillRect(pos.x - 18, pos.y - enemy.radius - 10, 36 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    if (enemy.type === 'boss') {
      ctx.strokeStyle = '#d0a2ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, enemy.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawHeroIcon(hero, x, y, size, star, boosted) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.fillStyle = boosted ? '#fff7bd' : hero.color;
  ctx.strokeStyle = boosted ? '#ffcf5a' : 'rgba(255,255,255,0.42)';
  ctx.lineWidth = boosted ? 4 : 2;
  ctx.beginPath();
  if (hero.shape === 'shield') ctx.roundRect(x + 9, y + 8, size - 18, size - 16, 10);
  else if (hero.shape === 'bolt') {
    ctx.moveTo(cx + 2, y + 6);
    ctx.lineTo(cx - 14, cy + 3);
    ctx.lineTo(cx - 1, cy + 3);
    ctx.lineTo(cx - 8, y + size - 6);
    ctx.lineTo(cx + 16, cy - 4);
    ctx.lineTo(cx + 2, cy - 4);
    ctx.closePath();
  } else if (hero.shape === 'moon') {
    ctx.arc(cx, cy, size * 0.28, 0.35, Math.PI * 1.65);
    ctx.arc(cx + 9, cy, size * 0.25, Math.PI * 1.65, 0.35, true);
  } else if (hero.shape === 'wing') {
    ctx.ellipse(cx, cy, size * 0.36, size * 0.24, -0.55, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, cy, size * 0.27, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#11161f';
  ctx.font = '900 12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${star}★`, cx, y + size - 11);
}

function drawBoard(state, playerId) {
  const rect = boardRects[playerId];
  const board = state.boards[playerId];
  const isMine = playerId === 'p1';
  ctx.fillStyle = isMine ? 'rgba(73,215,255,0.08)' : 'rgba(208,162,255,0.08)';
  ctx.strokeStyle = isMine ? 'rgba(73,215,255,0.34)' : 'rgba(208,162,255,0.34)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f7f4e9';
  ctx.font = '900 13px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(isMine ? 'YOUR BOARD' : 'PARTNER BOARD', rect.x, rect.y - 10);
  ctx.fillStyle = '#ffcf5a';
  ctx.textAlign = 'right';
  ctx.fillText(board.comboText || '', rect.x + rect.w, rect.y - 10);

  board.slots.forEach((unit, index) => {
    const slot = boardSlotRect(rect, index);
    const selectedSlot = isMine && selected.includes(index);
    ctx.fillStyle = selectedSlot ? 'rgba(255,207,90,0.20)' : 'rgba(255,255,255,0.055)';
    ctx.strokeStyle = selectedSlot ? '#ffcf5a' : 'rgba(255,255,255,0.13)';
    ctx.lineWidth = selectedSlot ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 8);
    ctx.fill();
    ctx.stroke();
    if (unit) {
      const hero = HEROES[unit.hero];
      drawHeroIcon(hero, slot.x + 4, slot.y + 2, Math.min(slot.w, slot.h) - 4, unit.star, unit.boostedUntil > state.now);
      ctx.fillStyle = RARITIES[hero.rarity].color;
      ctx.font = '800 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(hero.name.split(' ')[0], slot.x + slot.w / 2, slot.y + slot.h - 4);
    }
  });
}

function drawEffects(state) {
  for (const effect of state.effects) {
    const alpha = Math.max(0, effect.ttl);
    ctx.globalAlpha = Math.min(1, alpha * 1.8);
    if (effect.type === 'hit') {
      const enemy = state.enemies.find((item) => item.id === effect.targetId);
      if (enemy) {
        const pos = enemyPosition(enemy);
        ctx.fillStyle = HEROES[effect.hero]?.color ?? '#fff';
        ctx.font = '900 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(String(effect.damage), pos.x, pos.y - 22 - alpha * 12);
      }
    } else {
      ctx.strokeStyle = effect.type === 'merge' ? '#ffcf5a' : effect.type === 'boost' ? '#49d7ff' : '#f7f4e9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(195, 356, 36 + (1 - alpha) * 55, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function render() {
  const state = serializeState(game);
  drawBackground();
  drawBoard(state, 'p2');
  drawTrack(state);
  drawEnemies(state);
  drawBoard(state, 'p1');
  drawEffects(state);

  if (state.over) {
    ctx.fillStyle = 'rgba(17,22,31,0.72)';
    ctx.fillRect(0, 0, 390, 720);
    ctx.fillStyle = state.won ? '#6ee787' : '#ff5c7a';
    ctx.font = '950 32px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.won ? 'CLEAR!' : 'DEFEAT', 195, 352);
    ctx.fillStyle = '#f7f4e9';
    ctx.font = '800 14px system-ui';
    ctx.fillText('Tap Bot to restart instantly', 195, 382);
  }
}

function updateHud() {
  goldMeter.textContent = `G ${Math.floor(game.resources.gold)}`;
  manaMeter.textContent = `M ${Math.floor(game.resources.mana)}`;
  gemMeter.textContent = `D ${Math.floor(game.resources.gems)}`;
  waveMeter.textContent = `Wave ${Math.min(game.wave.index + 1, GAME_RULES.maxWave)}`;
  pressureMeter.textContent = `Pressure ${Math.floor(game.pressure.count)}/${game.pressure.limit}`;
  bossMeter.textContent = game.boss.active ? `Boss ${Math.ceil(game.boss.timer)}s` : 'Boss --';
  document.querySelector('#summonButton').textContent = 'Summon';
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
      <button data-buy="${item.id}">${item.price.gems} D</button>
    </div>
  `).join('') + SHOP.dailyMissions.map((mission) => `
    <div class="row">
      <div><strong>${mission.text}</strong><span>Reward ${mission.reward.gems} D</span></div>
      <span>Daily</span>
    </div>
  `).join('') + SHOP.pass.tiers.map((tier, index) => `
    <div class="row">
      <div><strong>${SHOP.pass.name} ${index + 1}</strong><span>${tier.xp} XP reward track</span></div>
      <span>${tier.grant.gems ? `${tier.grant.gems} D` : 'Skin'}</span>
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
    showToast('Server offline. Bot partner resumed.');
    game = createGame({ mode: 'bot', seed: Date.now() % 100000 });
  });
}

canvas.addEventListener('pointerdown', (event) => {
  const hit = slotAt(canvasPoint(event));
  if (!hit || hit.playerId !== 'p1') return;
  const unit = game.boards.p1.slots[hit.index];
  if (!unit) return;
  if (selected.includes(hit.index)) selected = selected.filter((index) => index !== hit.index);
  else selected = [...selected, hit.index].slice(-3);
  const names = selected.map((index) => HEROES[game.boards.p1.slots[index]?.hero]?.name).filter(Boolean);
  if (names.length > 0) showToast(names.join(' + '));
});

document.querySelector('#summonButton').addEventListener('click', () => command({ type: 'summon' }));
document.querySelector('#mergeButton').addEventListener('click', () => command({ type: 'merge' }));
document.querySelector('#chanceButton').addEventListener('click', () => command({ type: 'chance' }));
document.querySelector('#boostButton').addEventListener('click', () => command({ type: 'boost' }));
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
