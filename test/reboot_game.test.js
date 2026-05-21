import test from 'node:test';
import assert from 'node:assert/strict';

import { REBOOT_WAVES } from '../src/shared/reboot_content.js';
import {
  castRescue,
  createRebootGame,
  mergeToys,
  serializeRebootState,
  summonToy,
  tickRebootGame
} from '../src/shared/reboot_game.js';

const SCRIPTS = {
  tutorial_success: [
    [6, 'summon'],
    [19, 'summon'],
    [38, 'summon'],
    [51, 'merge'],
    [78, 'rescue']
  ],
  lucky_clutch: [
    [6, 'summon'],
    [18, 'summon'],
    [35, 'merge'],
    [74, 'rescue'],
    [96, 'summon'],
    [105, 'merge']
  ],
  bad_recoverable: [
    [6, 'summon'],
    [20, 'summon'],
    [42, 'summon'],
    [62, 'merge'],
    [79, 'rescue']
  ],
  greed_loss: [
    [6, 'summon'],
    [18, 'summon'],
    [34, 'summon'],
    [52, 'merge'],
    [70, 'summon'],
    [77, 'merge']
  ],
  rescue_miss: [
    [6, 'summon'],
    [19, 'summon'],
    [39, 'summon'],
    [52, 'merge']
  ]
};

function advance(game, seconds, step = 0.25) {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    tickRebootGame(game, Math.min(step, seconds - elapsed));
  }
  return game;
}

function advanceTo(game, time) {
  return advance(game, Math.max(0, time - game.now));
}

function runScript(game, script) {
  for (const [at, action] of script) {
    advanceTo(game, at);
    if (action === 'summon') summonToy(game, { playerId: 'p1' });
    if (action === 'merge') mergeToys(game, { playerId: 'p1' });
    if (action === 'rescue') castRescue(game, { playerId: 'p1' });
  }
  advanceTo(game, 120);
  return game;
}

function prepareBossBranch(game) {
  advanceTo(game, 6);
  summonToy(game, { playerId: 'p1' });
  advanceTo(game, 18);
  summonToy(game, { playerId: 'p1' });
  advanceTo(game, 35);
  mergeToys(game, { playerId: 'p1' });
  advanceTo(game, 78);
  castRescue(game, { playerId: 'p1' });
  return game;
}

function addUnit(game, boardId, unitId, grade = 1) {
  const unit = {
    id: `${boardId}-test-${unitId}-${game.boards[boardId].units.length}`,
    unitId,
    owner: boardId,
    grade,
    role: 'attack',
    spriteKey: unitId
  };
  game.boards[boardId].units.push(unit);
  return unit;
}

function types(game) {
  return game.events.map((event) => event.type);
}

function lastResult(game) {
  assert.ok(game.result, 'expected game.result to be set');
  return game.result;
}

test('createRebootGame exposes the deterministic two-board state shape', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 42 });

  assert.equal(game.mode, 'bot');
  assert.equal(game.seedName, 'tutorial_success');
  assert.match(game.runId, /^reboot-/);
  assert.equal(game.now, 0);
  assert.deepEqual(game.players.find((player) => player.id === 'p2'), { id: 'p2', name: '린', bot: true });
  assert.deepEqual(game.boards.p1, { playerId: 'p1', units: [], danger: 0 });
  assert.deepEqual(game.boards.p2, { playerId: 'p2', units: [], danger: 0 });
  assert.deepEqual(game.resources.p1, { summon: 10, rescue: 0 });
  assert.deepEqual(game.resources.p2, { summon: 10, rescue: 0 });
  assert.deepEqual(game.actionState.p1, { summon: true, merge: false, rescue: false });
  assert.deepEqual(game.events, []);
  assert.equal(game.result, null);
});

