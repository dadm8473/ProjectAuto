import { ENEMIES, GAME_RULES, HEROES, RARITIES, RARITY_ORDER, SHOP, SUMMON_TABLE, WAVES } from './content.js';

let nextId = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function weightedPick(weights, random) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  let roll = random() * total;
  for (const [key, value] of Object.entries(weights)) {
    roll -= value;
    if (roll <= 0) return key;
  }
  return Object.keys(weights).at(-1);
}

function heroesByRarity(rarity) {
  return Object.values(HEROES).filter((hero) => hero.rarity === rarity);
}

function findBoard(game, playerId) {
  return game.boards[playerId] ?? game.boards.p1;
}

function partnerId(playerId) {
  return playerId === 'p1' ? 'p2' : 'p1';
}

function emptySlotIndex(board) {
  return board.slots.findIndex((slot) => slot === null);
}

function rarityAfter(rarity) {
  return RARITIES[rarity]?.next ?? rarity;
}

function makeUnit(game, playerId, heroId, star = 1) {
  return {
    id: `u${nextId++}`,
    hero: heroId,
    star,
    cooldown: 0,
    owner: playerId,
    boostedUntil: 0
  };
}

function rollHero(game, playerId) {
  const odds = { ...game.summonOdds };
  if (game.rng.pity[playerId] >= GAME_RULES.pityThreshold) {
    odds.common = Math.max(0.2, odds.common - 0.25);
    odds.epic += 0.18;
    odds.legendary += 0.06;
    odds.mythic += 0.01;
  }
  const rarity = weightedPick(odds, game.rng.next);
  const pool = heroesByRarity(rarity);
  const hero = pool[Math.floor(game.rng.next() * pool.length)] ?? heroesByRarity('common')[0];
  return hero;
}

function expandWave(wave) {
  const result = [];
  for (const [type, count] of Object.entries(wave)) {
    for (let i = 0; i < count; i += 1) result.push(type);
  }
  return result;
}

function startWave(game) {
  const wave = WAVES[Math.min(game.wave.index, WAVES.length - 1)];
  game.wave.queue = expandWave(wave);
  game.wave.spawnTimer = 0;
  game.wave.active = true;
  game.wave.startedAt = game.now;
  if (game.wave.queue.includes('boss')) {
    game.boss.active = true;
    game.boss.timer = GAME_RULES.bossTimer;
    game.boss.limit = GAME_RULES.bossTimer;
  }
}

function makeEnemy(game, type) {
  const spec = ENEMIES[type];
  const waveScale = 1 + game.wave.index * 0.18;
  const bossScale = type === 'boss' ? 1 + Math.floor(game.wave.index / 5) * 0.55 : 1;
  return {
    id: `e${nextId++}`,
    type,
    hp: Math.round(spec.hp * waveScale * bossScale),
    maxHp: Math.round(spec.hp * waveScale * bossScale),
    progress: 0,
    lane: game.rng.next() > 0.5 ? 1 : 0,
    speed: spec.speed,
    reward: spec.reward,
    pressure: spec.pressure,
    radius: spec.radius,
    color: spec.color,
    slowUntil: 0,
    slow: 0
  };
}

function pickTarget(game, hero) {
  const enemies = game.enemies.filter((enemy) => enemy.hp > 0);
  if (enemies.length === 0) return null;
  if (hero.target === 'boss') return enemies.find((enemy) => enemy.type === 'boss') ?? enemies.sort((a, b) => b.progress - a.progress)[0];
  if (hero.target === 'lowest') return enemies.sort((a, b) => a.hp - b.hp)[0];
  if (hero.target === 'cluster') return enemies.sort((a, b) => nearbyCount(game, b) - nearbyCount(game, a))[0];
  return enemies.sort((a, b) => b.progress - a.progress)[0];
}

function nearbyCount(game, target) {
  return game.enemies.filter((enemy) => Math.abs(enemy.progress - target.progress) < 0.08).length;
}

function unitPower(game, unit) {
  const hero = HEROES[unit.hero];
  const rarityPower = RARITIES[hero.rarity].power;
  const boosted = unit.boostedUntil > game.now ? 1.75 : 1;
  const familyCount = Object.values(game.boards)
    .flatMap((board) => board.slots)
    .filter((slot) => slot && HEROES[slot.hero].family === hero.family).length;
  const synergy = familyCount >= 3 ? 1.18 : 1;
  return hero.damage * rarityPower * (1 + (unit.star - 1) * 0.85) * boosted * synergy;
}

