import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createGame, serializeState, tickGame, tryBuildTower, tryBuyShopItem, upgradeTower } from '../src/shared/game.js';
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
  '.svg': 'image/svg+xml'
};

const room = {
  game: createGame({ mode: 'online', levelId: 'harbor-spiral', seed: Date.now() % 100000 }),
  clients: new Map(),
  lastTick: Date.now()
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
    ready: true,
    builds: room.game.players.find((player) => player.id === client.playerId)?.builds ?? 0
  }));
  while (room.game.players.length < 2) {
    room.game.players.push({ id: `bot${room.game.players.length + 1}`, name: 'AUTO-BOT', bot: true, ready: true, builds: 0 });
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
  if (action.type === 'build') result = tryBuildTower(room.game, { playerId, type: action.tower, x: action.x, y: action.y });
  if (action.type === 'upgrade') result = upgradeTower(room.game, { playerId, towerId: action.towerId });
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
  if (room.game.over) room.game = createGame({ mode: 'online', levelId: 'harbor-spiral', seed: Date.now() % 100000 });
  assignPlayers();
  broadcast({ type: 'state', state: serializeState(room.game) });
}

const server = http.createServer(serve);
server.on('upgrade', upgrade);
server.listen(port, () => {
  console.log(`ProjectAuto Relay Defense running at http://localhost:${port}`);
});
setInterval(tickRoom, 100);
