import test from 'node:test';
import assert from 'node:assert/strict';

import {
  castLinkPulse,
  createGame,
  computeActiveLinks,
  mergeRelays,
  overclockRelay,
  serializeState,
  supplyRelay,
  swapRelays,
  tickGame,
  tryBuyShopItem,
  upgradeSupplyFocus
} from '../src/shared/game.js';
import { RELAY_TYPES, SHOP } from '../src/shared/content.js';

function installRelay(game, playerId, slot, relayId, overrides = {}) {
  game.boards[playerId].slots[slot] = {
    id: `${playerId}-${slot}-${relayId}`,
    relayId,
    tier: overrides.tier ?? 1,
    grade: overrides.grade ?? RELAY_TYPES[relayId].grade,
    heat: overrides.heat ?? 0,
    cooldown: overrides.cooldown ?? 0,
    owner: playerId,
    linkShape: overrides.linkShape ?? RELAY_TYPES[relayId].linkShape,
    overclockUntil: 0,
    linkPulseUntil: 0,
    shutdownUntil: overrides.shutdownUntil ?? 0
  };
  return game.boards[playerId].slots[slot];
}

function installNoise(game, overrides = {}) {
  const noise = {
    id: overrides.id ?? `test-noise-${game.noise.length}`,
    type: overrides.type ?? 'flicker',
    hp: overrides.hp ?? 10,
    maxHp: overrides.maxHp ?? 10,
    progress: overrides.progress ?? 0,
    lane: overrides.lane ?? 0,
    speed: overrides.speed ?? 40,
    rewardCharge: overrides.rewardCharge ?? 4,
    rewardLink: overrides.rewardLink ?? 1,
    saturation: overrides.saturation ?? 1,
    radius: overrides.radius ?? 7,
    color: overrides.color ?? '#ff6b6b',
    slowUntil: 0,
    slow: 0,
    saturationMarks: 0,
    deathResolved: false
  };
  game.noise.push(noise);
  return noise;
}

test('a new run is a two-board Signal Relay defense with earned-only BM scaffolding', () => {
  const game = createGame({ mode: 'bot', seed: 42 });

  assert.equal(game.title, 'Signal Relay');
  assert.equal(game.boards.p1.slots.length, 12);
  assert.equal(game.boards.p2.slots.length, 12);
  assert.equal(game.resources.charge, 110);
  assert.equal(game.resources.linkEnergy, 50);
  assert.deepEqual(game.resources.swapCharges, { p1: 1, p2: 1 });
  assert.equal(game.signal.integrity, 100);
  assert.equal(game.saturation.limit, 100);
  assert.equal(SHOP.items.every((item) => item.realMoney === false), true);
});

