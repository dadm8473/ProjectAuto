import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame, mergeRelays, serializeState, supplyRelay, tickGame, castLinkPulse } from '../src/shared/game.js';
import {
  buildMetaNavAlerts,
  buildMissionScreen,
  nextLobbyAction,
  nextLobbyOperation,
  operationForSeedName,
  buildRebootCollection,
  buildRebootLobby,
  buildRebootResultModel,
  buildRebootShop,
  buildSeasonScreen,
  postRewardRoute,
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
  assert.equal(model.code, '작전 성공');
  assert.equal(model.title, '같이 버텼다');
  assert.equal(model.reason.reason, 'partner_rescued');
  assert.equal(model.nextGoal.goal, 'time_next_rescue');
  assert.deepEqual(model.rewards, [{ type: 'soft', amount: 20 }]);
  assert.deepEqual(model.primaryAction, { label: '다시 방어', action: 'retry' });
  assert.deepEqual(model.secondaryAction, { label: '준비실', action: 'home' });
  assert.deepEqual(model.forbiddenActions, []);
});

test('result model promotes ready profile rewards and growth as the primary result action', () => {
  const missionModel = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    seedName: 'tutorial_success',
    profile: {
      gems: 24,
      xp: 60,
      processedRuns: ['run-1'],
      claimedMissions: [],
      claimedPassTiers: []
    }
  });

  assert.equal(missionModel.primaryAction.action, 'claim-missions');
  assert.equal(missionModel.primaryAction.label, '미션 받기');
  assert.equal(missionModel.primaryAction.title, '받을 미션 보상');
  assert.equal(missionModel.primaryAction.ariaLabel, '받을 미션 보상 수령');
  assert.deepEqual(missionModel.secondaryAction, {
    label: '다시 방어',
    action: 'retry',
    title: '보스 막타 작전',
    ariaLabel: '보스 막타 작전 시작'
  });

  const seasonModel = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    seedName: 'tutorial_success',
    profile: {
      gems: 24,
      xp: 80,
      processedRuns: ['run-1'],
      claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
      claimedPassTiers: []
    }
  });

  assert.equal(seasonModel.primaryAction.action, 'claim-season');
  assert.equal(seasonModel.primaryAction.label, '시즌 받기');
  assert.equal(seasonModel.primaryAction.title, '시즌 보상 도착');
  assert.equal(seasonModel.primaryAction.ariaLabel, '시즌 보상 도착 수령');
  assert.equal(seasonModel.secondaryAction.action, 'retry');

  const trainingModel = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    seedName: 'tutorial_success',
    profile: {
      gems: 24,
      xp: 60,
      processedRuns: ['run-1'],
      claimedMissions: ['first-run'],
      claimedPassTiers: [0]
    }
  });

  assert.equal(trainingModel.primaryAction.action, 'collection');
  assert.equal(trainingModel.primaryAction.label, '유닛 강화');
  assert.equal(trainingModel.primaryAction.ariaLabel, '유닛 강화 가능 열기');
  assert.equal(trainingModel.secondaryAction.action, 'retry');

  const shopModel = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    seedName: 'tutorial_success',
    profile: {
      gems: 200,
      xp: 0,
      processedRuns: ['run-1'],
      claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
      claimedPassTiers: [0, 1, 2, 3],
      unitLevels: { spark_pin: 20 }
    }
  });

  assert.equal(shopModel.primaryAction.action, 'shop');
  assert.equal(shopModel.primaryAction.label, '외형 해금');
  assert.equal(shopModel.primaryAction.ariaLabel, '외형 해금 가능 열기');
  assert.equal(shopModel.secondaryAction.action, 'retry');
});

test('lobby next action maps each priority to a generated beacon key', () => {
  const allClaimed = {
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  };

  assert.equal(nextLobbyAction({ processedRuns: ['run-1'] }).beacon, 'mission');
  assert.equal(nextLobbyAction({ ...allClaimed, xp: 80, claimedPassTiers: [] }).beacon, 'season');
  assert.equal(nextLobbyAction({ ...allClaimed, xp: 40 }).beacon, 'training');
  assert.equal(nextLobbyAction({ ...allClaimed, gems: 1_000, unlocks: [] }).beacon, 'shop');
  assert.equal(nextLobbyAction(allClaimed).beacon, 'battle');
});

test('lobby operation advances through authored combat beats after runs', () => {
  const first = nextLobbyOperation({ processedRuns: [] });
  const boss = nextLobbyOperation({ processedRuns: ['run-1'] });
  const recovery = nextLobbyOperation({ processedRuns: ['run-1', 'run-2'] });
  const final = nextLobbyOperation({ processedRuns: ['run-1', 'run-2', 'run-3', 'run-4', 'run-5'] });

  assert.deepEqual(
    {
      seedName: first.seedName,
      title: first.title,
      detail: first.detail,
      cta: first.cta,
      launchAriaLabel: first.launchAriaLabel
    },
    {
      seedName: 'tutorial_success',
      title: '첫 구원 작전',
      detail: '동료 구원',
      cta: '출격',
      launchAriaLabel: '첫 구원 작전 출격'
    }
  );
  assert.equal(boss.seedName, 'lucky_clutch');
  assert.equal(boss.title, '보스 막타 작전');
  assert.equal(boss.poster, 'boss');
  assert.equal(boss.step, 2);
  assert.equal(boss.total, 4);
  assert.equal(recovery.seedName, 'bad_recoverable');
  assert.equal(recovery.title, '역전 구원 작전');
  assert.equal(recovery.poster, 'recovery');
  assert.equal(final.seedName, 'boss_clutch');
  assert.equal(final.title, '보스 대응 작전');
  assert.equal(final.poster, 'response');
});

test('post reward route keeps the reward loop moving to the next useful screen', () => {
  const allMissionsClaimed = {
    processedRuns: ['run-1'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    unlocks: []
  };

  assert.equal(
    postRewardRoute({ ...allMissionsClaimed, xp: 60, claimedPassTiers: [] }, 'missions'),
    'season'
  );
  assert.equal(
    postRewardRoute({ ...allMissionsClaimed, xp: 60, claimedPassTiers: [0, 1, 2, 3] }, 'missions'),
    'collection'
  );
  assert.equal(
    postRewardRoute({ ...allMissionsClaimed, xp: 0, gems: 1_000, claimedPassTiers: [0, 1, 2, 3], unitLevels: { spark_pin: 20 } }, 'missions'),
    'shop'
  );
  assert.equal(
    postRewardRoute({ ...allMissionsClaimed, xp: 0, gems: 0, claimedPassTiers: [0, 1, 2, 3], unitLevels: { spark_pin: 20 } }, 'missions'),
    'missions'
  );
});

test('result model exposes loss status for generated result badges', () => {
  const model = buildRebootResultModel({ result: { status: 'lost', reason: 'boss_leaked' } });

  assert.equal(model.status, 'lost');
  assert.equal(model.code, '작전 실패');
  assert.equal(model.title, '거의 버텼다');
  assert.equal(model.highlight.kind, 'danger');
  assert.deepEqual(model.primaryAction, { label: '다시 도전', action: 'retry' });
  assert.deepEqual(model.secondaryAction, { label: '준비실', action: 'home' });
  assert.deepEqual(model.forbiddenActions, []);
});

test('result model maps the key run moment to a generated medal type', () => {
  const rescue = buildRebootResultModel({ result: { status: 'won', reason: 'partner_rescued' } });
  const boss = buildRebootResultModel({ result: { status: 'won', reason: 'boss_final_hit' } });
  const tactics = buildRebootResultModel({ result: { status: 'lost', reason: 'merge_gap' } });

  assert.equal(rescue.highlight.medal, 'rescue');
  assert.equal(boss.highlight.medal, 'boss');
  assert.equal(tactics.highlight.medal, 'tactics');
});

test('boss result model exposes generated boss loot presentation', () => {
  const boss = buildRebootResultModel({
    result: { status: 'won', reason: 'boss_final_hit' },
    rewards: [{ type: 'soft', amount: 24 }]
  });
  const slowed = buildRebootResultModel({
    result: { status: 'won', reason: 'boss_slowed' },
    rewards: [{ type: 'soft', amount: 24 }]
  });
  const rescue = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    rewards: [{ type: 'soft', amount: 24 }]
  });

  assert.equal(boss.rewardTone, 'boss');
  assert.equal(boss.rewardIcon, 'unlock_capsule');
  assert.equal(boss.rewardLabel, '전리품');
  assert.equal(slowed.rewardTone, 'boss');
  assert.equal(slowed.rewardIcon, 'unlock_capsule');
  assert.equal(slowed.rewardLabel, '전리품');
  assert.equal(rescue.rewardTone, 'standard');
  assert.equal(rescue.rewardIcon, 'soft_currency');
  assert.equal(rescue.rewardLabel, '획득');
});