function dealDamage(game, unit, target, amount) {
  target.hp -= amount;
  game.effects.push({
    id: `fx${nextId++}`,
    type: 'hit',
    hero: unit.hero,
    targetId: target.id,
    damage: Math.round(amount),
    ttl: 0.42
  });
}

function attackWithUnit(game, unit, dt) {
  const hero = HEROES[unit.hero];
  unit.cooldown = Math.max(0, unit.cooldown - dt);
  if (unit.cooldown > 0) return;
  const target = pickTarget(game, hero);
  if (!target) return;

  let damage = unitPower(game, unit);
  if (hero.crit && game.rng.next() < hero.crit) damage *= 2.8;
  if (hero.execute && target.hp / target.maxHp <= hero.execute) damage = target.hp + 1;
  dealDamage(game, unit, target, damage);
  if (hero.splash) {
    for (const enemy of game.enemies) {
      if (enemy.id !== target.id && Math.abs(enemy.progress - target.progress) < 0.075) dealDamage(game, unit, enemy, damage * 0.38);
    }
  }
  if (hero.chain) {
    const chained = game.enemies.filter((enemy) => enemy.id !== target.id).sort((a, b) => b.progress - a.progress).slice(0, hero.chain);
    for (const enemy of chained) dealDamage(game, unit, enemy, damage * 0.45);
  }
  if (hero.slow) {
    target.slow = Math.max(target.slow, hero.slow);
    target.slowUntil = Math.max(target.slowUntil, game.now + 1.7 + unit.star * 0.25);
  }
  if (hero.income) game.resources.gold += Math.ceil(hero.income * unit.star);
  unit.cooldown = Math.max(0.12, hero.speed / (unit.boostedUntil > game.now ? 1.45 : 1));
}

function resolveEnemies(game, dt) {
  const survivors = [];
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) {
      game.stats.kills += 1;
      game.resources.gold += enemy.reward;
      game.resources.mana += enemy.type === 'boss' ? 35 : 2;
      game.resources.xp += enemy.type === 'boss' ? 30 : 3;
      if (enemy.type === 'boss') {
        game.boss.active = false;
        game.boss.lastKillWave = game.wave.index + 1;
        game.resources.gems += 10;
      }
      continue;
    }
    const speed = enemy.speed * (game.now < enemy.slowUntil ? 1 - enemy.slow : 1);
    enemy.progress += (speed * dt) / 260;
    if (enemy.progress >= 1) {
      enemy.progress = 0;
      game.pressure.count += enemy.pressure;
    }
    survivors.push(enemy);
  }
  game.enemies = survivors;
}

function botThink(game) {
  const bot = game.players.find((player) => player.bot);
  if (!bot) return;
  const playerBoardHasUnit = game.boards.p1.slots.some(Boolean);
  if (!playerBoardHasUnit && game.wave.index === 0) return;
  if (bot.nextThink === undefined) bot.nextThink = game.now + 1.1;
  if (game.now < bot.nextThink) return;
  bot.nextThink = game.now + 2.4;
  const board = findBoard(game, bot.id);
  const merge = findMerge(board);
  if (merge) {
    mergeUnits(game, { playerId: bot.id, slotIds: merge });
    return;
  }
  if (emptySlotIndex(board) >= 0 && game.resources.gold >= currentSummonCost(game) + 20) {
    summonUnit(game, { playerId: bot.id });
    return;
  }
  if (game.resources.mana >= GAME_RULES.partnerBoostCost && game.boss.active) castPartnerBoost(game, { playerId: bot.id });
}

function findMerge(board) {
  const buckets = new Map();
  board.slots.forEach((slot, index) => {
    if (!slot) return;
    const key = `${slot.hero}:${slot.star}`;
    const items = buckets.get(key) ?? [];
    items.push(index);
    buckets.set(key, items);
  });
  return [...buckets.values()].find((items) => items.length >= GAME_RULES.mergeCount)?.slice(0, GAME_RULES.mergeCount) ?? null;
}

function currentSummonCost(game) {
  return GAME_RULES.summonBaseCost + Math.floor((game.stats.summons.p1 + game.stats.summons.p2) / 6) * 4;
}

