import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  serializeState,
  tickGame,
  tryBuyShopItem
} from '../src/shared/game.js';
import { boardForPlayer, createOnlineRoom, resetFinishedRoomForJoin, resetRoomGame } from './room.js';
import { approveClientPurchase, safeProfile } from './profile_purchase.js';
import { dispatchBattleAction } from './reboot_action_dispatch.js';
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

const room = createOnlineRoom();

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
  for (const [client, meta] of room.clients.entries()) {
    const boardPlayer = boardForPlayer(room.game.players, meta.playerId);
    send(client, { ...message, playerId: meta.playerId, boardPlayer });
  }
}

function isRebootGame(game) {
  return typeof game?.runId === 'string' && game.runId.startsWith('reboot-');
}

function assignPlayers(targetRoom = room) {
  const humans = [...targetRoom.clients.values()];
  targetRoom.game.players = humans.slice(0, 2).map((client, index) => ({
    id: client.playerId,
    name: client.name || `플레이어 ${index + 1}`,
    bot: false,
    ready: true
  }));
  while (targetRoom.game.players.length < 2) {
    targetRoom.game.players.push({ id: 'p2', name: '자동 파트너', bot: true, ready: true });
  }
}

function applyProfileToRoomGame(profile, targetRoom = room) {
  const safe = safeProfile(profile);
  targetRoom.game.resources.gems = Math.max(targetRoom.game.resources.gems ?? 0, safe.gems);
  targetRoom.game.metaProfile = targetRoom.game.metaProfile ?? { startingGems: 0 };
  targetRoom.game.metaProfile.startingGems = Math.max(targetRoom.game.metaProfile.startingGems ?? 0, safe.gems);
  targetRoom.game.unlocks = [...new Set([...(targetRoom.game.unlocks ?? []), ...safe.unlocks])];
}

export function handleActionForTest({ targetRoom = room, socket, action, send: sendFn = send }) {
  const client = targetRoom.clients.get(socket);
  if (action.type === 'join') {
    client.playerId = action.playerId || client.playerId;
    client.name = String(action.name || '플레이어').slice(0, 18);
    client.profile = safeProfile(action.profile);
    assignPlayers(targetRoom);
    applyProfileToRoomGame(client.profile, targetRoom);
    const boardPlayer = boardForPlayer(targetRoom.game.players, client.playerId);
    sendFn(socket, { type: 'state', state: serializeState(targetRoom.game), playerId: client.playerId, boardPlayer });
    return;
  }
  const playerId = client?.playerId ?? 'guest';
  let result = { ok: false, reason: '알 수 없는 행동.' };
  const boardPlayer = boardForPlayer(targetRoom.game.players, playerId);
  if (action.type === 'buy' && !isRebootGame(targetRoom.game)) {
    const approval = approveClientPurchase(client, action);
    if (!approval.ok) result = { ok: false, reason: approval.reason };
    else {
      targetRoom.game.resources.gems = Math.max(targetRoom.game.resources.gems ?? 0, approval.profile.gems + (approval.item.price.gems ?? 0));
      result = tryBuyShopItem(targetRoom.game, { playerId, itemId: action.itemId, ownedUnlocks: approval.profile.unlocks.filter((unlock) => unlock !== approval.item.grant.cosmetic) });
    }
  } else {
    result = dispatchBattleAction({ game: targetRoom.game, action, playerId, boardPlayer });
  }
  if (result.ok) sendFn(socket, { type: 'action_result', actionType: action.type, result, state: serializeState(targetRoom.game) });
  if (!result.ok) sendFn(socket, { type: 'error', reason: result.reason });
}

function handleAction(socket, action) {
  handleActionForTest({ targetRoom: room, socket, action, send });
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
  resetFinishedRoomForJoin(room);
  const id = `p${room.clients.size + 1}`;
  room.clients.set(socket, { playerId: id, name: `플레이어 ${room.clients.size + 1}` });
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
      send(socket, { type: 'error', reason: '잘못된 메시지.' });
    }
  });
  socket.on('close', () => {
    room.clients.delete(socket);
    if (room.clients.size === 0) resetRoomGame(room);
    assignPlayers();
  });
  socket.on('error', () => {
    room.clients.delete(socket);
    if (room.clients.size === 0) resetRoomGame(room);
    assignPlayers();
  });
  const boardPlayer = boardForPlayer(room.game.players, id);
  send(socket, { type: 'state', state: serializeState(room.game), playerId: id, boardPlayer });
}

function tickRoom() {
  const now = Date.now();
  const dt = Math.min(0.1, (now - room.lastTick) / 1000);
  room.lastTick = now;
  if (room.clients.size === 0) return;
  tickGame(room.game, dt);
  if (room.game.over && room.resetAt === null) room.resetAt = now + 6000;
  if (room.resetAt !== null && now >= room.resetAt) {
    resetRoomGame(room);
  }
  assignPlayers();
  broadcast({ type: 'state', state: serializeState(room.game) });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const server = http.createServer(serve);
  server.on('upgrade', upgrade);
  server.listen(port, () => {
    console.log(`ProjectAuto 시그널 릴레이 실행 중: http://localhost:${port}`);
  });
  setInterval(tickRoom, 100);
}
