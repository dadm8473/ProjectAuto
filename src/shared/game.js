import { ENEMIES, LEVELS, SHOP, TOWERS } from './content.js';

const PATH_RADIUS = 28;
const PAD_RADIUS = 30;

let nextId = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findLevel(levelId) {
  return clone(LEVELS.find((level) => level.id === levelId) ?? LEVELS[0]);
}

function isNearSegment(point, a, b, radius) {
  const lengthSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (lengthSq === 0) return dist(point, a) <= radius;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lengthSq));
  const projection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return dist(point, projection) <= radius;
}

function isOnPath(level, point) {
  for (let i = 0; i < level.path.length - 1; i += 1) {
    if (isNearSegment(point, level.path[i], level.path[i + 1], PATH_RADIUS)) return true;
  }
  return false;
}

function isOnPad(level, point) {
  return level.buildPads.some((pad) => dist(pad, point) <= PAD_RADIUS);
}

function expandWave(wave) {
  const result = [];
  for (const [type, count] of Object.entries(wave)) {
    for (let i = 0; i < count; i += 1) result.push(type);
  }
  return result;
}

function makeEnemy(game, type) {
  const spec = ENEMIES[type];
  return {
    id: `e${nextId++}`,
    type,
    x: game.level.path[0].x,
    y: game.level.path[0].y,
    hp: spec.hp + game.wave.index * 7,
    maxHp: spec.hp + game.wave.index * 7,
    speed: spec.speed,
    reward: spec.reward,
    damage: spec.damage,
    radius: spec.radius,
    color: spec.color,
    segment: 0,
    slow: 0,
    slowUntil: 0,
    progress: 0
  };
}

function prepareWave(game) {
  const waveSpec = game.level.waves[Math.min(game.wave.index, game.level.waves.length - 1)];
  game.wave.queue = expandWave(waveSpec);
  game.wave.spawnTimer = 0;
  game.wave.inProgress = true;
}

export function createGame({ mode = 'solo', levelId = 'harbor-spiral', seed = Date.now() } = {}) {
  nextId = 1;
  const level = findLevel(levelId);
  return {
    id: `g${seed}`,
    mode,
    privateSeed: seed,
    now: 0,
    level,
    base: { hp: level.baseHp, maxHp: level.baseHp },
    resources: { scrap: level.startScrap, cores: level.startCores, xp: 0 },
    players: [
      { id: 'p1', name: 'Captain', bot: false, ready: true, builds: 0 },
      { id: 'p2', name: mode === 'bot' ? 'AUTO-BOT' : 'Partner', bot: mode === 'bot', ready: mode === 'bot', builds: 0 }
    ],
    towers: [],
    enemies: [],
    effects: [],
    wave: { index: 0, queue: [], spawnTimer: 0, restTimer: 1.2, inProgress: false },
    stats: { kills: 0, leaked: 0, spent: 0 },
    unlocks: [],
    over: false,
    won: false
  };
}

export function tryBuildTower(game, { playerId, type, x, y }) {
  const spec = TOWERS[type];
  const point = { x, y };
  if (!spec) return { ok: false, reason: 'Unknown tower.' };
  if (game.resources.scrap < spec.cost) return { ok: false, reason: 'Not enough scrap.' };
  if (isOnPath(game.level, point)) return { ok: false, reason: 'Cannot build on the enemy path.' };
  if (!isOnPad(game.level, point)) return { ok: false, reason: 'Build on a lit pad.' };
  if (game.towers.some((tower) => dist(tower, point) < 34)) return { ok: false, reason: 'Pad already occupied.' };

  const tower = {
    id: `t${nextId++}`,
    owner: playerId,
    type,
    x,
    y,
    level: 1,
    range: spec.range,
    damage: spec.damage,
    fireRate: spec.fireRate,
    cooldown: 0,
    slow: spec.slow ?? 0,
    slowTime: spec.slowTime ?? 0,
    color: spec.color
  };
  game.resources.scrap -= spec.cost;
  game.stats.spent += spec.cost;
  game.towers.push(tower);
  const player = game.players.find((item) => item.id === playerId);
  if (player) player.builds += 1;
  return { ok: true, towerId: tower.id };
}

export function upgradeTower(game, { playerId, towerId }) {
  const tower = game.towers.find((item) => item.id === towerId);
  if (!tower) return { ok: false, reason: 'Tower not found.' };
  const cost = 65 + tower.level * 30;
  if (game.resources.scrap < cost) return { ok: false, reason: 'Not enough scrap.' };
  game.resources.scrap -= cost;
  game.stats.spent += cost;
  tower.level += 1;
  tower.damage = Math.round(tower.damage * 1.45);
  tower.range += 8;
  tower.fireRate *= 1.08;
  tower.upgradedBy = playerId;
  return { ok: true, towerId };
}

export function tryBuyShopItem(game, { itemId }) {
  const item = SHOP.items.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'Shop item not found.' };
  for (const [currency, amount] of Object.entries(item.price)) {
    if ((game.resources[currency] ?? 0) < amount) return { ok: false, reason: `Not enough ${currency}.` };
  }
  for (const [currency, amount] of Object.entries(item.price)) game.resources[currency] -= amount;
  if (item.grant.scrap) game.resources.scrap += item.grant.scrap;
  if (item.grant.cores) game.resources.cores += item.grant.cores;
  if (item.grant.cosmetic && !game.unlocks.includes(item.grant.cosmetic)) game.unlocks.push(item.grant.cosmetic);
  return { ok: true, itemId };
}

