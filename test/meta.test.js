import test from 'node:test';
import assert from 'node:assert/strict';

import { applyRunToProfile, createMetaProfile, normalizeMetaProfile } from '../src/shared/meta.js';

test('meta profile grants run, mission, and pass rewards once', () => {
  const profile = createMetaProfile();
  const state = {
    id: 'run-meta-1',
    result: {
      code: 'win_signal_lock',
      won: true,
      wave: 3,
      time: 123.4,
      earned: { gems: 18, xp: 92 },
      stats: {
        merges: { p1: 1, p2: 0 },
        linkPulses: { p1: 1, p2: 0 }
      }
    },
    eventLog: [
      { type: 'link_pulse_save', bossActive: true },
      { type: 'wave_cleared', signalIntegrity: 30 }
    ]
  };

  const first = applyRunToProfile(profile, state);
  const second = applyRunToProfile(first.profile, state);

  assert.equal(first.summary.run.gems, 18);
  assert.equal(first.summary.run.xp, 92);
  assert.deepEqual(first.summary.missions.map((mission) => mission.id), ['merge-three', 'save-partner', 'signal-clutch']);
  assert.equal(first.summary.missionGems, 60);
  assert.equal(first.summary.passRewards.some((reward) => reward.tier === 0 && reward.gems === 20), true);
  assert.equal(first.profile.gems, 98);
  assert.equal(first.profile.xp, 92);
  assert.equal(second.summary.missionGems, 0);
  assert.equal(second.summary.passRewards.length, 0);
  assert.equal(second.summary.duplicate, true);
  assert.equal(second.profile.gems, 98);
  assert.equal(second.profile.xp, 92);
});

test('meta profile settles run spending against the run start balance', () => {
  const profile = normalizeMetaProfile({ gems: 18 });
  const state = {
    id: 'run-spend-1',
    result: {
      code: 'loss_signal_collapse',
      wave: 2,
      time: 55,
      startingProfileGems: 50,
      earned: { gems: 8, xp: 0 },
      spent: { gems: 40 },
      stats: {}
    },
    eventLog: []
  };

  const first = applyRunToProfile(profile, state);
  const second = applyRunToProfile(first.profile, state);

  assert.equal(first.summary.spentGems, 40);
  assert.equal(first.summary.totalGems, -32);
  assert.equal(first.profile.gems, 18);
  assert.equal(second.summary.duplicate, true);
  assert.equal(second.profile.gems, 18);
});

test('meta profile clamps run spending that used free run gems', () => {
  const profile = normalizeMetaProfile({ gems: 0 });
  const state = {
    id: 'run-spend-2',
    result: {
      code: 'loss_signal_collapse',
      wave: 2,
      time: 55,
      startingProfileGems: 10,
      earned: { gems: 40, xp: 0 },
      spent: { gems: 40 },
      stats: {}
    },
    eventLog: []
  };

  const { profile: settled } = applyRunToProfile(profile, state);

  assert.equal(settled.gems, 10);
});

test('meta profile normalization rejects malformed storage without losing shape', () => {
  const profile = normalizeMetaProfile({
    gems: 'bad',
    xp: 12,
    claimedMissions: ['merge-three', 42],
    claimedPassTiers: [0, 'x'],
    unlocks: ['founder-board'],
    processedRuns: ['run-1', 7]
  });

  assert.equal(profile.gems, 0);
  assert.equal(profile.xp, 12);
  assert.deepEqual(profile.claimedMissions, ['merge-three']);
  assert.deepEqual(profile.claimedPassTiers, [0]);
  assert.deepEqual(profile.unlocks, ['founder-board']);
  assert.deepEqual(profile.processedRuns, ['run-1']);
});
