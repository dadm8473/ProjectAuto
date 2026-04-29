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
import { GAME_RULES, NOISE_TYPES, RELAY_TYPES, SHOP, WAVE_PLAN } from '../src/shared/content.js';

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

test('a new run is a two-board Korean Signal Relay defense with earned-only rewards', () => {
  const game = createGame({ mode: 'bot', seed: 42 });

  assert.equal(game.title, '시그널 릴레이');
  assert.equal(game.boards.p1.slots.length, 12);
  assert.equal(game.boards.p2.slots.length, 12);
  assert.equal(game.resources.charge, 110);
  assert.equal(game.resources.linkEnergy, 50);
  assert.deepEqual(game.resources.swapCharges, { p1: 1, p2: 1 });
  assert.equal(game.signal.integrity, 100);
  assert.equal(game.saturation.limit, 100);
  assert.equal(SHOP.items.every((item) => item.realMoney === false), true);
});

test('run ids stay unique when a deterministic seed is reused', () => {
  const first = createGame({ mode: 'bot', seed: 42 });
  const second = createGame({ mode: 'bot', seed: 42 });

  assert.notEqual(first.id, second.id);
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

test('bot onboarding scripts the first supplies into an immediate merge lesson', () => {
  const game = createGame({ mode: 'bot', seed: 101 });
  const firstCue = serializeState(game).onboarding.cues.p1;

  assert.equal(firstCue.action, 'supply');
  assert.equal(firstCue.label, '강화');

  const supplies = [
    supplyRelay(game, { playerId: 'p1' }),
    supplyRelay(game, { playerId: 'p1' }),
    supplyRelay(game, { playerId: 'p1' })
  ];
  const relayIds = supplies.map((result) => result.relay.relayId);
  const merge = serializeState(game).actionState.p1.merge;
  const mergeCue = serializeState(game).onboarding.cues.p1;

  assert.deepEqual(relayIds, ['pulse_drum', 'pulse_drum', 'pulse_drum']);
  assert.equal(merge.available, true);
  assert.equal(mergeCue.action, 'merge');
  assert.equal(mergeCue.label, '합성!');
  assert.deepEqual(new Set(mergeCue.slots), new Set(merge.slots));
});

test('bot onboarding guides the first partner Pulse and expires after the opening window', () => {
  const game = createGame({ mode: 'bot', seed: 102 });
  game.resources.charge = 300;
  const supplies = [
    supplyRelay(game, { playerId: 'p1' }),
    supplyRelay(game, { playerId: 'p1' }),
    supplyRelay(game, { playerId: 'p1' })
  ];
  mergeRelays(game, { playerId: 'p1', slotIds: supplies.map((result) => result.slot) });
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 72 });

  const pulseCue = serializeState(game).onboarding.cues.p1;
  assert.equal(pulseCue.action, 'pulse');
  assert.equal(pulseCue.label, '파트너 구원');

  game.now = GAME_RULES.onboardingWindow + 0.1;
  assert.equal(serializeState(game).onboarding.cues.p1, null);
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

  const cappedBoss = createGame({ mode: 'bot', seed: 14 });
  cappedBoss.resources.charge = 1000;
  cappedBoss.stats.supplies.p1 = 50;
  cappedBoss.boss.active = true;
  const cappedBossBefore = cappedBoss.resources.charge;
  assert.equal(supplyRelay(cappedBoss, { playerId: 'p1' }).ok, true);
  assert.equal(cappedBossBefore - cappedBoss.resources.charge, 57);

  const cappedBossDiscounted = createGame({ mode: 'bot', seed: 15 });
  cappedBossDiscounted.resources.charge = 1000;
  cappedBossDiscounted.stats.supplies.p1 = 50;
  cappedBossDiscounted.boss.active = true;
  cappedBossDiscounted.pendingSupplyDiscountPct = 25;
  const cappedBossDiscountedBefore = cappedBossDiscounted.resources.charge;
  assert.equal(supplyRelay(cappedBossDiscounted, { playerId: 'p1' }).ok, true);
  assert.equal(cappedBossDiscountedBefore - cappedBossDiscounted.resources.charge, 43);
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
  const beforeCharge = game.resources.charge;
  const beforeLink = game.resources.linkEnergy;

  const result = mergeRelays(game, { playerId: 'p1', slotIds: [0, 1, 2] });

  assert.equal(result.ok, true);
  assert.equal(game.boards.p1.slots[0].tier, 2);
  assert.equal(game.boards.p1.slots[0].heat, 20);
  assert.equal(game.boards.p1.slots[1], null);
  assert.equal(game.boards.p1.slots[2], null);
  assert.equal(game.resources.charge, beforeCharge + GAME_RULES.mergeSurgeCharge);
  assert.equal(game.resources.linkEnergy, beforeLink + GAME_RULES.mergeSurgeLink);
  assert.equal(game.effects.some((effect) => effect.type === 'merge' && effect.rewardCharge === GAME_RULES.mergeSurgeCharge && effect.rewardLink === GAME_RULES.mergeSurgeLink), true);
});