test('result model preserves multiple run highlights for generated result strips', () => {
  const model = buildRebootResultModel({
    result: {
      status: 'won',
      reason: 'partner_rescued',
      highlights: ['bad_roll_recovered', 'partner_rescued']
    }
  });

  assert.deepEqual(
    model.highlights.map((highlight) => ({ label: highlight.label, medal: highlight.medal })),
    [
      { label: '약한 운 회복', medal: 'tactics' },
      { label: '결정적 구원', medal: 'rescue' }
    ]
  );
  assert.deepEqual(model.highlight, model.highlights[0]);
});

test('result model separates victory reason from memorable rescue highlight copy', () => {
  const model = buildRebootResultModel({
    result: {
      status: 'won',
      reason: 'partner_rescued',
      highlights: ['partner_rescued']
    }
  });

  assert.equal(model.reason.label, '파트너 구원 성공');
  assert.equal(model.highlights[0].label, '결정적 구원');
  assert.notEqual(model.highlights[0].label, model.reason.label);
});

test('operation title lookup exposes the active combat beat for the battle HUD', () => {
  assert.equal(operationForSeedName('tutorial_success').title, '첫 구원 작전');
  assert.equal(operationForSeedName('tutorial_success').hudTitle, '첫 구원');
  assert.equal(operationForSeedName('lucky_clutch').title, '보스 막타 작전');
  assert.equal(operationForSeedName('lucky_clutch').hudTitle, '보스 막타');
  assert.equal(operationForSeedName('boss_clutch').title, '보스 대응 작전');
  assert.equal(operationForSeedName('boss_clutch').hudTitle, '보스 대응');
  assert.equal(operationForSeedName('unknown_seed').title, '신호릴레이');
  assert.equal(operationForSeedName('unknown_seed').hudTitle, '신호릴레이');
});

test('result primary action keeps the next authored operation as button context after a win', () => {
  const next = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued' },
    seedName: 'tutorial_success'
  }).primaryAction;
  const loss = buildRebootResultModel({
    result: { status: 'lost', reason: 'boss_leaked' },
    seedName: 'tutorial_success'
  }).primaryAction;

  assert.deepEqual(next, {
    label: '다시 방어',
    action: 'retry',
    title: '보스 막타 작전',
    ariaLabel: '보스 막타 작전 시작'
  });
  assert.deepEqual(loss, { label: '다시 도전', action: 'retry' });
});

