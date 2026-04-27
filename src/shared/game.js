import {
  GAME_RULES,
  GRADE_ORDER,
  GRADES,
  NOISE_TYPES,
  RELAY_ROSTER,
  RELAY_TYPES,
  SHOP,
  SUPPLY_TABLE,
  WAVES
} from './content.js';

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

function gradeRank(grade) {
  return GRADE_ORDER.indexOf(grade);
}

function relaysByGrade(grade) {
  return Object.values(RELAY_TYPES).filter((relay) => relay.grade === grade);
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

function socketCoord(index) {
  return { col: index % GAME_RULES.boardColumns, row: Math.floor(index / GAME_RULES.boardColumns) };
}

function neighborIndex(index, direction) {
  const { col, row } = socketCoord(index);
  if (direction === 'N') return row > 0 ? index - GAME_RULES.boardColumns : -1;
  if (direction === 'S') return row < 2 ? index + GAME_RULES.boardColumns : -1;
  if (direction === 'W') return col > 0 ? index - 1 : -1;
  if (direction === 'E') return col < GAME_RULES.boardColumns - 1 ? index + 1 : -1;
  return -1;
}

function opposite(direction) {
  return { N: 'S', S: 'N', W: 'E', E: 'W' }[direction];
}

function relayOnline(relay, now) {
  return relay && relay.shutdownUntil <= now;
}

function makeRelay(game, playerId, relayId, tier = 1, grade = RELAY_TYPES[relayId].grade) {
  const spec = RELAY_TYPES[relayId];
  return {
    id: `r${nextId++}`,
    relayId,
    tier,
    grade,
    heat: 0,
    cooldown: 0,
    owner: playerId,
    linkShape: [...spec.linkShape],
    overclockUntil: 0,
    linkPulseUntil: 0,
    shutdownUntil: 0
  };
}

function rollRelay(game, playerId) {
  const odds = { ...game.supplyOdds };
  if (game.rng.pity[playerId] >= GAME_RULES.pityThreshold) {
    odds.Basic = Math.max(0.35, odds.Basic - 0.22);
    odds.Tuned += 0.11;
    odds.Prime += 0.075;
    odds.Core += 0.03;
    odds.Origin += 0.005;
  }
  const grade = weightedPick(odds, game.rng.next);
  const pool = relaysByGrade(grade);
  const relay = pool[Math.floor(game.rng.next() * pool.length)] ?? relaysByGrade('Basic')[0];
  return relay;
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
  game.wave.disruptionFired = false;
  if (game.wave.queue.includes('boss')) {
    game.boss.active = true;
    game.boss.timer = GAME_RULES.bossTimer;
    game.boss.limit = GAME_RULES.bossTimer;
  }
}

function makeNoise(game, type, overrides = {}) {
  const spec = NOISE_TYPES[type];
  const waveScale = 1 + game.wave.index * 0.18;
  const bossScale = type === 'boss' ? 1 + Math.floor(game.wave.index / 3) * 0.45 : 1;
  const maxHp = Math.round((overrides.maxHp ?? spec.hp) * waveScale * bossScale);
  return {
    id: `n${nextId++}`,
    type,
    hp: overrides.hp ?? maxHp,
    maxHp,
    progress: overrides.progress ?? 0,
    lane: overrides.lane ?? (game.rng.next() > 0.5 ? 1 : 0),
    speed: overrides.speed ?? spec.speed,
    rewardCharge: overrides.rewardCharge ?? spec.rewardCharge,
    rewardLink: overrides.rewardLink ?? spec.rewardLink,
    saturation: overrides.saturation ?? spec.saturation,
    radius: overrides.radius ?? spec.radius,
    color: overrides.color ?? spec.color,
    slowUntil: 0,
    slow: 0,
    saturationMarks: 0,
    deathResolved: false
  };
}

function nearbyCount(game, target) {
  return game.noise.filter((noise) => Math.abs(noise.progress - target.progress) < 0.08).length;
}

function pickTarget(game, spec) {
  const candidates = game.noise.filter((noise) => noise.hp > 0);
  if (candidates.length === 0) return null;
  if (spec.target === 'boss') return candidates.find((noise) => noise.type === 'boss') ?? candidates.sort((a, b) => b.progress - a.progress)[0];
  if (spec.target === 'null') return candidates.find((noise) => noise.type === 'null') ?? candidates.sort((a, b) => b.progress - a.progress)[0];
  if (spec.target === 'cluster') return candidates.sort((a, b) => nearbyCount(game, b) - nearbyCount(game, a) || b.progress - a.progress)[0];
  return candidates.sort((a, b) => b.progress - a.progress)[0];
}

function activeLinkCountForSocket(links, index) {
  return links.filter((link) => link.a === index || link.b === index).length;
}

function activeLinksOnAnchor(board, now) {
  return computeActiveLinks(board, now).filter((link) => link.a === board.anchorIndex || link.b === board.anchorIndex).length;
}

function isAnchorLinked(board, now, index) {
  if (index === board.anchorIndex && relayOnline(board.slots[index], now)) return true;
  return computeActiveLinks(board, now).some((link) => {
    return (link.a === index && link.b === board.anchorIndex) || (link.b === index && link.a === board.anchorIndex);
  });
}

function gradeMultiplier(grade) {
  return GRADES[grade]?.power ?? 1;
}

function tierMultiplier(tier) {
  return 1 + (tier - 1) * 0.62;
}

function boardAmpMultiplier(board, now, slotIndex) {
  const links = computeActiveLinks(board, now);
  const linkedIndexes = links
    .filter((link) => link.a === slotIndex || link.b === slotIndex)
    .map((link) => (link.a === slotIndex ? link.b : link.a));
  const strongest = linkedIndexes
    .map((index) => board.slots[index])
    .filter((relay) => relayOnline(relay, now))
    .map((relay) => RELAY_TYPES[relay.relayId].amp ?? 1)
    .sort((a, b) => b - a)[0];
  return strongest ?? 1;
}

function relayDamage(game, board, slotIndex, relay) {
  const spec = RELAY_TYPES[relay.relayId];
  const links = computeActiveLinks(board, game.now);
  const activeLinks = activeLinkCountForSocket(links, slotIndex);
  const linkMultiplier = Math.min(1 + activeLinks * 0.08, 1.32);
  const anchorBonus = (isAnchorLinked(board, game.now, slotIndex) ? 1.12 : 1) * (activeLinksOnAnchor(board, game.now) >= 3 ? 1.08 : 1);
  const heatOutput = relay.heat >= 50 && relay.heat < 70 ? 1.05 : 1;
  const heatPenalty = relay.heat >= 90 ? 0.55 : relay.heat >= 70 ? 0.8 : 1;
  const overclock = relay.overclockUntil > game.now ? 1.35 : 1;
  const pulse = relay.linkPulseUntil > game.now ? 1.2 : 1;
  return spec.voltage * tierMultiplier(relay.tier) * gradeMultiplier(relay.grade) * linkMultiplier * anchorBonus * heatOutput * heatPenalty * overclock * pulse * boardAmpMultiplier(board, game.now, slotIndex);
}

function applyHeat(game, relay, amount) {
  relay.heat = Math.max(0, Math.min(130, Math.round((relay.heat + amount) * 10) / 10));
  if (relay.heat >= GAME_RULES.shutdownHeat && relay.shutdownUntil <= game.now) {
    relay.shutdownUntil = game.now + GAME_RULES.shutdownDuration;
    game.effects.push({ id: `fx${nextId++}`, type: 'shutdown', unitId: relay.id, playerId: relay.owner, ttl: 1.2 });
  }
}

function repairBoard(game, board, relay, spec) {
  const relays = board.slots.filter(Boolean).sort((a, b) => b.heat - a.heat);
  const amount = Math.abs(spec.heatPerAction) * (1 + (relay.tier - 1) * 0.25);
  if (relays[0]) applyHeat(game, relays[0], -amount);
  if (spec.repair) game.signal.integrity = Math.min(GAME_RULES.signalMax, game.signal.integrity + spec.repair * relay.tier);
  game.effects.push({ id: `fx${nextId++}`, type: 'repair', playerId: relay.owner, unitId: relay.id, ttl: 0.75 });
}

function dealDamage(game, relay, target, amount) {
  const markedAmount = amount * (1 + target.saturationMarks * 0.08);
  target.hp -= markedAmount;
  game.effects.push({
    id: `fx${nextId++}`,
    type: 'hit',
    relayId: relay.relayId,
    targetId: target.id,
    damage: Math.round(markedAmount),
    ttl: 0.42
  });
}

function attackWithRelay(game, board, slotIndex, relay, dt) {
  const spec = RELAY_TYPES[relay.relayId];
  if (!relayOnline(relay, game.now)) return;
  relay.cooldown = Math.max(0, relay.cooldown - dt);
  relay.heat = Math.max(0, relay.heat - dt * 1.3);
  if (relay.cooldown > 0) return;

  if (spec.target === 'repair') {
    repairBoard(game, board, relay, spec);
    relay.cooldown = spec.cycle;
    return;
  }

  const target = pickTarget(game, spec);
  if (!target) return;

  let damage = relayDamage(game, board, slotIndex, relay);
  if (spec.crit && game.rng.next() < spec.crit) damage *= 2.4;
  if (spec.execute && target.type === 'boss' && target.hp / target.maxHp <= spec.execute) {
    damage = target.hp + 1;
    game.effects.push({ id: `fx${nextId++}`, type: 'boss_execute', relayId: relay.relayId, targetId: target.id, ttl: 1.1 });
  }
  dealDamage(game, relay, target, damage);

  if (spec.splash) {
    for (const noise of game.noise) {
      if (noise.id !== target.id && Math.abs(noise.progress - target.progress) < spec.splash) dealDamage(game, relay, noise, damage * 0.34);
    }
  }
  if (spec.chain) {
    const chained = game.noise.filter((noise) => noise.id !== target.id).sort((a, b) => b.progress - a.progress).slice(0, spec.chain);
    for (const noise of chained) dealDamage(game, relay, noise, damage * 0.42);
  }
  if (spec.slow) {
    target.slow = Math.max(target.slow, spec.slow);
    target.slowUntil = Math.max(target.slowUntil, game.now + 1.8 + relay.tier * 0.2);
  }
  if (spec.saturationMark) target.saturationMarks += spec.saturationMark;
  if (spec.sink) {
    const hottest = board.slots.filter(Boolean).sort((a, b) => b.heat - a.heat)[0];
    if (hottest) applyHeat(game, hottest, -spec.sink);
  }

  applyHeat(game, relay, spec.heatPerAction);
  relay.cooldown = Math.max(0.16, spec.cycle / (relay.linkPulseUntil > game.now ? 1.2 : 1));
}

function resolveNoise(game, dt) {
  const survivors = [];
  const children = [];
  for (const noise of game.noise) {
    if (noise.hp <= 0 && !noise.deathResolved) {
      noise.deathResolved = true;
      game.stats.kills += 1;
      game.resources.charge += noise.rewardCharge;
      game.resources.linkEnergy += noise.rewardLink;
      game.resources.xp += noise.type === 'boss' ? 30 : 3;
      if (noise.type === 'boss') {
        game.boss.active = false;
        game.boss.lastKillWave = game.wave.index + 1;
        game.resources.gems += 10;
      }
      if (noise.type === 'splitter') {
        children.push(makeNoise(game, 'flicker', { progress: Math.max(0, noise.progress - 0.015), lane: noise.lane, rewardCharge: 0, rewardLink: 0, saturation: 1 }));
        children.push(makeNoise(game, 'flicker', { progress: Math.min(0.995, noise.progress + 0.015), lane: noise.lane, rewardCharge: 0, rewardLink: 0, saturation: 1 }));
      }
      continue;
    }
    if (noise.hp <= 0) continue;

    const speed = noise.speed * (game.now < noise.slowUntil ? 1 - noise.slow : 1);
    noise.progress += (speed * dt) / 250;
    if (noise.progress >= 1) {
      noise.progress = 0;
      game.saturation.count += noise.saturation;
      game.signal.integrity = Math.max(0, game.signal.integrity - (noise.type === 'null' ? 8 : noise.saturation));
    }
    survivors.push(noise);
  }
  game.noise = survivors.concat(children);
}

function findMerge(board) {
  const buckets = new Map();
  board.slots.forEach((slot, index) => {
    if (!slot) return;
    const key = `${slot.relayId}:${slot.tier}`;
    const items = buckets.get(key) ?? [];
    items.push(index);
    buckets.set(key, items);
  });
  return [...buckets.values()].find((items) => items.length >= GAME_RULES.mergeCount)?.slice(0, GAME_RULES.mergeCount) ?? null;
}

function botThink(game) {
  const bot = game.players.find((player) => player.bot);
  if (!bot) return;
  const playerBoardHasRelay = game.boards.p1.slots.some(Boolean);
  if (!playerBoardHasRelay && game.wave.index === 0) return;
  if (bot.nextThink === undefined) bot.nextThink = game.now + 1.0;
  if (game.now < bot.nextThink) return;
  bot.nextThink = game.now + 1.9;
  const board = findBoard(game, bot.id);
  const merge = findMerge(board);
  if (merge) {
    mergeRelays(game, { playerId: bot.id, slotIds: merge });
    return;
  }
  const partnerDanger = game.boards.p1.slots.some((relay) => relay && relay.heat >= 82) || game.signal.integrity <= 38;
  if (partnerDanger && game.resources.linkEnergy >= GAME_RULES.linkPulseCost) {
    castLinkPulse(game, { playerId: bot.id });
    return;
  }
  if (game.boss.active) {
    const strongestSlot = board.slots.findIndex((relay) => relay && relay.heat < 78);
    if (strongestSlot >= 0) {
      overclockRelay(game, { playerId: bot.id, slot: strongestSlot });
      return;
    }
  }
  if (emptySlotIndex(board) >= 0 && game.resources.charge >= currentSupplyCost(game) + 18) {
    supplyRelay(game, { playerId: bot.id });
  }
}

function currentSupplyCost(game) {
  const totalSupplies = (game.stats.supplies.p1 ?? 0) + (game.stats.supplies.p2 ?? 0);
  const uncapped = GAME_RULES.supplyBaseCost + Math.floor(totalSupplies / 6) * GAME_RULES.supplyCostStep;
  const discountPct = game.pendingSupplyDiscountPct ?? 0;
  return Math.max(1, Math.floor(uncapped * (1 - discountPct / 100)));
}

export function computeActiveLinks(board, now = 0) {
  const links = [];
  board.slots.forEach((relay, index) => {
    if (!relayOnline(relay, now)) return;
    for (const direction of relay.linkShape) {
      const neighbor = neighborIndex(index, direction);
      if (neighbor < 0 || neighbor < index) continue;
      const other = board.slots[neighbor];
      if (!relayOnline(other, now)) continue;
      if (other.linkShape.includes(opposite(direction))) links.push({ a: index, b: neighbor, direction });
    }
  });
  return links;
}

export function createGame({ mode = 'bot', seed = Date.now() } = {}) {
  nextId = 1;
  return {
    title: 'Signal Relay',
    id: `signal-${seed}`,
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
      p1: { id: 'p1', name: 'Your Relay Board', anchorIndex: 5, slots: Array(GAME_RULES.boardSlots).fill(null), comboText: '' },
      p2: { id: 'p2', name: 'Partner Relay Board', anchorIndex: 5, slots: Array(GAME_RULES.boardSlots).fill(null), comboText: '' }
    },
    resources: { charge: 110, linkEnergy: 36, gems: 30, xp: 0 },
    supplyOdds: { ...SUPPLY_TABLE },
    wave: { index: 0, queue: [], spawnTimer: 0, restTimer: 2.0, active: false, startedAt: 0, disruptionFired: false },
    boss: { active: false, timer: GAME_RULES.bossTimer, limit: GAME_RULES.bossTimer, lastKillWave: 0 },
    signal: { integrity: 100, max: 100 },
    saturation: { count: 0, limit: GAME_RULES.saturationLimit },
    noise: [],
    effects: [],
    stats: {
      kills: 0,
      supplies: { p1: 0, p2: 0 },
      merges: { p1: 0, p2: 0 },
      swaps: { p1: 0, p2: 0 },
      focusUps: { p1: 0, p2: 0 },
      linkPulses: { p1: 0, p2: 0 },
      overclocks: { p1: 0, p2: 0 }
    },
    pendingSupplyDiscountPct: 0,
    unlocks: [],
    over: false,
    won: false
  };
}

