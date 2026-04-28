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
    { label: 'Clutch Pulse', value: '1', detail: 'boss save', tone: 'link' },
    { label: 'Best Merge', value: '3', detail: 'relay upgrades', tone: 'charge' },
    { label: 'Boss Break', value: '2', detail: 'windows cleared', tone: 'danger' }
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
    { label: 'Run', value: '+92 XP', detail: '+128 G' },
    { label: 'Missions', value: '2 clear', detail: '+35 G' },
    { label: 'Pass', value: '2 unlock', detail: '310 XP' },
    { label: 'Vault', value: '240 G', detail: '+183 G' }
  ]);
});