test('Supply spends Charge, uses socket priority, and advances pity', () => {
  const game = createGame({ mode: 'bot', seed: 9 });
  const before = game.resources.charge;

  const result = supplyRelay(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.equal(game.resources.charge, before - 20);
  assert.equal(game.boards.p1.slots.filter(Boolean).length, 1);
  assert.equal(game.boards.p1.slots[5], result.relay);
  assert.equal(game.stats.supplies.p1, 1);
  assert.ok(game.rng.pity.p1 >= 1 || result.relay.grade !== 'Basic');
});

test('Supply cost scales by personal supply count, not team total', () => {
  const game = createGame({ mode: 'bot', seed: 10 });
  game.resources.charge = 1000;

  for (let i = 0; i < 6; i += 1) {
    assert.equal(supplyRelay(game, { playerId: 'p2' }).ok, true);
  }
  const before = game.resources.charge;
  assert.equal(supplyRelay(game, { playerId: 'p1' }).ok, true);

  assert.equal(before - game.resources.charge, 20);
});

test('Supply cost uses canonical cap, boss multiplier, discount, and ceil', () => {
  const normal = createGame({ mode: 'bot', seed: 11 });
  normal.resources.charge = 1000;
  normal.stats.supplies.p1 = 5;
  const normalBefore = normal.resources.charge;
  assert.equal(supplyRelay(normal, { playerId: 'p1' }).ok, true);
  assert.equal(normalBefore - normal.resources.charge, 23);

  const bossDiscounted = createGame({ mode: 'bot', seed: 12 });
  bossDiscounted.resources.charge = 1000;
  bossDiscounted.stats.supplies.p1 = 5;
  bossDiscounted.boss.active = true;
  bossDiscounted.pendingSupplyDiscountPct = 25;
  const bossBefore = bossDiscounted.resources.charge;
  assert.equal(supplyRelay(bossDiscounted, { playerId: 'p1' }).ok, true);
  assert.equal(bossBefore - bossDiscounted.resources.charge, 21);

  const capped = createGame({ mode: 'bot', seed: 13 });
  capped.resources.charge = 1000;
  capped.stats.supplies.p1 = 50;
  const cappedBefore = capped.resources.charge;
  assert.equal(supplyRelay(capped, { playerId: 'p1' }).ok, true);
  assert.equal(cappedBefore - capped.resources.charge, 47);
});

test('Supply Focus shifts the table toward higher grades without paid power', () => {
  const game = createGame({ mode: 'bot', seed: 17 });
  game.resources.charge = 300;
  const beforePrime = game.supplyOdds.Prime;

  const result = upgradeSupplyFocus(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.ok(game.supplyOdds.Prime > beforePrime);
  assert.equal(game.stats.focusUps.p1, 1);
});

test('active links require reciprocal link shapes and ignore offline relays', () => {
  const game = createGame({ mode: 'bot', seed: 3 });
  installRelay(game, 'p1', 4, 'needle_beam', { linkShape: ['E'] });
  installRelay(game, 'p1', 5, 'signal_amp', { linkShape: ['W', 'E'] });
  installRelay(game, 'p1', 6, 'sink_stone', { linkShape: ['W'], shutdownUntil: 5 });

  assert.equal(computeActiveLinks(game.boards.p1, 0).length, 1);
  assert.equal(computeActiveLinks(game.boards.p1, 6).length, 2);
});

test('three matching relays merge into a hotter higher-tier relay and clear sockets', () => {
  const game = createGame({ mode: 'bot', seed: 3 });
  installRelay(game, 'p1', 0, 'needle_beam', { heat: 60 });
  installRelay(game, 'p1', 1, 'needle_beam', { heat: 30 });
  installRelay(game, 'p1', 2, 'needle_beam', { heat: 45 });

  const result = mergeRelays(game, { playerId: 'p1', slotIds: [0, 1, 2] });

  assert.equal(result.ok, true);
  assert.equal(game.boards.p1.slots[0].tier, 2);
  assert.equal(game.boards.p1.slots[0].heat, 20);
  assert.equal(game.boards.p1.slots[1], null);
  assert.equal(game.boards.p1.slots[2], null);
  assert.equal(game.effects.some((effect) => effect.type === 'merge'), true);
});

test('Merge and Swap reject malformed slot payloads without corrupting the board', () => {
  const game = createGame({ mode: 'bot', seed: 33 });
  installRelay(game, 'p1', 0, 'needle_beam');
  installRelay(game, 'p1', 1, 'needle_beam');
  installRelay(game, 'p1', 2, 'needle_beam');
  const before = JSON.stringify(game.boards.p1.slots);

  const duplicateMerge = mergeRelays(game, { playerId: 'p1', slotIds: [0, 0, 0] });
  const invalidSwap = swapRelays(game, { playerId: 'p1', from: 0, to: 99 });

  assert.equal(duplicateMerge.ok, false);
  assert.equal(invalidSwap.ok, false);
  assert.equal(game.boards.p1.slots.length, 12);
  assert.equal(JSON.stringify(game.boards.p1.slots), before);
});

test('Swap changes board geometry and Link Pulse only emits save copy on a real save event', () => {
  const game = createGame({ mode: 'bot', seed: 12 });
  game.resources.linkEnergy = 80;
  installRelay(game, 'p1', 0, 'needle_beam', { linkShape: ['E'] });
  installRelay(game, 'p1', 1, 'signal_amp', { linkShape: ['W'] });
  installRelay(game, 'p1', 4, 'sink_stone');
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 96 });
  installRelay(game, 'p2', 6, 'rain_pump', { heat: 91 });

  const beforeLinks = computeActiveLinks(game.boards.p1, game.now).length;
  const swap = swapRelays(game, { playerId: 'p1', from: 0, to: 4 });
  const pulse = castLinkPulse(game, { playerId: 'p1' });

  assert.equal(swap.ok, true);
  assert.equal(game.resources.swapCharges.p1, 0);
  assert.equal(beforeLinks, 1);
  assert.equal(computeActiveLinks(game.boards.p1, game.now).length, 0);
  assert.equal(pulse.ok, true);
  assert.equal(game.resources.linkEnergy, 40);
  assert.equal(game.boards.p2.slots[5].heat < 90, true);
  assert.equal(game.boards.p2.slots[6].heat < 90, true);
  assert.equal(game.effects.some((effect) => effect.type === 'link_pulse'), true);
  assert.equal(game.effects.some((effect) => effect.type === 'link_pulse_save'), true);
});

