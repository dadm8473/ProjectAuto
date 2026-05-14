import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { decodeClientFrame, encodeServerFrame } from '../server/ws.js';
import { addRoomClient, boardForPlayer, createOnlineRoom, joinRoomClient, removeRoomClient, resetFinishedRoomForJoin } from '../server/room.js';

test('server frames encode a readable text websocket payload', () => {
  const frame = encodeServerFrame(JSON.stringify({ type: 'state', ok: true }));

  assert.equal(frame[0], 0x81);
  assert.equal(frame.subarray(2).toString('utf8'), '{"type":"state","ok":true}');
});

test('masked client frames decode into text payloads', () => {
  const payload = Buffer.from('{"type":"join"}');
  const mask = Buffer.from([1, 2, 3, 4]);
  const frame = Buffer.alloc(2 + 4 + payload.length);
  frame[0] = 0x81;
  frame[1] = 0x80 | payload.length;
  mask.copy(frame, 2);
  for (let i = 0; i < payload.length; i += 1) frame[6 + i] = payload[i] ^ mask[i % 4];

  assert.equal(decodeClientFrame(frame), '{"type":"join"}');
});

test('room player mapping gives the second online socket board p2', () => {
  const players = [
    { id: 'socket-a', name: 'Player 1', bot: false },
    { id: 'socket-b', name: 'Player 2', bot: false }
  ];

  assert.equal(boardForPlayer(players, 'socket-a'), 'p1');
  assert.equal(boardForPlayer(players, 'socket-b'), 'p2');
  assert.equal(boardForPlayer(players, 'late-joiner'), 'p1');
});

test('finished online rooms reset before a new socket joins', () => {
  const room = createOnlineRoom(1);
  const finishedId = room.game.id;
  room.game.over = true;
  room.game.result = { code: 'loss_signal_collapse' };
  room.resetAt = Date.now() + 6000;

  resetFinishedRoomForJoin(room, 2);

  assert.notEqual(room.game.id, finishedId);
  assert.equal(room.game.mode, 'online');
  assert.equal(room.game.over, false);
  assert.equal(room.game.result, null);
  assert.equal(room.resetAt, null);
});

test('accepted joins reset a finished room before assigning the player slot', () => {
  const room = createOnlineRoom(1);
  const first = {};
  const finishedId = room.game.id;
  room.game.over = true;
  room.game.result = { code: 'win_signal_restored' };
  room.resetAt = Date.now() + 6000;

  assert.deepEqual(joinRoomClient(room, first, 'First'), { ok: true, playerId: 'p1' });

  assert.notEqual(room.game.id, finishedId);
  assert.equal(room.game.over, false);
  assert.equal(room.game.result, null);
  assert.equal(room.resetAt, null);
  assert.deepEqual(room.game.players, [
    { id: 'p1', name: 'First', bot: false, ready: true },
    { id: 'p2', name: '자동 파트너', bot: true, ready: true }
  ]);
});

test('single remaining online socket is reassigned to p1 after stale p1 disconnects', () => {
  const room = createOnlineRoom(1);
  const staleP1 = {};
  const reconnecting = {};
  room.clients.set(staleP1, { playerId: 'p1', name: 'Old Player' });
  room.clients.set(reconnecting, { playerId: 'p2', name: 'New Player' });

  removeRoomClient(room, staleP1);

  const remaining = room.clients.get(reconnecting);
  assert.equal(remaining.playerId, 'p1');
  assert.deepEqual(room.game.players, [
    { id: 'p1', name: 'New Player', bot: false, ready: true },
    { id: 'p2', name: '자동 파트너', bot: true, ready: true }
  ]);
  assert.equal(boardForPlayer(room.game.players, remaining.playerId), 'p1');
});

test('full online room rejects a third socket without remapping the active match', () => {
  const room = createOnlineRoom(1);
  const first = {};
  const second = {};
  const third = {};

  assert.deepEqual(addRoomClient(room, first, 'First'), { ok: true, playerId: 'p1' });
  assert.deepEqual(addRoomClient(room, second, 'Second'), { ok: true, playerId: 'p2' });
  const playersBefore = structuredClone(room.game.players);

  assert.deepEqual(addRoomClient(room, third, 'Third'), { ok: false, reason: '방이 가득 찼습니다.' });
  assert.equal(room.clients.has(third), false);
  assert.deepEqual(room.game.players, playersBefore);
});

test('full finished online room rejects a third socket without resetting the result', () => {
  const room = createOnlineRoom(1);
  const first = {};
  const second = {};
  const third = {};

  assert.equal(joinRoomClient(room, first, 'First').ok, true);
  assert.equal(joinRoomClient(room, second, 'Second').ok, true);
  room.game.over = true;
  room.game.result = { outcome: 'win', reason: '검증용 결과' };
  const runIdBefore = room.game.runId;
  const playersBefore = structuredClone(room.game.players);
  const resultBefore = structuredClone(room.game.result);

  assert.deepEqual(joinRoomClient(room, third, 'Third'), { ok: false, reason: '방이 가득 찼습니다.' });
  assert.equal(room.clients.has(third), false);
  assert.equal(room.game.over, true);
  assert.equal(room.game.runId, runIdBefore);
  assert.deepEqual(room.game.players, playersBefore);
  assert.deepEqual(room.game.result, resultBefore);
});

test('server does not advance empty online rooms', async () => {
  const source = await readFile('server/server.js', 'utf8');
  const tickStart = source.indexOf('function tickRoom()');
  assert.notEqual(tickStart, -1);
  const tickBody = source.slice(tickStart, source.indexOf('const server =', tickStart));

  assert.equal(tickBody.includes('if (room.clients.size === 0) return;'), true);
  assert.equal(tickBody.indexOf('if (room.clients.size === 0) return;') < tickBody.indexOf('tickGame(room.game, dt);'), true);
});

test('online server rejects hidden manual overclock actions', async () => {
  const source = await readFile('server/server.js', 'utf8');
  const handleStart = source.indexOf('function handleAction');
  assert.notEqual(handleStart, -1);
  const handleBody = source.slice(handleStart, source.indexOf('function upgrade', handleStart));

  assert.equal(handleBody.includes("if (action.type === 'overclock')"), false);
  assert.equal(source.includes('overclockRelay'), false);
});