test('tutorial_success teaches summon, merge, and rescue within 120 seconds', () => {
  const game = runScript(
    createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 101 }),
    SCRIPTS.tutorial_success
  );

  assert.equal(lastResult(game).status, 'won');
  assert.equal(game.result.reason, 'partner_rescued');
  assert.deepEqual(types(game).filter((type) => ['summon', 'merge', 'rescue'].includes(type)), [
    'summon',
    'summon',
    'summon',
    'merge',
    'rescue'
  ]);
  assert.equal(game.result.highlights.includes('partner_rescued'), true);
  assert.equal(game.boards.p2.danger < 100, true);
});

test('first combat beat keeps enemies visible and the next summon close for mobile pacing', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 109 });

  summonToy(game, { playerId: 'p1' });
  advance(game, 4.1, 0.1);

  assert.equal(
    game.enemies.some((enemy) => enemy.boardId === 'p1' && enemy.progress > 0.06),
    true,
    'the first wave should still read as an active track threat after the first summon impact'
  );

  advanceTo(game, 9);

  assert.equal(game.resources.p1.summon >= 10, true, 'the next summon should return before the first mobile lull feels empty');
  assert.equal(game.actionState.p1.summon, true);
});

test('opening combat restores summon before the first single-button moment feels idle', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1091 });

  summonToy(game, { playerId: 'p1' });
  advance(game, 5.5, 0.1);

  assert.equal(game.resources.p1.summon >= 10, true, 'the first cooldown should be closer to a tap rhythm than a wait state');
  assert.equal(game.actionState.p1.summon, true);
});

test('tutorial first scripted summon still creates a short readable cooldown beat', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1092 });

  advanceTo(game, 6);
  summonToy(game, { playerId: 'p1' });

  assert.equal(game.resources.p1.summon, 0);
  assert.equal(game.actionState.p1.summon, false);

  advanceTo(game, 14.25);

  assert.equal(game.resources.p1.summon >= 10, true);
  assert.equal(game.actionState.p1.summon, true);
});

test('merge consumes eligible grade-one units without deleting higher grade units', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 102 });
  game.resources.p1.summon = 40;

  summonToy(game, { playerId: 'p1' });
  summonToy(game, { playerId: 'p1' });
  mergeToys(game, { playerId: 'p1' });
  summonToy(game, { playerId: 'p1' });
  summonToy(game, { playerId: 'p1' });

  const [higherGrade, firstGradeOne, secondGradeOne] = game.boards.p1.units;
  assert.equal(higherGrade.grade, 2);
  assert.equal(firstGradeOne.grade, 1);
  assert.equal(secondGradeOne.grade, 1);

  const result = mergeToys(game, { playerId: 'p1' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.consumed, [firstGradeOne.id, secondGradeOne.id]);
  assert.equal(game.boards.p1.units.some((unit) => unit.id === higherGrade.id), true);
});

test('reboot merge rejects supplied unit ids when no merge candidate exists', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 103 });
  summonToy(game, { playerId: 'p1' });

  const onlyUnit = game.boards.p1.units[0];
  const result = mergeToys(game, { playerId: 'p1', unitIds: ['bogus'] });

  assert.equal(result.ok, false);
  assert.deepEqual(game.boards.p1.units.map((unit) => unit.id), [onlyUnit.id]);
  assert.equal(game.actionState.p1.merge, false);
});

test('rescue spends charge and cannot be spammed after the tutorial window', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 111 });
  advanceTo(game, 78);

  assert.equal(game.actionState.p1.rescue, true);
  assert.equal(castRescue(game, { playerId: 'p1' }).ok, true);
  assert.equal(game.resources.p1.rescue, 0);
  assert.equal(game.actionState.p1.rescue, false);

  advanceTo(game, 86);
  assert.equal(game.resources.p1.rescue, 0);
  assert.equal(game.actionState.p1.rescue, false);
  assert.equal(castRescue(game, { playerId: 'p1' }).ok, false);
  assert.equal(types(game).filter((type) => type === 'rescue').length, 1);
});

