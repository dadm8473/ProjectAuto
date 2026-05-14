import test from 'node:test';
import assert from 'node:assert/strict';

import {
  castLinkPulse,
  createGame,
  mergeRelays,
  overclockRelay,
  serializeState,
  supplyRelay,
  swapRelays,
  tickGame,
  upgradeSupplyFocus
} from '../src/shared/game.js';

function advanceTo(game, time) {
  while (game.now < time) {
    tickGame(game, Math.min(0.25, time - game.now));
  }
}

test('createGame with a reboot seed returns reboot combat state through the public API', () => {
  const game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 42 });
  const state = serializeState(game);

  assert.equal(game.seedName, 'tutorial_success');
  assert.match(game.runId, /^reboot-/);
  assert.equal(state.seedName, 'tutorial_success');
  assert.equal(state.actionState.p1.summon, true);
  assert.equal('rng' in state, false);
});

test('legacy public actions map to summon, merge, and rescue in reboot mode', () => {
  const game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 43 });

  const firstSummon = supplyRelay(game, { playerId: 'p1' });
  assert.equal(firstSummon.ok, true);
  assert.equal(firstSummon.unit.unitId, 'spark_pin');

  advanceTo(game, 19);
  const secondSummon = supplyRelay(game, { playerId: 'p1' });
  assert.equal(secondSummon.ok, true);
  assert.equal(secondSummon.unit.unitId, 'toktok_amp');

  advanceTo(game, 38);
  const thirdSummon = supplyRelay(game, { playerId: 'p1' });
  assert.equal(thirdSummon.ok, true);

  advanceTo(game, 51);
  const merge = mergeRelays(game, { playerId: 'p1' });
  assert.equal(merge.ok, true);
  assert.equal(merge.unit.unitId, 'burst_pin');

  advanceTo(game, 78);
  const rescue = castLinkPulse(game, { playerId: 'p1' });
  assert.equal(rescue.ok, true);

  advanceTo(game, 120);
  assert.equal(game.result.reason, 'partner_rescued');
});

test('legacy-only actions are disabled without mutating reboot state', () => {
  const game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 44 });
  const before = serializeState(game);

  for (const action of [
    () => swapRelays(game, { playerId: 'p1', from: 0, to: 1 }),
    () => upgradeSupplyFocus(game, { playerId: 'p1' }),
    () => overclockRelay(game, { playerId: 'p1', slot: 0 })
  ]) {
    const result = action();
    assert.equal(result.ok, false);
    assert.equal(result.reason, '리부트 전투에서는 사용하지 않습니다.');
    assert.deepEqual(serializeState(game), before);
  }
});

test('non-reboot createGame keeps the legacy Signal Relay behavior during transition', () => {
  const game = createGame({ mode: 'bot', seed: 45 });

  assert.equal(game.title, '신호릴레이');
  assert.equal(game.resources.charge, 110);
  assert.equal(supplyRelay(game, { playerId: 'p1' }).ok, true);
});