test('boss Merge Surge arms board overdrive without a separate Overclock button', () => {
  const game = createGame({ mode: 'bot', seed: 303 });
  game.boss.active = true;
  installRelay(game, 'p1', 0, 'needle_beam', { heat: 12 });
  installRelay(game, 'p1', 1, 'needle_beam', { heat: 18 });
  installRelay(game, 'p1', 2, 'needle_beam', { heat: 9 });

  const result = mergeRelays(game, { playerId: 'p1', slotIds: [0, 1, 2] });

  assert.equal(result.ok, true);
  assert.equal(game.boards.p1.overclockUntil > game.now, true);
  assert.equal(game.boards.p1.slots[0].overclockUntil, game.boards.p1.overclockUntil);
  assert.equal(game.effects.some((effect) => effect.type === 'overclock' && effect.source === 'merge'), true);
});

test('boss Link Pulse creates the accessible partner-save overdrive window', () => {
  const game = createGame({ mode: 'bot', seed: 304 });
  game.boss.active = true;
  game.resources.linkEnergy = 100;
  installRelay(game, 'p1', 5, 'signal_amp');
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 96 });
  installRelay(game, 'p2', 0, 'needle_beam');
  installRelay(game, 'p2', 1, 'needle_beam');
  installRelay(game, 'p2', 2, 'needle_beam');

  const pulse = castLinkPulse(game, { playerId: 'p1' });
  const merge = mergeRelays(game, { playerId: 'p2', slotIds: [0, 1, 2] });

  assert.equal(pulse.ok, true);
  assert.equal(merge.ok, true);
  assert.equal(game.boards.p1.overclockUntil > game.now, true);
  assert.equal(game.boards.p2.overclockUntil > game.now, true);
  assert.equal(game.dualOverclockBossUntil > game.now, true);
  assert.equal(game.effects.some((effect) => effect.type === 'overclock' && effect.source === 'link_pulse'), true);
});

test('boss Link Pulse overdrive requires a real clutch target', () => {
  const game = createGame({ mode: 'bot', seed: 305 });
  game.boss.active = true;
  game.resources.linkEnergy = 100;
  installRelay(game, 'p1', 5, 'signal_amp');
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 20 });

  const pulse = castLinkPulse(game, { playerId: 'p1' });

  assert.equal(pulse.ok, true);
  assert.equal(pulse.overdrive, false);
  assert.equal(game.boards.p1.overclockUntil, 0);
  assert.equal(game.effects.some((effect) => effect.type === 'overclock' && effect.source === 'link_pulse'), false);
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
    if (elapsed > 0) {
      game.now += elapsed;
      for (const board of Object.values(game.boards)) {
        board.overclockUntil += elapsed;
      }
    }
    tickGame(game, 0.1);
    return game.effects.find((effect) => effect.type === 'hit')?.damage ?? 0;
  }

  assert.equal(runScenario({ dual: true, targetType: 'crawler', elapsed: 0 }), runScenario({ dual: false, targetType: 'crawler', elapsed: 0 }));
  assert.equal(runScenario({ dual: true, targetType: 'boss', elapsed: 3.89 }) > runScenario({ dual: false, targetType: 'boss', elapsed: 3.89 }) * 1.25, true);
  assert.equal(runScenario({ dual: true, targetType: 'boss', elapsed: 3.9 }), runScenario({ dual: false, targetType: 'boss', elapsed: 3.9 }));
});

