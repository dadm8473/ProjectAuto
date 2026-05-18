import {
  REBOOT_ENEMIES,
  REBOOT_RULES,
  REBOOT_SEEDS,
  REBOOT_UNITS,
  REBOOT_WAVES
} from './reboot_content.js';

let nextRunId = 1;
let nextEffectId = 1;
const BOSS_DECISION_START = 92;
const BOSS_DECISION_END = 102;
const HIT_EFFECT_INTERVAL = 0.48;
const HIT_EFFECT_TTL = 0.62;

const BOT_PARTNER_SCRIPT = [
  { at: 10, unitId: 'spark_pin', highlight: false },
  { at: 46, unitId: 'slow_coil', highlight: true },
  { at: 88, unitId: 'rescue_coil', action: 'rescue', highlight: true }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBoard(playerId) {
  return {
    playerId,
    units: [],
    danger: 0
  };
}

function createPlayerResources() {
  return {
    summon: REBOOT_RULES.summon.startCurrency,
    rescue: 0
  };
}

function event(game, payload) {
  game.events.push({
    at: Number(game.now.toFixed(2)),
    ...payload
  });
}

function result(game, status, reason, highlights = [reason]) {
  if (game.result) return game.result;
  game.over = true;
  game.won = status === 'won';
  game.result = {
    status,
    reason,
    nextGoal: nextGoalForReason(reason),
    highlights
  };
  event(game, { type: 'result', reason, highlight: status === 'won' });
  refreshActionState(game);
  return game.result;
}

function nextGoalForReason(reason) {
  return {
    boss_final_hit: 'repeat_boss_timing',
    boss_slowed: 'protect_control_unit',
    partner_rescued: 'time_next_rescue',
    greed: 'rescue_before_merge_greed',
    rescue_missed: 'save_rescue_for_partner_danger',
    boss_leaked: 'answer_boss_warning',
    merge_gap: 'merge_before_boss',
    bad_luck: 'turn_bad_rolls_into_utility'
  }[reason] ?? 'retry_first_120_seconds';
}

function player(game, playerId) {
  return game.boards[playerId] ? playerId : 'p1';
}

function nextScriptUnit(game, playerId) {
  if (isBossDecisionWindow(game)) {
    if (game.branch === 'summonSlow') return 'slow_coil';
    if (game.branch === 'summonBurst') return 'burst_pin';
  }
  const seed = REBOOT_SEEDS[game.seedName] ?? REBOOT_SEEDS.tutorial_success;
  const index = game.internal.summonIndexes[playerId] ?? 0;
  const summons = seed.script?.summons ?? ['spark_pin'];
  return summons[index] ?? summons[summons.length - 1] ?? 'spark_pin';
}

function nextMergeUnit(game) {
  if (isBossDecisionWindow(game)) return 'burst_pin';
  const seed = REBOOT_SEEDS[game.seedName] ?? REBOOT_SEEDS.tutorial_success;
  const index = game.internal.mergeIndex ?? 0;
  const merges = seed.script?.merges ?? ['burst_pin'];
  return merges[index] ?? merges[merges.length - 1] ?? 'burst_pin';
}

function makeUnit(unitId, owner, sequence) {
  const spec = REBOOT_UNITS[unitId] ?? REBOOT_UNITS.spark_pin;
  return {
    id: `${owner}-${sequence}-${unitId}`,
    unitId,
    owner,
    grade: spec.grade,
    role: spec.role,
    spriteKey: spec.spriteKey
  };
}

function mergeCandidateIndexes(board) {
  const gradeCounts = new Map();
  const gradeIndexes = new Map();
  for (const [index, unit] of board.units.entries()) {
    if (unit.grade >= 2) continue;
    gradeCounts.set(unit.grade, (gradeCounts.get(unit.grade) ?? 0) + 1);
    if (!gradeIndexes.has(unit.grade)) gradeIndexes.set(unit.grade, []);
    gradeIndexes.get(unit.grade).push(index);
  }
  const readyGrade = [...gradeCounts.entries()]
    .find(([, count]) => count >= REBOOT_RULES.merge.requiredSameGrade)?.[0];
  return readyGrade == null ? [] : gradeIndexes.get(readyGrade).slice(0, REBOOT_RULES.merge.requiredSameGrade);
}

function hasMergeCandidate(board) {
  return mergeCandidateIndexes(board).length >= REBOOT_RULES.merge.requiredSameGrade;
}

function refreshActionState(game) {
  for (const playerId of Object.keys(game.boards)) {
    const board = game.boards[playerId];
    const resources = game.resources[playerId];
    game.actionState[playerId] = {
      summon: !game.result && resources.summon >= REBOOT_RULES.summon.cost,
      merge: !game.result && (hasMergeCandidate(board) || canBossMerge(game)),
      rescue: !game.result && resources.rescue >= REBOOT_RULES.rescue.chargeRequired
    };
  }
}

function canBossMerge(game) {
  return isBossDecisionWindow(game);
}

function isBossDecisionWindow(game) {
  return game.seedName === 'boss_clutch' && game.now >= BOSS_DECISION_START && game.now < BOSS_DECISION_END;
}

function applyTimedResources(game) {
  for (const grant of REBOOT_RULES.summon.grants) {
    if (game.now >= grant.at && !game.internal.grantsApplied.includes(grant.at)) {
      game.internal.grantsApplied.push(grant.at);
      for (const resources of Object.values(game.resources)) {
        resources.summon += grant.amount;
      }
      event(game, { type: 'summon_grant', amount: grant.amount });
    }
  }

  if (!game.internal.rescued && game.now >= REBOOT_RULES.rescue.passiveChargeAt) {
    for (const resources of Object.values(game.resources)) {
      resources.rescue = Math.max(resources.rescue, REBOOT_RULES.rescue.passiveChargeAmount);
    }
  }

  const rescueReadyAt = game.seedName === 'tutorial_success'
    ? REBOOT_RULES.rescue.tutorialWindowStart
    : 70;
  if (!game.internal.rescued && game.now >= rescueReadyAt) {
    for (const resources of Object.values(game.resources)) {
      resources.rescue = REBOOT_RULES.rescue.chargeRequired;
    }
  }
}

function applyPressureScript(game) {
  if (game.internal.rescued) return;

  if (game.now >= 62) {
    game.boards.p2.danger = Math.max(game.boards.p2.danger, 80);
  } else if (game.now >= 28) {
    game.boards.p2.danger = Math.max(game.boards.p2.danger, 65);
  } else if (game.now >= 18) {
    game.boards.p2.danger = Math.max(game.boards.p2.danger, 35);
  }

  if (game.seedName === 'greed_loss' && game.now >= 77) {
    game.boards.p2.danger = Math.max(game.boards.p2.danger, 90);
  }
}

function applyBotPartnerScript(game) {
  if (game.mode !== 'bot' || game.result) return;
  for (const step of BOT_PARTNER_SCRIPT) {
    if (game.now < step.at || game.internal.partnerAutoApplied.includes(step.at)) continue;
    game.internal.partnerAutoApplied.push(step.at);
    const unit = makeUnit(step.unitId, 'p2', game.internal.unitSequence++);
    game.boards.p2.units.push(unit);
    game.boards.p2.danger = Math.max(0, game.boards.p2.danger - 6);
    event(game, {
      type: 'partner_auto',
      action: step.action ?? 'summon',
      playerId: 'p2',
      unitId: step.unitId,
      highlight: step.highlight
    });
  }
}

function spawnDueWaves(game) {
  for (const wave of REBOOT_WAVES) {
    if (game.now < wave.at || game.internal.wavesSpawned.includes(wave.at)) continue;
    game.internal.wavesSpawned.push(wave.at);
    for (const [boardId, spawns] of Object.entries(wave.boards)) {
      for (const spawn of spawns) {
        for (let i = 0; i < spawn.count; i += 1) {
          game.enemies.push({
            id: `${boardId}-${wave.at}-${spawn.enemyId}-${i}`,
            boardId,
            enemyId: spawn.enemyId,
            progress: 0,
            spawnedAt: wave.at + (spawn.interval * i)
          });
        }
      }
    }
    event(game, { type: 'wave', waveAt: wave.at });
  }
}

function enemyProgress(game, enemy) {
  const spec = REBOOT_ENEMIES[enemy.enemyId] ?? REBOOT_ENEMIES.noise_shard;
  const age = Math.max(0, game.now - enemy.spawnedAt);
  return Math.max(0, Math.min(0.98, (age * spec.speed) / REBOOT_RULES.path.length));
}

function defeatDelay(enemyId) {
  if (enemyId === 'mini_boss') return 7.5;
  if (enemyId === 'heavy_noise') return 3.6;
  if (enemyId === 'quick_noise') return 1.65;
  return 2.35;
}

function pushDeathBurst(game, enemy, progress) {
  const spec = REBOOT_ENEMIES[enemy.enemyId] ?? REBOOT_ENEMIES.noise_shard;
  const boss = enemy.enemyId === 'mini_boss';
  const reward = spec.reward ?? 1;
  game.effects.push({
    id: `rfx${nextEffectId++}`,
    type: 'death_burst',
    targetId: enemy.id,
    targetType: enemy.enemyId,
    targetProgress: progress,
    targetLane: enemy.boardId === 'p2' ? -0.45 : 0.25,
    rewardCharge: reward,
    rewardLink: boss ? 4 : reward > 1 ? 2 : 1,
    ttl: boss ? 1.25 : 0.78
  });
}

function effectLaneForBoard(boardId) {
  return boardId === 'p2' ? -0.45 : 0.25;
}

function pushHitEffect(game, boardId, board, enemy, progress) {
  const slot = Math.max(0, Math.min(board.units.length - 1, Math.floor(game.now * 3) % Math.max(1, board.units.length)));
  game.effects.push({
    id: `hfx${nextEffectId++}`,
    type: 'hit',
    playerId: boardId,
    slot,
    targetId: enemy.id,
    targetType: enemy.enemyId,
    targetProgress: progress,
    targetLane: effectLaneForBoard(enemy.boardId),
    ttl: HIT_EFFECT_TTL
  });
}

function emitLiveHitEffects(game) {
  for (const [boardId, board] of Object.entries(game.boards)) {
    if (board.units.length === 0) continue;
    const lastHitAt = game.internal.hitPulseAt[boardId] ?? -Infinity;
    if (game.now - lastHitAt < HIT_EFFECT_INTERVAL) continue;
    const target = game.enemies
      .filter((enemy) => enemy.boardId === boardId)
      .map((enemy) => ({ enemy, progress: enemyProgress(game, enemy) }))
      .filter(({ progress }) => progress < 0.98)
      .sort((a, b) => b.progress - a.progress)[0];
    if (!target) continue;
    game.internal.hitPulseAt[boardId] = game.now;
    pushHitEffect(game, boardId, board, target.enemy, target.progress);
  }
}

function pushMiniBossRewardBurst(game) {
  if (game.internal.bossRewardEmitted) return;
  game.internal.bossRewardEmitted = true;
  const boss = game.enemies.find((enemy) => enemy.enemyId === 'mini_boss') ?? {
    id: 'final-mini-boss',
    enemyId: 'mini_boss',
    boardId: 'p1',
    spawnedAt: REBOOT_RULES.boss.spawnAt
  };
  pushDeathBurst(game, boss, Math.max(0.72, enemyProgress(game, boss)));
  game.enemies = game.enemies.filter((enemy) => enemy.id !== boss.id);
}

function resolveCombatEffects(game, dt) {
  game.effects = game.effects.map((effect) => ({ ...effect, ttl: effect.ttl - dt })).filter((effect) => effect.ttl > 0);
  emitLiveHitEffects(game);
  const survivors = [];
  for (const enemy of game.enemies) {
    if (enemy.enemyId === 'mini_boss') {
      survivors.push({
        ...enemy,
        progress: enemyProgress(game, enemy)
      });
      continue;
    }
    const board = game.boards[enemy.boardId] ?? game.boards.p1;
    const age = game.now - enemy.spawnedAt;
    const progress = enemyProgress(game, enemy);
    if (board.units.length > 0 && age >= defeatDelay(enemy.enemyId)) {
      pushDeathBurst(game, enemy, progress);
      continue;
    }
    survivors.push({
      ...enemy,
      progress
    });
  }
  game.enemies = survivors;
}

function resolveTerminal(game) {
  if (game.result || game.now < 120) return;

  if (game.seedName === 'greed_loss') {
    result(game, 'lost', 'greed', ['greed']);
    return;
  }

  if (game.seedName === 'rescue_miss') {
    result(game, 'lost', 'rescue_missed', ['rescue_missed']);
    return;
  }

  if (game.seedName === 'lucky_clutch') {
    game.boss.remainingHp = 0;
    pushMiniBossRewardBurst(game);
    result(game, 'won', 'boss_final_hit', ['boss_final_hit']);
    return;
  }

  if (game.seedName === 'bad_recoverable') {
    result(game, 'won', 'partner_rescued', ['bad_roll_recovered', 'partner_rescued']);
    return;
  }

  if (game.seedName === 'boss_clutch') {
    if (game.internal.bossChoice === 'summonSlow') {
      game.boss.remainingHp = 28;
      result(game, 'won', 'boss_slowed', ['boss_slowed']);
      return;
    }
    if (game.internal.bossChoice === 'summonBurst' || game.internal.bossChoice === 'merge') {
      game.boss.remainingHp = 0;
      pushMiniBossRewardBurst(game);
      result(game, 'won', 'boss_final_hit', ['boss_final_hit']);
      return;
    }
    result(game, 'lost', 'boss_leaked', ['boss_leaked']);
    return;
  }

  if (game.internal.rescued) {
    result(game, 'won', 'partner_rescued', ['partner_rescued']);
  } else {
    result(game, 'lost', 'rescue_missed', ['rescue_missed']);
  }
}

export function createRebootGame({
  mode = 'bot',
  seedName = 'tutorial_success',
  seed = 1,
  players = [
    { id: 'p1', name: '플레이어', bot: false },
    { id: 'p2', name: '자동 파트너', bot: true }
  ],
  branch = 'wait'
} = {}) {
  const runId = `reboot-${nextRunId++}`;
  const game = {
    mode,
    seedName,
    seed,
    branch,
    now: 0,
    id: runId,
    runId,
    players: clone(players),
    boards: {
      p1: createBoard('p1'),
      p2: createBoard('p2')
    },
    enemies: [],
    resources: {
      p1: createPlayerResources(),
      p2: createPlayerResources()
    },
    result: null,
    over: false,
    won: false,
    events: [],
    effects: [],
    actionState: {
      p1: { summon: true, merge: false, rescue: false },
      p2: { summon: true, merge: false, rescue: false }
    },
    boss: {
      active: false,
      remainingHp: 220
    },
    internal: {
      grantsApplied: [],
      wavesSpawned: [],
      partnerAutoApplied: [],
      hitPulseAt: { p1: -Infinity, p2: -Infinity },
      summonIndexes: { p1: 0, p2: 0 },
      mergeIndex: 0,
      unitSequence: 0,
      rescued: false,
      bossChoice: null,
      bossRewardEmitted: false
    }
  };
  refreshActionState(game);
  return game;
}

export function summonToy(game, { playerId = 'p1' } = {}) {
  if (game.result) return { ok: false, reason: '이미 종료된 판입니다.' };
  const owner = player(game, playerId);
  const resources = game.resources[owner];
  if (resources.summon < REBOOT_RULES.summon.cost) {
    return { ok: false, reason: '소환 에너지가 부족합니다.' };
  }

  resources.summon -= REBOOT_RULES.summon.cost;
  const unitId = nextScriptUnit(game, owner);
  game.internal.summonIndexes[owner] = (game.internal.summonIndexes[owner] ?? 0) + 1;
  const unit = makeUnit(unitId, owner, game.internal.unitSequence++);
  game.boards[owner].units.push(unit);

  if (isBossDecisionWindow(game)) {
    game.internal.bossChoice = unitId === 'slow_coil' ? 'summonSlow' : 'summonBurst';
  }

  event(game, { type: 'summon', playerId: owner, unitId, unitIdResult: unitId, highlight: unit.grade >= 2 });
  refreshActionState(game);
  return { ok: true, unit };
}

export function mergeToys(game, { playerId = 'p1', unitIds = [] } = {}) {
  if (game.result) return { ok: false, reason: '이미 종료된 판입니다.' };
  const owner = player(game, playerId);
  const board = game.boards[owner];
  const candidateIndexes = mergeCandidateIndexes(board);
  const hasNormalCandidate = candidateIndexes.length >= REBOOT_RULES.merge.requiredSameGrade;
  const bossMerge = canBossMerge(game);
  if (!hasNormalCandidate && !bossMerge) {
    return { ok: false, reason: '합성할 유닛이 없습니다.' };
  }

  const unitId = nextMergeUnit(game);
  const unit = makeUnit(unitId, owner, game.internal.unitSequence++);
  const indexesToConsume = hasNormalCandidate
    ? candidateIndexes
    : board.units.slice(0, REBOOT_RULES.merge.requiredSameGrade).map((_, index) => index);
  const consumedUnits = indexesToConsume.map((index) => board.units[index]).filter(Boolean);
  for (const index of [...indexesToConsume].sort((a, b) => b - a)) {
    board.units.splice(index, 1);
  }
  const consumed = consumedUnits.map((consumedUnit) => consumedUnit.id);
  board.units.push(unit);
  game.internal.mergeIndex += 1;

  if (isBossDecisionWindow(game)) {
    game.internal.bossChoice = 'merge';
  }

  event(game, { type: 'merge', playerId: owner, unitId, consumed, highlight: true });
  refreshActionState(game);
  return { ok: true, unit, consumed };
}

export function castRescue(game, { playerId = 'p1' } = {}) {
  if (game.result) return { ok: false, reason: '이미 종료된 판입니다.' };
  const owner = player(game, playerId);
  const resources = game.resources[owner];
  if (resources.rescue < REBOOT_RULES.rescue.chargeRequired) {
    return { ok: false, reason: '구원 게이지가 부족합니다.' };
  }

  resources.rescue = 0;
  game.internal.rescued = true;
  game.boards.p2.danger = Math.max(0, game.boards.p2.danger - REBOOT_RULES.rescue.dangerReduction);
  event(game, { type: 'rescue', playerId: owner, reason: 'partner_rescued', highlight: true });
  refreshActionState(game);
  return { ok: true, danger: game.boards.p2.danger };
}

export function tickRebootGame(game, dt) {
  if (dt <= 0 || game.result) return game;
  game.now = Number((game.now + dt).toFixed(4));
  applyTimedResources(game);
  spawnDueWaves(game);
  applyPressureScript(game);
  applyBotPartnerScript(game);
  resolveCombatEffects(game, dt);
  if (game.now >= REBOOT_RULES.boss.spawnAt) game.boss.active = true;
  resolveTerminal(game);
  refreshActionState(game);
  return game;
}

export function serializeRebootState(game) {
  return {
    mode: game.mode,
    seedName: game.seedName,
    now: game.now,
    runId: game.runId,
    players: clone(game.players),
    boards: clone(game.boards),
    enemies: clone(game.enemies),
    resources: clone(game.resources),
    result: clone(game.result),
    events: clone(game.events),
    effects: clone(game.effects),
    actionState: clone(game.actionState),
    boss: clone(game.boss)
  };
}
