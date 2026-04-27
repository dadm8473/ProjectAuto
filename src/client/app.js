import {
  createGame,
  serializeState,
  tickGame,
  tryBuildTower,
  tryBuyShopItem,
  upgradeTower,
  SHOP,
  TOWERS
} from '../shared/game.js';

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const toast = document.querySelector('#toast');
const netStatus = document.querySelector('#netStatus');
const hpMeter = document.querySelector('#hpMeter');
const scrapMeter = document.querySelector('#scrapMeter');
const coreMeter = document.querySelector('#coreMeter');
const towerButtons = document.querySelector('#towerButtons');
const squadList = document.querySelector('#squadList');
const shopList = document.querySelector('#shopList');

const localPlayerId = `p${Math.floor(Math.random() * 9000) + 1000}`;
let selectedTowerType = 'pulse';
let selectedTowerId = null;
let game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: Date.now() % 100000 });
let online = false;
let socket = null;
let last = performance.now();

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 1700);
}

function send(action) {
  if (online && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(action));
    return true;
  }
  return false;
}

function command(action) {
  if (send(action)) return;
  if (action.type === 'build') {
    const result = tryBuildTower(game, { playerId: 'p1', type: action.tower, x: action.x, y: action.y });
    if (!result.ok) showToast(result.reason);
  }
  if (action.type === 'upgrade') {
    const result = upgradeTower(game, { playerId: 'p1', towerId: action.towerId });
    if (!result.ok) showToast(result.reason);
  }
  if (action.type === 'buy') {
    const result = tryBuyShopItem(game, { playerId: 'p1', itemId: action.itemId });
    showToast(result.ok ? 'Unlocked for this run.' : result.reason);
  }
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
    y: ((touch.clientY - rect.top) / rect.height) * canvas.height
  };
}

function drawPath(level) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#31434a';
  ctx.lineWidth = 46;
  ctx.beginPath();
  level.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = '#56666b';
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.setLineDash([6, 14]);
  ctx.strokeStyle = '#f6f7ed';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBackground(level) {
  const gradient = ctx.createLinearGradient(0, 0, 0, level.bounds.h);
  gradient.addColorStop(0, '#12222a');
  gradient.addColorStop(0.48, '#152b26');
  gradient.addColorStop(1, '#171d2b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, level.bounds.w, level.bounds.h);

  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let y = 30; y < level.bounds.h; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(level.bounds.w, y - 18);
    ctx.stroke();
  }
}

function drawPads(level) {
  for (const pad of level.buildPads) {
    const occupied = game.towers.some((tower) => Math.hypot(tower.x - pad.x, tower.y - pad.y) < 34);
    ctx.fillStyle = occupied ? 'rgba(255,255,255,0.06)' : 'rgba(47,214,197,0.13)';
    ctx.strokeStyle = occupied ? 'rgba(255,255,255,0.17)' : 'rgba(47,214,197,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pad.x - 22, pad.y - 22, 44, 44, 8);
    ctx.fill();
    ctx.stroke();
  }
}

function drawTowers() {
  for (const tower of game.towers) {
    if (tower.id === selectedTowerId) {
      ctx.strokeStyle = 'rgba(246,247,237,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = tower.color;
    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(tower.x - 16, tower.y - 16, 32, 32, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#101820';
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tower.level), tower.x, tower.y + 1);
  }
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101820';
    ctx.fillRect(enemy.x - 14, enemy.y - enemy.radius - 10, 28, 4);
    ctx.fillStyle = '#f6f7ed';
    ctx.fillRect(enemy.x - 14, enemy.y - enemy.radius - 10, 28 * Math.max(0, enemy.hp / enemy.maxHp), 4);
  }
}

function drawEffects() {
  for (const effect of game.effects) {
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = Math.max(0, effect.ttl / 0.14);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(effect.tx, effect.ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function render() {
  const state = serializeState(game);
  drawBackground(state.level);
  drawPath(state.level);
  drawPads(state.level);
  drawEffects();
  drawTowers();
  drawEnemies();

  ctx.fillStyle = '#f6f7ed';
  ctx.font = '800 18px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Wave ${Math.min(state.wave.index + 1, state.level.waves.length)}/${state.level.waves.length}`, 18, 32);
  ctx.font = '700 12px system-ui';
  ctx.fillStyle = '#a9b3ad';
  ctx.fillText(state.over ? (state.won ? 'CLEAR' : 'BASE LOST') : state.level.name, 18, 52);
}

function updateHud() {
  hpMeter.textContent = `HP ${game.base.hp}`;
  scrapMeter.textContent = `S ${game.resources.scrap}`;
  coreMeter.textContent = `C ${game.resources.cores}`;
  squadList.innerHTML = game.players.map((player) => `
    <div class="row">
      <div><strong>${player.name}</strong><span>${player.bot ? 'Bot partner' : 'Human'} · builds ${player.builds}</span></div>
      <span>${player.ready ? 'Ready' : 'Syncing'}</span>
    </div>
  `).join('');
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!online) tickGame(game, dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

function buildTowerButtons() {
  towerButtons.innerHTML = Object.values(TOWERS).map((tower) => `
    <button class="tower-button ${tower.id === selectedTowerType ? 'active' : ''}" data-tower="${tower.id}">
      <span>${tower.name}</span>
      <small>${tower.cost} scrap</small>
    </button>
  `).join('');
  towerButtons.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      selectedTowerType = button.dataset.tower;
      buildTowerButtons();
    });
  });
}

function buildShop() {
  shopList.innerHTML = SHOP.items.map((item) => `
    <div class="row">
      <div><strong>${item.name}</strong><span>${item.description}</span></div>
      <button data-buy="${item.id}">${item.price.cores} C</button>
    </div>
  `).join('') + SHOP.dailyMissions.map((mission) => `
    <div class="row">
      <div><strong>${mission.text}</strong><span>Mission reward: ${mission.reward.cores} C</span></div>
      <span>Daily</span>
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
    game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: Date.now() % 100000 });
  });
}

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const tower = game.towers.find((item) => Math.hypot(item.x - point.x, item.y - point.y) < 26);
  if (tower) {
    selectedTowerId = tower.id;
    showToast(`${TOWERS[tower.type].name} L${tower.level}`);
    return;
  }
  command({ type: 'build', playerId: localPlayerId, tower: selectedTowerType, x: Math.round(point.x), y: Math.round(point.y) });
});

document.querySelector('#upgradeButton').addEventListener('click', () => {
  if (!selectedTowerId) {
    showToast('Select a tower first.');
    return;
  }
  command({ type: 'upgrade', playerId: localPlayerId, towerId: selectedTowerId });
});

document.querySelector('#botButton').addEventListener('click', () => {
  online = false;
  socket?.close();
  game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: Date.now() % 100000 });
  netStatus.textContent = 'BOT CO-OP';
});

document.querySelector('#onlineButton').addEventListener('click', connectOnline);

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`#${tab.dataset.panel}Panel`).classList.add('active');
  });
});

buildTowerButtons();
buildShop();
requestAnimationFrame(loop);