test('summoned units emit live hit effects before enemies die', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 112 });
  summonToy(game, { playerId: 'p1' });
  advance(game, 0.25);

  const state = serializeRebootState(game);
  const hit = state.effects.find((effect) => effect.type === 'hit');

  assert.ok(hit, 'expected a live hit effect while the first target is still alive');
  assert.equal(hit.playerId, 'p1');
  assert.equal(hit.slot, 0);
  assert.equal(hit.targetType, 'noise_shard');
  assert.equal(hit.targetProgress >= 0 && hit.targetProgress <= 1, true);
  assert.equal(Number.isFinite(hit.targetLane), true);
  assert.equal(hit.damage, 8);
  assert.equal(hit.critical, false);
  assert.equal(hit.ttl > 0, true);
  assert.equal(state.effects.some((effect) => effect.type === 'death_burst'), false);
});

test('live hit effects attribute damage to the strongest known firing unit', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 113 });
  summonToy(game, { playerId: 'p1' });
  game.boards.p1.units.push({
    id: 'p1-test-burst',
    unitId: 'burst_pin',
    owner: 'p1',
    grade: 2,
    role: 'attack',
    spriteKey: 'burst_pin'
  });
  advance(game, 0.25);

  const hit = serializeRebootState(game).effects.find((effect) => effect.type === 'hit' && effect.slot === 1);

  assert.ok(hit, 'expected a live hit effect');
  assert.equal(hit.slot, 1);
  assert.equal(hit.damage, 18);
});

test('boss-window critical hits show a matching damage bump for grade-one units', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 115 });
  summonToy(game, { playerId: 'p1' });
  game.now = 92.1;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'test-mini-boss', enemyId: 'mini_boss', boardId: 'p1', progress: 0, spawnedAt: 92.1 }
  ];
  advance(game, 0.1);

  const hit = serializeRebootState(game).effects.find((effect) => effect.type === 'hit');

  assert.ok(hit, 'expected a boss-window hit effect');
  assert.equal(hit.targetType, 'mini_boss');
  assert.equal(hit.critical, true);
  assert.equal(hit.damage, 16);
});

test('live hit effects skip invalid unit slots instead of showing fake damage', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 114 });
  game.boards.p1.units.push({
    id: 'p1-invalid-unit',
    owner: 'p1',
    grade: 1
  });
  advance(game, 0.25);

  const hits = serializeRebootState(game).effects.filter((effect) => effect.type === 'hit');

  assert.deepEqual(hits, []);
});

test('enemies survive past old defeat timers until real unit damage removes hp', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'tutorial_success', seed: 116 });
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'damage-heavy', enemyId: 'heavy_noise', boardId: 'p1', progress: 0, spawnedAt: 0, hp: 46, maxHp: 46 }
  ];
  addUnit(game, 'p1', 'spark_pin', 1);

  advance(game, 3.7, 0.1);

  const damaged = game.enemies.find((enemy) => enemy.id === 'damage-heavy');
  assert.ok(damaged, 'heavy noise should not disappear on a fixed age timer');
  assert.equal(damaged.hp > 0 && damaged.hp < damaged.maxHp, true, `expected partial hp damage, got ${damaged?.hp}/${damaged?.maxHp}`);

  addUnit(game, 'p1', 'burst_pin', 2);
  advance(game, 0.2, 0.1);

  assert.equal(game.enemies.some((enemy) => enemy.id === 'damage-heavy'), false);
  assert.equal(game.effects.some((effect) => effect.type === 'death_burst' && effect.targetId === 'damage-heavy'), true);
});

test('serialized boss hp is the real remaining hp after unit attacks', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'boss_clutch', seed: 117 });
  game.now = 102;
  game.boss.active = true;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'real-boss', enemyId: 'mini_boss', boardId: 'p1', progress: 0, spawnedAt: 102, hp: 220, maxHp: 220 }
  ];
  addUnit(game, 'p1', 'burst_pin', 2);

  advance(game, 1.6, 0.1);

  const boss = serializeRebootState(game).enemies.find((enemy) => enemy.id === 'real-boss');
  assert.ok(boss, 'expected boss to still be alive after a short real damage window');
  assert.equal(boss.maxHp, 220);
  assert.equal(boss.hp < 220 && boss.hp > 0, true, `expected real boss hp loss, got ${boss.hp}`);
});

