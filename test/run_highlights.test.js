import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRunHighlights, buildRunProgress } from '../src/shared/run_highlights.js';

test('run highlights prioritize player-readable clutch moments', () => {
  const state = {
    result: {
      won: true,
      wave: 10,
      time: 241,
      stats: {
        kills: 512,
        merges: { p1: 2, p2: 1 },
        linkPulses: { p1: 4, p2: 3 },
        overclocks: { p1: 1, p2: 0 }
      }
    },
    eventLog: [
      { type: 'boss_defeated', wave: 3 },
      { type: 'boss_defeated', wave: 6 },
      { type: 'link_pulse_save', bossActive: true }
    ]
  };
  const summary = {
    totalGems: 148,
    totalXp: 92,
    missions: [{ id: 'save-partner' }],
    passRewards: [{ tier: 0, gems: 20 }]
  };

  assert.deepEqual(buildRunHighlights(state, summary), [
    { label: '결정적 구원', value: '1', detail: '보스 세이브', tone: 'link' },
    { label: '최고 합성', value: '3', detail: '릴레이 강화', tone: 'charge' },
    { label: '보스 격파', value: '2', detail: '위기 돌파', tone: 'danger' }
  ]);
});

test('run progress summarizes rewards without long explanatory text', () => {
  const summary = {
    run: { gems: 128, xp: 92 },
    missions: [{ id: 'merge-three' }, { id: 'save-partner' }],
    missionGems: 35,
    passRewards: [{ tier: 0, gems: 20 }, { tier: 1, cosmetic: 'founder-board', gems: 0 }],
    totalGems: 183,
    totalXp: 92
  };

  assert.deepEqual(buildRunProgress(summary, { gems: 240, xp: 310 }), [
    { label: '전투', value: '+92 경험치', detail: '+128 보석' },
    { label: '미션', value: '2개 완료', detail: '+35 보석' },
    { label: '패스', value: '2개 해금', detail: '310 경험치' },
    { label: '보관함', value: '240 보석', detail: '+183 보석' }
  ]);
});
