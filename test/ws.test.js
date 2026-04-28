import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { decodeClientFrame, encodeServerFrame } from '../server/ws.js';
import { boardForPlayer, createOnlineRoom, resetFinishedRoomForJoin } from '../server/room.js';

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
