import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame, mergeRelays, serializeState, supplyRelay, tickGame, castLinkPulse } from '../src/shared/game.js';
import {
  buildMetaNavAlerts,
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

test('result model routes secondary action to the next profile growth screen', () => {
  const missionModel = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    profile: {
      gems: 24,
      xp: 60,
      processedRuns: ['run-1'],
      claimedMissions: [],
      claimedPassTiers: []
    }
  });

  assert.equal(missionModel.secondaryAction.action, 'missions');
  assert.equal(missionModel.secondaryAction.label, '수령하기');
  assert.equal(missionModel.secondaryAction.title, '받을 미션 보상');

  const trainingModel = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    profile: {
      gems: 24,
      xp: 60,
      processedRuns: ['run-1'],
      claimedMissions: ['first-run'],
      claimedPassTiers: [0]
    }
  });

  assert.equal(trainingModel.secondaryAction.action, 'collection');
  assert.equal(trainingModel.secondaryAction.label, '훈련하기');
});

test('result model exposes loss status for generated result badges', () => {
  const model = buildRebootResultModel({ result: { status: 'lost', reason: 'boss_leaked' } });

  assert.equal(model.status, 'lost');
  assert.equal(model.title, '패배');
  assert.equal(model.highlight.kind, 'danger');
});

test('result next-goal copy stays compact for generated result plates', () => {
  const goalKeys = [
    'time_next_rescue',
    'repeat_boss_timing',
    'protect_control_unit',
    'rescue_before_merge_greed',
    'save_rescue_for_partner_danger',
    'answer_boss_warning',
    'merge_before_boss',
    'turn_bad_rolls_into_utility',
    undefined
  ];

  for (const nextGoal of goalKeys) {
    const model = buildRebootResultModel({ result: { status: 'lost', reason: 'boss_leaked', nextGoal } });
    const compactLength = model.nextGoal.label.replace(/\s/g, '').length;
    assert.equal(compactLength <= 10, true, `${model.nextGoal.label} is too long for the result plate`);
    assert.equal(/[.。]/.test(model.nextGoal.label), false, `${model.nextGoal.label} reads like paragraph copy`);
  }
});

test('result reason copy stays compact for generated result plates', () => {
  const reasons = [
    'partner_rescued',
    'boss_final_hit',
    'boss_slowed',
    'greed',
    'rescue_missed',
    'boss_leaked',
    'merge_gap',
    'bad_luck'
  ];

  for (const reason of reasons) {
    const model = buildRebootResultModel({ result: { status: 'lost', reason } });
    const compactLength = model.reason.label.replace(/\s/g, '').length;
    assert.equal(compactLength <= 8, true, `${model.reason.label} is too long for the result reason plate`);
    assert.equal(/[.。]/.test(model.reason.label), false, `${model.reason.label} reads like paragraph copy`);
  }
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
  assert.equal(shop.includes('data-shop-cosmetic="mythic-aura"'), true);
  assert.equal(shop.includes('data-shop-cosmetic="founder-board"'), true);
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

test('meta summary detail copy stays compact for generated header banners', () => {
  const screens = [
    buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 2 } }),
    buildRebootShop({ gems: 100, unlocks: [] }),
    buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] }),
    buildSeasonScreen({ xp: 60, claimedPassTiers: [] })
  ];
  const details = screens.map((html) => {
    const match = html.match(/<article class="meta-summary screen-card"[\s\S]*?<p>(.*?)<\/p>/);
    assert.ok(match, 'meta summary detail is missing');
    return match[1];
  });

  for (const detail of details) {
    const compactLength = detail.replace(/\s/g, '').length;
    assert.equal(compactLength <= 9, true, `${detail} is too long for a meta header banner`);
    assert.equal(/하세요|습니다|[.。]/.test(detail), false, `${detail} reads like paragraph copy`);
  }
});

test('shop card descriptions stay compact enough for portrait game cards', () => {
  const shop = buildRebootShop({ gems: 300, unlocks: [] });
  const descriptions = [...shop.matchAll(/<article class="screen-card shop-card"[\s\S]*?<p>(.*?)<\/p>/g)]
    .map((match) => match[1]);

  assert.equal(descriptions.length >= 5, true);
  for (const description of descriptions) {
    const compactLength = description.replace(/\s/g, '').length;
    assert.equal(compactLength <= 9, true, `${description} is too long for a portrait shop card`);
    assert.equal(/[.。]/.test(description), false, `${description} reads like paragraph copy`);
  }
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
  assert.equal(missions.includes('class="reward-token mission-reward-token"'), true);
  assert.equal(missions.includes('data-reward-icon="soft_currency"'), true);
  assert.equal(missions.includes('첫 작전 완료'), true);
  assert.equal(missions.includes('유닛 훈련'), true);
  assert.equal(missions.includes('>받음<'), true);
  assert.equal(missions.includes('>수령<'), true);
});