export function supplyRelay(game, { playerId }) {
  const board = findBoard(game, playerId);
  const slotIndex = emptySlotIndex(board);
  const cost = currentSupplyCost(game);
  if (slotIndex < 0) return { ok: false, reason: 'Board full. Merge or Swap Relays first.' };
  if (game.resources.charge < cost) return { ok: false, reason: 'Not enough Charge.' };
  const relaySpec = rollRelay(game, playerId);
  const relay = makeRelay(game, playerId, relaySpec.id);
  game.resources.charge -= cost;
  game.pendingSupplyDiscountPct = 0;
  game.stats.supplies[playerId] = (game.stats.supplies[playerId] ?? 0) + 1;
  game.rng.pity[playerId] = gradeRank(relaySpec.grade) >= gradeRank('Prime') ? 0 : game.rng.pity[playerId] + 1;
  board.slots[slotIndex] = relay;
  game.effects.push({ id: `fx${nextId++}`, type: 'supply', playerId, slot: slotIndex, relayId: relay.relayId, grade: relay.grade, ttl: 0.8 });
  return { ok: true, slot: slotIndex, relay };
}

export function mergeRelays(game, { playerId, slotIds }) {
  const board = findBoard(game, playerId);
  const slots = slotIds.map((index) => board.slots[index]);
  if (slotIds.length !== GAME_RULES.mergeCount || slots.some((slot) => !slot)) return { ok: false, reason: 'Select three matching Relays.' };
  const [first] = slots;
  if (!slots.every((slot) => slot.relayId === first.relayId && slot.tier === first.tier)) return { ok: false, reason: 'Relays must match exactly.' };
  const averageHeat = slots.reduce((sum, slot) => sum + slot.heat, 0) / slots.length;
  const merged = makeRelay(game, playerId, first.relayId, Math.min(5, first.tier + 1), first.grade);
  merged.heat = Math.min(40, Math.floor(averageHeat * 0.45));
  board.slots[slotIds[0]] = merged;
  for (const index of slotIds.slice(1)) board.slots[index] = null;
  game.stats.merges[playerId] = (game.stats.merges[playerId] ?? 0) + 1;
  board.comboText = `${RELAY_TYPES[merged.relayId].name} T${merged.tier}`;
  game.effects.push({ id: `fx${nextId++}`, type: 'merge', playerId, slot: slotIds[0], relayId: merged.relayId, grade: merged.grade, ttl: 1.0 });
  return { ok: true, relay: merged };
}