function moveEnemy(game, enemy, dt) {
  const target = game.level.path[enemy.segment + 1];
  if (!target) return false;
  const from = { x: enemy.x, y: enemy.y };
  const speed = enemy.speed * (game.now < enemy.slowUntil ? 1 - enemy.slow : 1);
  const step = speed * dt;
  const distance = dist(from, target);
  if (step >= distance) {
    enemy.x = target.x;
    enemy.y = target.y;
    enemy.segment += 1;
    enemy.progress = enemy.segment / (game.level.path.length - 1);
    if (enemy.segment >= game.level.path.length - 1) return false;
  } else {
    enemy.x += ((target.x - enemy.x) / distance) * step;
    enemy.y += ((target.y - enemy.y) / distance) * step;
    enemy.progress = (enemy.segment + step / Math.max(1, distance)) / (game.level.path.length - 1);
  }
  return true;
}

function towerAttack(game, tower, dt) {
  tower.cooldown = Math.max(0, tower.cooldown - dt);
  if (tower.cooldown > 0) return;
  const target = game.enemies
    .filter((enemy) => dist(tower, enemy) <= tower.range)
    .sort((a, b) => b.progress - a.progress)[0];
  if (!target) return;
  target.hp -= tower.damage;
  if (tower.slow) {
    target.slow = Math.max(target.slow, tower.slow);
    target.slowUntil = Math.max(target.slowUntil, game.now + tower.slowTime);
  }
  tower.cooldown = 1 / tower.fireRate;
  game.effects.push({ type: 'shot', x: tower.x, y: tower.y, tx: target.x, ty: target.y, ttl: 0.14, color: tower.color });
}

function botThink(game) {
  const bot = game.players.find((player) => player.bot);
  if (bot && bot.nextThink === undefined) bot.nextThink = 2;
  if (!bot || game.now < (bot.nextThink ?? 0)) return;
  bot.nextThink = game.now + 1.4;
  if (game.resources.scrap < 70) return;
  const openPad = game.level.buildPads.find((pad) => !game.towers.some((tower) => dist(tower, pad) < 34));
  if (!openPad) {
    const tower = game.towers[0];
    if (tower) upgradeTower(game, { playerId: bot.id, towerId: tower.id });
    return;
  }
  const type = game.towers.length % 3 === 0 ? 'frost' : game.towers.length % 2 === 0 ? 'spark' : 'pulse';
  tryBuildTower(game, { playerId: bot.id, type, x: openPad.x, y: openPad.y });
}

export function tickGame(game, dt) {
  if (game.over) return game;
  game.now += dt;
  botThink(game);

  if (!game.wave.inProgress) {
    game.wave.restTimer -= dt;
    if (game.wave.restTimer <= 0) prepareWave(game);
  }

  if (game.wave.inProgress && game.wave.queue.length > 0) {
    game.wave.spawnTimer -= dt;
    if (game.wave.spawnTimer <= 0) {
      game.enemies.push(makeEnemy(game, game.wave.queue.shift()));
      game.wave.spawnTimer = Math.max(0.35, 0.95 - game.wave.index * 0.06);
    }
  }

  for (const tower of game.towers) towerAttack(game, tower, dt);

  const survivors = [];
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) {
      game.stats.kills += 1;
      game.resources.scrap += enemy.reward;
      game.resources.xp += 3;
      if (game.stats.kills % 18 === 0) game.resources.cores += 5;
      continue;
    }
    if (!moveEnemy(game, enemy, dt)) {
      game.base.hp -= enemy.damage;
      game.stats.leaked += 1;
      continue;
    }
    survivors.push(enemy);
  }
  game.enemies = survivors;
  game.effects = game.effects.map((effect) => ({ ...effect, ttl: effect.ttl - dt })).filter((effect) => effect.ttl > 0);

  if (game.wave.inProgress && game.wave.queue.length === 0 && game.enemies.length === 0) {
    game.wave.index += 1;
    game.resources.scrap += 45 + game.wave.index * 8;
    game.resources.cores += game.wave.index % 2 === 0 ? 10 : 0;
    game.wave.inProgress = false;
    game.wave.restTimer = 3.2;
    if (game.wave.index >= game.level.waves.length) {
      game.over = true;
      game.won = true;
      game.resources.cores += 75;
    }
  }

  if (game.base.hp <= 0) {
    game.base.hp = 0;
    game.over = true;
    game.won = false;
  }
  return game;
}

export function serializeState(game) {
  return {
    id: game.id,
    mode: game.mode,
    now: Number(game.now.toFixed(2)),
    level: game.level,
    base: game.base,
    resources: game.resources,
    players: game.players.map(({ id, name, bot, ready, builds }) => ({ id, name, bot, ready, builds })),
    towers: game.towers,
    enemies: game.enemies.map((enemy) => ({
      id: enemy.id, type: enemy.type, x: Math.round(enemy.x), y: Math.round(enemy.y),
      hp: Math.ceil(enemy.hp), maxHp: enemy.maxHp, radius: enemy.radius, color: enemy.color
    })),
    effects: game.effects,
    wave: game.wave,
    stats: game.stats,
    unlocks: game.unlocks,
    over: game.over,
    won: game.won
  };
}

export { LEVELS, SHOP, TOWERS };