test('meta progression surfaces render compact visual progress bars', () => {
  const collection = buildRebootCollection({ xp: 20, unitLevels: {} });
  const missions = buildMissionScreen({ processedRuns: ['run-1'], unitLevels: {}, unlocks: [], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });

  assert.equal(collection.includes('class="meta-progress" data-progress-kind="training"'), true);
  assert.equal(collection.includes('style="--progress-fill:50%"'), true);
  assert.equal(collection.includes('role="progressbar" aria-valuemin="0" aria-valuemax="40" aria-valuenow="20"'), true);
  assert.equal(collection.includes('aria-label="훈련 경험치 20/40"'), true);
  assert.equal(missions.includes('class="meta-progress" data-progress-kind="mission"'), true);
  assert.equal(missions.includes('style="--progress-fill:100%"'), true);
  assert.equal(missions.includes('role="progressbar" aria-valuemin="0" aria-valuemax="1" aria-valuenow="1"'), true);
  assert.equal(season.includes('class="meta-progress" data-progress-kind="season"'), true);
  assert.equal(season.includes('style="--progress-fill:50%"'), true);
  assert.equal(season.includes('role="progressbar" aria-valuemin="0" aria-valuemax="160" aria-valuenow="80"'), true);
});

test('meta cards render generated state badge hooks for ready owned and locked states', () => {
  const collection = buildRebootCollection({ xp: 80, unitLevels: {} });
  const shop = buildRebootShop({ gems: 300, unlocks: ['mythic-aura'] });
  const missions = buildMissionScreen({ processedRuns: ['run-1'], unitLevels: {}, unlocks: [], claimedMissions: ['train-unit'] });

  assert.equal(collection.includes('class="card-state-badge" data-card-state="ready"'), true);
  assert.equal(shop.includes('data-owned="true"'), true);
  assert.equal(shop.includes('class="card-state-badge" data-card-state="owned"'), true);
  assert.equal(missions.includes('class="card-state-badge" data-card-state="locked"'), true);
});

test('mission goals stay compact enough for portrait mission cards', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: ['mythic-aura'],
    claimedMissions: []
  });
  const goals = [...missions.matchAll(/<article class="screen-card mission-card"[\s\S]*?<p>(.*?)<\/p>/g)]
    .map((match) => match[1]);

  assert.equal(goals.length >= 3, true);
  for (const goal of goals) {
    const compactLength = goal.replace(/\s/g, '').length;
    assert.equal(compactLength <= 8, true, `${goal} is too long for a portrait mission card`);
    assert.equal(/하세요|습니다|[.。]/.test(goal), false, `${goal} reads like paragraph copy`);
  }
});

test('season screen renders pass tiers from profile XP and claim states', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  assert.equal(season.includes('data-pass-claim="0"'), true);
  assert.equal(season.includes('data-pass-claim="1"'), true);
  assert.equal(season.includes('class="reward-token season-reward-token"'), true);
  assert.equal(season.includes('data-reward-icon="season_progress"'), true);
  assert.equal(season.includes('data-reward-icon="cosmetic_shard"'), true);
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

test('meta navigation alerts expose only actionable profile destinations', () => {
  const empty = buildMetaNavAlerts({
    gems: 0,
    xp: 0,
    processedRuns: [],
    claimedMissions: [],
    claimedPassTiers: []
  });

  assert.deepEqual(empty, {
    collection: false,
    shop: false,
    missions: false,
    season: false
  });

  const actionable = buildMetaNavAlerts({
    gems: 90,
    xp: 80,
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: [],
    claimedMissions: [],
    claimedPassTiers: []
  });

  assert.deepEqual(actionable, {
    collection: true,
    shop: true,
    missions: true,
    season: true
  });

  const claimed = buildMetaNavAlerts({
    gems: 20,
    xp: 80,
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 4, toktok_amp: 4, slow_coil: 4, burst_pin: 4, rescue_coil: 4 },
    unlocks: ['founder-board', 'mythic-aura'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0]
  });

  assert.deepEqual(claimed, {
    collection: false,
    shop: false,
    missions: false,
    season: false
  });
});
