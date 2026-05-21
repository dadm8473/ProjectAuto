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
const HIT_EFFECT_TTL = 0.62;
const DEFAULT_ATTACK_CYCLE = 1.15;
const SIMULATION_STEP = 0.05;

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
    boss_unfinished: 'focus_boss_damage',
    signal_overrun: 'protect_signal_core',
    merge_gap: 'merge_before_boss',
    bad_luck: 'turn_bad_rolls_into_utility'
  }[reason] ?? 'retry_first_120_seconds';
}

function normalizeRetryContext(context) {
  if (!context || typeof context !== 'object') return null;
  const reason = typeof context.reason === 'string' ? context.reason : null;
  const nextGoal = typeof context.nextGoal === 'string' ? context.nextGoal : nextGoalForReason(reason);
  if (!reason && !nextGoal) return null;
  return {
    status: context.status === 'won' ? 'won' : 'lost',
    reason: reason ?? 'retry',
    nextGoal: nextGoal ?? 'retry_first_120_seconds'
  };
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

function makeUnit(unitId, owner, sequence, now = 0) {
  const spec = REBOOT_UNITS[unitId] ?? REBOOT_UNITS.spark_pin;
  return {
    id: `${owner}-${sequence}-${unitId}`,
    unitId,
    owner,
    grade: spec.grade,
    role: spec.role,
    spriteKey: spec.spriteKey,
    nextAttackAt: Number(now.toFixed(4))
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
      merge: !game.result && (hasMergeCandidate(board) || canBossMerge(game, board)),
      rescue: !game.result && resources.rescue >= REBOOT_RULES.rescue.chargeRequired
    };
  }
}

function canBossMerge(game, board) {
  return isBossDecisionWindow(game) && (board?.units?.length ?? 0) >= REBOOT_RULES.merge.requiredSameGrade;
}

function isBossDecisionWindow(game) {
  return game.now >= BOSS_DECISION_START && game.now < BOSS_DECISION_END;
}

function timedGrantKey(playerId, grant) {
  return `${playerId}:${grant.at}`;
}

function applyTimedResources(game) {
  for (const grant of REBOOT_RULES.summon.grants) {
    if (game.now < grant.at) continue;
    const awarded = [];
    for (const [playerId, resources] of Object.entries(game.resources)) {
      const key = timedGrantKey(playerId, grant);
      if (game.internal.grantsApplied.includes(key)) continue;
      game.internal.grantsApplied.push(key);
      if ((game.internal.summonIndexes[playerId] ?? 0) <= 0) continue;
      resources.summon += grant.amount;
      awarded.push(playerId);
    }
    if (awarded.length) {
      event(game, { type: 'summon_grant', amount: grant.amount, playerIds: awarded });
    }
  }

  if (!game.internal.rescued && game.now >= REBOOT_RULES.rescue.passiveChargeAt) {
    for (const resources of Object.values(game.resources)) {
      resources.rescue = Math.max(resources.rescue, REBOOT_RULES.rescue.passiveChargeAmount);
    }
  }

  if (!game.internal.rescued && game.now >= 70) {
    for (const resources of Object.values(game.resources)) {
      resources.rescue = REBOOT_RULES.rescue.chargeRequired;
    }
  }
}

function applyBotPartnerScript(game) {
  if (game.mode !== 'bot' || game.result) return;
  for (const step of BOT_PARTNER_SCRIPT) {
    if (game.now < step.at || game.internal.partnerAutoApplied.includes(step.at)) continue;
    game.internal.partnerAutoApplied.push(step.at);
    const unit = makeUnit(step.unitId, 'p2', game.internal.unitSequence++, game.now);
    game.boards.p2.units.push(unit);
    if (step.action === 'rescue') {
      applyPartnerRescueAssist(game);
    } else {
      game.boards.p2.danger = Math.max(0, game.boards.p2.danger - 6);
    }
    event(game, {
      type: 'partner_auto',
      action: step.action ?? 'summon',
      playerId: 'p2',
      unitId: step.unitId,
      highlight: step.highlight
    });
  }
}

function applyPartnerRescueAssist(game) {
  game.boards.p2.danger = Math.max(0, game.boards.p2.danger - REBOOT_RULES.rescue.dangerReduction);
  for (const enemy of game.enemies) {
    if (enemy.boardId !== 'p2' || enemyHp(enemy) <= 0) continue;
    enemy.progress = Math.max(0, enemyProgress(game, enemy) - (REBOOT_RULES.rescue.knockbackPx / REBOOT_RULES.path.length));
    enemy.slowPercent = Math.max(Number(enemy.slowPercent) || 0, REBOOT_RULES.rescue.slowPercent);
    enemy.slowUntil = Math.max(Number(enemy.slowUntil) || 0, game.now + REBOOT_RULES.rescue.slowSeconds);
  }
  game.internal.partnerRescueAssistSeen = true;
}