test('partner danger rises from actual leaked enemies instead of a fixed danger script', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'rescue_miss', seed: 118 });
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'partner-leak-a', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.99, spawnedAt: 0, hp: 46, maxHp: 46 },
    { id: 'partner-leak-b', enemyId: 'mini_boss', boardId: 'p2', progress: 0.99, spawnedAt: 0, hp: 220, maxHp: 220 },
    { id: 'partner-leak-c', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.99, spawnedAt: 0, hp: 46, maxHp: 46 }
  ];

  advance(game, 0.5, 0.1);

  assert.equal(game.boards.p2.danger >= 80, true, `expected danger from leaks, got ${game.boards.p2.danger}`);
  assert.equal(game.events.filter((event) => event.type === 'enemy_leaked' && event.boardId === 'p2').length, 3);
});

test('boss_clutch can be won by a strong real board even without scripted boss choice', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'boss_clutch', seed: 119, branch: 'wait' });
  addUnit(game, 'p1', 'nova_mast', 2);
  addUnit(game, 'p1', 'nova_mast', 2);
  addUnit(game, 'p1', 'burst_pin', 2);
  advanceTo(game, 78);
  castRescue(game, { playerId: 'p1' });
  advanceTo(game, 120);

  assert.equal(lastResult(game).status, 'won');
  assert.equal(game.internal.bossChoice, null);
  assert.equal(serializeRebootState(game).effects.some((effect) => effect.type === 'death_burst' && effect.targetType === 'mini_boss'), true);
});

test('terminal boss kill reason follows combat state instead of seed identity', () => {
  const reasons = ['tutorial_success', 'lucky_clutch'].map((seedName, index) => {
    const game = createRebootGame({ mode: 'bot', seedName, seed: 130 + index });
    game.now = 119.75;
    game.internal.rescued = true;
    game.internal.bossSpawned = true;
    game.internal.bossRewardEmitted = true;
    game.internal.bossKilledAt = 115;
    game.internal.bossKilledProgress = 0.7;
    game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
    game.enemies = [];
    tickRebootGame(game, 0.25);
    return game.result.reason;
  });

  assert.deepEqual(reasons, ['boss_final_hit', 'boss_final_hit']);
});

test('boss slow result can come from actual slow control outside the boss_clutch seed', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 131 });
  game.now = 119.75;
  game.boss.active = true;
  game.internal.rescued = true;
  game.internal.bossSpawned = true;
  game.internal.bossControlSeen = true;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'controlled-boss', enemyId: 'mini_boss', boardId: 'p1', progress: 0.7, spawnedAt: 102, hp: 150, maxHp: 220 }
  ];
  tickRebootGame(game, 0.25);

  assert.equal(lastResult(game).status, 'won');
  assert.equal(game.result.reason, 'boss_slowed');
});

test('boss slow terminal result is not blocked by unspent rescue when no partner threat exists', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'tutorial_success', seed: 1311 });
  game.now = 119.75;
  game.boss.active = true;
  game.internal.bossSpawned = true;
  game.internal.bossControlSeen = true;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'controlled-unrescued-boss', enemyId: 'mini_boss', boardId: 'p1', progress: 0.7, spawnedAt: 102, hp: 150, maxHp: 220 }
  ];
  tickRebootGame(game, 0.25);

  assert.equal(lastResult(game).status, 'won');
  assert.equal(game.result.reason, 'boss_slowed');
});

test('capped player lane danger loses from real signal overrun', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 132 });
  game.now = 119.75;
  game.internal.rescued = true;
  game.internal.bossSpawned = true;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.boards.p1.danger = 100;
  game.enemies = [];
  tickRebootGame(game, 0.25);

  assert.equal(lastResult(game).status, 'lost');
  assert.equal(game.result.reason, 'signal_overrun');
});