test('result next-goal copy stays compact for generated result plates', () => {
  assert.equal(
    buildRebootResultModel({ result: { status: 'won', reason: 'partner_rescued', nextGoal: 'time_next_rescue' } }).nextGoal.label,
    '위험 80 직전 구원'
  );

  assert.equal(
    buildRebootResultModel({ result: { status: 'lost', reason: 'boss_leaked', nextGoal: 'answer_boss_warning' } }).nextGoal.label,
    '보스 경고 때 합성'
  );

  const goalKeys = [
    'time_next_rescue',
    'repeat_boss_timing',
    'protect_control_unit',
    'rescue_before_merge_greed',
    'save_rescue_for_partner_danger',
    'answer_boss_warning',
    'focus_boss_damage',
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

test('result next-goal exposes a generated tactical slot tone', () => {
  const rescue = buildRebootResultModel({
    result: { status: 'won', reason: 'partner_rescued', nextGoal: 'time_next_rescue' }
  }).nextGoal;
  const boss = buildRebootResultModel({
    result: { status: 'lost', reason: 'boss_leaked', nextGoal: 'answer_boss_warning' }
  }).nextGoal;
  const tactics = buildRebootResultModel({
    result: { status: 'lost', reason: 'merge_gap', nextGoal: 'protect_control_unit' }
  }).nextGoal;
  const fallback = buildRebootResultModel({
    result: { status: 'lost', reason: 'bad_luck' }
  }).nextGoal;

  assert.deepEqual(rescue, {
    label: '위험 80 직전 구원',
    goal: 'time_next_rescue',
    tone: 'rescue'
  });
  assert.deepEqual(boss, {
    label: '보스 경고 때 합성',
    goal: 'answer_boss_warning',
    tone: 'boss'
  });
  assert.deepEqual(tactics, {
    label: '느림 코일 생존',
    goal: 'protect_control_unit',
    tone: 'tactics'
  });
  assert.deepEqual(fallback, {
    label: '핵심 타이밍 재도전',
    goal: 'retry',
    tone: 'tactics'
  });
});

test('result reason copy stays compact for generated result plates', () => {
  const reasons = [
    'partner_rescued',
    'boss_final_hit',
    'boss_slowed',
    'greed',
    'rescue_missed',
    'boss_leaked',
    'boss_unfinished',
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

test('retry advances bot runs through authored seeds without opening monetization paths', () => {
  const previousGame = runTutorial();
  const retry = buildRebootResultModel({ result: previousGame.result }).primaryAction;
  const nextGame = startRebootRetry({ previousGame, action: retry });
  nextGame.result = { status: 'won', reason: 'boss_final_hit' };
  const thirdGame = startRebootRetry({ previousGame: nextGame, action: retry });
  thirdGame.result = { status: 'won', reason: 'boss_slowed' };
  const fourthGame = startRebootRetry({ previousGame: thirdGame, action: retry });
  fourthGame.result = { status: 'won', reason: 'boss_final_hit' };
  const wrappedGame = startRebootRetry({ previousGame: fourthGame, action: retry });
  const nextState = serializeState(nextGame);

  assert.notEqual(nextGame.runId, previousGame.runId);
  assert.equal(nextGame.seedName, 'lucky_clutch');
  assert.equal(thirdGame.seedName, 'bad_recoverable');
  assert.equal(fourthGame.seedName, 'boss_clutch');
  assert.equal(wrappedGame.seedName, 'tutorial_success');
  assert.equal(nextGame.seed, previousGame.seed + 1);
  assert.equal(wrappedGame.result, null);
  assert.equal(nextGame.events.length, 0);
  assert.equal(nextGame.now, 0);
  assert.equal(nextGame.resources.p1.summon, 10);
  assert.equal(nextState.actionState.p1.summon, true);
});

test('retry preserves non-bot or unlisted seed identity while still creating a fresh run', () => {
  const onlineGame = createGame({ mode: 'online', seedName: 'boss_clutch', seed: 40, branch: 'merge' });
  const onlineRetry = startRebootRetry({ previousGame: onlineGame, action: { action: 'retry' } });
  const unlistedGame = createGame({ mode: 'bot', seedName: 'greed_loss', seed: 50 });
  const unlistedRetry = startRebootRetry({ previousGame: unlistedGame, action: { action: 'retry' } });

  assert.equal(onlineRetry.seedName, 'boss_clutch');
  assert.equal(onlineRetry.branch, 'merge');
  assert.equal(onlineRetry.seed, 41);
  assert.equal(unlistedRetry.seedName, 'greed_loss');
  assert.equal(unlistedRetry.seed, 51);
  assert.notEqual(onlineRetry.runId, onlineGame.runId);
  assert.notEqual(unlistedRetry.runId, unlistedGame.runId);
});

test('retry repeats a failed authored bot operation instead of advancing the sequence', () => {
  const failedBoss = createGame({ mode: 'bot', seedName: 'boss_clutch', seed: 60, branch: 'wait' });
  failedBoss.result = { status: 'lost', reason: 'boss_leaked' };
  const retry = startRebootRetry({ previousGame: failedBoss, action: { action: 'retry' } });

  assert.equal(retry.seedName, 'boss_clutch');
  assert.equal(retry.branch, 'wait');
  assert.equal(retry.seed, 61);
  assert.equal(retry.result, null);
  assert.notEqual(retry.runId, failedBoss.runId);
});

test('retry carries the previous result reason and next goal into the fresh run', () => {
  const failedBoss = createGame({ mode: 'bot', seedName: 'boss_clutch', seed: 60, branch: 'wait' });
  failedBoss.result = { status: 'lost', reason: 'boss_leaked', nextGoal: 'answer_boss_warning' };
  const retry = startRebootRetry({ previousGame: failedBoss, action: { action: 'retry' } });
  const serialized = serializeState(retry);

  assert.deepEqual(retry.retryContext, {
    status: 'lost',
    reason: 'boss_leaked',
    nextGoal: 'answer_boss_warning'
  });
  assert.deepEqual(serialized.retryContext, retry.retryContext);
  assert.equal(retry.result, null);
});

test('reboot shop renders earned-gem cosmetic purchases with owned and locked states', () => {
  const shop = buildRebootShop({ gems: 90, unlocks: ['founder-board'] });

  assert.equal(shop.includes('data-shop-buy="mythic-aura"'), true);
  assert.equal(shop.includes('data-shop-buy="founder-board"'), true);
  assert.equal(shop.includes('data-shop-cosmetic="mythic-aura"'), true);
  assert.equal(shop.includes('data-shop-cosmetic="founder-board"'), true);
  assert.equal(shop.includes('data-owned="true"'), true);
  assert.equal(shop.includes('90 보석'), true);
  assert.equal(shop.includes('140 보석'), true);
  assert.equal(shop.includes('>해금<'), true);
  assert.equal(shop.includes('>착용<'), true);
  assert.equal(shop.includes('lucky-cache'), false);
  assert.equal(shop.includes('run_boost'), false);
});

test('reboot shop opens with a featured cosmetic offer instead of only shelf cards', () => {
  const shop = buildRebootShop({ gems: 120, unlocks: [] });

  assert.equal(shop.includes('class="meta-showcase shop-feature-showcase"'), true);
  assert.equal(shop.includes('data-featured-shop="mythic-aura"'), true);
  assert.equal(shop.includes('data-featured-state="ready"'), true);
  assert.equal(shop.includes('class="meta-showcase-preview shop-feature-pedestal"'), true);
  assert.equal(shop.includes('class="featured-shop-action" data-shop-buy="mythic-aura"'), true);
  assert.equal(shop.indexOf('class="meta-showcase shop-feature-showcase"') < shop.indexOf('class="meta-shelf-grid" data-shelf-kind="shop"'), true);
});

test('equipped shop feature shows generated aura and passive equipped state', () => {
  const shop = buildRebootShop({
    gems: 0,
    unlocks: ['mythic-aura'],
    equippedCosmetic: 'mythic-aura'
  });

  assert.equal(shop.includes('data-featured-shop="mythic-aura"'), true);
  assert.equal(shop.includes('data-featured-state="equipped"'), true);
  assert.equal(shop.includes('class="cosmetic-equip-aura shop-feature-aura"'), true);
  assert.equal(shop.includes('class="card-passive-state featured-shop-passive" data-passive-state="owned" aria-label="장착중">장착중</span>'), true);
  assert.equal(shop.includes('class="featured-shop-action"'), false);
});

test('shop surfaces clarify cosmetic purchases do not sell combat power', () => {
  const shop = buildRebootShop({ gems: 90, unlocks: [] });

  assert.equal((shop.match(/data-shop-purpose="cosmetic-only"/g) ?? []).length, 6);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="외형 전용 · 전투력 영향 없음">외형만</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="전투력 영향 없음">전투력 0</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip">외형 전용</span>'), false);
  assert.equal((shop.match(/<span class="role-pill" aria-label="외형 전용 · 전투력 영향 없음">외형만<\/span>/g) ?? []).length, 5);
  assert.equal(
    shop.includes('aria-label="추천 외형 신화 오라 · 코어 릴레이 오라 · 외형 전용 · 전투력 영향 없음 · 보유 90 보석 · 가격 90 보석 · 해금 가능"'),
    true
  );
  assert.equal(
    shop.includes('aria-label="신화 오라 · 코어 릴레이 오라 · 외형 전용 · 전투력 영향 없음 · 해금 비용 90 보석 · 해금 가능"'),
    true
  );
});

test('reboot collection renders unit upgrade state from profile XP and levels', () => {
  const collection = buildRebootCollection({ xp: 50, unitLevels: { spark_pin: 2 } });

  assert.equal(collection.includes('data-unit-card="spark_pin"'), true);
  assert.equal(collection.includes('data-unit-card="mirror_port"'), true);
  assert.equal(collection.includes('data-unit-card="bloom_amp"'), true);
  assert.equal(collection.includes('data-unit-card="nova_mast"'), true);
  assert.equal(collection.includes('Lv.2'), true);
  assert.equal(collection.includes('60 경험치'), true);
  assert.equal(collection.includes('>강화<'), true);
  assert.equal(collection.includes('data-unit-upgrade="burst_pin"'), true);
  assert.equal(collection.includes('40 경험치'), true);
  assert.equal(collection.includes('aria-label="경험치 부족"'), true);
  assert.equal(collection.includes('>부족<'), true);
  assert.equal(collection.includes('>경험치 부족<'), false);
});

test('reboot collection opens with a featured upgrade command instead of only unit shelf cards', () => {
  const collection = buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 2 } });

  assert.equal(collection.includes('class="meta-showcase unit-feature-showcase"'), true);
  assert.equal(collection.includes('data-featured-unit="spark_pin"'), true);
  assert.equal(collection.includes('data-featured-state="ready"'), true);
  assert.equal(collection.includes('class="meta-showcase-preview unit-feature-pedestal"'), true);
  assert.equal(collection.includes('class="unit-feature-ring"'), true);
  assert.equal(collection.includes('class="featured-unit-action" data-unit-upgrade="spark_pin"'), true);
  assert.equal(collection.indexOf('class="meta-showcase unit-feature-showcase"') < collection.indexOf('class="meta-shelf-grid" data-shelf-kind="collection"'), true);
});

test('locked collection feature uses a passive generated command state', () => {
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });

  assert.equal(collection.includes('class="meta-showcase unit-feature-showcase"'), true);
  assert.equal(collection.includes('data-featured-unit="spark_pin"'), true);
  assert.equal(collection.includes('data-featured-state="locked"'), true);
  assert.equal(collection.includes('class="unit-feature-ring"'), true);
  assert.equal(collection.includes('class="card-passive-state featured-unit-passive" data-passive-state="locked" aria-label="경험치 부족">부족</span>'), true);
  assert.equal(collection.includes('class="featured-unit-action"'), false);
});

test('inactive meta states render as passive chips instead of disabled fake action buttons', () => {
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const shop = buildRebootShop({ gems: 0, unlocks: [] });
  const missions = buildMissionScreen({ processedRuns: [], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 0, claimedPassTiers: [] });

  for (const html of [collection, shop, missions, season]) {
    assert.equal(html.includes('disabled>'), false);
    assert.equal(html.includes('class="card-passive-state"'), true);
  }

  assert.equal((collection.match(/<button type="button" data-unit-upgrade=/g) ?? []).length, 0);
  assert.equal((shop.match(/<button type="button" data-shop-buy=/g) ?? []).length, 0);
  assert.equal((missions.match(/<button type="button" data-mission-claim=/g) ?? []).length, 0);
  assert.equal((season.match(/<button type="button" data-pass-claim=/g) ?? []).length, 0);
});

test('locked unit and shop rows use short visual state tokens instead of repeated shortage copy', () => {
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const shop = buildRebootShop({ gems: 0, unlocks: [] });

  assert.equal(collection.includes('aria-label="경험치 부족"'), true);
  assert.equal(shop.includes('aria-label="보석 부족"'), true);
  assert.equal(collection.includes('>경험치 부족<'), false);
  assert.equal(shop.includes('>보석 부족<'), false);
  assert.equal((collection.match(/class="card-passive-state" data-passive-state="locked" aria-label="경험치 부족">부족/g) ?? []).length >= 1, true);
  assert.equal((shop.match(/class="card-passive-state" data-passive-state="locked" aria-label="보석 부족">부족/g) ?? []).length >= 1, true);
});

test('meta screens start with compact actionable status headers', () => {
  const collection = buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 2 } });
  assert.equal(collection.includes('meta-showcase'), true);
  assert.equal(collection.includes('대표 유닛'), true);
  assert.equal(collection.includes('XP 60/60'), true);

  const shop = buildRebootShop({ gems: 100, unlocks: [] });
  assert.equal(shop.includes('meta-showcase'), true);
  assert.equal(shop.includes('추천 외형'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="외형 전용 · 전투력 영향 없음">외형만</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="전투력 영향 없음">전투력 0</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="보유 100 보석">보유 100</span>'), false);
  assert.equal(shop.includes('class="shop-price shop-feature-price" aria-label="해금 비용 90 보석">90</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="가격 90 보석">가격 90</span>'), false);

  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    claimedMissions: []
  });
  assert.equal(missions.includes('mission-stamp-board'), true);
  assert.equal(missions.includes('수령 가능'), true);
  assert.equal(missions.indexOf('class="mission-stamp-board"') < missions.indexOf('class="screen-card mission-card"'), true);

  const season = buildSeasonScreen({
    xp: 60,
    claimedPassTiers: []
  });
  assert.equal(season.includes('season-track-board'), true);
  assert.equal(season.includes('시즌 경험치'), true);
  assert.equal(season.includes('보상 가능'), true);
  assert.equal(season.indexOf('class="season-track-board"') < season.indexOf('class="screen-card season-card"'), true);
});