test('Link Pulse enforces team cooldown and Twin Gate improves heat drop and duration', () => {
  const game = createGame({ mode: 'bot', seed: 91 });
  game.resources.linkEnergy = 100;
  installRelay(game, 'p1', 5, 'twin_gate', { linkShape: ['E'] });
  installRelay(game, 'p1', 6, 'signal_amp', { linkShape: ['W'] });
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 98 });
  installRelay(game, 'p2', 6, 'rain_pump', { heat: 92 });

  const firstPulse = castLinkPulse(game, { playerId: 'p1' });
  const secondPulse = castLinkPulse(game, { playerId: 'p2' });

  assert.equal(firstPulse.ok, true);
  assert.equal(game.boards.p2.slots[5].heat, 45);
  assert.equal(game.boards.p2.slots[6].heat, 39);
  assert.equal(game.boards.p2.slots[5].linkPulseUntil - game.now, 9);
  assert.equal(secondPulse.ok, false);
  assert.equal(game.resources.linkEnergy, 60);
});

test('Overclock buffs the whole board, adds heat to every Relay, and stalls hot Relays on expiry', () => {
  const game = createGame({ mode: 'bot', seed: 19 });
  game.boss.active = true;
  const first = installRelay(game, 'p1', 0, 'prism_lance', { heat: 80 });
  const second = installRelay(game, 'p1', 1, 'signal_amp', { heat: 75 });

  const result = overclockRelay(game, { playerId: 'p1', slot: 0 });

  assert.equal(result.ok, true);
  assert.equal(first.heat, 100);
  assert.equal(second.heat, 95);
  assert.equal(game.boards.p1.overclockUntil > game.now, true);

  tickGame(game, 5.1);

  assert.equal(first.shutdownUntil > game.now, true);
  assert.equal(second.shutdownUntil > game.now, true);
  assert.equal(game.effects.some((effect) => effect.type === 'overclock_stall'), true);
});

test('Dual Overclock applies a boss-only damage multiplier while both boards are active', () => {
  function runScenario(dual) {
    const game = createGame({ mode: 'solo', seed: 77 });
    game.boss.active = true;
    installRelay(game, 'p1', 5, 'prism_lance', { heat: 0 });
    installRelay(game, 'p2', 5, 'coolant_moss', { heat: 0 });
    installNoise(game, { type: 'boss', hp: 1000, maxHp: 1000, speed: 0, progress: 0.2, rewardCharge: 0, rewardLink: 0 });
    overclockRelay(game, { playerId: 'p1', slot: 5 });
    if (dual) overclockRelay(game, { playerId: 'p2', slot: 5 });
    tickGame(game, 0.1);
    return game.effects.find((effect) => effect.type === 'hit')?.damage ?? 0;
  }

  const soloOverclockDamage = runScenario(false);
  const dualOverclockDamage = runScenario(true);

  assert.equal(dualOverclockDamage > soloOverclockDamage * 1.25, true);
  assert.equal(dualOverclockDamage < soloOverclockDamage * 1.35, true);
});