test('failed unavailable merge does not mark a rescue-ready player as greedy', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'rescue_miss', seed: 133 });
  game.resources.p1.rescue = 100;
  game.internal.partnerDangerSeen = true;
  game.enemies = [
    { id: 'partner-threat', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 0, hp: 46, maxHp: 46 }
  ];

  const merge = mergeToys(game, { playerId: 'p1' });

  assert.equal(merge.ok, false);
  assert.equal(game.internal.greedDecision, false);
});

test('failed unavailable boss-window merge does not record a boss response', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'boss_clutch', seed: 134 });
  game.now = 96;
  game.boss.active = true;
  game.internal.bossSpawned = true;
  game.resources.p1.rescue = 100;

  const merge = mergeToys(game, { playerId: 'p1' });

  assert.equal(merge.ok, false);
  assert.equal(game.boards.p1.units.length, 0);
  assert.equal(game.internal.bossChoice, null);
  assert.equal(game.internal.bossResponseAt, null);
  assert.equal(game.internal.greedDecision, false);
});

test('bot partner visibly contributes with scripted board actions', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1212 });
  advanceTo(game, 54);

  const partnerEvents = game.events.filter((event) => event.type === 'partner_auto');

  assert.equal(game.boards.p2.units.length >= 2, true);
  assert.deepEqual(partnerEvents.map((event) => event.action), ['summon', 'summon']);
  assert.equal(partnerEvents.every((event) => event.playerId === 'p2'), true);
  assert.equal(partnerEvents.some((event) => event.highlight), true);
});

test('bot partner joins before the first combat lull feels solo', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1214 });
  advanceTo(game, 12);

  const partnerEvents = game.events.filter((event) => event.type === 'partner_auto');

  assert.equal(game.boards.p2.units.length >= 1, true);
  assert.equal(partnerEvents.length >= 1, true);
  assert.equal(partnerEvents[0].at <= 12, true);
  assert.equal(partnerEvents[0].action, 'summon');
});

test('bot partner marks the late rescue-coil script as rescue support', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1213 });
  game.boards.p2.danger = 80;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'partner-danger', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.8, spawnedAt: 88, hp: 46, maxHp: 46 }
  ];
  advanceTo(game, 89);

  const partnerEvents = game.events.filter((event) => event.type === 'partner_auto');
  const enemy = game.enemies.find((target) => target.id === 'partner-danger');

  assert.deepEqual(partnerEvents.map((event) => event.action), ['summon', 'summon', 'rescue']);
  assert.equal(partnerEvents.at(-1).unitId, 'rescue_coil');
  assert.equal(game.boards.p2.danger <= 35, true, `expected real partner rescue danger drop, got ${game.boards.p2.danger}`);
  assert.equal(enemy.progress < 0.8, true, `expected real partner rescue knockback, got ${enemy.progress}`);
});

test('online reboot rooms do not run local bot partner automation', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'tutorial_success', seed: 1313 });
  advanceTo(game, 54);

  assert.equal(game.boards.p2.units.length, 0);
  assert.equal(types(game).includes('partner_auto'), false);
});

test('lucky_clutch produces a visible boss final-hit result', () => {
  const game = runScript(
    createRebootGame({ mode: 'bot', seedName: 'lucky_clutch', seed: 202, branch: 'summonBurst' }),
    SCRIPTS.lucky_clutch
  );

  assert.equal(lastResult(game).status, 'won');
  assert.equal(game.result.reason, 'boss_final_hit');
  assert.equal(game.result.highlights.includes('boss_final_hit'), true);
});

test('bad_recoverable turns weak rolls into slow or rescue utility', () => {
  const game = runScript(
    createRebootGame({ mode: 'bot', seedName: 'bad_recoverable', seed: 303 }),
    SCRIPTS.bad_recoverable
  );

  assert.equal(lastResult(game).status, 'won');
  assert.equal(game.result.reason, 'partner_rescued');
  assert.equal(game.result.highlights.includes('bad_roll_recovered'), true);
});