export function swapRelays(game, { playerId, from, to }) {
  const board = findBoard(game, playerId);
  if (from === to) return { ok: false, reason: 'Choose two different sockets.' };
  if (!board.slots[from] && !board.slots[to]) return { ok: false, reason: 'No Relay to swap.' };
  const temp = board.slots[from];
  board.slots[from] = board.slots[to];
  board.slots[to] = temp;
  game.stats.swaps[playerId] = (game.stats.swaps[playerId] ?? 0) + 1;
  game.effects.push({ id: `fx${nextId++}`, type: 'swap', playerId, from, to, ttl: 0.7 });
  return { ok: true };
}

export function upgradeSupplyFocus(game, { playerId }) {
  const cost = GAME_RULES.supplyFocusCost + (game.stats.focusUps[playerId] ?? 0) * 25;
  if (game.resources.charge < cost) return { ok: false, reason: 'Not enough Charge.' };
  game.resources.charge -= cost;
  game.stats.focusUps[playerId] = (game.stats.focusUps[playerId] ?? 0) + 1;
  game.supplyOdds.Basic = Math.max(0.38, game.supplyOdds.Basic - 0.045);
  game.supplyOdds.Tuned += 0.022;
  game.supplyOdds.Prime += 0.016;
  game.supplyOdds.Core += 0.006;
  game.supplyOdds.Origin += 0.001;
  game.effects.push({ id: `fx${nextId++}`, type: 'focus', playerId, ttl: 0.75 });
  return { ok: true, odds: clone(game.supplyOdds) };
}

