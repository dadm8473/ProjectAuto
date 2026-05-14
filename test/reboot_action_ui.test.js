import test from 'node:test';
import assert from 'node:assert/strict';

import { isCriticalRebootAction } from '../src/client/reboot_action_ui.js';

function state(overrides = {}) {
  return {
    now: overrides.now ?? 0,
    boards: {
      p1: { danger: overrides.p1Danger ?? 0 },
      p2: { danger: overrides.p2Danger ?? 0 }
    }
  };
}

test('critical action cue appears only for playable boss and rescue decisions', () => {
  assert.equal(isCriticalRebootAction({ actionKey: 'summon', current: state({ now: 94 }), localBoardId: 'p1', enabled: true }), true);
  assert.equal(isCriticalRebootAction({ actionKey: 'merge', current: state({ now: 100 }), localBoardId: 'p1', enabled: true }), true);
  assert.equal(isCriticalRebootAction({ actionKey: 'summon', current: state({ now: 91.9 }), localBoardId: 'p1', enabled: true }), false);
  assert.equal(isCriticalRebootAction({ actionKey: 'summon', current: state({ now: 102 }), localBoardId: 'p1', enabled: true }), false);
  assert.equal(isCriticalRebootAction({ actionKey: 'merge', current: state({ now: 120 }), localBoardId: 'p1', enabled: true }), false);
  assert.equal(isCriticalRebootAction({ actionKey: 'summon', current: state({ now: 94 }), localBoardId: 'p1', enabled: false }), false);
});

test('critical rescue cue follows partner danger for either local board', () => {
  assert.equal(isCriticalRebootAction({ actionKey: 'rescue', current: state({ p2Danger: 70 }), localBoardId: 'p1', enabled: true }), true);
  assert.equal(isCriticalRebootAction({ actionKey: 'rescue', current: state({ p1Danger: 76 }), localBoardId: 'p2', enabled: true }), true);
  assert.equal(isCriticalRebootAction({ actionKey: 'rescue', current: state({ p2Danger: 69.9 }), localBoardId: 'p1', enabled: true }), false);
  assert.equal(isCriticalRebootAction({ actionKey: 'rescue', current: state({ p2Danger: 90 }), localBoardId: 'p1', enabled: false }), false);
  assert.equal(isCriticalRebootAction({ actionKey: 'merge', current: state({ p2Danger: 95 }), localBoardId: 'p1', enabled: true }), false);
});