test('greed_loss marks late rescue greed as the single failure reason', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'greed_loss', seed: 404 });
  game.now = 77;
  game.resources.p1.rescue = 100;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  addUnit(game, 'p1', 'spark_pin', 1);
  addUnit(game, 'p1', 'spark_pin', 1);
  game.enemies = [
    { id: 'active-partner-threat-a', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 77, hp: 46, maxHp: 46 },
    { id: 'active-partner-threat-b', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 77, hp: 46, maxHp: 46 },
    { id: 'active-partner-threat-c', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 77, hp: 46, maxHp: 46 },
    { id: 'active-partner-threat-d', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 77, hp: 46, maxHp: 46 }
  ];
  mergeToys(game, { playerId: 'p1' });
  advanceTo(game, 120);

  assert.equal(lastResult(game).status, 'lost');
  assert.equal(game.result.reason, 'greed');
  assert.deepEqual(game.result.highlights, ['greed']);
});

test('rescue_miss marks not pressing rescue as the single failure reason', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'rescue_miss', seed: 505 });
  game.now = 119.75;
  game.resources.p1.rescue = 100;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'missed-partner-threat', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 102, hp: 46, maxHp: 46 }
  ];
  tickRebootGame(game, 0.25);

  assert.equal(lastResult(game).status, 'lost');
  assert.equal(game.result.reason, 'rescue_missed');
  assert.deepEqual(game.result.highlights, ['rescue_missed']);
});

test('boss_clutch distinguishes late summon, merge, and wait branches', () => {
  const summonSlow = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 606,
    branch: 'summonSlow'
  });
  prepareBossBranch(summonSlow);
  advanceTo(summonSlow, 96);
  summonToy(summonSlow, { playerId: 'p1' });
  advanceTo(summonSlow, 120);
  assert.equal(lastResult(summonSlow).status, 'won');
  assert.equal(summonSlow.internal.bossChoice, 'summonSlow');

  const summonBurst = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 607,
    branch: 'summonBurst'
  });
  prepareBossBranch(summonBurst);
  advanceTo(summonBurst, 96);
  summonToy(summonBurst, { playerId: 'p1' });
  advanceTo(summonBurst, 120);
  assert.equal(lastResult(summonBurst).status, 'won');
  assert.equal(summonBurst.result.reason, 'boss_final_hit');

  const mergeBranch = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 608,
    branch: 'merge'
  });
  prepareBossBranch(mergeBranch);
  advanceTo(mergeBranch, 96);
  mergeToys(mergeBranch, { playerId: 'p1' });
  advanceTo(mergeBranch, 120);
  assert.equal(lastResult(mergeBranch).status, 'won');
  assert.equal(mergeBranch.result.reason, 'boss_final_hit');

  const waitBranch = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 609,
    branch: 'wait'
  });
  waitBranch.now = 119.75;
  waitBranch.boss.active = true;
  waitBranch.internal.rescued = true;
  waitBranch.internal.bossSpawned = true;
  waitBranch.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  waitBranch.enemies = [
    { id: 'wait-boss', enemyId: 'mini_boss', boardId: 'p1', progress: 0.7, spawnedAt: 102, hp: 150, maxHp: 220 }
  ];
  tickRebootGame(waitBranch, 0.25);
  assert.equal(lastResult(waitBranch).status, 'lost');
  assert.equal(waitBranch.result.reason, 'boss_unfinished');
});