test('combat hit effects carry source and target anchors for readable beams', () => {
  const game = createGame({ mode: 'bot', seed: 32 });
  installRelay(game, 'p1', 5, 'needle_beam', { cooldown: 0 });
  installNoise(game, { id: 'noise-anchor', type: 'flicker', hp: 100, maxHp: 100, progress: 0.37, lane: 1 });

  tickGame(game, 0);

  const hit = game.effects.find((effect) => effect.type === 'hit');
  assert.equal(hit.playerId, 'p1');
  assert.equal(hit.slot, 5);
  assert.equal(hit.targetId, 'noise-anchor');
  assert.equal(hit.targetType, 'flicker');
  assert.equal(hit.targetProgress, 0.37);
  assert.equal(hit.targetLane, 1);
  assert.equal(typeof hit.targetColor, 'string');
  assert.equal(hit.ttl > 0.5, true);
});

test('defeated Noise emits a persistent death burst after leaving the live roster', () => {
  const game = createGame({ mode: 'bot', seed: 34 });
  installRelay(game, 'p1', 5, 'needle_beam', { cooldown: 0 });
  installNoise(game, { id: 'noise-pop', type: 'flicker', hp: 1, maxHp: 1, progress: 0.42, lane: 0 });

  tickGame(game, 0);

  assert.equal(game.noise.some((noise) => noise.id === 'noise-pop'), false);
  const burst = game.effects.find((effect) => effect.type === 'death_burst');
  assert.equal(burst.targetId, 'noise-pop');
  assert.equal(burst.targetType, 'flicker');
  assert.equal(burst.targetProgress, 0.42);
  assert.equal(burst.targetLane, 0);
  assert.equal(burst.rewardCharge > 0, true);
});

test('serialized action state exposes exact costs, cooldowns, and availability', () => {
  const game = createGame({ mode: 'bot', seed: 86 });
  game.resources.charge = 22;
  game.resources.linkEnergy = 80;
  game.stats.supplies.p1 = 5;
  game.resources.swapCharges.p1 = 0;
  game.linkPulseCooldownUntil = game.now + 3.42;
  installRelay(game, 'p1', 0, 'needle_beam');
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 80 });

  const snapshot = serializeState(game);
  const actions = snapshot.actionState.p1;

  assert.equal(actions.supply.cost, 23);
  assert.equal(actions.supply.available, false);
  assert.equal(actions.supply.reason, '전력 23 필요.');
  assert.equal(actions.swap.charges, 0);
  assert.equal(actions.swap.available, false);
  assert.equal(actions.linkPulse.cost, 40);
  assert.equal(actions.linkPulse.cooldownRemaining, 3.42);
  assert.equal(actions.linkPulse.available, false);
  assert.equal(Object.hasOwn(actions, 'overclock'), false);

  game.linkPulseCooldownUntil = game.now;
  game.resources.linkEnergy = 39;
  assert.equal(serializeState(game).actionState.p1.linkPulse.reason, '협력 40 필요.');
});

test('serialized merge availability requires an actual matching trio', () => {
  const game = createGame({ mode: 'bot', seed: 89 });
  installRelay(game, 'p1', 0, 'needle_beam');
  installRelay(game, 'p1', 1, 'pulse_drum');
  installRelay(game, 'p1', 2, 'coolant_moss');

  const unavailable = serializeState(game).actionState.p1.merge;
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.reason, '같은 릴레이 3개 없음.');

  installRelay(game, 'p1', 3, 'needle_beam');
  installRelay(game, 'p1', 4, 'needle_beam');

  const available = serializeState(game).actionState.p1.merge;
  assert.equal(available.available, true);
  assert.deepEqual(available.slots, [0, 3, 4]);
});

test('serialized merge state previews a two-of-three merge setup', () => {
  const game = createGame({ mode: 'bot', seed: 90 });
  installRelay(game, 'p1', 0, 'needle_beam');
  installRelay(game, 'p1', 1, 'pulse_drum');
  installRelay(game, 'p1', 3, 'needle_beam');

  const merge = serializeState(game).actionState.p1.merge;

  assert.equal(merge.available, false);
  assert.equal(merge.progress, 2);
  assert.deepEqual(merge.previewSlots, [0, 3]);
  assert.equal(merge.relayId, 'needle_beam');
  assert.equal(merge.tier, 1);
});

