import test from 'node:test';
import assert from 'node:assert/strict';

import { createOnlineRoom } from '../server/room.js';
import { dispatchBattleAction } from '../server/reboot_action_dispatch.js';
import { handleActionForTest } from '../server/server.js';
import { serializeState, tickGame } from '../src/shared/game.js';

function action(room, type, extra = {}) {
  return dispatchBattleAction({
    game: room.game,
    action: { type, ...extra },
    playerId: 'socket-a',
    boardPlayer: 'p1'
  });
}

test('online rooms start on the reboot seed contract for both players', () => {
  const room = createOnlineRoom(101);
  const state = serializeState(room.game);

  assert.equal(room.game.mode, 'online');
  assert.equal(room.game.seedName, 'tutorial_success');
  assert.match(room.game.runId, /^reboot-/);
  assert.equal(room.game.id, room.game.runId);
  assert.equal(state.seedName, 'tutorial_success');
  assert.equal(state.runId, room.game.runId);
  assert.equal(state.players[0].id, 'p1');
  assert.equal(state.players[1].id, 'p2');
  assert.equal(state.players[1].bot, true);
});

test('reboot battle dispatch allows only summon, merge, and rescue to mutate combat state', () => {
  const room = createOnlineRoom(102);

  const summon = action(room, 'summon');
  assert.equal(summon.ok, true);
  assert.equal(room.game.boards.p1.units.length, 1);

  tickGame(room.game, 19);
  action(room, 'summon');
  tickGame(room.game, 19);
  action(room, 'summon');
  const merge = action(room, 'merge');
  assert.equal(merge.ok, true);
  assert.equal(room.game.boards.p1.units.some((unit) => unit.unitId === 'burst_pin'), true);

  tickGame(room.game, 78);
  const rescue = action(room, 'rescue');
  assert.equal(rescue.ok, true);
  assert.equal(room.game.events.some((event) => event.type === 'rescue'), true);
});

test('legacy online actions and combat buy are rejected without changing reboot state', () => {
  const room = createOnlineRoom(103);

  for (const type of ['supply', 'swap', 'focus', 'chance', 'pulse', 'boost', 'overclock', 'buy']) {
    const before = serializeState(room.game);
    const result = action(room, type, { itemId: 'skin-signal-mint' });

    assert.equal(result.ok, false);
    assert.deepEqual(serializeState(room.game), before);
  }
});

test('both online players observe the same reboot result reason', () => {
  const room = createOnlineRoom(104);

  action(room, 'summon');
  tickGame(room.game, 19);
  action(room, 'summon');
  tickGame(room.game, 19);
  action(room, 'summon');
  tickGame(room.game, 13);
  action(room, 'merge');
  tickGame(room.game, 27);
  action(room, 'rescue');
  tickGame(room.game, 42);

  const p1State = serializeState(room.game);
  const p2State = serializeState(room.game);

  assert.equal(p1State.result.reason, 'partner_rescued');
  assert.equal(p2State.result.reason, p1State.result.reason);
  assert.equal(p2State.runId, p1State.runId);
});

test('joining online with profile gems does not poison reboot combat resources', () => {
  const room = createOnlineRoom(105);
  const socket = { destroyed: false };
  room.clients.set(socket, { playerId: 'socket-a', name: 'Tester' });

  handleActionForTest({
    targetRoom: room,
    socket,
    action: { type: 'join', name: 'Tester', profile: { gems: 28, unlocks: ['skin-signal-mint'] } },
    send() {}
  });

  assert.deepEqual(Object.keys(room.game.resources).sort(), ['p1', 'p2']);
  assert.equal(room.game.metaProfile.startingGems, 28);
  assert.doesNotThrow(() => tickGame(room.game, 20));
});
