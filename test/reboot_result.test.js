import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame, mergeRelays, serializeState, supplyRelay, tickGame, castLinkPulse } from '../src/shared/game.js';
import {
  buildMissionScreen,
  buildRebootCollection,
  buildRebootLobby,
  buildRebootResultModel,
  buildRebootShop,
  buildSeasonScreen,
  startRebootRetry
} from '../src/client/reboot_screens.js';

function advanceTo(game, time) {
  while (game.now < time) tickGame(game, Math.min(0.25, time - game.now));
}

function runTutorial() {
  const game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 800 });
  supplyRelay(game, { playerId: 'p1' });
  advanceTo(game, 19);
  supplyRelay(game, { playerId: 'p1' });
  advanceTo(game, 38);
  supplyRelay(game, { playerId: 'p1' });
  advanceTo(game, 51);
  mergeRelays(game, { playerId: 'p1' });
  advanceTo(game, 78);
  castLinkPulse(game, { playerId: 'p1' });
  advanceTo(game, 120);
  return game;
}

test('result model prioritizes reason, next goal, rewards, retry, and home', () => {
  const game = runTutorial();
  const model = buildRebootResultModel({ result: game.result, rewards: [{ type: 'soft', amount: 20 }] });

  assert.equal(model.status, 'won');
  assert.equal(model.title, '승리');
  assert.equal(model.reason.reason, 'partner_rescued');
  assert.equal(model.nextGoal.goal, 'time_next_rescue');
  assert.deepEqual(model.rewards, [{ type: 'soft', amount: 20 }]);
  assert.deepEqual(model.primaryAction, { label: '다시 도전', action: 'retry' });
  assert.deepEqual(model.secondaryAction, { label: '홈', action: 'home' });
  assert.deepEqual(model.forbiddenActions, []);
});

test('result model exposes loss status for generated result badges', () => {
  const model = buildRebootResultModel({ result: { status: 'lost', reason: 'boss_leaked' } });

  assert.equal(model.status, 'lost');
  assert.equal(model.title, '패배');
  assert.equal(model.highlight.kind, 'danger');
});

test('retry creates a fresh run without opening monetization paths', () => {
  const previousGame = runTutorial();
  const retry = buildRebootResultModel({ result: previousGame.result }).primaryAction;
  const nextGame = startRebootRetry({ previousGame, action: retry });
  const nextState = serializeState(nextGame);

  assert.notEqual(nextGame.runId, previousGame.runId);
  assert.equal(nextGame.seedName, previousGame.seedName);
  assert.equal(nextGame.result, null);
  assert.equal(nextGame.events.length, 0);
  assert.equal(nextGame.now, 0);
  assert.equal(nextGame.resources.p1.summon, 10);
  assert.equal(nextState.actionState.p1.summon, true);
});

test('reboot shop renders earned-gem cosmetic purchases with owned and locked states', () => {
  const shop = buildRebootShop({ gems: 90, unlocks: ['founder-board'] });

  assert.equal(shop.includes('data-shop-buy="mythic-aura"'), true);
  assert.equal(shop.includes('data-shop-buy="founder-board"'), true);
  assert.equal(shop.includes('data-owned="true"'), true);
  assert.equal(shop.includes('90 젬'), true);
  assert.equal(shop.includes('140 젬'), true);
  assert.equal(shop.includes('>해금<'), true);
  assert.equal(shop.includes('>보유<'), true);
  assert.equal(shop.includes('lucky-cache'), false);
  assert.equal(shop.includes('run_boost'), false);
});

test('reboot collection renders unit training state from profile XP and levels', () => {
  const collection = buildRebootCollection({ xp: 50, unitLevels: { spark_pin: 2 } });

  assert.equal(collection.includes('data-unit-upgrade="spark_pin"'), true);
  assert.equal(collection.includes('Lv.2'), true);
  assert.equal(collection.includes('60 경험치'), true);
  assert.equal(collection.includes('>훈련<'), true);
  assert.equal(collection.includes('data-unit-upgrade="burst_pin"'), true);
  assert.equal(collection.includes('40 경험치'), true);
  assert.equal(collection.includes('>경험치 부족<'), true);
});

test('meta screens start with compact actionable status headers', () => {
  const collection = buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 2 } });
  assert.equal(collection.includes('meta-summary'), true);
  assert.equal(collection.includes('훈련 가능'), true);
  assert.equal(collection.includes('80 경험치'), true);

  const shop = buildRebootShop({ gems: 100, unlocks: [] });
  assert.equal(shop.includes('meta-summary'), true);
  assert.equal(shop.includes('해금 가능'), true);
  assert.equal(shop.includes('100 젬'), true);

  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    claimedMissions: []
  });
  assert.equal(missions.includes('meta-summary'), true);
  assert.equal(missions.includes('수령 가능'), true);

  const season = buildSeasonScreen({
    xp: 60,
    claimedPassTiers: []
  });
  assert.equal(season.includes('meta-summary'), true);
  assert.equal(season.includes('시즌 경험치'), true);
  assert.equal(season.includes('보상 가능'), true);
});

test('mission screen renders profile progress and claim states', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: [],
    claimedMissions: ['first-run']
  });

  assert.equal(missions.includes('data-mission-claim="first-run"'), true);
  assert.equal(missions.includes('data-mission-claim="train-unit"'), true);
  assert.equal(missions.includes('첫 작전 완료'), true);
  assert.equal(missions.includes('유닛 훈련'), true);
  assert.equal(missions.includes('>받음<'), true);
  assert.equal(missions.includes('>수령<'), true);
});

test('season screen renders pass tiers from profile XP and claim states', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  assert.equal(season.includes('data-pass-claim="0"'), true);
  assert.equal(season.includes('data-pass-claim="1"'), true);
  assert.equal(season.includes('60 경험치'), true);
  assert.equal(season.includes('160 경험치'), true);
  assert.equal(season.includes('>받음<'), true);
  assert.equal(season.includes('>진행중<'), true);
});

test('lobby recommends the next profile action after rewards settle', () => {
  const missionLobby = buildRebootLobby({
    gems: 24,
    xp: 60,
    processedRuns: ['run-1'],
    claimedMissions: [],
    claimedPassTiers: []
  });

  assert.equal(missionLobby.includes('data-lobby-open="missions"'), true);
  assert.equal(missionLobby.includes('미션 보상'), true);

  const trainingLobby = buildRebootLobby({
    gems: 24,
    xp: 60,
    processedRuns: ['run-1'],
    claimedMissions: ['first-run'],
    claimedPassTiers: [0]
  });

  assert.equal(trainingLobby.includes('data-lobby-open="collection"'), true);
  assert.equal(trainingLobby.includes('훈련 가능'), true);

  const shopLobby = buildRebootLobby({
    gems: 90,
    xp: 0,
    processedRuns: ['run-1'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0]
  });

  assert.equal(shopLobby.includes('data-lobby-open="shop"'), true);
  assert.equal(shopLobby.includes('외형 해금'), true);
});
