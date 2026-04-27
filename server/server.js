import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  castLinkPulse,
  createGame,
  mergeRelays,
  overclockRelay,
  serializeState,
  supplyRelay,
  swapRelays,
  tickGame,
  tryBuyShopItem,
  upgradeSupplyFocus
} from '../src/shared/game.js';
import { acceptKey, decodeClientFrame, encodeServerFrame } from './ws.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT ?? 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const room = {
  game: createGame({ mode: 'online', seed: Date.now() % 100000 }),
  clients: new Map(),
  lastTick: Date.now(),
  resetAt: null
};

function safePath(url) {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  const resolved = path.resolve(root, `.${pathname}`);
  return resolved.startsWith(root) ? resolved : null;
}

function serve(req, res) {
  const filePath = safePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': mime[path.extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  });
}

function send(client, message) {
  if (!client.destroyed) client.write(encodeServerFrame(JSON.stringify(message)));
}

function broadcast(message) {
  for (const client of room.clients.keys()) send(client, message);
}

function assignPlayers() {
  const humans = [...room.clients.values()];
  room.game.players = humans.slice(0, 2).map((client, index) => ({
    id: client.playerId,
    name: client.name || `Player ${index + 1}`,
    bot: false,
    ready: true
  }));
  while (room.game.players.length < 2) {
    room.game.players.push({ id: 'p2', name: 'AUTO PARTNER', bot: true, ready: true });
  }
}

function handleAction(socket, action) {
  const client = room.clients.get(socket);
  if (action.type === 'join') {
    client.playerId = action.playerId || client.playerId;
    client.name = String(action.name || 'Player').slice(0, 18);
    assignPlayers();
    send(socket, { type: 'state', state: serializeState(room.game) });
    return;
  }
  const playerId = client?.playerId ?? 'guest';
  let result = { ok: false, reason: 'Unknown action.' };
  const boardPlayer = playerId === room.game.players[1]?.id ? 'p2' : 'p1';
  if (action.type === 'supply' || action.type === 'summon') result = supplyRelay(room.game, { playerId: boardPlayer });
  if (action.type === 'merge') result = mergeRelays(room.game, { playerId: boardPlayer, slotIds: action.slotIds ?? [] });
  if (action.type === 'swap') result = swapRelays(room.game, { playerId: boardPlayer, from: action.from, to: action.to });
  if (action.type === 'focus' || action.type === 'chance') result = upgradeSupplyFocus(room.game, { playerId: boardPlayer });
  if (action.type === 'pulse' || action.type === 'boost') result = castLinkPulse(room.game, { playerId: boardPlayer });
  if (action.type === 'overclock') result = overclockRelay(room.game, { playerId: boardPlayer, slot: action.slot });
  if (action.type === 'buy') result = tryBuyShopItem(room.game, { playerId, itemId: action.itemId });
  if (!result.ok) send(socket, { type: 'error', reason: result.reason });
}

function upgrade(req, socket) {
  if (req.headers.upgrade?.toLowerCase() !== 'websocket' || req.url !== '/ws') {
    socket.destroy();
    return;
  }
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey(req.headers['sec-websocket-key'])}`,
    '',
    ''
  ].join('\r\n'));
  const id = `p${room.clients.size + 1}`;
  room.clients.set(socket, { playerId: id, name: `Player ${room.clients.size + 1}` });
  assignPlayers();

  socket.on('data', (buffer) => {
    const text = decodeClientFrame(buffer);
    if (text === null) {
      socket.end();
      return;
    }
    if (!text) return;
    try {
      handleAction(socket, JSON.parse(text));
    } catch {
      send(socket, { type: 'error', reason: 'Bad message.' });
    }
  });
  socket.on('close', () => {
    room.clients.delete(socket);
    assignPlayers();
  });
  socket.on('error', () => {
    room.clients.delete(socket);
    assignPlayers();
  });
  send(socket, { type: 'state', state: serializeState(room.game) });
}

function tickRoom() {
  const now = Date.now();
  const dt = Math.min(0.1, (now - room.lastTick) / 1000);
  room.lastTick = now;
  tickGame(room.game, dt);
  if (room.game.over && room.resetAt === null) room.resetAt = now + 6000;
  if (room.resetAt !== null && now >= room.resetAt) {
    room.game = createGame({ mode: 'online', seed: Date.now() % 100000 });
    room.resetAt = null;
  }
  assignPlayers();
  broadcast({ type: 'state', state: serializeState(room.game) });
}

const server = http.createServer(serve);
server.on('upgrade', upgrade);
server.listen(port, () => {
  console.log(`ProjectAuto Signal Relay running at http://localhost:${port}`);
});
setInterval(tickRoom, 100);
