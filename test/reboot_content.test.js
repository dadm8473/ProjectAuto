import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REBOOT_ENEMIES,
  REBOOT_RULES,
  REBOOT_SEEDS,
  REBOOT_UNITS,
  REBOOT_WAVES
} from '../src/shared/reboot_content.js';

test('reboot rules lock the portrait first-120-second combat contract', () => {
  assert.equal(REBOOT_RULES.screen.reference, '390x844');
  assert.equal(REBOOT_RULES.screen.width, 390);
  assert.equal(REBOOT_RULES.screen.height, 844);
  assert.equal(REBOOT_RULES.summon.startCurrency, 10);
  assert.equal(REBOOT_RULES.summon.cost, 10);
  assert.deepEqual(REBOOT_RULES.summon.grants, [
    { at: 18, amount: 10 },
    { at: 32, amount: 10 },
    { at: 58, amount: 10 },
    { at: 92, amount: 10 }
  ]);
  assert.equal(REBOOT_RULES.merge.requiredSameGrade, 2);
  assert.equal(REBOOT_RULES.merge.revealMs, 700);
  assert.equal(REBOOT_RULES.rescue.tutorialWindowSeconds, 10);
  assert.equal(REBOOT_RULES.rescue.standardWindowSeconds, 6);
  assert.equal(REBOOT_RULES.rescue.dangerReduction, 45);
  assert.equal(REBOOT_RULES.rescue.knockbackPx, 120);
  assert.equal(REBOOT_RULES.rescue.slowPercent, 0.35);
  assert.equal(REBOOT_RULES.defeatDanger, 100);
});

test('reboot units expose readable Korean names, roles, stats, and sprite keys', () => {
  assert.deepEqual(Object.keys(REBOOT_UNITS), [
    'spark_pin',
    'toktok_amp',
    'slow_coil',
    'burst_pin',
    'rescue_coil'
  ]);

  assert.deepEqual(REBOOT_UNITS.spark_pin, {
    id: 'spark_pin',
    name: '스파크 핀',
    grade: 1,
    role: 'attack',
    damage: 8,
    cycle: 0.8,
    range: 150,
    spriteKey: 'spark_pin'
  });
  assert.equal(REBOOT_UNITS.toktok_amp.name, '톡톡 앰프');
  assert.equal(REBOOT_UNITS.toktok_amp.role, 'support');
  assert.equal(REBOOT_UNITS.toktok_amp.amp, 1.2);
  assert.equal(REBOOT_UNITS.slow_coil.slow, 0.2);
  assert.equal(REBOOT_UNITS.slow_coil.slowSeconds, 1.5);
  assert.equal(REBOOT_UNITS.burst_pin.grade, 2);
  assert.equal(REBOOT_UNITS.burst_pin.damage, 18);
  assert.equal(REBOOT_UNITS.rescue_coil.role, 'rescue');
  assert.equal(REBOOT_UNITS.rescue_coil.rescueChargeOnPartnerDanger, 10);

  for (const [id, unit] of Object.entries(REBOOT_UNITS)) {
    assert.equal(unit.id, id);
    assert.equal(unit.spriteKey, id);
    assert.notEqual(typeof unit.name, 'undefined');
    assert.notEqual(typeof unit.role, 'undefined');
    assert.equal('atlasIndex' in unit, false);
  }
});

test('reboot enemies lock track-object stats and sprite keys', () => {
  assert.deepEqual(Object.keys(REBOOT_ENEMIES), [
    'noise_shard',
    'quick_noise',
    'heavy_noise',
    'mini_boss'
  ]);

  assert.deepEqual(REBOOT_ENEMIES.noise_shard, {
    id: 'noise_shard',
    name: '잡음 조각',
    hp: 20,
    speed: 42,
    leakDamage: 12,
    reward: 1,
    spriteKey: 'noise_shard'
  });
  assert.equal(REBOOT_ENEMIES.quick_noise.hp, 14);
  assert.equal(REBOOT_ENEMIES.quick_noise.speed, 58);
  assert.equal(REBOOT_ENEMIES.heavy_noise.hp, 46);
  assert.equal(REBOOT_ENEMIES.heavy_noise.leakDamage, 18);
  assert.equal(REBOOT_ENEMIES.mini_boss.hp, 220);
  assert.equal(REBOOT_ENEMIES.mini_boss.speed, 24);
  assert.equal(REBOOT_ENEMIES.mini_boss.leakDamage, 45);

  for (const [id, enemy] of Object.entries(REBOOT_ENEMIES)) {
    assert.equal(enemy.id, id);
    assert.equal(enemy.spriteKey, id);
    assert.equal('atlasIndex' in enemy, false);
  }
});