test('meta summary detail copy stays compact for generated header banners', () => {
  const screens = [
    { html: buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 2 } }), pattern: /<section class="meta-showcase(?: [^"]*)?"[\s\S]*?<p>(.*?)<\/p>/ },
    { html: buildRebootShop({ gems: 100, unlocks: [] }), pattern: /<section class="meta-showcase(?: [^"]*)?"[\s\S]*?<p>(.*?)<\/p>/ },
    { html: buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] }), pattern: /<section class="mission-stamp-board"[\s\S]*?<p>(.*?)<\/p>/ },
    { html: buildSeasonScreen({ xp: 60, claimedPassTiers: [] }), pattern: /<section class="season-track-board"[\s\S]*?<p>(.*?)<\/p>/ }
  ];
  const details = screens.map(({ html, pattern }) => {
    const match = html.match(pattern);
    assert.ok(match, 'meta summary detail is missing');
    return match[1];
  });

  for (const detail of details) {
    const compactLength = detail.replace(/\s/g, '').length;
    assert.equal(compactLength <= 12, true, `${detail} is too long for a meta header banner`);
    assert.equal(/하세요|습니다|[.。]/.test(detail), false, `${detail} reads like paragraph copy`);
  }
});

test('collection and shop showcases split numeric state into compact game badges', () => {
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const shop = buildRebootShop({ gems: 0, unlocks: [] });

  assert.equal(collection.includes('class="meta-showcase-stats"'), true);
  assert.equal(collection.includes('<span class="meta-showcase-chip" aria-label="레벨 1">Lv.1</span>'), true);
  assert.equal(collection.includes('<span class="meta-showcase-chip" aria-label="강화 경험치 0/40">XP 0/40</span>'), true);
  assert.equal(collection.includes('<span class="meta-showcase-chip">0/40 경험치</span>'), false);
  assert.equal(collection.includes('Lv.1 · XP 0/40'), false);
  assert.equal(collection.includes('Lv.1 · 0/40 경험치'), false);

  assert.equal(shop.includes('class="meta-showcase-stats"'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="외형 전용 · 전투력 영향 없음">외형만</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="전투력 영향 없음">전투력 0</span>'), true);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="보유 0 보석">보유 0</span>'), false);
  assert.equal(shop.includes('<span class="meta-showcase-chip">외형 전용</span>'), false);
  assert.equal(shop.includes('<span class="meta-showcase-chip">보유 0 보석</span>'), false);
  assert.equal(shop.includes('<span class="meta-showcase-chip" aria-label="가격 90 보석">가격 90</span>'), false);
  assert.equal(shop.includes('<span class="meta-showcase-chip">가격 90 보석</span>'), false);
  assert.equal(shop.includes('0 보석 보유 · 90 보석'), false);
  assert.equal(shop.includes('젬'), false);
});

test('collection showcase names upgrade availability as game-state copy instead of awkward person count', () => {
  const idleCollection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const readyCollection = buildRebootCollection({ xp: 40, unitLevels: {} });

  assert.equal(idleCollection.includes('<p>공격 · 피해</p>'), true);
  assert.equal(idleCollection.includes('<p>공격 유닛</p>'), false);
  assert.equal(idleCollection.includes('공격 · 강화 대기'), false);
  assert.equal(idleCollection.includes('0명 강화 가능'), false);
  assert.equal(readyCollection.includes('8기 강화 가능'), false);
  assert.equal(readyCollection.includes('명 강화 가능'), false);
});

test('collection and shop shelf price chips show numbers while preserving accessible meaning', () => {
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const shop = buildRebootShop({ gems: 0, unlocks: [] });

  assert.equal(collection.includes('class="unit-cost" aria-label="강화 비용 40 경험치">40</span>'), true);
  assert.equal(collection.includes('class="unit-cost">40 경험치</span>'), false);
  assert.equal(shop.includes('class="shop-price" aria-label="해금 비용 90 보석">90</span>'), true);
  assert.equal(shop.includes('class="shop-price">90 보석</span>'), false);
});