function spawnDueWaves(game) {
  for (const wave of REBOOT_WAVES) {
    if (game.now < wave.at || game.internal.wavesSpawned.includes(wave.at)) continue;
    game.internal.wavesSpawned.push(wave.at);
    for (const [boardId, spawns] of Object.entries(wave.boards)) {
      for (const spawn of spawns) {
        for (let i = 0; i < spawn.count; i += 1) {
          if (spawn.enemyId === 'mini_boss') game.internal.bossSpawned = true;
          game.enemies.push({
            id: `${boardId}-${wave.at}-${spawn.enemyId}-${i}`,
            boardId,
            enemyId: spawn.enemyId,
            progress: 0,
            spawnedAt: wave.at + (spawn.interval * i),
            hp: REBOOT_ENEMIES[spawn.enemyId]?.hp ?? REBOOT_ENEMIES.noise_shard.hp,
            maxHp: REBOOT_ENEMIES[spawn.enemyId]?.hp ?? REBOOT_ENEMIES.noise_shard.hp,
            slowUntil: 0,
            slowPercent: 0
          });
        }
      }
    }
    event(game, { type: 'wave', waveAt: wave.at });
  }
}

function enemyProgress(game, enemy) {
  if (Number.isFinite(Number(enemy.progress))) {
    return Math.max(0, Math.min(1, Number(enemy.progress)));
  }
  const spec = REBOOT_ENEMIES[enemy.enemyId] ?? REBOOT_ENEMIES.noise_shard;
  const age = Math.max(0, game.now - enemy.spawnedAt);
  return Math.max(0, Math.min(1, (age * spec.speed) / REBOOT_RULES.path.length));
}

function serializedBossHp(game, enemy) {
  if (enemy.enemyId !== 'mini_boss') return null;
  const maxHp = REBOOT_ENEMIES.mini_boss.hp;
  return {
    hp: Math.max(0, Math.ceil(Number.isFinite(Number(enemy.hp)) ? Number(enemy.hp) : maxHp)),
    maxHp
  };
}

function enemyHp(enemy) {
  const spec = REBOOT_ENEMIES[enemy.enemyId] ?? REBOOT_ENEMIES.noise_shard;
  return Number.isFinite(Number(enemy.hp)) ? Number(enemy.hp) : spec.hp;
}