test('terminal states emit a run result and event log entry with one readable cause', () => {
  const game = createGame({ mode: 'solo', seed: 87 });
  game.metaEarned.gems = 12;
  game.metaEarned.xp = 27;
  game.metaSpent.gems = 5;
  game.metaProfile.startingGems = 80;
  game.signal.integrity = 0;

  tickGame(game, 0);
  const snapshot = serializeState(game);

  assert.equal(snapshot.over, true);
  assert.equal(snapshot.result.code, 'loss_signal_collapse');
  assert.equal(snapshot.result.text, '신호가 붕괴했습니다.');
  assert.equal(snapshot.result.won, false);
  assert.deepEqual(snapshot.result.earned, { gems: 12, xp: 27 });
  assert.deepEqual(snapshot.result.spent, { gems: 5 });
  assert.equal(snapshot.result.startingProfileGems, 80);
  assert.equal(snapshot.eventLog.at(-1).type, 'run_finished');
  assert.equal(snapshot.eventLog.at(-1).code, 'loss_signal_collapse');
});

test('boss waves fire named disruption logs with actual board pressure', () => {
  const game = createGame({ mode: 'solo', seed: 90 });
  game.wave.index = 2;
  game.wave.active = true;
  game.wave.startedAt = 0;
  game.wave.queue = [];
  game.wave.disruptionFired = false;
  game.boss.active = true;
  game.boss.timer = GAME_RULES.bossTimer - 9;
  game.boss.limit = GAME_RULES.bossTimer;
  installRelay(game, 'p1', 5, 'twin_gate', { linkShape: ['E'], heat: 20 });
  installRelay(game, 'p1', 6, 'signal_amp', { linkShape: ['W'], heat: 30 });
  installRelay(game, 'p2', 5, 'coolant_moss', { linkShape: ['E'], heat: 40 });
  installRelay(game, 'p2', 6, 'rain_pump', { linkShape: ['W'], heat: 10 });
  installNoise(game, { type: 'boss', hp: 1000, maxHp: 1000, speed: 0, progress: 0.1 });

  tickGame(game, 0);

  const heatroot = game.eventLog.find((event) => event.type === 'boss_orchid_heatroot');
  assert.equal(Boolean(heatroot), true);
  assert.equal(game.effects.some((effect) => effect.type === 'boss_orchid_heatroot'), true);
  assert.deepEqual(heatroot.targets.map((target) => [target.playerId, target.slot, target.heatAfter]), [
    ['p2', 5, 52],
    ['p1', 6, 42]
  ]);
  assert.equal(game.boards.p2.slots[5].heat > 40, true);
  assert.equal(game.boards.p1.slots[6].heat > 30, true);
});

test('mirror boss disruption temporarily disables one active link per board', () => {
  const game = createGame({ mode: 'solo', seed: 92 });
  game.wave.index = 5;
  game.wave.active = true;
  game.wave.queue = [];
  game.wave.disruptionFired = false;
  game.boss.active = true;
  game.boss.timer = GAME_RULES.bossTimer - 9;
  game.boss.limit = GAME_RULES.bossTimer;
  installRelay(game, 'p1', 5, 'twin_gate', { linkShape: ['E'] });
  installRelay(game, 'p1', 6, 'signal_amp', { linkShape: ['W'] });
  installRelay(game, 'p2', 5, 'coolant_moss', { linkShape: ['E'] });
  installRelay(game, 'p2', 6, 'rain_pump', { linkShape: ['W'] });
  installNoise(game, { type: 'boss', hp: 1000, maxHp: 1000, speed: 0, progress: 0.1 });

  assert.equal(computeActiveLinks(game.boards.p1, game.now).length, 1);
  assert.equal(computeActiveLinks(game.boards.p2, game.now).length, 1);

  tickGame(game, 0.1);

  assert.equal(game.eventLog.some((event) => event.type === 'boss_mirror_linkbreak'), true);
  assert.equal(computeActiveLinks(game.boards.p1, game.now).length, 0);
  assert.equal(computeActiveLinks(game.boards.p2, game.now).length, 0);

  tickGame(game, 5.1);

  assert.equal(computeActiveLinks(game.boards.p1, game.now).length, 1);
  assert.equal(computeActiveLinks(game.boards.p2, game.now).length, 1);
});

