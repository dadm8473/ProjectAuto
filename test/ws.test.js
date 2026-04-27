import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeClientFrame, encodeServerFrame } from '../server/ws.js';

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