function serializeEnemy(game, enemy) {
  const spec = REBOOT_ENEMIES[enemy.enemyId] ?? REBOOT_ENEMIES.noise_shard;
  const bossHp = serializedBossHp(game, enemy);
  return {
    ...enemy,
    spriteKey: enemy.spriteKey ?? spec.spriteKey ?? enemy.enemyId,
    progress: Number.isFinite(Number(enemy.progress)) ? Number(enemy.progress) : enemyProgress(game, enemy),
    ...(bossHp ?? {})
  };
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

function hitDamageForUnit(game, unit = {}, enemy = {}, critical = isCriticalHit(game, unit, enemy), amp = 1) {
  const spec = REBOOT_UNITS[unit.unitId] ?? {};
  if (!spec.id) return 0;
  const baseDamage = Number(spec.damage);
  const gradeScale = Math.max(1, Number(unit.grade) || Number(spec.grade) || 1);
  const supportDamage = spec.amp ? 3 : 2;
  const rawDamage = Number.isFinite(baseDamage) ? baseDamage : supportDamage * gradeScale;
  const bossMultiplier = critical ? 2 : 1;
  return Math.max(1, Math.round(rawDamage * bossMultiplier * Math.max(1, amp)));
}

function isCriticalHit(game, unit = {}, enemy = {}) {
  const spec = REBOOT_UNITS[unit.unitId] ?? {};
  if (!spec.id) return false;
  const grade = Math.max(1, Number(unit.grade) || Number(spec.grade) || 1);
  return enemy.enemyId === 'mini_boss' && (grade >= 2 || game.now >= BOSS_DECISION_START);
}

function unitAttackCycle(unit = {}) {
  const spec = REBOOT_UNITS[unit.unitId] ?? {};
  return Number.isFinite(Number(spec.cycle)) ? Number(spec.cycle) : DEFAULT_ATTACK_CYCLE;
}

function boardAttackAmp(board, sourceUnit) {
  return board.units.reduce((amp, unit) => {
    if (unit.id === sourceUnit.id) return amp;
    const spec = REBOOT_UNITS[unit.unitId] ?? {};
    return Math.max(amp, Number(spec.amp) || 1);
  }, 1);
}

function targetForUnit(game, boardId, unit = {}) {
  const spec = REBOOT_UNITS[unit.unitId] ?? {};
  if (!spec.id) return null;
  return game.enemies
    .filter((enemy) => enemy.boardId === boardId && game.now >= enemy.spawnedAt)
    .filter((enemy) => enemyHp(enemy) > 0)
    .map((enemy) => ({ enemy, progress: enemyProgress(game, enemy) }))
    .filter(({ progress }) => progress < 1)
    .sort((a, b) => b.progress - a.progress)[0]?.enemy ?? null;
}

function pushHitEffect(game, boardId, slot, unit, enemy, progress, damage, critical) {
  game.effects.push({
    id: `hfx${nextEffectId++}`,
    type: 'hit',
    playerId: boardId,
    slot,
    targetId: enemy.id,
    targetType: enemy.enemyId,
    targetProgress: progress,
    targetLane: effectLaneForBoard(enemy.boardId),
    damage,
    critical,
    ttl: HIT_EFFECT_TTL
  });
  return true;
}

function applyUnitSlow(game, unit, enemy) {
  const spec = REBOOT_UNITS[unit.unitId] ?? {};
  const slow = Number(spec.slow);
  if (!Number.isFinite(slow) || slow <= 0) return;
  const seconds = Number.isFinite(Number(spec.slowSeconds)) ? Number(spec.slowSeconds) : REBOOT_RULES.rescue.slowSeconds;
  enemy.slowPercent = Math.max(Number(enemy.slowPercent) || 0, Math.min(0.8, slow));
  enemy.slowUntil = Math.max(Number(enemy.slowUntil) || 0, game.now + seconds);
  if (enemy.enemyId === 'mini_boss') game.internal.bossControlSeen = true;
}

function resolveUnitAttacks(game) {
  for (const [boardId, board] of Object.entries(game.boards)) {
    for (const [slot, unit] of board.units.entries()) {
      const spec = REBOOT_UNITS[unit.unitId] ?? {};
      if (!spec.id) continue;
      if (!Number.isFinite(Number(unit.nextAttackAt))) unit.nextAttackAt = game.now;
      if (game.now + 0.0001 < unit.nextAttackAt) continue;
      const target = targetForUnit(game, boardId, unit);
      if (!target) continue;
      const critical = isCriticalHit(game, unit, target);
      const damage = hitDamageForUnit(game, unit, target, critical, boardAttackAmp(board, unit));
      target.hp = Math.max(0, enemyHp(target) - damage);
      applyUnitSlow(game, unit, target);
      pushHitEffect(game, boardId, slot, unit, target, enemyProgress(game, target), damage, critical);
      unit.nextAttackAt = Number((game.now + unitAttackCycle(unit)).toFixed(4));
      if (target.enemyId === 'mini_boss') game.boss.remainingHp = target.hp;
      if (target.hp <= 0) {
        const targetProgress = enemyProgress(game, target);
        pushDeathBurst(game, target, enemyProgress(game, target));
        if (target.enemyId === 'mini_boss') {
          game.internal.bossRewardEmitted = true;
          game.internal.bossKilledAt = game.now;
          game.internal.bossKilledProgress = targetProgress;
          game.internal.bossKillerUnitId = unit.unitId;
          game.boss.remainingHp = 0;
        }
      }
    }
  }
}

function pushMiniBossRewardBurst(game, { force = false } = {}) {
  if (game.internal.bossRewardEmitted && !force) return;
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
  advanceEnemies(game, dt);
  resolveUnitAttacks(game);
  const survivors = [];
  for (const enemy of game.enemies) {
    const progress = enemyProgress(game, enemy);
    if (enemyHp(enemy) <= 0) continue;
    if (progress >= 1) continue;
    survivors.push({
      ...enemy,
      progress
    });
  }
  game.enemies = survivors;
}

function advanceEnemies(game, dt) {
  for (const enemy of game.enemies) {
    if (game.now < enemy.spawnedAt) continue;
    if (enemyHp(enemy) <= 0) continue;
    const spec = REBOOT_ENEMIES[enemy.enemyId] ?? REBOOT_ENEMIES.noise_shard;
    const slowMultiplier = Number(enemy.slowUntil) > game.now
      ? 1 - Math.max(0, Math.min(0.8, Number(enemy.slowPercent) || 0))
      : 1;
    enemy.progress = Math.max(0, Math.min(1, enemyProgress(game, enemy) + ((spec.speed * slowMultiplier * dt) / REBOOT_RULES.path.length)));
    if (enemy.boardId === 'p2' && !game.internal.rescued && enemy.progress >= 0.62) {
      game.internal.partnerDangerSeen = true;
      game.internal.partnerDangerPeak = Math.max(game.internal.partnerDangerPeak, REBOOT_RULES.rescue.partnerDangerWarning);
      game.resources.p1.rescue = Math.max(game.resources.p1.rescue, REBOOT_RULES.rescue.chargeRequired);
    }
    if (enemy.progress >= 1) {
      const board = game.boards[enemy.boardId] ?? game.boards.p1;
      const damage = spec.leakDamage ?? REBOOT_RULES.leakDamage.normal;
      board.danger = Math.min(REBOOT_RULES.defeatDanger, board.danger + damage);
      if (enemy.enemyId === 'mini_boss') game.boss.leaked = true;
      if (enemy.boardId === 'p2' && !game.internal.rescued && board.danger >= REBOOT_RULES.rescue.partnerDangerWarning) {
        game.resources.p1.rescue = Math.max(game.resources.p1.rescue, REBOOT_RULES.rescue.chargeRequired);
      }
      if (enemy.boardId === 'p2') {
        game.internal.partnerDangerSeen = true;
        game.internal.partnerDangerPeak = Math.max(game.internal.partnerDangerPeak, board.danger);
      }
      event(game, { type: 'enemy_leaked', boardId: enemy.boardId, enemyId: enemy.enemyId, damage, danger: board.danger, highlight: enemy.enemyId === 'mini_boss' || board.danger >= REBOOT_RULES.rescue.partnerDangerCritical });
    }
  }
}

function recoveredHighlights(game, highlights) {
  if (!game.internal.utilityRecoverySeen) return highlights;
  return ['bad_roll_recovered', ...highlights.filter((highlight) => highlight !== 'bad_roll_recovered')];
}

function bossKillWasClutch(game) {
  return (
    Number(game.internal.bossResponseAt) >= BOSS_DECISION_START
    || Number(game.internal.bossKilledAt) >= REBOOT_RULES.boss.expectedResolveStart
    || Number(game.internal.bossKilledProgress) >= 0.55
  );
}

function partnerRescueNeeded(game) {
  if (game.boards.p2.danger >= REBOOT_RULES.rescue.partnerDangerWarning) return true;
  return game.enemies.some((enemy) => (
    enemy.boardId === 'p2'
    && enemyHp(enemy) > 0
    && game.now >= enemy.spawnedAt
    && enemyProgress(game, enemy) >= 0.62
  ));
}

function resolveTerminal(game) {
  if (game.result || game.now < 120) return;

  const bossAlive = game.enemies.some((enemy) => enemy.enemyId === 'mini_boss' && enemyHp(enemy) > 0);
  const bossSpawned = game.internal.bossSpawned || game.internal.bossRewardEmitted || bossAlive;
  const partnerInDanger = partnerRescueNeeded(game);

  if (game.boards.p1.danger >= REBOOT_RULES.defeatDanger) {
    result(game, 'lost', 'signal_overrun', ['signal_overrun']);
    return;
  }

  if (game.boss.leaked) {
    result(game, 'lost', 'boss_leaked', ['boss_leaked']);
    return;
  }

  if (!game.internal.rescued && partnerInDanger) {
    result(game, 'lost', game.internal.greedDecision ? 'greed' : 'rescue_missed', [game.internal.greedDecision ? 'greed' : 'rescue_missed']);
    return;
  }

  if (bossSpawned && !bossAlive && game.internal.bossRewardEmitted) {
    if (!game.effects.some((effect) => effect.type === 'death_burst' && effect.targetType === 'mini_boss')) {
      pushMiniBossRewardBurst(game, { force: true });
    }
    if (bossKillWasClutch(game) || !game.internal.rescued) {
      result(game, 'won', 'boss_final_hit', recoveredHighlights(game, ['boss_final_hit']));
      return;
    }
    result(game, 'won', 'partner_rescued', recoveredHighlights(game, ['partner_rescued']));
    return;
  }

  if (bossAlive && game.internal.bossControlSeen) {
    game.boss.remainingHp = game.enemies.find((enemy) => enemy.enemyId === 'mini_boss')?.hp ?? game.boss.remainingHp;
    result(game, 'won', 'boss_slowed', recoveredHighlights(game, ['boss_slowed']));
    return;
  }

  if (!game.internal.rescued && bossAlive && game.boss.active && !partnerInDanger) {
    result(game, 'lost', 'boss_unfinished', ['boss_unfinished']);
    return;
  }

  if (bossAlive && game.boss.active) {
    result(game, 'lost', 'boss_unfinished', ['boss_unfinished']);
    return;
  }

  if (game.internal.rescued) {
    result(game, 'won', 'partner_rescued', recoveredHighlights(game, ['partner_rescued']));
    return;
  }

  result(game, 'lost', 'rescue_missed', ['rescue_missed']);
}

export function createRebootGame({
  mode = 'bot',
  seedName = 'tutorial_success',
  seed = 1,
  players = [
    { id: 'p1', name: '플레이어', bot: false },
    { id: 'p2', name: '린', bot: true }
  ],
  branch = 'wait',
  retryContext = null
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
    retryContext: normalizeRetryContext(retryContext),
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
      summonIndexes: { p1: 0, p2: 0 },
      mergeIndex: 0,
      unitSequence: 0,
      rescued: false,
      bossChoice: null,
      bossRewardEmitted: false,
      bossSpawned: false,
      bossResponseAt: null,
      bossControlSeen: false,
      bossKilledAt: null,
      bossKilledProgress: 0,
      bossKillerUnitId: null,
      greedDecision: false,
      partnerDangerSeen: false,
      partnerDangerPeak: 0,
      partnerRescueAssistSeen: false,
      utilityRolls: 0,
      utilityRecoverySeen: false
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
    return { ok: false, reason: '전력이 부족합니다.' };
  }

  resources.summon -= REBOOT_RULES.summon.cost;
  const unitId = nextScriptUnit(game, owner);
  game.internal.summonIndexes[owner] = (game.internal.summonIndexes[owner] ?? 0) + 1;
  const unit = makeUnit(unitId, owner, game.internal.unitSequence++, game.now);
  game.boards[owner].units.push(unit);
  const spec = REBOOT_UNITS[unitId] ?? {};
  if (owner === 'p1' && ['support', 'control', 'rescue'].includes(spec.role)) {
    game.internal.utilityRolls += 1;
  }

  if (isBossDecisionWindow(game)) {
    game.internal.bossChoice = unitId === 'slow_coil' ? 'summonSlow' : 'summonBurst';
    game.internal.bossResponseAt = game.now;
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
  const bossMerge = canBossMerge(game, board);
  if (!hasNormalCandidate && !bossMerge) {
    return { ok: false, reason: '합성할 유닛이 없습니다.' };
  }

  const unitId = nextMergeUnit(game);
  const unit = makeUnit(unitId, owner, game.internal.unitSequence++, game.now);
  const spec = REBOOT_UNITS[unitId] ?? {};
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
    game.internal.bossResponseAt = game.now;
  }
  if (
    owner === 'p1'
    && !game.internal.rescued
    && partnerRescueNeeded(game)
    && game.now >= 70
    && game.resources.p1.rescue >= REBOOT_RULES.rescue.chargeRequired
  ) {
    game.internal.greedDecision = true;
  }
  if (owner === 'p1' && game.internal.utilityRolls > 0 && ['support', 'control', 'rescue'].includes(spec.role)) {
    game.internal.utilityRecoverySeen = true;
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
  let remaining = dt;
  while (remaining > 0 && !game.result) {
    const step = Math.min(SIMULATION_STEP, remaining);
    game.now = Number((game.now + step).toFixed(4));
    applyTimedResources(game);
    spawnDueWaves(game);
    applyBotPartnerScript(game);
    resolveCombatEffects(game, step);
    if (game.now >= REBOOT_RULES.boss.spawnAt) game.boss.active = true;
    resolveTerminal(game);
    remaining = Number((remaining - step).toFixed(4));
  }
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
    enemies: game.enemies.map((enemy) => serializeEnemy(game, enemy)),
    resources: clone(game.resources),
    result: clone(game.result),
    retryContext: clone(game.retryContext ?? null),
    events: clone(game.events),
    effects: clone(game.effects),
    actionState: clone(game.actionState),
    boss: clone(game.boss)
  };
}
