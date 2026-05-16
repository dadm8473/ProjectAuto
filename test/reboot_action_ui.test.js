import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRebootActionState } from '../src/client/reboot_actions.js';
import { buildCombatActionExposure, buildCombatCoachCue, buildCombatCommandLabels, buildCombatStatusDisplay, buildCombatStatusPrompt, isCriticalRebootAction } from '../src/client/reboot_action_ui.js';

function state(overrides = {}) {
  return {
    now: overrides.now ?? 0,
    boards: {
      p1: { danger: overrides.p1Danger ?? 0, units: overrides.p1Units ?? [] },
      p2: { danger: overrides.p2Danger ?? 0, units: overrides.p2Units ?? [] }
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

test('combat coach cue teaches only the next simple first-run action', () => {
  assert.equal(buildCombatCoachCue({
    current: state({ now: 3 }),
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), 'summon');

  assert.equal(buildCombatCoachCue({
    current: state({ now: 24, p1Units: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }),
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: true }, rescue: { enabled: false } }
  }), 'merge');

  assert.equal(buildCombatCoachCue({
    current: state({ now: 78, p2Danger: 80, p1Units: [{ id: 'a' }] }),
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: true } }
  }), 'rescue');
});

test('combat coach cue avoids clutter after the player has clear context', () => {
  assert.equal(buildCombatCoachCue({
    current: state({ now: 18, p1Units: [{ id: 'a' }] }),
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), '');

  assert.equal(buildCombatCoachCue({
    current: state({ now: 70, p1Units: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }),
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: true }, rescue: { enabled: false } }
  }), '');

  assert.equal(buildCombatCoachCue({
    current: state({ now: 80, p2Danger: 80 }),
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), '');
});

test('combat status prompt names the next useful action instead of only elapsed time', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 4 }),
      resources: { p1: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    localBoardId: 'p1'
  }), '첫 유닛 배치');

  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 9 }),
      resources: { p1: { summon: 0, rescue: 0 } },
      actionState: { p1: { summon: false, merge: false, rescue: false } }
    },
    localBoardId: 'p1'
  }), '충전 11초');

  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 24, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: true, rescue: false } }
    },
    localBoardId: 'p1'
  }), '합성 가능');

  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 78, p2Danger: 82 }),
      resources: { p1: { summon: 10, rescue: 100 } },
      actionState: { p1: { summon: true, merge: false, rescue: true } }
    },
    localBoardId: 'p1'
  }), '구원 가능');
});

test('combat status prioritizes rescue preparation over extra summoning during partner danger', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 70, p2Danger: 82, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 45 } },
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    localBoardId: 'p1'
  }), '구원 충전 중');
});

test('combat status stays quiet for routine summon availability after onboarding', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 34, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    localBoardId: 'p1'
  }), '');
});

test('combat status aligns with rescue focus when rescue becomes ready below danger warning', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 76, p2Danger: 68, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 100 } },
      actionState: { p1: { summon: true, merge: false, rescue: true } }
    },
    localBoardId: 'p1'
  }), '구원 가능');
});

test('combat status names the boss clutch decision instead of generic action availability', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 94, p1Units: [{ id: 'a' }] }),
      resources: { p1: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    localBoardId: 'p1'
  }), '보스 대응');
});

test('combat status display does not stack a boss warning chip beside an active decision prompt', () => {
  assert.deepEqual(buildCombatStatusDisplay({
    statusPrompt: '보스 대응',
    bossWarning: true
  }), {
    visible: true,
    showPrompt: true,
    showBossWarning: false
  });
});

test('combat status display can show a boss warning alone when no prompt owns the dock', () => {
  assert.deepEqual(buildCombatStatusDisplay({
    statusPrompt: '',
    bossWarning: true
  }), {
    visible: true,
    showPrompt: false,
    showBossWarning: true
  });
});

test('combat status prioritizes rescue during dual boss and partner danger', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 95, p2Danger: 84, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 100 } },
      actionState: { p1: { summon: true, merge: false, rescue: true } }
    },
    localBoardId: 'p1'
  }), '구원 우선');
});

test('combat status prompt shows online partner wait before normal action prompts', () => {
  assert.equal(buildCombatStatusPrompt({
    current: {
      ...state({ now: 4 }),
      resources: { p1: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    localBoardId: 'p1',
    onlineWaiting: true
  }), '파트너 대기');
});

test('combat command labels show summon cooldown as charging time on the button', () => {
  assert.deepEqual(buildCombatCommandLabels({
    current: {
      ...state({ now: 9 }),
      resources: { p1: { summon: 0, rescue: 0 } },
      actionState: { p1: { summon: false, merge: false, rescue: false } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: false }, merge: { enabled: false }, rescue: { enabled: false } }
  }), {
    summon: '충전 11초',
    merge: '합성',
    rescue: '구원'
  });

  assert.deepEqual(buildCombatCommandLabels({
    current: {
      ...state({ now: 24 }),
      resources: { p1: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), {
    summon: '소환',
    merge: '합성',
    rescue: '구원'
  });
});

test('combat action exposure reveals only earned controls during onboarding', () => {
  assert.deepEqual(buildCombatActionExposure({
    current: {
      ...state({ now: 4 }),
      resources: { p1: { summon: 10, rescue: 0 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), { summon: true, merge: false, rescue: false, focus: 'summon', openCount: 1 });

  assert.deepEqual(buildCombatActionExposure({
    current: {
      ...state({ now: 24, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 0 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: true }, rescue: { enabled: false } }
  }), { summon: true, merge: true, rescue: false, focus: 'merge', openCount: 2 });

  assert.deepEqual(buildCombatActionExposure({
    current: {
      ...state({ now: 70, p2Danger: 82, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 60 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), { summon: true, merge: true, rescue: true, focus: 'rescue', openCount: 3 });
});

test('combat action exposure counts only visible learned commands for console staging', () => {
  assert.equal(buildCombatActionExposure({
    current: {
      ...state({ now: 4 }),
      resources: { p1: { summon: 10, rescue: 0 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }).openCount, 1);

  assert.equal(buildCombatActionExposure({
    current: {
      ...state({ now: 24, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 0 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: true }, rescue: { enabled: false } }
  }).openCount, 2);

  assert.equal(buildCombatActionExposure({
    current: {
      ...state({ now: 70, p2Danger: 82, p1Units: [{ id: 'a' }, { id: 'b' }] }),
      resources: { p1: { summon: 10, rescue: 60 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }).openCount, 3);
});

test('combat action exposure keeps rescue locked during minor early partner danger', () => {
  assert.deepEqual(buildCombatActionExposure({
    current: {
      ...state({ now: 18, p2Danger: 29 }),
      resources: { p1: { summon: 20, rescue: 0 } }
    },
    localBoardId: 'p1',
    actions: { summon: { enabled: true }, merge: { enabled: false }, rescue: { enabled: false } }
  }), { summon: true, merge: true, rescue: false, focus: 'summon', openCount: 2 });
});

test('locked merge action reason names grade-one merge candidates', () => {
  const actions = buildRebootActionState({
    actionState: { p1: { summon: false, merge: false, rescue: false } },
    resources: { p1: { summon: 0, rescue: 0 } }
  }, 'p1');

  assert.equal(actions.merge.reason, '1등급 2개 필요');
});
