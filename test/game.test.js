import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  serializeState,
  tickGame,
  tryBuildTower,
  tryBuyShopItem,
  upgradeTower
} from '../src/shared/game.js';
import { LEVELS, SHOP } from '../src/shared/content.js';

test('a new squad starts with shared build resources and portrait-ready level data', () => {
  const game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: 7 });

  assert.equal(game.resources.scrap, 180);
  assert.equal(game.players.length, 2);
  assert.equal(game.level.bounds.w, 390);
  assert.equal(game.level.bounds.h, 720);
  assert.ok(game.level.path.length > 5);
  assert.equal(LEVELS[0].id, 'harbor-spiral');
});

test('building a tower spends shared scrap and rejects blocked cells', () => {
  const game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: 3 });

  const built = tryBuildTower(game, { playerId: 'p1', type: 'pulse', x: 90, y: 210 });
  assert.equal(built.ok, true);
  assert.equal(game.towers.length, 1);
  assert.equal(game.resources.scrap, 120);

  const blocked = tryBuildTower(game, { playerId: 'p2', type: 'pulse', x: game.level.path[1].x, y: game.level.path[1].y });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /path/i);
});

test('waves spawn enemies, towers damage them, and kills grant squad rewards', () => {
  const game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: 11 });
  tryBuildTower(game, { playerId: 'p1', type: 'spark', x: 128, y: 170 });
  tryBuildTower(game, { playerId: 'p2', type: 'pulse', x: 255, y: 225 });

  for (let i = 0; i < 550; i += 1) tickGame(game, 0.1);

  assert.ok(game.stats.kills > 0);
  assert.ok(game.resources.scrap > 0);
  assert.ok(game.wave.index >= 1);
  assert.ok(game.base.hp > 0);
});

test('upgrades are cooperative purchases with clear power growth', () => {
  const game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: 19 });
  const result = tryBuildTower(game, { playerId: 'p1', type: 'frost', x: 300, y: 350 });
  const tower = game.towers.find((item) => item.id === result.towerId);
  const beforeDamage = tower.damage;
  game.resources.scrap = 200;

  const upgraded = upgradeTower(game, { playerId: 'p2', towerId: tower.id });

  assert.equal(upgraded.ok, true);
  assert.equal(tower.level, 2);
  assert.ok(tower.damage > beforeDamage);
  assert.equal(game.resources.scrap, 105);
});

test('shop purchases use earned premium currency without mutating paid platform state', () => {
  const game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: 23 });
  game.resources.cores = 120;

  const purchase = tryBuyShopItem(game, { playerId: 'p1', itemId: 'starter-cache' });

  assert.equal(purchase.ok, true);
  assert.equal(game.resources.cores, 70);
  assert.equal(game.resources.scrap, 280);
  assert.equal(SHOP.items.find((item) => item.id === 'starter-cache').price.cores, 50);
});

test('serialized state is compact and client-safe', () => {
  const game = createGame({ mode: 'bot', levelId: 'harbor-spiral', seed: 29 });
  tryBuildTower(game, { playerId: 'p1', type: 'pulse', x: 90, y: 210 });
  tickGame(game, 0.25);

  const snapshot = serializeState(game);

  assert.equal(snapshot.level.id, 'harbor-spiral');
  assert.equal(snapshot.towers.length, 1);
  assert.equal(typeof snapshot.now, 'number');
  assert.equal(snapshot.privateSeed, undefined);
});