test('unit shelf cards expose compact roles and full accessible state', () => {
  const collection = buildRebootCollection({
    xp: 60,
    unitLevels: { spark_pin: 1 }
  });

  assert.equal(
    collection.includes('aria-label="스파크 핀 · 공격 · 피해 · Lv.1 · 강화 비용 40 경험치 · 강화 가능"'),
    true
  );
  assert.equal(collection.includes('<span class="role-pill" aria-label="공격 역할 · 피해">피해</span>'), true);
  assert.equal(collection.includes('data-role="support"'), true);
  assert.equal(collection.includes('<span class="role-pill" aria-label="지원 역할 · 증폭">증폭</span>'), true);
  assert.equal(collection.includes('data-unit-upgrade="spark_pin" aria-label="스파크 핀 강화"'), true);
  assert.equal(collection.includes('<span class="unit-upgrade-label">강화</span>'), true);
});

test('shop shelf cards expose compact prices and full accessible state', () => {
  const shop = buildRebootShop({
    gems: 90,
    unlocks: ['merge-effect'],
    equippedCosmetic: 'merge-effect'
  });

  assert.equal(
    shop.includes('aria-label="신화 오라 · 코어 릴레이 오라 · 외형 전용 · 전투력 영향 없음 · 해금 비용 90 보석 · 해금 가능"'),
    true
  );
  assert.equal(shop.includes('data-shop-buy="mythic-aura" aria-label="신화 오라 해금">해금<'), true);
  assert.equal(
    shop.includes('aria-label="파운더 보드 · 협동 보드 스킨 · 외형 전용 · 전투력 영향 없음 · 해금 비용 140 보석 · 보석 부족"'),
    true
  );
  assert.equal(
    shop.includes('aria-label="합성 플레어 · 합성 이펙트 · 외형 전용 · 전투력 영향 없음 · 해금 비용 55 보석 · 장착중"'),
    true
  );
});

test('collection and shop items sit inside a generated shelf grid', () => {
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const shop = buildRebootShop({ gems: 0, unlocks: [] });

  assert.equal(collection.includes('class="meta-shelf-grid" data-shelf-kind="collection"'), true);
  assert.equal(shop.includes('class="meta-shelf-grid" data-shelf-kind="shop"'), true);
  assert.equal(collection.indexOf('class="meta-showcase unit-feature-showcase"') < collection.indexOf('class="meta-shelf-grid"'), true);
  assert.equal(shop.indexOf('class="meta-showcase"') < shop.indexOf('class="meta-shelf-grid"'), true);
  assert.equal(collection.indexOf('class="meta-shelf-grid"') < collection.indexOf('class="screen-card unit-card"'), true);
  assert.equal(shop.indexOf('class="meta-shelf-grid"') < shop.indexOf('class="screen-card shop-card"'), true);
});

test('mission and season rows sit inside a generated progress board', () => {
  const missions = buildMissionScreen({ processedRuns: [], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 0, claimedPassTiers: [] });

  assert.equal(missions.includes('class="meta-progress-board" data-progress-board="missions"'), true);
  assert.equal(season.includes('class="meta-progress-board" data-progress-board="season"'), true);
  assert.equal(missions.indexOf('class="mission-stamp-board"') < missions.indexOf('class="meta-progress-board"'), true);
  assert.equal(season.indexOf('class="season-track-board"') < season.indexOf('class="meta-progress-board"'), true);
  assert.equal(missions.indexOf('class="meta-progress-board"') < missions.indexOf('class="screen-card mission-card"'), true);
  assert.equal(season.indexOf('class="meta-progress-board"') < season.indexOf('class="screen-card season-card"'), true);
});

test('season progress board uses compact reward names for phone slots', () => {
  const season = buildSeasonScreen({ xp: 0, claimedPassTiers: [] });

  assert.equal(season.includes('2단계 · 외형'), true);
  assert.equal(season.includes('<strong>1단계 · 20보석</strong>'), true);
  assert.equal(season.includes('<strong>3단계 · 80보석</strong>'), true);
  assert.equal(season.includes('<strong>3단계 · 80 보석</strong>'), false);
  assert.equal(season.includes('외형 보상'), false);
});

test('mission screen starts with a stamp board instead of a web list summary', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: [],
    claimedMissions: ['first-run']
  });

  assert.equal(missions.includes('class="mission-stamp-board"'), true);
  assert.equal(missions.includes('class="mission-stamp-grid"'), true);
  assert.equal((missions.match(/class="mission-stamp-slot"/g) ?? []).length, 3);
  assert.equal(missions.includes('data-mission-state="claimed"'), true);
  assert.equal(missions.includes('data-mission-state="ready"'), true);
  assert.equal(missions.includes('data-mission-state="locked"'), true);
  assert.equal(missions.includes('class="meta-summary screen-card"'), false);
});

test('mission board exposes one dominant claim command when a reward is ready', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: {},
    unlocks: [],
    claimedMissions: []
  });

  assert.equal(missions.includes('class="mission-stamp-board"'), true);
  assert.equal(missions.includes('data-featured-mission="first-run"'), true);
  assert.equal(missions.includes('data-board-state="ready"'), true);
  assert.equal(missions.includes('class="mission-board-command"'), true);
  assert.equal(missions.includes('class="reward-token board-feature-reward" data-reward-icon="soft_currency"'), true);
  assert.equal(missions.includes('class="featured-objective-action" data-mission-claim="first-run"'), true);
  assert.equal(missions.indexOf('class="mission-board-command"') < missions.indexOf('class="meta-progress-board"'), true);
});

test('mission board promotes one readable next condition instead of only a reward count', () => {
  const locked = buildMissionScreen({ processedRuns: [], claimedMissions: [] });
  const ready = buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] });
  const claimed = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: ['mythic-aura'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic']
  });

  assert.equal(locked.includes('class="objective-focus" data-focus-kind="mission" data-focus-state="locked"'), true);
  assert.equal(locked.includes('<span>다음 목표</span>'), true);
  assert.equal(locked.includes('<strong>첫 작전 완료</strong>'), true);
  assert.equal(locked.includes('<p>전투 1회 완료 · 0/1</p>'), true);
  assert.equal(ready.includes('data-focus-kind="mission" data-focus-state="ready"'), true);
  assert.equal(ready.includes('<span>받을 보상</span>'), true);
  assert.equal(ready.includes('<p>20보석 · 1/1</p>'), true);
  assert.equal(claimed.includes('data-focus-kind="mission" data-focus-state="complete"'), true);
  assert.equal(claimed.includes('<strong>모든 미션 완료</strong>'), true);
});

test('ready mission rows use status stamps while the top board owns the claim button', () => {
  const missions = buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] });

  assert.equal((missions.match(/data-mission-claim="/g) ?? []).length, 1);
  assert.equal(missions.includes('class="featured-objective-action" data-mission-claim="first-run"'), true);
  assert.equal(missions.includes('class="card-passive-state" data-passive-state="ready" aria-label="수령 가능">준비</span>'), true);
});

test('mission board uses a passive generated command when no reward is ready', () => {
  const missions = buildMissionScreen({ processedRuns: [], claimedMissions: [] });

  assert.equal(missions.includes('data-board-state="locked"'), true);
  assert.equal(missions.includes('data-featured-mission=""'), true);
  assert.equal(missions.includes('class="card-passive-state featured-objective-passive" data-passive-state="locked" aria-label="진행중">대기</span>'), true);
  assert.equal(missions.includes('aria-label="진행중">진행중</span>'), false);
  assert.equal(missions.includes('class="featured-objective-action"'), false);
});

test('season screen starts with a reward track instead of a web list summary', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  assert.equal(season.includes('class="season-track-board"'), true);
  assert.equal(season.includes('class="season-track-rail"'), true);
  assert.equal((season.match(/class="season-track-node"/g) ?? []).length, 4);
  assert.equal(season.includes('data-season-state="claimed"'), true);
  assert.equal(season.includes('data-season-state="locked"'), true);
  assert.equal(season.includes('data-reward-icon="season_progress"'), true);
  assert.equal(season.includes('data-reward-icon="cosmetic_shard"'), true);
  assert.equal(season.includes('class="meta-summary screen-card"'), false);
});

