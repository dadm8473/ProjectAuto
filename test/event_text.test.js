import test from 'node:test';
import assert from 'node:assert/strict';

import { eventLabel } from '../src/shared/event_text.js';

test('event labels cover recorded player actions and loop pressure', () => {
  assert.equal(eventLabel({ type: 'swap', from: 1, to: 5 }), 'Signal geometry shifted');
  assert.equal(eventLabel({ type: 'focus', focusLevel: 2 }), 'Supply focus raised to 2');
  assert.equal(eventLabel({ type: 'loop_complete', noiseType: 'null', signalDamage: 8 }), 'Null breached the loop');
});