export function createGame({ mode = 'bot', seed = Date.now() } = {}) {
  nextId = 1;
  return {
    title: 'Fortune Relay',
    id: `fortune-${seed}`,
    privateSeed: seed,
    now: 0,
    mode,
    rng: {
      next: makeRng(seed),
      pity: { p1: 0, p2: 0 }
    },
    players: [
      { id: 'p1', name: 'You', bot: false, ready: true },
      { id: 'p2', name: mode === 'bot' ? 'AUTO PARTNER' : 'Partner', bot: mode === 'bot', ready: true }
    ],
    boards: {
      p1: { id: 'p1', name: 'Your Board', slots: Array(GAME_RULES.boardSlots).fill(null), comboText: '' },
      p2: { id: 'p2', name: 'Partner Board', slots: Array(GAME_RULES.boardSlots).fill(null), comboText: '' }
    },
    resources: { gold: 120, mana: 40, gems: 30, xp: 0 },
    summonOdds: { ...SUMMON_TABLE },
    wave: { index: 0, queue: [], spawnTimer: 0, restTimer: 2.2, active: false, startedAt: 0 },
    boss: { active: false, timer: GAME_RULES.bossTimer, limit: GAME_RULES.bossTimer, lastKillWave: 0 },
    pressure: { count: 0, limit: GAME_RULES.pressureLimit },
    enemies: [],
    effects: [],
    stats: {
      kills: 0,
      summons: { p1: 0, p2: 0 },
      merges: { p1: 0, p2: 0 },
      chanceUps: { p1: 0, p2: 0 }
    },
    unlocks: [],
    over: false,
    won: false
  };
}

export function summonUnit(game, { playerId }) {
  const board = findBoard(game, playerId);
  const slotIndex = emptySlotIndex(board);
  const cost = currentSummonCost(game);
  if (slotIndex < 0) return { ok: false, reason: 'Board full. Merge units first.' };
  if (game.resources.gold < cost) return { ok: false, reason: 'Not enough gold.' };
  const hero = rollHero(game, playerId);
  const unit = makeUnit(game, playerId, hero.id);
  game.resources.gold -= cost;
  game.stats.summons[playerId] = (game.stats.summons[playerId] ?? 0) + 1;
  game.rng.pity[playerId] = RARITY_ORDER.indexOf(hero.rarity) >= RARITY_ORDER.indexOf('epic') ? 0 : game.rng.pity[playerId] + 1;
  board.slots[slotIndex] = unit;
  game.effects.push({ id: `fx${nextId++}`, type: 'summon', playerId, slot: slotIndex, rarity: hero.rarity, ttl: 0.8 });
  return { ok: true, slot: slotIndex, unit };
}

export function mergeUnits(game, { playerId, slotIds }) {
  const board = findBoard(game, playerId);
  const slots = slotIds.map((index) => board.slots[index]);
  if (slotIds.length !== GAME_RULES.mergeCount || slots.some((slot) => !slot)) return { ok: false, reason: 'Select three matching units.' };
  const [first] = slots;
  if (!slots.every((slot) => slot.hero === first.hero && slot.star === first.star)) return { ok: false, reason: 'Units must match exactly.' };
  const baseHero = HEROES[first.hero];
  const nextRarity = rarityAfter(baseHero.rarity);
  const pool = heroesByRarity(nextRarity);
  const hero = pool[Math.floor(game.rng.next() * pool.length)] ?? HEROES[first.hero];
  const merged = makeUnit(game, playerId, hero.id, Math.min(5, first.star + 1));
  board.slots[slotIds[0]] = merged;
  for (const index of slotIds.slice(1)) board.slots[index] = null;
  game.stats.merges[playerId] = (game.stats.merges[playerId] ?? 0) + 1;
  board.comboText = `${HEROES[hero.id].name} ${merged.star}★`;
  game.effects.push({ id: `fx${nextId++}`, type: 'merge', playerId, slot: slotIds[0], rarity: hero.rarity, ttl: 1.0 });
  return { ok: true, unit: merged };
}

export function upgradeSummonOdds(game, { playerId }) {
  const cost = GAME_RULES.chanceUpCost + (game.stats.chanceUps[playerId] ?? 0) * 25;
  if (game.resources.gold < cost) return { ok: false, reason: 'Not enough gold.' };
  game.resources.gold -= cost;
  game.stats.chanceUps[playerId] = (game.stats.chanceUps[playerId] ?? 0) + 1;
  game.summonOdds.common = Math.max(0.4, game.summonOdds.common - 0.045);
  game.summonOdds.rare += 0.022;
  game.summonOdds.epic += 0.016;
  game.summonOdds.legendary += 0.006;
  game.summonOdds.mythic += 0.001;
  game.effects.push({ id: `fx${nextId++}`, type: 'chance', playerId, ttl: 0.75 });
  return { ok: true, odds: clone(game.summonOdds) };
}

