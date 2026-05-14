import test from 'node:test';
import assert from 'node:assert/strict';

import { createRebootOnlineClient } from '../src/client/reboot_online.js';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close');
  }
}

function installFakeBrowser() {
  FakeWebSocket.instances = [];
  const previousWebSocket = globalThis.WebSocket;
  const previousLocation = globalThis.location;
  globalThis.WebSocket = FakeWebSocket;
  globalThis.location = { protocol: 'http:', host: 'play.test' };
  return () => {
    globalThis.WebSocket = previousWebSocket;
    globalThis.location = previousLocation;
  };
}

test('online client reports connection lifecycle and sends profile join payload', () => {
  const restore = installFakeBrowser();
  const statuses = [];
  try {
    const client = createRebootOnlineClient({
      name: '테스터',
      profile: { gems: 77, unlocks: ['skin-signal-mint'], equippedCosmetic: 'skin-signal-mint' },
      onStatus(status) {
        statuses.push(status);
      }
    });

    client.connect();
    const socket = FakeWebSocket.instances[0];
    assert.equal(socket.url, 'ws://play.test/ws');
    assert.deepEqual(statuses.map((entry) => entry.state), ['connecting']);

    socket.readyState = FakeWebSocket.OPEN;
    socket.emit('open');

    assert.deepEqual(statuses.map((entry) => entry.state), ['connecting', 'open']);
    assert.deepEqual(JSON.parse(socket.sent[0]), {
      type: 'join',
      name: '테스터',
      profile: { gems: 77, unlocks: ['skin-signal-mint'], equippedCosmetic: 'skin-signal-mint' }
    });
  } finally {
    restore();
  }
});

test('online client rejects commands before the socket is open instead of dropping them silently', () => {
  const restore = installFakeBrowser();
  const errors = [];
  try {
    const client = createRebootOnlineClient({
      onError(reason) {
        errors.push(reason);
      }
    });

    client.connect();
    const delivered = client.send({ type: 'summon' });

    assert.equal(delivered, false);
    assert.deepEqual(errors, ['온라인 연결 대기 중']);
    assert.deepEqual(FakeWebSocket.instances[0].sent, []);
  } finally {
    restore();
  }
});

test('online client turns malformed server frames into a readable protocol error', () => {
  const restore = installFakeBrowser();
  const errors = [];
  try {
    const client = createRebootOnlineClient({
      onError(reason) {
        errors.push(reason);
      }
    });

    client.connect();
    FakeWebSocket.instances[0].emit('message', { data: '{bad json' });

    assert.deepEqual(errors, ['온라인 메시지 오류']);
  } finally {
    restore();
  }
});

test('online client rejects server frames with missing state shape', () => {
  const restore = installFakeBrowser();
  const errors = [];
  const states = [];
  try {
    const client = createRebootOnlineClient({
      onState(state) {
        states.push(state);
      },
      onError(reason) {
        errors.push(reason);
      }
    });

    client.connect();
    FakeWebSocket.instances[0].emit('message', { data: 'null' });
    FakeWebSocket.instances[0].emit('message', { data: '{"type":"state"}' });
    FakeWebSocket.instances[0].emit('message', { data: '{"type":"state","state":{}}' });

    assert.deepEqual(states, []);
    assert.deepEqual(errors, ['온라인 메시지 오류', '온라인 메시지 오류', '온라인 메시지 오류']);
  } finally {
    restore();
  }
});
