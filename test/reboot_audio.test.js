import assert from 'node:assert/strict';
import test from 'node:test';
import { createRebootAudio } from '../src/client/reboot_audio.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    }
  };
}

function baseState(overrides = {}) {
  return {
    mode: 'bot',
    now: 1,
    players: [
      { id: 'p1', name: '플레이어' },
      { id: 'p2', name: '린', bot: true }
    ],
    boards: {
      p1: { danger: 0, units: [] },
      p2: { danger: 0, units: [] }
    },
    resources: {
      p1: { summon: 0, rescue: 0 },
      p2: { summon: 0, rescue: 0 }
    },
    events: [],
    effects: [],
    result: null,
    ...overrides
  };
}

test('reboot audio stays silent by default until the player enables it', () => {
  const played = [];
  const audio = createRebootAudio({
    storage: memoryStorage(),
    playCue: (cue) => played.push(cue)
  });

  audio.unlock();
  audio.consume(baseState({
    events: [{ at: 2, type: 'summon', playerId: 'p1' }]
  }), { localBoardId: 'p1' });

  assert.deepEqual(played, []);
  assert.equal(audio.isEnabled(), false);
});

test('mute query locks reboot audio off even if the player tries to enable it', () => {
  const played = [];
  const audio = createRebootAudio({
    mutedByQuery: true,
    storage: memoryStorage(),
    playCue: (cue) => played.push(cue)
  });

  audio.setEnabled(true);
  audio.unlock();
  audio.consume(baseState({
    events: [{ at: 2, type: 'merge', playerId: 'p1' }]
  }), { localBoardId: 'p1' });

  assert.equal(audio.isEnabled(), false);
  assert.deepEqual(played, []);
});

test('reboot audio maps combat events and effects to deduped game cues', () => {
  const played = [];
  const audio = createRebootAudio({
    storage: memoryStorage({ 'projectauto.reboot.audio.enabled.v1': '1' }),
    playCue: (cue) => played.push(cue)
  });
  audio.unlock();

  const state = baseState({
    events: [
      { at: 2, type: 'summon', playerId: 'p1' },
      { at: 3, type: 'partner_auto', action: 'summon', playerId: 'p2' },
      { at: 4, type: 'rescue', playerId: 'p1' }
    ],
    effects: [
      { id: 'hfx1', type: 'hit', playerId: 'p1', critical: true },
      { id: 'rfx1', type: 'death_burst', targetType: 'mini_boss' }
    ]
  });

  audio.consume(state, { localBoardId: 'p1' });
  audio.consume(state, { localBoardId: 'p1' });

  assert.deepEqual(played.map((cue) => `${cue.bus}:${cue.name}`), [
    'sfx:summon',
    'partner:partner_summon',
    'sfx:rescue',
    'sfx:critical_hit',
    'sfx:boss_kill'
  ]);
});

test('reboot audio pulses haptics once for danger crossing and rescue', () => {
  const pulses = [];
  const audio = createRebootAudio({
    storage: memoryStorage({ 'projectauto.reboot.audio.enabled.v1': '1' }),
    navigator: { vibrate: (pattern) => pulses.push(pattern) },
    playCue: () => {}
  });
  audio.unlock();

  audio.consume(baseState({ boards: { p1: { danger: 0 }, p2: { danger: 65 } } }), { localBoardId: 'p1' });
  audio.consume(baseState({ boards: { p1: { danger: 0 }, p2: { danger: 80 } } }), { localBoardId: 'p1' });
  audio.consume(baseState({ boards: { p1: { danger: 0 }, p2: { danger: 90 } } }), { localBoardId: 'p1' });
  audio.consume(baseState({
    boards: { p1: { danger: 0 }, p2: { danger: 20 } },
    events: [{ at: 6, type: 'rescue', playerId: 'p1' }]
  }), { localBoardId: 'p1' });

  assert.deepEqual(pulses, [15, [15, 24, 15]]);
});
