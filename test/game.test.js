import test from 'node:test';
import assert from 'node:assert/strict';

import {
  castPartnerBoost,
  createGame,
  mergeUnits,
  serializeState,
  summonUnit,
  tickGame,
  upgradeSummonOdds,
  tryBuyShopItem
} from '../src/shared/game.js';
import { HEROES, SHOP } from '../src/shared/content.js';

test('a new run is a two-board co-op defense with monetization scaffolding', () => {
  const game = createGame({ mode: 'bot', seed: 42 });

  assert.equal(game.title, 'Fortune Relay');
  assert.equal(game.boards.p1.slots.length, 12);
  assert.equal(game.boards.p2.slots.length, 12);
  assert.equal(game.resources.gold, 120);
  assert.equal(game.pressure.limit, 100);
  assert.equal(SHOP.items.some((item) => item.category === 'cosmetic'), true);
});

test('summoning is random, spends shared gold, fills a board slot, and advances pity', () => {
  const game = createGame({ mode: 'bot', seed: 9 });
  const before = game.resources.gold;

  const result = summonUnit(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.equal(game.resources.gold, before - 20);
  assert.equal(game.boards.p1.slots.filter(Boolean).length, 1);
  assert.equal(game.stats.summons.p1, 1);
  assert.ok(game.rng.pity.p1 >= 1 || HEROES[result.unit.hero].rarity !== 'common');
});

test('chance upgrades shift the summon table toward higher rarities', () => {
  const game = createGame({ mode: 'bot', seed: 17 });
  game.resources.gold = 300;
  const beforeEpic = game.summonOdds.epic;

  const result = upgradeSummonOdds(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.ok(game.summonOdds.epic > beforeEpic);
  assert.equal(game.stats.chanceUps.p1, 1);
});

test('three matching units merge into a higher-star dramatic unit', () => {
  const game = createGame({ mode: 'bot', seed: 3 });
  game.boards.p1.slots[0] = { id: 'u1', hero: 'sprout', star: 1, cooldown: 0, owner: 'p1' };
  game.boards.p1.slots[1] = { id: 'u2', hero: 'sprout', star: 1, cooldown: 0, owner: 'p1' };
  game.boards.p1.slots[2] = { id: 'u3', hero: 'sprout', star: 1, cooldown: 0, owner: 'p1' };

  const result = mergeUnits(game, { playerId: 'p1', slotIds: [0, 1, 2] });

  assert.equal(result.ok, true);
  assert.equal(game.boards.p1.slots[0].star, 2);
  assert.equal(game.boards.p1.slots[1], null);
  assert.equal(game.boards.p1.slots[2], null);
  assert.notEqual(game.boards.p1.slots[0].hero, 'sprout');
  assert.equal(game.effects.some((effect) => effect.type === 'merge'), true);
});

test('partner boost is a cooperative action that buffs the other board', () => {
  const game = createGame({ mode: 'bot', seed: 12 });
  game.resources.mana = 80;
  game.boards.p2.slots[0] = { id: 'u9', hero: 'volt', star: 2, cooldown: 0, owner: 'p2' };

  const result = castPartnerBoost(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.equal(game.boards.p2.slots[0].boostedUntil > game.now, true);
  assert.equal(game.resources.mana, 45);
});

test('bot partner waits for the player to start before spending shared gold', () => {
  const game = createGame({ mode: 'bot', seed: 44 });

  for (let i = 0; i < 30; i += 1) tickGame(game, 0.1);

  assert.equal(game.boards.p1.slots.filter(Boolean).length, 0);
  assert.equal(game.boards.p2.slots.filter(Boolean).length, 0);
  assert.equal(game.resources.gold, 120);

  summonUnit(game, { playerId: 'p1' });
  for (let i = 0; i < 30; i += 1) tickGame(game, 0.1);

  assert.ok(game.boards.p2.slots.filter(Boolean).length >= 1);
  assert.ok(game.resources.gold >= 20);
});

test('combat creates a boss timer, rewards kills, and fails when pressure reaches the cap', () => {
  const game = createGame({ mode: 'solo', seed: 5 });
  game.boards.p1.slots[0] = { id: 'u1', hero: 'cannon', star: 3, cooldown: 0, owner: 'p1' };
  game.boards.p2.slots[0] = { id: 'u2', hero: 'oracle', star: 2, cooldown: 0, owner: 'p2' };

  for (let i = 0; i < 360; i += 1) tickGame(game, 0.1);

  assert.ok(game.wave.index >= 1);
  assert.ok(game.stats.kills > 0);
  assert.ok(game.boss.timer <= game.boss.limit);

  game.pressure.count = 100;
  tickGame(game, 0.1);
  assert.equal(game.over, true);
  assert.equal(game.won, false);
});

test('shop purchases use earned gems and unlock account-style cosmetics', () => {
  const game = createGame({ mode: 'bot', seed: 31 });
  game.resources.gems = 150;

  const purchase = tryBuyShopItem(game, { itemId: 'mythic-aura' });

  assert.equal(purchase.ok, true);
  assert.equal(game.resources.gems, 60);
  assert.deepEqual(game.unlocks, ['mythic-aura']);
});

test('serialized state omits private rng data but keeps all client board state', () => {
  const game = createGame({ mode: 'bot', seed: 29 });
  summonUnit(game, { playerId: 'p1' });
  tickGame(game, 0.25);

  const snapshot = serializeState(game);

  assert.equal(snapshot.privateSeed, undefined);
  assert.equal(snapshot.rng, undefined);
  assert.equal(snapshot.boards.p1.slots.length, 12);
  assert.equal(typeof snapshot.now, 'number');
});