test('origin boss disruption spawns two Null spores around the boss position', () => {
  const game = createGame({ mode: 'solo', seed: 93 });
  game.wave.index = 9;
  game.wave.active = true;
  game.wave.queue = [];
  game.wave.disruptionFired = false;
  game.boss.active = true;
  game.boss.timer = GAME_RULES.bossTimer - 9;
  game.boss.limit = GAME_RULES.bossTimer;
  installNoise(game, { id: 'boss-origin', type: 'boss', hp: 1000, maxHp: 1000, speed: 0, progress: 0.5, lane: 1 });

  tickGame(game, 0.1);

  const spores = game.noise.filter((noise) => noise.type === 'null_spore');
  assert.equal(game.eventLog.some((event) => event.type === 'boss_origin_spore'), true);
  assert.equal(spores.length, 2);
  assert.deepEqual(spores.map((noise) => Number(noise.progress.toFixed(2))), [0.44, 0.56]);
  assert.deepEqual(spores.map((noise) => noise.lane), [1, 1]);
});

test('origin boss disruption waits until a live boss is on the loop', () => {
  const game = createGame({ mode: 'solo', seed: 94 });
  game.wave.index = 9;
  game.wave.active = true;
  game.wave.queue = ['bulwark', 'null', 'boss'];
  game.wave.disruptionFired = false;
  game.boss.active = true;
  game.boss.timer = GAME_RULES.bossTimer - 9;
  game.boss.limit = GAME_RULES.bossTimer;

  tickGame(game, 0.1);

  assert.equal(game.eventLog.some((event) => event.type === 'boss_origin_spore'), false);
  assert.equal(game.noise.some((noise) => noise.type === 'null_spore'), false);
  assert.equal(game.wave.disruptionFired, false);
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

test('bot partner acts on the partner board when player ids are socket ids', () => {
  const game = createGame({ mode: 'online', seed: 45 });
  game.players = [
    { id: 'socket-human', name: 'Player', bot: false, ready: true },
    { id: 'socket-bot', name: 'AUTO PARTNER', bot: true, ready: true }
  ];
  installRelay(game, 'p1', 0, 'needle_beam');
  game.firstPlayerSupplyAt = 0;
  game.now = 25;
  game.resources.charge = 220;

  for (let i = 0; i < 10; i += 1) tickGame(game, 0.25);

  assert.equal(game.boards.p1.slots.filter(Boolean).length, 1);
  assert.ok(game.boards.p2.slots.filter(Boolean).length >= 1);
  assert.equal(Number.isFinite(game.rng.pity.p2), true);
  assert.equal(Object.hasOwn(game.rng.pity, 'socket-bot'), false);
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

test('wave plan exposes named difficulty beats and canonical rewards', () => {
  assert.equal(WAVE_PLAN.length, GAME_RULES.maxWave);
  assert.deepEqual(WAVE_PLAN.map((wave) => wave.clearReward.charge), [35, 45, 65, 55, 65, 85, 75, 85, 95, 0]);
  assert.deepEqual(WAVE_PLAN.filter((wave) => wave.bossTimer).map((wave) => wave.bossTimer), [36, 42, 55]);
  assert.equal(WAVE_PLAN.every((wave) => wave.name && wave.intent && wave.spawns), true);
  assert.equal(WAVE_PLAN.some((wave) => /overclock/i.test(wave.intent)), false);
});

test('late wave plan favors readable heavy threats over mobile screen floods', () => {
  const lateWaves = WAVE_PLAN.slice(6);
  const spawnTotals = lateWaves.map((wave) => Object.values(wave.spawns).reduce((sum, count) => sum + count, 0));
  const largestSingleStacks = lateWaves.map((wave) => Math.max(...Object.values(wave.spawns)));

  assert.deepEqual(spawnTotals, [36, 34, 46, 27]);
  assert.equal(Math.max(...largestSingleStacks) <= 28, true);
  assert.deepEqual(lateWaves.map((wave) => wave.threatScale), [1.2, 1.55, 1.65, 1.45]);
  assert.equal(WAVE_PLAN[8].intent.includes('합성'), true);
  assert.equal(WAVE_PLAN[9].intent.includes('구원'), true);
});

test('late wave threat scale makes fewer enemies matter', () => {
  const game = createGame({ mode: 'solo', seed: 141 });
  game.wave.index = 6;
  game.wave.active = false;
  game.wave.restTimer = 0;

  tickGame(game, 0);

  const firstNoise = game.noise[0];
  assert.equal(firstNoise.type, 'flicker');
  assert.equal(firstNoise.maxHp, Math.round(NOISE_TYPES.flicker.hp * (1 + 6 * 0.18) * WAVE_PLAN[6].threatScale));
});

test('wave clear pays the authored reward and cools board heat', () => {
  const game = createGame({ mode: 'solo', seed: 101 });
  game.wave.active = true;
  game.wave.index = 0;
  game.wave.queue = [];
  game.wave.clearReward = WAVE_PLAN[0].clearReward;
  game.wave.name = WAVE_PLAN[0].name;
  game.noise = [];
  game.resources.charge = 0;
  game.resources.linkEnergy = 0;
  installRelay(game, 'p1', 5, 'needle_beam', { heat: 50 });
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 15 });

  tickGame(game, 0);

  assert.equal(game.wave.index, 1);
  assert.equal(game.resources.charge, 35);
  assert.equal(game.resources.linkEnergy, 10);
  assert.equal(game.boards.p1.slots[5].heat, 30);
  assert.equal(game.boards.p2.slots[5].heat, 0);
  assert.equal(game.wave.name, WAVE_PLAN[1].name);
  const clear = game.eventLog.find((event) => event.type === 'wave_cleared');
  assert.equal(clear.waveName, WAVE_PLAN[0].name);
  assert.equal(clear.chargeReward, 35);
});

test('boss wave starts with authored timer and readable wave intent', () => {
  const game = createGame({ mode: 'solo', seed: 102 });
  game.wave.index = 2;
  game.wave.active = false;
  game.wave.restTimer = 0;

  tickGame(game, 0);

  assert.equal(game.boss.active, true);
  assert.equal(game.boss.timer, WAVE_PLAN[2].bossTimer);
  assert.equal(game.wave.name, WAVE_PLAN[2].name);
  assert.equal(game.eventLog.at(-1).intent, WAVE_PLAN[2].intent);
});

test('Mirror Port supports partner damage through a matching linked tag', () => {
  function p1NeedleDamage(withSupport) {
    const game = createGame({ mode: 'solo', seed: 103 });
    installRelay(game, 'p1', 5, 'needle_beam', { cooldown: 0 });
    if (withSupport) {
      installRelay(game, 'p2', 5, 'mirror_port', { cooldown: 99, linkShape: ['E'] });
      installRelay(game, 'p2', 6, 'needle_beam', { cooldown: 99, linkShape: ['W'] });
    }
    installNoise(game, { id: 'mirror-target', type: 'crawler', hp: 1000, maxHp: 1000, speed: 0, progress: 0.42, rewardCharge: 0, rewardLink: 0 });
    tickGame(game, 0.1);
    return game.effects.find((effect) => effect.type === 'hit' && effect.playerId === 'p1')?.damage ?? 0;
  }

  const baseDamage = p1NeedleDamage(false);
  const supportedDamage = p1NeedleDamage(true);

  assert.equal(baseDamage > 0, true);
  assert.equal(supportedDamage > baseDamage * 1.07, true);
});

test('Bloom Amp increases linked Signal repair output without becoming a damage unit', () => {
  function repairedSignal(withAmp) {
    const game = createGame({ mode: 'solo', seed: 104 });
    game.signal.integrity = 50;
    installRelay(game, 'p1', 5, 'root_clinic', { cooldown: 0, linkShape: ['E'] });
    if (withAmp) {
      installRelay(game, 'p1', 6, 'bloom_amp', { cooldown: 0, linkShape: ['W'] });
      installNoise(game, { id: 'bloom-decoy', type: 'crawler', hp: 1000, maxHp: 1000, speed: 0, progress: 0.42, rewardCharge: 0, rewardLink: 0 });
    }
    tickGame(game, 0.1);
    assert.equal(game.effects.some((effect) => effect.type === 'hit' && effect.relayId === 'bloom_amp'), false);
    return game.signal.integrity;
  }

  const baseRepair = repairedSignal(false);
  const ampedRepair = repairedSignal(true);

  assert.equal(baseRepair > 50, true);
  assert.equal(ampedRepair > baseRepair + 0.5, true);
});

test('shop purchases use earned gems and unlock cosmetic-only rewards', () => {
  const game = createGame({ mode: 'bot', seed: 31 });
  game.resources.gems = 150;

  const purchase = tryBuyShopItem(game, { itemId: 'mythic-aura' });

  assert.equal(purchase.ok, true);
  assert.equal(game.resources.gems, 60);
  assert.deepEqual(game.unlocks, ['mythic-aura']);

  const duplicate = tryBuyShopItem(game, { itemId: 'mythic-aura' });

  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, '이미 해금됨.');
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