test('Dual Overclock does not buff non-boss damage and expires after 4 seconds', () => {
  function runScenario({ dual, targetType, elapsed }) {
    const game = createGame({ mode: 'solo', seed: 78 });
    game.boss.active = targetType === 'boss';
    installRelay(game, 'p1', 5, 'needle_beam', { heat: 0 });
    installRelay(game, 'p2', 5, 'coolant_moss', { heat: 0 });
    installNoise(game, { type: targetType, hp: 1000, maxHp: 1000, speed: 0, progress: 0.2, rewardCharge: 0, rewardLink: 0 });
    overclockRelay(game, { playerId: 'p1', slot: 5 });
    if (dual) overclockRelay(game, { playerId: 'p2', slot: 5 });
    if (elapsed > 0) game.now += elapsed;
    tickGame(game, 0.1);
    return game.effects.find((effect) => effect.type === 'hit')?.damage ?? 0;
  }

  assert.equal(runScenario({ dual: true, targetType: 'crawler', elapsed: 0 }), runScenario({ dual: false, targetType: 'crawler', elapsed: 0 }));
  assert.equal(runScenario({ dual: true, targetType: 'boss', elapsed: 4.2 }), runScenario({ dual: false, targetType: 'boss', elapsed: 4.2 }));
});


test('bot partner waits for the player to start before spending shared Charge', () => {
  const game = createGame({ mode: 'bot', seed: 44 });

  for (let i = 0; i < 30; i += 1) tickGame(game, 0.1);

  assert.equal(game.boards.p1.slots.filter(Boolean).length, 0);
  assert.equal(game.boards.p2.slots.filter(Boolean).length, 0);
  assert.equal(game.resources.charge, 110);

  supplyRelay(game, { playerId: 'p1' });
  for (let i = 0; i < 190; i += 1) tickGame(game, 0.1);

  assert.equal(game.boards.p2.slots.filter(Boolean).length, 0);

  for (let i = 0; i < 30; i += 1) tickGame(game, 0.1);

  assert.ok(game.boards.p2.slots.filter(Boolean).length >= 1);
});

test('Noise that completes the loop is removed with no reward', () => {
  const game = createGame({ mode: 'solo', seed: 88 });
  game.wave.active = true;
  game.wave.queue = ['crawler'];
  game.wave.spawnTimer = 99;
  game.resources.charge = 100;
  installNoise(game, { progress: 0.995, speed: 100, rewardCharge: 50, rewardLink: 20, saturation: 6 });

  tickGame(game, 0.1);

  assert.equal(game.noise.length, 0);
  assert.equal(game.resources.charge, 100);
  assert.equal(game.resources.linkEnergy, 50);
  assert.equal(game.saturation.count > 5.9, true);
  assert.equal(game.signal.integrity, 94);
});

test('combat rewards kills, starts boss timers, and loses on Signal collapse', () => {
  const game = createGame({ mode: 'solo', seed: 5 });
  installRelay(game, 'p1', 5, 'storm_heart', { tier: 3, grade: 'Core' });
  installRelay(game, 'p2', 5, 'origin_seed', { tier: 2, grade: 'Origin' });

  for (let i = 0; i < 520; i += 1) tickGame(game, 0.1);

  assert.ok(game.wave.index >= 1);
  assert.ok(game.stats.kills > 0);
  assert.ok(game.boss.timer <= game.boss.limit);

  game.signal.integrity = 0;
  tickGame(game, 0.1);
  assert.equal(game.over, true);
  assert.equal(game.won, false);
});

test('shop purchases use earned gems and unlock cosmetic-only rewards', () => {
  const game = createGame({ mode: 'bot', seed: 31 });
  game.resources.gems = 150;

  const purchase = tryBuyShopItem(game, { itemId: 'mythic-aura' });

  assert.equal(purchase.ok, true);
  assert.equal(game.resources.gems, 60);
  assert.deepEqual(game.unlocks, ['mythic-aura']);
});

test('serialized state omits private rng data and exposes player-readable Relay state', () => {
  const game = createGame({ mode: 'bot', seed: 29 });
  supplyRelay(game, { playerId: 'p1' });
  tickGame(game, 0.25);

  const snapshot = serializeState(game);

  assert.equal(snapshot.privateSeed, undefined);
  assert.equal(snapshot.rng, undefined);
  assert.equal(snapshot.boards.p1.slots.length, 12);
  assert.equal(typeof snapshot.now, 'number');
  assert.equal(snapshot.resources.charge >= 0, true);
  assert.equal(snapshot.signal.integrity <= 100, true);
});