test('season board exposes one dominant claim command when a reward is ready', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });

  assert.equal(season.includes('class="season-track-board"'), true);
  assert.equal(season.includes('data-featured-tier="0"'), true);
  assert.equal(season.includes('data-board-state="ready"'), true);
  assert.equal(season.includes('class="season-board-command"'), true);
  assert.equal(season.includes('class="reward-token board-feature-reward" data-reward-icon="season_progress"'), true);
  assert.equal(season.includes('class="featured-objective-action" data-pass-claim="0"'), true);
  assert.equal(season.indexOf('class="season-board-command"') < season.indexOf('class="meta-progress-board"'), true);
});

test('season board promotes the current pass target as the largest condition', () => {
  const locked = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });
  const ready = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });
  const complete = buildSeasonScreen({ xp: 520, claimedPassTiers: [0, 1, 2, 3] });

  assert.equal(locked.includes('class="objective-focus" data-focus-kind="season" data-focus-state="locked"'), true);
  assert.equal(locked.includes('<span>다음 보상</span>'), true);
  assert.equal(locked.includes('<strong>2단계 · 외형</strong>'), true);
  assert.equal(locked.includes('<p>80/160 XP</p>'), true);
  assert.equal(ready.includes('data-focus-kind="season" data-focus-state="ready"'), true);
  assert.equal(ready.includes('<span>받을 보상</span>'), true);
  assert.equal(ready.includes('<strong>1단계 · 20보석</strong>'), true);
  assert.equal(ready.includes('<p>20보석 · 60/60 XP</p>'), true);
  assert.equal(complete.includes('data-focus-kind="season" data-focus-state="complete"'), true);
  assert.equal(complete.includes('<strong>시즌 완료</strong>'), true);
});

test('ready season rows use status stamps while the top board owns the claim button', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });

  assert.equal((season.match(/data-pass-claim="/g) ?? []).length, 1);
  assert.equal(season.includes('class="featured-objective-action" data-pass-claim="0"'), true);
  assert.equal(season.includes('class="card-passive-state" data-passive-state="ready" aria-label="수령 가능">준비</span>'), true);
});

test('season board uses a passive generated command when no reward is ready', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  assert.equal(season.includes('data-board-state="locked"'), true);
  assert.equal(season.includes('data-featured-tier=""'), true);
  assert.equal(season.includes('class="card-passive-state featured-objective-passive" data-passive-state="locked" aria-label="보상 없음">대기</span>'), true);
  assert.equal(season.includes('class="featured-objective-action"'), false);
});

test('season reward track marks the current target tier', () => {
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });
  const readySeason = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });

  assert.equal(season.includes('data-pass-tier="1" data-season-current="true" aria-current="step"'), true);
  assert.equal(season.includes('aria-label="2단계 80/160 · 현재 목표"'), true);
  assert.equal((season.match(/data-season-current="true"/g) ?? []).length, 1);
  assert.equal(season.includes('data-season-current="false"'), false);
  assert.equal(readySeason.includes('data-pass-tier="0" data-season-current="true" aria-current="step"'), true);
});

test('season reward track does not mark a current target after every tier is claimed', () => {
  const season = buildSeasonScreen({ xp: 999, claimedPassTiers: [0, 1, 2, 3] });

  assert.equal(season.includes('data-season-current="true"'), false);
  assert.equal(season.includes('aria-current="step"'), false);
  assert.equal(season.includes('현재 목표'), false);
});

test('mission and season top boards keep large copy numeric while preserving full accessible meaning', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    claimedMissions: ['first-run']
  });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  assert.equal(
    missions.includes('class="mission-stamp-board" data-board-kind="missions" data-board-layout="contract-stamps" aria-label="미션 보드 · 수령 가능 1개 · 완료 목표 보상 전환"'),
    true
  );
  assert.equal(missions.includes('<span>수령</span>'), true);
  assert.equal(missions.includes('<span>보상</span>'), false);
  assert.equal(missions.includes('class="objective-focus" data-focus-kind="mission" data-focus-state="ready"'), true);
  assert.equal(missions.includes('<span>받을 보상</span>'), true);
  assert.equal(missions.includes('<strong>1</strong>'), true);
  assert.equal(missions.includes('<p>받기</p>'), true);
  assert.equal(missions.includes('<p>수령 가능</p>'), false);
  assert.equal(missions.includes('<span>보상 대기</span>'), false);
  assert.equal(missions.includes('<strong>1개</strong>'), false);
  assert.equal(missions.includes('완료 목표 보상 전환</p>'), false);

  assert.equal(
    season.includes('class="season-track-board" data-board-kind="season" data-board-layout="season-pass-road" aria-label="시즌 보드 · 시즌 경험치 80 · 대기 보상 없음"'),
    true
  );
  assert.equal(season.includes('<span>시즌 XP</span>'), true);
  assert.equal(season.includes('<strong>80</strong>'), true);
  assert.equal(season.includes('<p>다음 160</p>'), true);
  assert.equal(season.includes('<p>대기</p>'), false);
  assert.equal(season.includes('<p>보상 없음</p>'), false);
  assert.equal(season.includes('<span>시즌 점수</span>'), false);
  assert.equal(season.includes('<strong>80 경험치</strong>'), false);
  assert.equal(season.includes('<p>0개 보상 가능</p>'), false);
});

test('mission top board does not promise a reward claim when none are ready', () => {
  const emptyMissions = buildMissionScreen({ processedRuns: [], claimedMissions: [] });
  const readyMissions = buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] });

  assert.equal(emptyMissions.includes('<span>수령</span>'), true);
  assert.equal(emptyMissions.includes('<span>보상</span>'), false);
  assert.equal(emptyMissions.includes('<span>받을 보상</span>'), false);
  assert.equal(emptyMissions.includes('<strong>0</strong>'), true);
  assert.equal(emptyMissions.includes('aria-label="미션 보드 · 대기 보상 없음 · 완료 목표 보상 전환"'), true);
  assert.equal(emptyMissions.includes('<p>완료 대기</p>'), true);
  assert.equal(emptyMissions.includes('<p>진행</p>'), false);
  assert.equal(emptyMissions.includes('<p>작전 진행</p>'), false);
  assert.equal(emptyMissions.includes('<p>진행중</p>'), false);
  assert.equal(emptyMissions.includes('<p>수령 가능</p>'), false);
  assert.equal(readyMissions.includes('<p>받기</p>'), true);
  assert.equal(readyMissions.includes('<p>수령 가능</p>'), false);
});