test('boss_clutch accepts fractional last-second decisions until the boss spawns', () => {
  const summonBranch = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 610,
    branch: 'summonBurst'
  });
  prepareBossBranch(summonBranch);
  advanceTo(summonBranch, 101.75);
  const summonResult = summonToy(summonBranch, { playerId: 'p1' });
  assert.equal(summonResult.ok, true);
  assert.equal(summonBranch.internal.bossChoice, 'summonBurst');
  advanceTo(summonBranch, 120);
  assert.equal(lastResult(summonBranch).status, 'won');
  assert.equal(summonBranch.result.reason, 'boss_final_hit');

  const mergeBranch = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 611,
    branch: 'merge'
  });
  prepareBossBranch(mergeBranch);
  advanceTo(mergeBranch, 101.75);
  const mergeResult = mergeToys(mergeBranch, { playerId: 'p1' });
  assert.equal(mergeResult.ok, true);
  assert.equal(mergeBranch.internal.bossChoice, 'merge');
  advanceTo(mergeBranch, 120);
  assert.equal(lastResult(mergeBranch).status, 'won');
  assert.equal(mergeBranch.result.reason, 'boss_final_hit');
});

test('serialized mini boss exposes live hp for the battlefield vitality plate', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'boss_clutch', seed: 612, branch: 'merge' });
  prepareBossBranch(game);
  advanceTo(game, 96);
  mergeToys(game, { playerId: 'p1' });
  advanceTo(game, 108);

  const boss = serializeRebootState(game).enemies.find((enemy) => enemy.enemyId === 'mini_boss');

  assert.ok(boss, 'expected the mini boss to be serialized after spawning');
  assert.equal(boss.maxHp, 220);
  assert.equal(Number.isFinite(boss.hp), true);
  assert.equal(boss.hp > 0 && boss.hp < boss.maxHp, true, `expected live boss hp, got ${boss.hp}`);
});

test('serializeRebootState omits rng internals and keeps player-readable action state', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 707 });
  advanceTo(game, 76);

  const state = serializeRebootState(game);

  assert.equal(state.seedName, 'tutorial_success');
  assert.equal(state.actionState.p1.summon, true);
  assert.equal(state.actionState.p1.rescue, true);
  assert.equal('rng' in state, false);
});

test('reboot combat emits serialized death bursts with reward payloads', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 808 });
  summonToy(game, { playerId: 'p1' });
  advanceTo(game, 1.7);

  const state = serializeRebootState(game);
  const burst = state.effects.find((effect) => effect.type === 'death_burst');

  assert.ok(burst, 'expected a death burst from early reboot combat');
  assert.equal(burst.targetId.includes('noise_shard'), true);
  assert.equal(burst.targetType, 'noise_shard');
  assert.equal(burst.targetProgress >= 0 && burst.targetProgress <= 1, true);
  assert.equal(Number.isFinite(burst.targetLane), true);
  assert.equal(burst.rewardCharge, 1);
  assert.equal(burst.rewardLink, 1);
  assert.equal(burst.ttl > 0, true);
});

test('loss branches do not show boss reward pickup before defeat', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'rescue_miss', seed: 909 });
  game.now = 119.75;
  game.resources.p1.rescue = 100;
  game.internal.wavesSpawned = REBOOT_WAVES.map((wave) => wave.at);
  game.enemies = [
    { id: 'loss-partner-threat', enemyId: 'heavy_noise', boardId: 'p2', progress: 0.7, spawnedAt: 102, hp: 46, maxHp: 46 }
  ];
  tickRebootGame(game, 0.25);

  assert.equal(game.result.status, 'lost');
  assert.equal(
    serializeRebootState(game).effects.some((effect) => effect.type === 'death_burst' && effect.targetType === 'mini_boss'),
    false
  );
});

test('boss final-hit branches emit a mini boss reward burst for the renderer', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'boss_clutch', seed: 911, branch: 'merge' });
  prepareBossBranch(game);
  advanceTo(game, 96);
  mergeToys(game, { playerId: 'p1' });
  advanceTo(game, 120);

  const bossBurst = serializeRebootState(game).effects.find((effect) => effect.type === 'death_burst' && effect.targetType === 'mini_boss');
  assert.equal(game.result.reason, 'boss_final_hit');
  assert.ok(bossBurst, 'expected boss final hit to emit a mini boss burst');
  assert.equal(bossBurst.rewardCharge, 10);
  assert.equal(bossBurst.rewardLink, 4);
});
