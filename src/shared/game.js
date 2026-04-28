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
const EVENT_LOG_LIMIT = 24;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function roundedSeconds(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function pushEvent(game, event) {
  if (!game.eventLog) game.eventLog = [];
  const entry = {
    id: `ev${nextId++}`,
    at: roundedSeconds(game.now),
    ...event
  };
  game.eventLog.push(entry);
  if (game.eventLog.length > EVENT_LOG_LIMIT) game.eventLog = game.eventLog.slice(-EVENT_LOG_LIMIT);
  return entry;
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

function boardIdForPlayer(game, playerId) {
  if (game.boards[playerId]) return playerId;
  return playerId === game.players[1]?.id ? 'p2' : 'p1';
}

function partnerId(playerId) {
  return playerId === 'p1' ? 'p2' : 'p1';
}

function emptySlotIndex(board) {
  return board.slots.findIndex((slot) => slot === null);
}

function prioritySlotIndex(board) {
  return GAME_RULES.supplyPlacementPriority.find((index) => board.slots[index] === null) ?? -1;
}

function validSlotIndex(board, index) {
  return Number.isInteger(index) && index >= 0 && index < board.slots.length;
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

function linkKey(a, b) {
  return `${Math.min(a, b)}:${Math.max(a, b)}`;
}

function linkDisabled(board, a, b, now) {
  const key = linkKey(a, b);
  return (board.disabledLinks ?? []).some((link) => link.until > now && link.key === key);
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
    shutdownUntil: 0,
    overclockStallResolvedAt: 0
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
  game.linkPulseSignalGainThisWave = 0;
  game.resources.swapCharges.p1 += 1;
  game.resources.swapCharges.p2 += 1;
  if (game.wave.queue.includes('boss')) {
    game.boss.active = true;
    game.boss.timer = GAME_RULES.bossTimer;
    game.boss.limit = GAME_RULES.bossTimer;
  }
  pushEvent(game, {
    type: game.wave.queue.includes('boss') ? 'boss_wave_started' : 'wave_started',
    wave: game.wave.index + 1,
    bossActive: game.wave.queue.includes('boss')
  });
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

function relayDamage(game, board, slotIndex, relay, target) {
  const spec = RELAY_TYPES[relay.relayId];
  const links = computeActiveLinks(board, game.now);
  const activeLinks = activeLinkCountForSocket(links, slotIndex);
  const linkMultiplier = Math.min(1 + activeLinks * 0.08, 1.32);
  const anchorBonus = (isAnchorLinked(board, game.now, slotIndex) ? 1.12 : 1) * (activeLinksOnAnchor(board, game.now) >= 3 ? 1.08 : 1);
  const heatOutput = relay.heat >= 50 && relay.heat < 70 ? 1.05 : 1;
  const heatPenalty = relay.heat >= 90 ? 0.55 : relay.heat >= 70 ? 0.8 : 1;
  const overclock = board.overclockUntil > game.now ? 1.35 : 1;
  const dualOverclockBoss = target?.type === 'boss' && game.dualOverclockBossUntil > game.now ? 1.3 : 1;
  return spec.voltage * tierMultiplier(relay.tier) * gradeMultiplier(relay.grade) * linkMultiplier * anchorBonus * heatOutput * heatPenalty * overclock * dualOverclockBoss * boardAmpMultiplier(board, game.now, slotIndex);
}

function applyHeat(game, relay, amount) {
  relay.heat = Math.max(0, Math.min(100, Math.round((relay.heat + amount) * 10) / 10));
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

function effectNoiseAnchor(noise) {
  return {
    targetId: noise.id,
    targetType: noise.type,
    targetProgress: Number(noise.progress.toFixed(3)),
    targetLane: noise.lane,
    targetColor: noise.color,
    targetRadius: noise.radius
  };
}

function dealDamage(game, relay, source, target, amount) {
  const markedAmount = amount * (1 + target.saturationMarks * 0.08);
  target.hp -= markedAmount;
  game.effects.push({
    id: `fx${nextId++}`,
    type: 'hit',
    playerId: source.playerId,
    slot: source.slotIndex,
    relayId: relay.relayId,
    ...effectNoiseAnchor(target),
    damage: Math.round(markedAmount),
    ttl: 0.62
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
    relay.cooldown = spec.cycle * (relay.linkPulseUntil > game.now ? 0.8 : 1);
    return;
  }

  const target = pickTarget(game, spec);
  if (!target) return;

  let damage = relayDamage(game, board, slotIndex, relay, target);
  if (spec.crit && game.rng.next() < spec.crit) damage *= 2.4;
  if (spec.execute && target.type === 'boss' && target.hp / target.maxHp <= spec.execute) {
    damage = target.hp + 1;
    game.effects.push({ id: `fx${nextId++}`, type: 'boss_execute', relayId: relay.relayId, targetId: target.id, ttl: 1.1 });
  }
  const source = { playerId: relay.owner, slotIndex };
  dealDamage(game, relay, source, target, damage);

  if (spec.splash) {
    for (const noise of game.noise) {
      if (noise.id !== target.id && Math.abs(noise.progress - target.progress) < spec.splash) dealDamage(game, relay, source, noise, damage * 0.34);
    }
  }
  if (spec.chain) {
    const chained = game.noise.filter((noise) => noise.id !== target.id).sort((a, b) => b.progress - a.progress).slice(0, spec.chain);
    for (const noise of chained) dealDamage(game, relay, source, noise, damage * 0.42);
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
  relay.cooldown = Math.max(0.16, spec.cycle * (relay.linkPulseUntil > game.now ? 0.8 : 1));
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
      game.effects.push({
        id: `fx${nextId++}`,
        type: 'death_burst',
        ...effectNoiseAnchor(noise),
        rewardCharge: noise.rewardCharge,
        rewardLink: noise.rewardLink,
        ttl: noise.type === 'boss' ? 1.25 : 0.78
      });
      if (noise.type === 'boss') {
        game.boss.active = false;
        game.boss.lastKillWave = game.wave.index + 1;
        game.resources.gems += 10;
        game.resources.swapCharges.p1 += 2;
        game.resources.swapCharges.p2 += 2;
        pushEvent(game, { type: 'boss_defeated', wave: game.wave.index + 1, bossId: noise.id, rewardCharge: noise.rewardCharge, rewardLink: noise.rewardLink });
      } else {
        pushEvent(game, { type: 'noise_defeated', noiseType: noise.type, rewardCharge: noise.rewardCharge, rewardLink: noise.rewardLink });
      }
      if (noise.type === 'splitter') {
        children.push(makeNoise(game, 'flicker', { progress: Math.max(0, noise.progress - 0.015), lane: noise.lane, rewardCharge: 0, rewardLink: 0, saturation: 1 }));
        children.push(makeNoise(game, 'flicker', { progress: Math.min(0.995, noise.progress + 0.015), lane: noise.lane, rewardCharge: 0, rewardLink: 0, saturation: 1 }));
      }
      continue;
    }
    if (noise.hp <= 0) continue;

    if (noise.spawnedAt === game.now) {
      survivors.push(noise);
      continue;
    }

    const speed = noise.speed * (game.now < noise.slowUntil ? 1 - noise.slow : 1);
    noise.progress += (speed * dt) / 250;
    if (noise.progress >= 1) {
      game.saturation.count += noise.saturation;
      game.signal.integrity = Math.max(0, game.signal.integrity - (noise.type === 'null' ? 8 : noise.saturation));
      game.effects.push({ id: `fx${nextId++}`, type: 'loop_complete', noiseType: noise.type, signalDamage: noise.type === 'null' ? 8 : noise.saturation, ttl: 0.9 });
      pushEvent(game, { type: 'loop_complete', noiseType: noise.type, saturation: noise.saturation, signalDamage: noise.type === 'null' ? 8 : noise.saturation });
      if (noise.type === 'boss') game.boss.active = false;
      continue;
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
  const botBoardId = boardIdForPlayer(game, bot.id);
  const playerBoardHasRelay = game.boards.p1.slots.some(Boolean);
  if (!playerBoardHasRelay && game.wave.index === 0) return;
  if (game.firstPlayerSupplyAt === null || game.now - game.firstPlayerSupplyAt < 20) return;
  if (bot.nextThink === undefined) bot.nextThink = game.now + 1.0;
  if (game.now < bot.nextThink) return;
  bot.nextThink = game.now + 1.9;
  const board = findBoard(game, botBoardId);
  const merge = findMerge(board);
  if (merge) {
    mergeRelays(game, { playerId: botBoardId, slotIds: merge });
    return;
  }
  const partnerDanger = game.boards.p1.slots.some((relay) => relay && relay.heat >= 82) || game.signal.integrity <= 38;
  if (partnerDanger && game.resources.linkEnergy >= GAME_RULES.linkPulseCost) {
    castLinkPulse(game, { playerId: botBoardId });
    return;
  }
  if (game.boss.active) {
    const strongestSlot = board.slots.findIndex((relay) => relay && relay.heat < 78);
    if (strongestSlot >= 0) {
      overclockRelay(game, { playerId: botBoardId, slot: strongestSlot });
      return;
    }
  }
  if (emptySlotIndex(board) >= 0 && game.resources.charge >= currentSupplyCostForPlayer(game, botBoardId) + 18) {
    supplyRelay(game, { playerId: botBoardId });
  }
}

function currentSupplyCost(game) {
  return currentSupplyCostForPlayer(game, 'p1');
}

function currentSupplyCostForPlayer(game, playerId) {
  const personalSupplies = game.stats.supplies[playerId] ?? 0;
  const uncapped = GAME_RULES.supplyBaseCost + Math.floor(personalSupplies / GAME_RULES.supplyCostInterval) * GAME_RULES.supplyCostStep;
  const baseSupplyCost = Math.min(uncapped, GAME_RULES.supplyCostCap);
  const bossSupplyMultiplier = game.boss.active ? GAME_RULES.bossSupplyMultiplier : 1;
  const discountPct = game.pendingSupplyDiscountPct ?? 0;
  const discountMultiplier = discountPct > 0 ? 0.75 : 1;
  return Math.max(1, Math.ceil(baseSupplyCost * bossSupplyMultiplier * discountMultiplier));
}

function availability(available, reason = '') {
  return available ? { available: true, reason: '' } : { available: false, reason };
}

function computeActionStateForPlayer(game, playerId) {
  const board = findBoard(game, playerId);
  const partnerBoard = findBoard(game, partnerId(playerId));
  const relayCount = board.slots.filter(Boolean).length;
  const partnerRelayCount = partnerBoard.slots.filter(Boolean).length;
  const supplyCost = currentSupplyCostForPlayer(game, playerId);
  const focusCost = GAME_RULES.supplyFocusCost + (game.stats.focusUps[playerId] ?? 0) * 25;
  const linkPulseCooldownRemaining = roundedSeconds((game.linkPulseCooldownUntil ?? 0) - game.now);
  const swapCharges = game.resources.swapCharges[playerId] ?? 0;
  const overclockActiveRemaining = roundedSeconds((board.overclockUntil ?? 0) - game.now);
  const mergeSlots = findMerge(board);

  let supply = availability(!game.over && prioritySlotIndex(board) >= 0 && game.resources.charge >= supplyCost);
  if (!supply.available) {
    supply = availability(false, game.over ? 'Run finished.' : prioritySlotIndex(board) < 0 ? 'Board full.' : `Need ${supplyCost} Charge.`);
  }

  let focus = availability(!game.over && game.resources.charge >= focusCost);
  if (!focus.available) focus = availability(false, game.over ? 'Run finished.' : `Need ${focusCost} Charge.`);

  let swap = availability(!game.over && swapCharges > 0 && relayCount >= 2);
  if (!swap.available) {
    swap = availability(false, game.over ? 'Run finished.' : swapCharges <= 0 ? 'No Swap Charge.' : 'Need two Relays.');
  }

  let linkPulse = availability(!game.over && game.resources.linkEnergy >= GAME_RULES.linkPulseCost && linkPulseCooldownRemaining <= 0 && partnerRelayCount > 0);
  if (!linkPulse.available) {
    linkPulse = availability(
      false,
      game.over
        ? 'Run finished.'
        : game.resources.linkEnergy < GAME_RULES.linkPulseCost
          ? `Need ${GAME_RULES.linkPulseCost} Link.`
          : linkPulseCooldownRemaining > 0
            ? `Ready in ${linkPulseCooldownRemaining}s.`
            : 'Partner has no Relay.'
    );
  }

  let overclock = availability(!game.over && relayCount > 0);
  if (!overclock.available) overclock = availability(false, game.over ? 'Run finished.' : 'No Relays.');

  return {
    supply: { ...supply, cost: supplyCost },
    merge: {
      available: !game.over && Boolean(mergeSlots),
      reason: game.over ? 'Run finished.' : relayCount < GAME_RULES.mergeCount ? 'Need three Relays.' : mergeSlots ? '' : 'No matching trio.',
      selectedRequired: GAME_RULES.mergeCount,
      slots: mergeSlots ?? []
    },
    swap: { ...swap, charges: swapCharges },
    focus: { ...focus, cost: focusCost },
    linkPulse: { ...linkPulse, cost: GAME_RULES.linkPulseCost, cooldownRemaining: linkPulseCooldownRemaining, partnerTargets: partnerRelayCount },
    overclock: { ...overclock, heat: GAME_RULES.overclockHeat, duration: GAME_RULES.overclockDuration, activeRemaining: overclockActiveRemaining }
  };
}

function computeActionState(game) {
  return {
    p1: computeActionStateForPlayer(game, 'p1'),
    p2: computeActionStateForPlayer(game, 'p2')
  };
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
      if (linkDisabled(board, index, neighbor, now)) continue;
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
      p1: { id: 'p1', name: 'Your Relay Board', anchorIndex: 5, slots: Array(GAME_RULES.boardSlots).fill(null), comboText: '', overclockUntil: 0, overclockResolvedUntil: 0, disabledLinks: [] },
      p2: { id: 'p2', name: 'Partner Relay Board', anchorIndex: 5, slots: Array(GAME_RULES.boardSlots).fill(null), comboText: '', overclockUntil: 0, overclockResolvedUntil: 0, disabledLinks: [] }
    },
    resources: { charge: 110, linkEnergy: 50, swapCharges: { p1: 1, p2: 1 }, gems: 30, xp: 0 },
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
    firstPlayerSupplyAt: null,
    pendingSupplyDiscountPct: 0,
    linkPulseCooldownUntil: 0,
    linkPulseSignalGainThisWave: 0,
    dualOverclockBossUntil: 0,
    unlocks: [],
    eventLog: [],
    result: null,
    over: false,
    won: false
  };
}

export function supplyRelay(game, { playerId }) {
  const board = findBoard(game, playerId);
  const slotIndex = prioritySlotIndex(board);
  const cost = currentSupplyCostForPlayer(game, playerId);
  if (slotIndex < 0) return { ok: false, reason: 'Board full. Merge or Swap Relays first.' };
  if (game.resources.charge < cost) return { ok: false, reason: 'Not enough Charge.' };
  const relaySpec = rollRelay(game, playerId);
  const relay = makeRelay(game, playerId, relaySpec.id);
  game.resources.charge -= cost;
  game.pendingSupplyDiscountPct = 0;
  if (playerId === 'p1' && game.firstPlayerSupplyAt === null) game.firstPlayerSupplyAt = game.now;
  game.stats.supplies[playerId] = (game.stats.supplies[playerId] ?? 0) + 1;
  game.rng.pity[playerId] = gradeRank(relaySpec.grade) >= gradeRank('Prime') ? 0 : game.rng.pity[playerId] + 1;
  board.slots[slotIndex] = relay;
  game.effects.push({ id: `fx${nextId++}`, type: 'supply', playerId, slot: slotIndex, relayId: relay.relayId, grade: relay.grade, ttl: 0.8 });
  pushEvent(game, { type: 'supply', playerId, slot: slotIndex, relayId: relay.relayId, relayName: RELAY_TYPES[relay.relayId].name, tier: relay.tier, grade: relay.grade, cost });
  return { ok: true, slot: slotIndex, relay };
}

export function mergeRelays(game, { playerId, slotIds }) {
  const board = findBoard(game, playerId);
  if (!Array.isArray(slotIds)) return { ok: false, reason: 'Select three matching Relays.' };
  if (slotIds.length !== GAME_RULES.mergeCount) return { ok: false, reason: 'Select three matching Relays.' };
  if (new Set(slotIds).size !== GAME_RULES.mergeCount) return { ok: false, reason: 'Select three different sockets.' };
  if (!slotIds.every((index) => validSlotIndex(board, index))) return { ok: false, reason: 'Invalid socket.' };
  const slots = slotIds.map((index) => board.slots[index]);
  if (slots.some((slot) => !slot)) return { ok: false, reason: 'Select three matching Relays.' };
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
  pushEvent(game, { type: 'merge', playerId, slot: slotIds[0], relayId: merged.relayId, relayName: RELAY_TYPES[merged.relayId].name, tier: merged.tier, consumedSlots: slotIds });
  return { ok: true, relay: merged };
}

export function swapRelays(game, { playerId, from, to }) {
  const board = findBoard(game, playerId);
  if (!validSlotIndex(board, from) || !validSlotIndex(board, to)) return { ok: false, reason: 'Invalid socket.' };
  if (from === to) return { ok: false, reason: 'Choose two different sockets.' };
  if (!board.slots[from] || !board.slots[to]) return { ok: false, reason: 'Swap requires two Relays.' };
  if ((game.resources.swapCharges[playerId] ?? 0) < 1) return { ok: false, reason: 'Not enough Swap Charge.' };
  game.resources.swapCharges[playerId] -= 1;
  const temp = board.slots[from];
  board.slots[from] = board.slots[to];
  board.slots[to] = temp;
  game.stats.swaps[playerId] = (game.stats.swaps[playerId] ?? 0) + 1;
  game.effects.push({ id: `fx${nextId++}`, type: 'swap', playerId, from, to, ttl: 0.7 });
  pushEvent(game, { type: 'swap', playerId, from, to, remainingCharges: game.resources.swapCharges[playerId] ?? 0 });
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
  pushEvent(game, { type: 'focus', playerId, cost, focusLevel: game.stats.focusUps[playerId] });
  return { ok: true, odds: clone(game.supplyOdds) };
}

function boardHasActiveTwinGateLink(board, now) {
  const links = computeActiveLinks(board, now);
  return board.slots.some((relay, index) => relay?.relayId === 'twin_gate' && activeLinkCountForSocket(links, index) > 0);
}

export function castLinkPulse(game, { playerId }) {
  if (game.resources.linkEnergy < GAME_RULES.linkPulseCost) return { ok: false, reason: 'Not enough Link Energy.' };
  if (game.linkPulseCooldownUntil > game.now) return { ok: false, reason: 'Link Pulse cooling down.' };
  const targetPlayerId = partnerId(playerId);
  const board = findBoard(game, targetPlayerId);
  const casterBoard = findBoard(game, playerId);
  const targets = board.slots.filter(Boolean).sort((a, b) => b.heat - a.heat);
  if (targets.length === 0) return { ok: false, reason: 'Partner has no Relay.' };
  const preSignalIntegrity = game.signal.integrity;
  const partnerHeatMax = targets[0]?.heat ?? 0;
  const partnerRelayShutdownSoon = targets.some((relay) => relay.heat >= 92 && relay.cooldown <= 1.5);
  const saveCandidates = targets.filter((relay) => relay.heat >= 90).map((relay) => relay.id);
  const twinGateBoost = boardHasActiveTwinGateLink(casterBoard, game.now);
  const heatDrop = twinGateBoost ? GAME_RULES.linkPulseTwinGateHeatDrop : GAME_RULES.linkPulseHeatDrop;
  const duration = twinGateBoost ? GAME_RULES.linkPulseTwinGateDuration : GAME_RULES.linkPulseDuration;
  const affectedTargets = targets.slice(0, 2);
  game.resources.linkEnergy -= GAME_RULES.linkPulseCost;
  game.linkPulseCooldownUntil = game.now + GAME_RULES.linkPulseCooldown;
  for (const target of affectedTargets) {
    target.heat = Math.max(0, target.heat - heatDrop);
    target.linkPulseUntil = game.now + duration;
  }
  game.stats.linkPulses[playerId] = (game.stats.linkPulses[playerId] ?? 0) + 1;
  game.effects.push({ id: `fx${nextId++}`, type: 'link_pulse', playerId, targetPlayerId, unitIds: affectedTargets.map((target) => target.id), ttl: 1.0 });
  const savedUnitIds = saveCandidates.filter((id) => targets.find((relay) => relay.id === id)?.heat < 90);
  const partnerDanger = partnerHeatMax >= 90 || partnerRelayShutdownSoon || preSignalIntegrity <= 35;
  const signalGain = game.boss.active || partnerDanger ? Math.max(0, Math.min(4, 8 - game.linkPulseSignalGainThisWave)) : 0;
  if (signalGain > 0) {
    game.signal.integrity = Math.min(GAME_RULES.signalMax, game.signal.integrity + signalGain);
    game.linkPulseSignalGainThisWave += signalGain;
  }
  const heatSave = partnerRelayShutdownSoon && saveCandidates.every((id) => targets.find((relay) => relay.id === id)?.heat < 90);
  const signalSave = signalGain > 0 && preSignalIntegrity <= 35;
  if (heatSave || signalSave) {
    game.pendingSupplyDiscountPct = 25;
    game.effects.push({
      id: `fx${nextId++}`,
      type: 'link_pulse_save',
      playerId,
      targetPlayerId,
      preSignalIntegrity,
      savedUnitIds,
      signalGain,
      pendingSupplyDiscountPct: 25,
      ttl: 1.25
    });
  }
  pushEvent(game, {
    type: heatSave || signalSave ? 'link_pulse_save' : 'link_pulse',
    playerId,
    targetPlayerId,
    targetCount: affectedTargets.length,
    signalGain,
    savedUnitIds,
    cooldown: GAME_RULES.linkPulseCooldown
  });
  return { ok: true, unitIds: affectedTargets.map((target) => target.id), signalGain };
}

export function overclockRelay(game, { playerId, slot }) {
  const board = findBoard(game, playerId);
  if (slot !== undefined && !validSlotIndex(board, slot)) return { ok: false, reason: 'Invalid socket.' };
  const relays = board.slots.filter(Boolean);
  if (relays.length === 0) return { ok: false, reason: 'No Relays to Overclock.' };
  board.overclockUntil = game.now + GAME_RULES.overclockDuration;
  board.overclockResolvedUntil = 0;
  for (const relay of relays) applyHeat(game, relay, GAME_RULES.overclockHeat);
  const otherBoard = findBoard(game, partnerId(playerId));
  if (otherBoard.overclockUntil > game.now) game.dualOverclockBossUntil = game.now + 4;
  game.stats.overclocks[playerId] = (game.stats.overclocks[playerId] ?? 0) + 1;
  game.effects.push({ id: `fx${nextId++}`, type: 'overclock', playerId, slot, unitIds: relays.map((relay) => relay.id), ttl: 0.8 });
  pushEvent(game, { type: 'overclock', playerId, affectedCount: relays.length, dualBossWindow: game.dualOverclockBossUntil > game.now });
  return { ok: true, boardId: playerId };
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

function bossDisruptionTypeForWave(waveNumber) {
  if (waveNumber >= 10) return 'boss_origin_spore';
  if (waveNumber >= 6) return 'boss_mirror_linkbreak';
  return 'boss_orchid_heatroot';
}

function relayPressureTargets(game) {
  const candidates = [];
  for (const [playerId, board] of Object.entries(game.boards)) {
    const links = computeActiveLinks(board, game.now);
    board.slots.forEach((relay, slot) => {
      if (!relay) return;
      candidates.push({
        playerId,
        board,
        relay,
        slot,
        heat: relay.heat,
        activeLinks: activeLinkCountForSocket(links, slot)
      });
    });
  }
  return candidates
    .sort((a, b) => b.activeLinks - a.activeLinks || b.heat - a.heat || a.playerId.localeCompare(b.playerId) || a.slot - b.slot)
    .slice(0, 2);
}

function applyOrchidHeatroot(game) {
  const targets = relayPressureTargets(game);
  for (const target of targets) applyHeat(game, target.relay, 12);
  const payloadTargets = targets.map((target) => ({
    playerId: target.playerId,
    slot: target.slot,
    unitId: target.relay.id,
    heatAfter: target.relay.heat,
    activeLinks: target.activeLinks
  }));
  game.effects.push({ id: `fx${nextId++}`, type: 'boss_orchid_heatroot', targets: payloadTargets, ttl: 1.2 });
  pushEvent(game, { type: 'boss_orchid_heatroot', wave: game.wave.index + 1, targets: payloadTargets, heatAdded: 12, noOp: targets.length === 0 });
}

function applyMirrorLinkbreak(game) {
  const disabled = [];
  for (const [playerId, board] of Object.entries(game.boards)) {
    const link = computeActiveLinks(board, game.now)[0] ?? null;
    if (!link) {
      disabled.push({ playerId, disabledPair: null, noOp: true });
      continue;
    }
    const entry = {
      key: linkKey(link.a, link.b),
      a: link.a,
      b: link.b,
      until: game.now + 5,
      source: 'boss_mirror_linkbreak'
    };
    board.disabledLinks = [...(board.disabledLinks ?? []).filter((item) => item.until > game.now), entry];
    disabled.push({ playerId, disabledPair: [link.a, link.b], until: roundedSeconds(entry.until), noOp: false });
  }
  game.effects.push({ id: `fx${nextId++}`, type: 'boss_mirror_linkbreak', disabledLinks: disabled, ttl: 1.2 });
  pushEvent(game, { type: 'boss_mirror_linkbreak', wave: game.wave.index + 1, disabledLinks: disabled });
}

function wrapProgress(progress) {
  if (progress < 0) return progress + 1;
  if (progress >= 1) return progress - 1;
  return progress;
}

function applyOriginSpore(game) {
  const boss = game.noise.find((noise) => noise.type === 'boss') ?? null;
  const sourceProgress = boss?.progress ?? 0.5;
  const lane = boss?.lane ?? 0;
  const spawnedSpores = [-0.06, 0.06].map((offset) => {
    const spore = makeNoise(game, 'null_spore', { progress: wrapProgress(sourceProgress + offset), lane, rewardCharge: 0, rewardLink: 0 });
    spore.spawnedAt = game.now;
    game.noise.push(spore);
    return { noiseId: spore.id, progress: Number(spore.progress.toFixed(3)), lane: spore.lane };
  });
  game.effects.push({ id: `fx${nextId++}`, type: 'boss_origin_spore', spawnedSpores, ttl: 1.2 });
  pushEvent(game, { type: 'boss_origin_spore', wave: game.wave.index + 1, bossId: boss?.id ?? null, spawnedSpores, sourceProgress: Number(sourceProgress.toFixed(3)) });
}

function resolveBossDisruption(game) {
  if (!game.boss.active || game.wave.disruptionFired || game.boss.timer >= game.boss.limit - 8) return;
  if (!game.noise.some((noise) => noise.type === 'boss' && noise.hp > 0)) return;
  game.wave.disruptionFired = true;
  const type = bossDisruptionTypeForWave(game.wave.index + 1);
  if (type === 'boss_orchid_heatroot') applyOrchidHeatroot(game);
  if (type === 'boss_mirror_linkbreak') applyMirrorLinkbreak(game);
  if (type === 'boss_origin_spore') applyOriginSpore(game);
}

function resolveOverclockExpiry(game) {
  for (const [playerId, board] of Object.entries(game.boards)) {
    if (board.overclockUntil <= 0 || board.overclockUntil > game.now) continue;
    if (board.overclockResolvedUntil >= board.overclockUntil) continue;
    for (const relay of board.slots) {
      if (!relay || relay.heat < 70) continue;
      relay.shutdownUntil = Math.max(relay.shutdownUntil, game.now + GAME_RULES.overclockStallDuration);
      relay.overclockStallResolvedAt = game.now;
      game.effects.push({ id: `fx${nextId++}`, type: 'overclock_stall', playerId, unitId: relay.id, ttl: GAME_RULES.overclockStallDuration + 3.5 });
    }
    board.overclockResolvedUntil = board.overclockUntil;
  }
}

function finishGame(game, { won, code, text }) {
  if (game.over) return;
  game.over = true;
  game.won = won;
  game.resultReason = text;
  game.result = {
    won,
    code,
    text,
    wave: Math.min(game.wave.index + 1, GAME_RULES.maxWave),
    time: roundedSeconds(game.now),
    stats: clone(game.stats)
  };
  pushEvent(game, { type: 'run_finished', won, code, text, wave: game.result.wave, time: game.result.time });
}

export function tickGame(game, dt) {
  if (game.over) return game;
  game.now += dt;
  for (const board of Object.values(game.boards)) {
    board.disabledLinks = (board.disabledLinks ?? []).filter((link) => link.until > game.now);
  }
  resolveOverclockExpiry(game);
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
    resolveBossDisruption(game);
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
      finishGame(game, { won: false, code: 'loss_boss_timer', text: 'Boss timer expired.' });
    }
  }

  if (!game.over && (game.saturation.count >= game.saturation.limit || game.signal.integrity <= 0)) {
    finishGame(game, {
      won: false,
      code: game.signal.integrity <= 0 ? 'loss_signal_collapse' : 'loss_saturation',
      text: game.signal.integrity <= 0 ? 'Signal collapsed.' : 'Saturation reached 100.'
    });
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
    pushEvent(game, { type: 'wave_cleared', wave: game.wave.index, chargeReward: 45 + game.wave.index * 8, linkReward: 12 });
    if (game.wave.index >= GAME_RULES.maxWave) {
      game.resources.gems += 120;
      finishGame(game, { won: true, code: 'win_signal_lock', text: 'Signal loop stabilized.' });
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
    actionState: computeActionState(game),
    eventLog: game.eventLog ?? [],
    result: game.result ?? null,
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