test('season top board names empty reward state as no rewards instead of zero claimable rewards', () => {
  const emptySeason = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });
  const readySeason = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });
  const completedSeason = buildSeasonScreen({ xp: 999, claimedPassTiers: [0, 1, 2, 3] });

  assert.equal(emptySeason.includes('aria-label="시즌 보드 · 시즌 경험치 80 · 대기 보상 없음"'), true);
  assert.equal(emptySeason.includes('<p>다음 160</p>'), true);
  assert.equal(emptySeason.includes('<p>대기</p>'), false);
  assert.equal(emptySeason.includes('<p>보상 없음</p>'), false);
  assert.equal(emptySeason.includes('<p>보상 0개</p>'), false);
  assert.equal(readySeason.includes('aria-label="시즌 보드 · 시즌 경험치 80 · 보상 가능 1개"'), true);
  assert.equal(readySeason.includes('<p>받기</p>'), true);
  assert.equal(readySeason.includes('<p>보상 1개</p>'), false);
  assert.equal(completedSeason.includes('aria-label="시즌 보드 · 시즌 경험치 999 · 대기 보상 없음"'), true);
  assert.equal(completedSeason.includes('<p>완료</p>'), true);
  assert.equal(completedSeason.includes('<p>다음 '), false);
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

  assert.equal(missions.includes('data-mission="first-run"'), true);
  assert.equal(missions.includes('data-mission-claim="train-unit"'), true);
  assert.equal(missions.includes('class="reward-token mission-reward-token"'), true);
  assert.equal(missions.includes('data-reward-icon="soft_currency"'), true);
  assert.equal(missions.includes('첫 작전 완료'), true);
  assert.equal(missions.includes('유닛 강화'), true);
  assert.equal(missions.includes('>받음<'), true);
  assert.equal(missions.includes('>받기<'), true);
  assert.equal(missions.includes('>수령</button>'), false);
});

test('mission and season objective rows keep readable labels while reducing visible copy', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: [],
    claimedMissions: ['first-run']
  });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });
  const readySeason = buildSeasonScreen({ xp: 180, claimedPassTiers: [0] });

  assert.equal(missions.includes('aria-label="첫 작전 완료 · 미션 진행 1/1 · 보상 20 보석 · 받음"'), true);
  assert.equal(missions.includes('aria-label="유닛 강화 · 미션 진행 1/1 · 보상 20 보석 · 수령 가능"'), true);
  assert.equal(missions.includes('aria-label="외형 해금 · 미션 진행 0/1 · 보상 25 보석 · 진행중"'), true);
  assert.equal(missions.includes('data-mission-claim="train-unit" aria-label="유닛 강화 보상 20 보석 수령">받기</button>'), true);
  assert.equal(season.includes('aria-label="1단계 · 시즌 경험치 60/60 · 보상 20 보석 · 받음"'), true);
  assert.equal(season.includes('aria-label="2단계 · 시즌 경험치 80/160 · 보상 외형 · 진행중"'), true);
  assert.equal(readySeason.includes('data-pass-claim="1" aria-label="2단계 시즌 보상 외형 수령">받기</button>'), true);
  assert.equal(missions.includes('class="objective-detail"'), true);
  assert.equal(season.includes('class="objective-cost shop-price"'), true);
});