export function castPartnerBoost(game, { playerId }) {
  if (game.resources.mana < GAME_RULES.partnerBoostCost) return { ok: false, reason: 'Not enough mana.' };
  const board = findBoard(game, partnerId(playerId));
  const targets = board.slots.filter(Boolean).sort((a, b) => unitPower(game, b) - unitPower(game, a));
  if (targets.length === 0) return { ok: false, reason: 'Partner has no units.' };
  game.resources.mana -= GAME_RULES.partnerBoostCost;
  targets[0].boostedUntil = game.now + 8;
  game.effects.push({ id: `fx${nextId++}`, type: 'boost', playerId: partnerId(playerId), unitId: targets[0].id, ttl: 1.0 });
  return { ok: true, unitId: targets[0].id };
}

export function tryBuyShopItem(game, { itemId }) {
  const item = SHOP.items.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'Shop item not found.' };
  for (const [currency, amount] of Object.entries(item.price)) {
    if ((game.resources[currency] ?? 0) < amount) return { ok: false, reason: `Not enough ${currency}.` };
  }
  for (const [currency, amount] of Object.entries(item.price)) game.resources[currency] -= amount;
  if (item.grant.gold) game.resources.gold += item.grant.gold;
  if (item.grant.mana) game.resources.mana += item.grant.mana;
  if (item.grant.gems) game.resources.gems += item.grant.gems;
  if (item.grant.cosmetic && !game.unlocks.includes(item.grant.cosmetic)) game.unlocks.push(item.grant.cosmetic);
  return { ok: true, itemId };
}

export function tickGame(game, dt) {
  if (game.over) return game;
  game.now += dt;
  botThink(game);

  if (!game.wave.active) {
    game.wave.restTimer -= dt;
    if (game.wave.restTimer <= 0) startWave(game);
  }

  if (game.wave.active) {
    game.wave.spawnTimer -= dt;
    if (game.wave.spawnTimer <= 0 && game.wave.queue.length > 0) {
      game.enemies.push(makeEnemy(game, game.wave.queue.shift()));
      game.wave.spawnTimer = Math.max(0.13, 0.44 - game.wave.index * 0.01);
    }
  }

  for (const board of Object.values(game.boards)) {
    for (const unit of board.slots) {
      if (unit) attackWithUnit(game, unit, dt);
    }
  }
  resolveEnemies(game, dt);

  if (game.boss.active) {
    game.boss.timer -= dt;
    if (game.boss.timer <= 0 && game.enemies.some((enemy) => enemy.type === 'boss')) {
      game.over = true;
      game.won = false;
    }
  }

  if (game.pressure.count >= game.pressure.limit) {
    game.over = true;
    game.won = false;
  }

  game.effects = game.effects.map((effect) => ({ ...effect, ttl: effect.ttl - dt })).filter((effect) => effect.ttl > 0);
  if (!game.over) game.pressure.count = Math.max(0, game.pressure.count - dt * 0.75);

  if (game.wave.active && game.wave.queue.length === 0 && game.enemies.length === 0) {
    game.wave.index += 1;
    game.wave.active = false;
    game.wave.restTimer = 3.4;
    game.resources.gold += 45 + game.wave.index * 8;
    game.resources.mana += 12;
    game.resources.gems += game.wave.index % 3 === 0 ? 8 : 0;
    game.pressure.count = Math.max(0, game.pressure.count - 24);
    if (game.wave.index >= GAME_RULES.maxWave) {
      game.over = true;
      game.won = true;
      game.resources.gems += 120;
    }
  }
  return game;
}

export function serializeState(game) {
  return {
    title: game.title,
    id: game.id,
    now: Number(game.now.toFixed(2)),
    mode: game.mode,
    players: game.players,
    boards: game.boards,
    resources: game.resources,
    summonOdds: game.summonOdds,
    wave: game.wave,
    boss: game.boss,
    pressure: game.pressure,
    enemies: game.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      hp: Math.ceil(enemy.hp),
      maxHp: enemy.maxHp,
      progress: Number(enemy.progress.toFixed(3)),
      lane: enemy.lane,
      radius: enemy.radius,
      color: enemy.color
    })),
    effects: game.effects,
    stats: game.stats,
    unlocks: game.unlocks,
    over: game.over,
    won: game.won
  };
}

export { ENEMIES, GAME_RULES, HEROES, RARITIES, SHOP };
