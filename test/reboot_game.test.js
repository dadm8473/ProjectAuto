import test from 'node:test';
import assert from 'node:assert/strict';

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

test('bot partner visibly contributes with scripted board actions', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1212 });
  advanceTo(game, 54);

  const partnerEvents = game.events.filter((event) => event.type === 'partner_auto');

  assert.equal(game.boards.p2.units.length >= 2, true);
  assert.deepEqual(partnerEvents.map((event) => event.action), ['summon', 'summon']);
  assert.equal(partnerEvents.every((event) => event.playerId === 'p2'), true);
  assert.equal(partnerEvents.some((event) => event.highlight), true);
});

test('online reboot rooms do not run local bot partner automation', () => {
  const game = createRebootGame({ mode: 'online', seedName: 'tutorial_success', seed: 1313 });
  advanceTo(game, 54);

  assert.equal(game.boards.p2.units.length, 0);
  assert.equal(types(game).includes('partner_auto'), false);
});

test('lucky_clutch produces a visible boss final-hit result', () => {
  const game = runScript(
    createRebootGame({ mode: 'bot', seedName: 'lucky_clutch', seed: 202 }),
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
  const game = runScript(
    createRebootGame({ mode: 'bot', seedName: 'greed_loss', seed: 404 }),
    SCRIPTS.greed_loss
  );

  assert.equal(lastResult(game).status, 'lost');
  assert.equal(game.result.reason, 'greed');
  assert.deepEqual(game.result.highlights, ['greed']);
});

test('rescue_miss marks not pressing rescue as the single failure reason', () => {
  const game = runScript(
    createRebootGame({ mode: 'bot', seedName: 'rescue_miss', seed: 505 }),
    SCRIPTS.rescue_miss
  );

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
  advanceTo(summonSlow, 78);
  castRescue(summonSlow, { playerId: 'p1' });
  advanceTo(summonSlow, 96);
  summonToy(summonSlow, { playerId: 'p1' });
  advanceTo(summonSlow, 120);
  assert.equal(lastResult(summonSlow).status, 'won');
  assert.equal(summonSlow.result.reason, 'boss_slowed');
  assert.equal(summonSlow.boss.remainingHp <= 28, true);

  const summonBurst = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 607,
    branch: 'summonBurst'
  });
  advanceTo(summonBurst, 78);
  castRescue(summonBurst, { playerId: 'p1' });
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
  advanceTo(mergeBranch, 78);
  castRescue(mergeBranch, { playerId: 'p1' });
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
  advanceTo(waitBranch, 120);
  assert.equal(lastResult(waitBranch).status, 'lost');
  assert.equal(waitBranch.result.reason, 'boss_leaked');
});

test('boss_clutch accepts fractional last-second decisions until the boss spawns', () => {
  const summonBranch = createRebootGame({
    mode: 'bot',
    seedName: 'boss_clutch',
    seed: 610,
    branch: 'summonBurst'
  });
  advanceTo(summonBranch, 78);
  castRescue(summonBranch, { playerId: 'p1' });
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
  advanceTo(mergeBranch, 78);
  castRescue(mergeBranch, { playerId: 'p1' });
  advanceTo(mergeBranch, 101.75);
  const mergeResult = mergeToys(mergeBranch, { playerId: 'p1' });
  assert.equal(mergeResult.ok, true);
  assert.equal(mergeBranch.internal.bossChoice, 'merge');
  advanceTo(mergeBranch, 120);
  assert.equal(lastResult(mergeBranch).status, 'won');
  assert.equal(mergeBranch.result.reason, 'boss_final_hit');
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
  advanceTo(game, 1);

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
  const game = createRebootGame({ mode: 'bot', seedName: 'greed_loss', seed: 909 });
  runScript(game, SCRIPTS.greed_loss);
  const beforeLoss = createRebootGame({ mode: 'bot', seedName: 'greed_loss', seed: 910 });
  for (const [at, action] of SCRIPTS.greed_loss) {
    advanceTo(beforeLoss, at);
    if (action === 'summon') summonToy(beforeLoss, { playerId: 'p1' });
    if (action === 'merge') mergeToys(beforeLoss, { playerId: 'p1' });
  }
  advanceTo(beforeLoss, 110);

  assert.equal(game.result.status, 'lost');
  assert.equal(
    serializeRebootState(beforeLoss).effects.some((effect) => effect.type === 'death_burst' && effect.targetType === 'mini_boss'),
    false
  );
});

test('boss final-hit branches emit a mini boss reward burst for the renderer', () => {
  const game = createRebootGame({ mode: 'bot', seedName: 'boss_clutch', seed: 911, branch: 'merge' });
  advanceTo(game, 78);
  castRescue(game, { playerId: 'p1' });
  advanceTo(game, 96);
  mergeToys(game, { playerId: 'p1' });
  advanceTo(game, 120);

  const bossBurst = serializeRebootState(game).effects.find((effect) => effect.type === 'death_burst' && effect.targetType === 'mini_boss');
  assert.equal(game.result.reason, 'boss_final_hit');
  assert.ok(bossBurst, 'expected boss final hit to emit a mini boss burst');
  assert.equal(bossBurst.rewardCharge, 10);
  assert.equal(bossBurst.rewardLink, 4);
});