test('meta progression surfaces render compact visual progress bars', () => {
  const collection = buildRebootCollection({ xp: 20, unitLevels: {} });
  const missions = buildMissionScreen({ processedRuns: ['run-1'], unitLevels: {}, unlocks: [], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [] });

  assert.equal(collection.includes('class="meta-progress" data-progress-kind="training"'), true);
  assert.equal(collection.includes('style="--progress-fill:50%"'), true);
  assert.equal(collection.includes('role="progressbar" aria-valuemin="0" aria-valuemax="40" aria-valuenow="20"'), true);
  assert.equal(collection.includes('aria-label="강화 경험치 20/40"'), true);
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

test('shop turns owned cosmetics into equipped expression instead of dead BM cards', () => {
  const shop = buildRebootShop({
    gems: 300,
    unlocks: ['mythic-aura', 'merge-effect'],
    equippedCosmetic: 'mythic-aura'
  });

  assert.equal(shop.includes('data-equipped="true"'), true);
  assert.equal(shop.includes('data-equipped="false"'), true);
  assert.equal(shop.includes('class="cosmetic-equip-aura"'), true);
  assert.equal(shop.includes('data-cosmetic-effect="mythic-aura"'), true);
  assert.equal(shop.includes('class="card-passive-state" data-passive-state="owned" aria-label="장착중">장착중<'), true);
  assert.equal(shop.includes('data-shop-buy="merge-effect" aria-label="합성 플레어 착용">착용<'), true);
  assert.equal(shop.includes('data-shop-buy="founder-board" aria-label="파운더 보드 해금">해금<'), true);
  assert.equal(shop.includes('>보유<'), false);
});

test('mission goals stay compact enough for portrait mission cards', () => {
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: ['mythic-aura'],
    claimedMissions: []
  });
  const goals = [...missions.matchAll(/<article class="screen-card mission-card"[\s\S]*?<p(?: class="objective-detail")?>(.*?)<\/p>/g)]
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

  assert.equal(season.includes('data-pass-tier="0"'), true);
  assert.equal(season.includes('data-pass-tier="1"'), true);
  assert.equal(season.includes('class="reward-token season-reward-token"'), true);
  assert.equal(season.includes('data-reward-icon="season_progress"'), true);
  assert.equal(season.includes('data-reward-icon="cosmetic_shard"'), true);
  assert.equal(season.includes('60 경험치'), true);
  assert.equal(season.includes('160 경험치'), true);
  assert.equal(season.includes('>받음<'), true);
  assert.equal(season.includes('>대기<'), true);
  assert.equal(season.includes('>진행중<'), false);
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
  assert.equal(trainingLobby.includes('강화 가능'), true);

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

test('lobby operation card shows the next authored combat beat', () => {
  const lobby = buildRebootLobby({
    processedRuns: ['run-1'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    unlocks: ['mythic-aura', 'founder-board', 'merge-effect', 'rescue-effect', 'profile-frame'],
    unitLevels: { spark_pin: 20 },
    gems: 0
  });

  assert.equal(lobby.includes('<strong>보스 막타 작전</strong>'), true);
  assert.equal(lobby.includes('<p>소환 · 결정타</p>'), true);
  assert.equal(lobby.includes('data-operation-poster="boss"'), true);
  assert.equal(lobby.includes('reboot-lobby-operation-posters.png?v=operation-posters1'), true);
  assert.equal(lobby.includes('class="operation-progress" aria-label="작전 진행 2/4"'), true);
  assert.equal((lobby.match(/class="operation-progress-node"/g) ?? []).length, 4);
  assert.equal(lobby.includes('data-operation-node="active"'), true);
});

test('lobby operation card presents reward threat and progress as compact game intel chips', () => {
  const lobby = buildRebootLobby({
    processedRuns: ['run-1'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    unlocks: ['mythic-aura', 'founder-board', 'merge-effect', 'rescue-effect', 'profile-frame'],
    unitLevels: { spark_pin: 20 },
    gems: 0
  });

  assert.equal(lobby.includes('class="operation-intel-board" aria-label="작전 정보: 보상 전리품 캡슐, 위협 보스 막타, 진행 2/4"'), true);
  assert.equal(lobby.includes('class="operation-intel-chip" data-operation-intel="reward"'), true);
  assert.equal(lobby.includes('class="operation-intel-icon reward-token" data-reward-icon="unlock_capsule"'), true);
  assert.equal(lobby.includes('class="operation-intel-chip" data-operation-intel="threat"'), true);
  assert.equal(lobby.includes('class="operation-intel-icon operation-intel-enemy" data-enemy-sprite="heavy_noise"'), true);
  assert.equal(lobby.includes('class="operation-intel-chip" data-operation-intel="progress"'), true);
  assert.equal(lobby.includes('<b>2/4</b>'), true);
  assert.equal(lobby.includes('<span>협동 작전</span>'), false);
  assert.equal(lobby.includes('<span>작전 2</span>'), true);
});

test('lobby briefing strip shows partner readiness and currency without adding commands', () => {
  const lobby = buildRebootLobby({ gems: 240 });

  assert.equal(lobby.includes('class="lobby-intel-strip reward-hook coop-hook" aria-label="동료 준비됨, 보유 보석 240, 외형 해금 전용 재화"'), true);
  assert.equal(lobby.includes('class="lobby-partner-capsule" aria-hidden="true"'), true);
  assert.equal(lobby.includes('class="lobby-partner-avatar" data-sprite="rescue_coil"'), true);
  assert.equal(lobby.includes('<strong class="lobby-partner-name">동료</strong>'), true);
  assert.equal(lobby.includes('<span class="lobby-partner-status">준비</span>'), true);
  assert.equal(lobby.includes('class="lobby-currency-capsule" aria-hidden="true"'), true);
  assert.equal(lobby.includes('class="lobby-currency-icon" data-reward-icon="soft_currency"'), true);
  assert.equal(lobby.includes('<strong class="lobby-currency-value">240</strong>'), true);
  assert.equal(lobby.includes('<span class="lobby-currency-label">보석</span>'), true);
  assert.equal(lobby.includes('</strong><span class="lobby-currency-label">보석</span></span>'), true);
  assert.equal(lobby.includes('class="lobby-partner-action"'), false);
  assert.equal(lobby.includes('<span>보유 보석</span>'), false);
  assert.equal(lobby.includes('lobby-partner-name">린</strong>'), false);
  assert.equal(lobby.includes('젬'), false);
  assert.equal(lobby.includes('<p>외형만 해금</p>'), false);
});

test('lobby profile plate exposes commander rank without adding another command', () => {
  const lobby = buildRebootLobby({
    gems: 24,
    xp: 80,
    processedRuns: ['run-1'],
    claimedMissions: ['first-run'],
    claimedPassTiers: [0]
  });

  assert.equal(lobby.includes('class="lobby-profile-plate" aria-label="지휘관 랭크 Lv.2, 다음 랭크 40/100"'), true);
  assert.equal(lobby.includes('class="lobby-profile-emblem" data-rank-medal="rescue"'), true);
  assert.equal(lobby.includes('<span class="lobby-profile-label">지휘관</span>'), true);
  assert.equal(lobby.includes('<strong>Lv.2</strong>'), true);
  assert.equal(lobby.includes('class="lobby-profile-progress" data-progress-kind="season" style="--profile-progress:40%"'), true);
  assert.equal(lobby.includes('data-lobby-open="profile"'), false);
  assert.equal(lobby.includes('class="lobby-card profile-hook"'), false);
});

test('lobby profile rank plate exposes higher medals and caps max rank progress', () => {
  const tacticsLobby = buildRebootLobby({
    xp: 300,
    processedRuns: ['run-1', 'run-2', 'run-3']
  });

  assert.equal(tacticsLobby.includes('aria-label="지휘관 랭크 Lv.5, 다음 랭크 80/100"'), true);
  assert.equal(tacticsLobby.includes('class="lobby-profile-emblem" data-rank-medal="tactics"'), true);
  assert.equal(tacticsLobby.includes('style="--profile-progress:80%"'), true);

  const bossLobby = buildRebootLobby({
    xp: 500,
    processedRuns: ['run-1', 'run-2', 'run-3', 'run-4', 'run-5']
  });

  assert.equal(bossLobby.includes('aria-label="지휘관 랭크 Lv.9, 다음 랭크 0/100"'), true);
  assert.equal(bossLobby.includes('class="lobby-profile-emblem" data-rank-medal="boss"'), true);
  assert.equal(bossLobby.includes('style="--profile-progress:0%"'), true);

  const cappedLobby = buildRebootLobby({
    xp: 10000,
    processedRuns: []
  });

  assert.equal(cappedLobby.includes('aria-label="지휘관 랭크 Lv.99, 최고 랭크 도달"'), true);
  assert.equal(cappedLobby.includes('<strong>Lv.99</strong>'), true);
  assert.equal(cappedLobby.includes('style="--profile-progress:100%"'), true);
});

test('lobby next action uses compact game-state chips while preserving meaning for assistive tech', () => {
  const missionLobby = buildRebootLobby({
    gems: 24,
    xp: 60,
    processedRuns: ['run-1'],
    claimedMissions: [],
    claimedPassTiers: []
  });

  assert.equal(missionLobby.includes('class="lobby-intel-strip next-hook"'), true);
  assert.equal(missionLobby.includes('aria-label="미션 보상: 받을 미션 보상. 완료 목표 수령"'), true);
  assert.equal(missionLobby.includes('class="lobby-next-state" aria-label="미션 보상">받기</span>'), true);
  assert.equal(missionLobby.includes('class="lobby-next-title">받을 미션 보상</strong>'), true);
  assert.equal(missionLobby.includes('class="lobby-next-action" data-lobby-open="missions" aria-label="미션 보상 수령"'), true);
  assert.equal(missionLobby.includes('<span class="lobby-next-action-label">받기</span>'), true);
  assert.equal(missionLobby.includes('<span class="lobby-next-action-label">수령</span>'), false);
  assert.equal(missionLobby.includes('>보상 보기<'), false);
  assert.equal(missionLobby.includes('<span>미션 보상</span>'), false);

  const seasonLobby = buildRebootLobby({
    gems: 44,
    xp: 80,
    processedRuns: ['run-1'],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: []
  });

  assert.equal(seasonLobby.includes('class="lobby-next-action" data-lobby-open="season" aria-label="시즌 보상 수령"'), true);
  assert.equal(seasonLobby.includes('class="lobby-next-state" aria-label="시즌 보상">받기</span>'), true);
  assert.equal(seasonLobby.includes('<span class="lobby-next-action-label">받기</span>'), true);
  assert.equal(seasonLobby.includes('>열기<'), false);

  const battleLobby = buildRebootLobby({
    gems: 0,
    xp: 0,
    processedRuns: [],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    unlocks: ['mythic-aura', 'founder-board', 'merge-effect', 'rescue-effect', 'profile-frame']
  });

  assert.equal(battleLobby.includes('class="lobby-intel-strip next-hook"'), false);
  assert.equal(battleLobby.includes('data-next-beacon="battle"'), false);
  assert.equal(battleLobby.includes('class="lobby-next-state" aria-label="다음 작전">준비</span>'), false);
  assert.equal(battleLobby.includes('<strong>첫 구원 작전</strong>'), true);
  assert.equal(battleLobby.includes('<p>동료 구원</p>'), true);
  assert.equal(battleLobby.includes('<span>다음 작전</span>'), false);
});

test('battle-ready lobby keeps launch intent in the operation poster and launch console only', () => {
  const lobby = buildRebootLobby({
    gems: 0,
    xp: 0,
    processedRuns: [],
    claimedMissions: ['first-run', 'train-unit', 'unlock-cosmetic'],
    claimedPassTiers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    unlocks: ['mythic-aura', 'founder-board', 'merge-effect', 'rescue-effect', 'profile-frame']
  });

  assert.equal(lobby.includes('class="lobby-intel-strip next-hook"'), false);
  assert.equal(lobby.includes('data-next-beacon="battle"'), false);
  assert.equal(lobby.includes('class="lobby-battle-cue"'), false);
  assert.equal(lobby.includes('data-lobby-open="battle"'), false);
  assert.equal(lobby.includes('>출전<'), false);
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
    unitLevels: {
      spark_pin: 4,
      toktok_amp: 4,
      slow_coil: 4,
      burst_pin: 4,
      rescue_coil: 4,
      mirror_port: 4,
      bloom_amp: 4,
      nova_mast: 4
    },
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
