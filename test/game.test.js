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

test('a new run is a two-board Signal Relay defense with earned-only BM scaffolding', () => {
  const game = createGame({ mode: 'bot', seed: 42 });

  assert.equal(game.title, 'Signal Relay');
  assert.equal(game.boards.p1.slots.length, 12);
  assert.equal(game.boards.p2.slots.length, 12);
  assert.equal(game.resources.charge, 110);
  assert.equal(game.resources.linkEnergy, 36);
  assert.equal(game.signal.integrity, 100);
  assert.equal(game.saturation.limit, 100);
  assert.equal(SHOP.items.every((item) => item.realMoney === false), true);
});

test('Supply spends Charge, fills the first empty socket, and advances pity', () => {
  const game = createGame({ mode: 'bot', seed: 9 });
  const before = game.resources.charge;

  const result = supplyRelay(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.equal(game.resources.charge, before - 20);
  assert.equal(game.boards.p1.slots.filter(Boolean).length, 1);
  assert.equal(game.stats.supplies.p1, 1);
  assert.ok(game.rng.pity.p1 >= 1 || result.relay.grade !== 'Basic');
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

test('Swap changes board geometry and Link Pulse only emits save copy on a real save event', () => {
  const game = createGame({ mode: 'bot', seed: 12 });
  game.resources.linkEnergy = 80;
  installRelay(game, 'p1', 0, 'needle_beam', { linkShape: ['E'] });
  installRelay(game, 'p1', 1, 'signal_amp', { linkShape: ['W'] });
  installRelay(game, 'p2', 5, 'coolant_moss', { heat: 96 });

  const beforeLinks = computeActiveLinks(game.boards.p1, game.now).length;
  const swap = swapRelays(game, { playerId: 'p1', from: 0, to: 4 });
  const pulse = castLinkPulse(game, { playerId: 'p1' });

  assert.equal(swap.ok, true);
  assert.equal(beforeLinks, 1);
  assert.equal(computeActiveLinks(game.boards.p1, game.now).length, 0);
  assert.equal(pulse.ok, true);
  assert.equal(game.boards.p2.slots[5].heat < 90, true);
  assert.equal(game.effects.some((effect) => effect.type === 'link_pulse'), true);
  assert.equal(game.effects.some((effect) => effect.type === 'link_pulse_save'), true);
});

test('Overclock creates boss burst power and heat shutdown risk', () => {
  const game = createGame({ mode: 'bot', seed: 19 });
  game.boss.active = true;
  const relay = installRelay(game, 'p1', 0, 'prism_lance', { heat: 82 });

  const result = overclockRelay(game, { playerId: 'p1', slot: 0 });

  assert.equal(result.ok, true);
  assert.equal(relay.heat >= 100, true);
  assert.equal(relay.shutdownUntil > game.now, true);
  assert.equal(game.effects.some((effect) => effect.type === 'shutdown'), true);
});

test('bot partner waits for the player to start before spending shared Charge', () => {
  const game = createGame({ mode: 'bot', seed: 44 });

  for (let i = 0; i < 30; i += 1) tickGame(game, 0.1);

  assert.equal(game.boards.p1.slots.filter(Boolean).length, 0);
  assert.equal(game.boards.p2.slots.filter(Boolean).length, 0);
  assert.equal(game.resources.charge, 110);

  supplyRelay(game, { playerId: 'p1' });
  for (let i = 0; i < 36; i += 1) tickGame(game, 0.1);

  assert.ok(game.boards.p2.slots.filter(Boolean).length >= 1);
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
