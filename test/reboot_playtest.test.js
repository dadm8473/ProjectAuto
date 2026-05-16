import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PLAYTEST_STORAGE_KEY, createPlaytestRecorder } from '../src/client/reboot_playtest.js';

test('disabled playtest recorder keeps normal sessions invisible', () => {
  const writes = [];
  const recorder = createPlaytestRecorder({
    enabled: false,
    storage: { setItem: (...args) => writes.push(args) },
    now: () => 0
  });

  recorder.recordScreen('battle');
  recorder.recordAction('summon', { ok: true, atSeconds: 4 });
  recorder.recordResult({ status: 'won', reason: '파트너 구원 성공', nextGoal: '보스 막타 작전', atSeconds: 108 });

  assert.deepEqual(recorder.summary(), {
    enabled: false,
    totalEvents: 0,
    screensVisited: [],
    actionCounts: { summon: 0, merge: 0, rescue: 0, failed: 0 },
    firstAction: null,
    completedCoreLoopWithin120s: false,
    result: null,
    durationMs: 0
  });
  assert.deepEqual(writes, []);
});

test('playtest recorder summarizes whether the first 120 seconds taught the core loop', () => {
  let clock = 0;
  const writes = [];
  const recorder = createPlaytestRecorder({
    enabled: true,
    storage: { setItem: (...args) => writes.push(args) },
    now: () => clock
  });

  recorder.recordScreen('splash');
  clock = 1200;
  recorder.recordScreen('lobby');
  clock = 2600;
  recorder.recordScreen('battle');
  clock = 5200;
  recorder.recordAction('summon', { ok: true, atSeconds: 5.2 });
  clock = 48000;
  recorder.recordAction('merge', { ok: true, atSeconds: 48 });
  clock = 83000;
  recorder.recordAction('rescue', { ok: true, atSeconds: 83 });
  clock = 108000;
  recorder.recordResult({ status: 'won', reason: '파트너 구원 성공', nextGoal: '보스 막타 작전', atSeconds: 108 });

  const summary = recorder.summary();
  assert.equal(summary.enabled, true);
  assert.deepEqual(summary.screensVisited, ['splash', 'lobby', 'battle']);
  assert.deepEqual(summary.actionCounts, { summon: 1, merge: 1, rescue: 1, failed: 0 });
  assert.deepEqual(summary.firstAction, { action: 'summon', atSeconds: 5.2 });
  assert.equal(summary.completedCoreLoopWithin120s, true);
  assert.deepEqual(summary.result, {
    status: 'won',
    reason: '파트너 구원 성공',
    nextGoal: '보스 막타 작전',
    atSeconds: 108
  });
  assert.equal(summary.durationMs, 108000);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], PLAYTEST_STORAGE_KEY);
  assert.equal(JSON.parse(writes[0][1]).completedCoreLoopWithin120s, true);
});

test('playtest recorder flags late or incomplete core-loop understanding', () => {
  let clock = 0;
  const recorder = createPlaytestRecorder({ enabled: true, now: () => clock });

  clock = 2000;
  recorder.recordScreen('battle');
  clock = 9000;
  recorder.recordAction('summon', { ok: true, atSeconds: 9 });
  clock = 67000;
  recorder.recordAction('merge', { ok: false, reason: '합성 대기', atSeconds: 67 });
  clock = 123000;
  recorder.recordAction('rescue', { ok: true, atSeconds: 123 });

  assert.deepEqual(recorder.summary().actionCounts, { summon: 1, merge: 0, rescue: 1, failed: 1 });
  assert.equal(recorder.summary().completedCoreLoopWithin120s, false);
});

test('playtest recorder keeps stored result in sync with post-result screen events', () => {
  let clock = 0;
  const writes = [];
  const recorder = createPlaytestRecorder({
    enabled: true,
    storage: { setItem: (...args) => writes.push(args) },
    now: () => clock
  });

  recorder.recordScreen('battle');
  clock = 60000;
  recorder.recordAction('summon', { ok: true, atSeconds: 60 });
  clock = 90000;
  recorder.recordAction('merge', { ok: true, atSeconds: 90 });
  clock = 110000;
  recorder.recordAction('rescue', { ok: true, atSeconds: 110 });
  clock = 120000;
  recorder.recordResult({ status: 'won', reason: '파트너 구원 성공', nextGoal: '위험 80 전 구원', atSeconds: 120 });
  clock = 120080;
  recorder.recordScreen('result');

  const stored = JSON.parse(writes.at(-1)[1]);
  assert.deepEqual(stored, recorder.summary());
  assert.deepEqual(stored.screensVisited, ['battle', 'result']);
});