export function castLinkPulse(game, { playerId }) {
  if (game.resources.linkEnergy < GAME_RULES.linkPulseCost) return { ok: false, reason: 'Not enough Link Energy.' };
  const targetPlayerId = partnerId(playerId);
  const board = findBoard(game, targetPlayerId);
  const targets = board.slots.filter(Boolean).sort((a, b) => b.heat - a.heat);
  if (targets.length === 0) return { ok: false, reason: 'Partner has no Relay.' };
  const preSignalIntegrity = game.signal.integrity;
  const saveCandidates = targets.filter((relay) => relay.heat >= 90).map((relay) => relay.id);
  const target = targets[0];
  game.resources.linkEnergy -= GAME_RULES.linkPulseCost;
  target.heat = Math.max(0, target.heat - GAME_RULES.linkPulseHeatDrop);
  target.linkPulseUntil = game.now + GAME_RULES.linkPulseDuration;
  game.stats.linkPulses[playerId] = (game.stats.linkPulses[playerId] ?? 0) + 1;
  game.effects.push({ id: `fx${nextId++}`, type: 'link_pulse', playerId, targetPlayerId, unitId: target.id, ttl: 1.0 });
  const savedUnitIds = saveCandidates.filter((id) => targets.find((relay) => relay.id === id)?.heat < 90);
  const signalSave = preSignalIntegrity <= 35;
  if (savedUnitIds.length > 0 || signalSave) {
    if (signalSave) game.signal.integrity = Math.min(GAME_RULES.signalMax, game.signal.integrity + 8);
    game.pendingSupplyDiscountPct = 25;
    game.effects.push({
      id: `fx${nextId++}`,
      type: 'link_pulse_save',
      playerId,
      targetPlayerId,
      preSignalIntegrity,
      savedUnitIds,
      signalGain: signalSave ? 8 : 0,
      pendingSupplyDiscountPct: 25,
      ttl: 1.25
    });
  }
  return { ok: true, unitId: target.id };
}