test('reboot waves match the GDD first 120 seconds schedule', () => {
  assert.deepEqual(REBOOT_WAVES.map((wave) => wave.at), [0, 18, 28, 46, 62, 88, 102]);

  assert.deepEqual(REBOOT_WAVES[0].boards.p1, [
    { enemyId: 'noise_shard', count: 3, interval: 1.2 }
  ]);
  assert.deepEqual(REBOOT_WAVES[0].boards.p2, []);

  assert.deepEqual(REBOOT_WAVES[2].boards.p1, [
    { enemyId: 'noise_shard', count: 4, interval: 1.0 },
    { enemyId: 'quick_noise', count: 2, interval: 0.9 }
  ]);
  assert.deepEqual(REBOOT_WAVES[2].boards.p2, [
    { enemyId: 'noise_shard', count: 6, interval: 0.9 }
  ]);

  assert.deepEqual(REBOOT_WAVES[6].boards.p1, [
    { enemyId: 'mini_boss', count: 1, interval: 0 },
    { enemyId: 'noise_shard', count: 3, interval: 1.0 }
  ]);
  assert.deepEqual(REBOOT_WAVES[6].boards.p2, [
    { enemyId: 'noise_shard', count: 4, interval: 1.0 }
  ]);
});

test('reboot seed suite captures good luck, bad luck, greed, rescue miss, and boss clutch cases', () => {
  assert.deepEqual(Object.keys(REBOOT_SEEDS), [
    'tutorial_success',
    'lucky_clutch',
    'bad_recoverable',
    'greed_loss',
    'rescue_miss',
    'boss_clutch'
  ]);

  assert.deepEqual(REBOOT_SEEDS.tutorial_success.script.summons, [
    'spark_pin',
    'toktok_amp',
    'spark_pin'
  ]);
  assert.deepEqual(REBOOT_SEEDS.tutorial_success.script.merges, ['burst_pin']);
  assert.equal(REBOOT_SEEDS.tutorial_success.intendedResult, 'partner_rescued');

  assert.deepEqual(REBOOT_SEEDS.lucky_clutch.script.summons, [
    'spark_pin',
    'spark_pin',
    'rescue_coil'
  ]);
  assert.deepEqual(REBOOT_SEEDS.lucky_clutch.script.merges, ['burst_pin']);
  assert.equal(REBOOT_SEEDS.lucky_clutch.intendedResult, 'boss_final_hit');

  assert.deepEqual(REBOOT_SEEDS.bad_recoverable.script.summons, [
    'toktok_amp',
    'slow_coil',
    'spark_pin'
  ]);
  assert.deepEqual(REBOOT_SEEDS.bad_recoverable.script.merges, ['rescue_coil']);
  assert.equal(REBOOT_SEEDS.bad_recoverable.intendedResult, 'partner_rescued');

  assert.equal(REBOOT_SEEDS.greed_loss.intendedResult, 'greed');
  assert.equal(REBOOT_SEEDS.rescue_miss.intendedResult, 'rescue_missed');
  assert.deepEqual(REBOOT_SEEDS.boss_clutch.branches, {
    summonSlow: { action: 'summon', at: [92, 102], result: 'slow_coil', reason: 'boss_slowed' },
    summonBurst: { action: 'summon', at: [92, 102], result: 'burst_pin', reason: 'boss_final_hit' },
    merge: { action: 'merge', at: [92, 102], result: 'burst_pin', reason: 'boss_final_hit' },
    lateSummon: { action: 'summon', after: 102, reason: 'boss_leaked' },
    wait: { action: 'wait', at: [92, 116], reason: 'boss_leaked' }
  });
});