export function overclockRelay(game, { playerId, slot }) {
  const board = findBoard(game, playerId);
  const relay = board.slots[slot];
  if (!relay) return { ok: false, reason: 'No Relay in that socket.' };
  relay.overclockUntil = game.now + GAME_RULES.overclockDuration;
  applyHeat(game, relay, GAME_RULES.overclockHeat);
  game.stats.overclocks[playerId] = (game.stats.overclocks[playerId] ?? 0) + 1;
  game.effects.push({ id: `fx${nextId++}`, type: 'overclock', playerId, slot, unitId: relay.id, ttl: 0.8 });
  return { ok: true, relay };
}

export function tryBuyShopItem(game, { itemId }) {
  const item = SHOP.items.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'Shop item not found.' };
  for (const [currency, amount] of Object.entries(item.price)) {
    if ((game.resources[currency] ?? 0) < amount) return { ok: false, reason: `Not enough ${currency}.` };
  }
  for (const [currency, amount] of Object.entries(item.price)) game.resources[currency] -= amount;
  if (item.grant.charge) game.resources.charge += item.grant.charge;
  if (item.grant.linkEnergy) game.resources.linkEnergy += item.grant.linkEnergy;
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
      game.noise.push(makeNoise(game, game.wave.queue.shift()));
      game.wave.spawnTimer = Math.max(0.12, 0.42 - game.wave.index * 0.012);
    }
    if (game.boss.active && !game.wave.disruptionFired && game.boss.timer < game.boss.limit - 8) {
      game.wave.disruptionFired = true;
      game.effects.push({ id: `fx${nextId++}`, type: 'boss_disruption', waveIndex: game.wave.index + 1, ttl: 1.2 });
    }
  }

  for (const [playerId, board] of Object.entries(game.boards)) {
    for (const [slotIndex, relay] of board.slots.entries()) {
      if (relay) attackWithRelay(game, board, slotIndex, relay, dt);
    }
    board.activeLinks = computeActiveLinks(board, game.now).length;
    board.heatPeak = Math.max(0, ...board.slots.filter(Boolean).map((relay) => relay.heat));
    board.owner = playerId;
  }
  resolveNoise(game, dt);

  if (game.boss.active) {
    game.boss.timer -= dt;
    if (game.boss.timer <= 0 && game.noise.some((noise) => noise.type === 'boss')) {
      game.over = true;
      game.won = false;
      game.resultReason = 'Boss timer expired.';
    }
  }

  if (game.saturation.count >= game.saturation.limit || game.signal.integrity <= 0) {
    game.over = true;
    game.won = false;
    game.resultReason = game.signal.integrity <= 0 ? 'Signal collapsed.' : 'Saturation reached 100.';
  }

  game.effects = game.effects.map((effect) => ({ ...effect, ttl: effect.ttl - dt })).filter((effect) => effect.ttl > 0);
  if (!game.over) game.saturation.count = Math.max(0, game.saturation.count - dt * 0.42);

  if (game.wave.active && game.wave.queue.length === 0 && game.noise.length === 0) {
    game.wave.index += 1;
    game.wave.active = false;
    game.wave.restTimer = 3.0;
    game.resources.charge += 45 + game.wave.index * 8;
    game.resources.linkEnergy += 12;
    game.resources.gems += game.wave.index % 3 === 0 ? 8 : 0;
    game.signal.integrity = Math.min(GAME_RULES.signalMax, game.signal.integrity + 5);
    game.saturation.count = Math.max(0, game.saturation.count - 18);
    if (game.wave.index >= GAME_RULES.maxWave) {
      game.over = true;
      game.won = true;
      game.resultReason = 'Signal loop stabilized.';
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
    supplyOdds: game.supplyOdds,
    wave: game.wave,
    boss: game.boss,
    signal: game.signal,
    saturation: game.saturation,
    noise: game.noise.map((noise) => ({
      id: noise.id,
      type: noise.type,
      hp: Math.ceil(noise.hp),
      maxHp: noise.maxHp,
      progress: Number(noise.progress.toFixed(3)),
      lane: noise.lane,
      radius: noise.radius,
      color: noise.color,
      saturationMarks: noise.saturationMarks
    })),
    effects: game.effects,
    stats: game.stats,
    unlocks: game.unlocks,
    resultReason: game.resultReason,
    over: game.over,
    won: game.won
  };
}

export const summonUnit = supplyRelay;
export const mergeUnits = mergeRelays;
export const upgradeSummonOdds = upgradeSupplyFocus;
export const castPartnerBoost = castLinkPulse;

export { GAME_RULES, GRADES, GRADES as RARITIES, NOISE_TYPES, NOISE_TYPES as ENEMIES, RELAY_ROSTER, RELAY_TYPES, RELAY_TYPES as HEROES, SHOP };
