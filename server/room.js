import { createGame } from '../src/shared/game.js';

export function boardForPlayer(players, playerId) {
  return playerId === players[1]?.id ? 'p2' : 'p1';
}

export function createOnlineRoom(seed = Date.now() % 100000) {
  return {
    game: createGame({ mode: 'online', seed, seedName: 'tutorial_success' }),
    clients: new Map(),
    lastTick: Date.now(),
    resetAt: null
  };
}

export function resetRoomGame(room, seed = Date.now() % 100000) {
  room.game = createGame({ mode: 'online', seed, seedName: 'tutorial_success' });
  room.lastTick = Date.now();
  room.resetAt = null;
  return room.game;
}

export function resetFinishedRoomForJoin(room, seed = Date.now() % 100000) {
  if (room.game.over) resetRoomGame(room, seed);
  return room.game;
}

export function normalizeRoomClientSlots(room) {
  let index = 1;
  for (const client of room.clients.values()) {
    client.playerId = `p${index}`;
    index += 1;
  }
}

export function assignRoomPlayers(room) {
  const humans = [...room.clients.values()];
  room.game.players = humans.slice(0, 2).map((client, index) => ({
    id: client.playerId,
    name: client.name || `플레이어 ${index + 1}`,
    bot: false,
    ready: true
  }));
  while (room.game.players.length < 2) {
    const botSlot = `p${room.game.players.length + 1}`;
    room.game.players.push({ id: botSlot, name: '자동 파트너', bot: true, ready: true });
  }
}

export function addRoomClient(room, socket, name) {
  if (room.clients.size >= 2) return { ok: false, reason: '방이 가득 찼습니다.' };
  const playerId = `p${room.clients.size + 1}`;
  room.clients.set(socket, { playerId, name: name || `플레이어 ${room.clients.size + 1}` });
  assignRoomPlayers(room);
  return { ok: true, playerId };
}

export function joinRoomClient(room, socket, name) {
  if (room.clients.size >= 2) return { ok: false, reason: '방이 가득 찼습니다.' };
  resetFinishedRoomForJoin(room);
  return addRoomClient(room, socket, name);
}

export function removeRoomClient(room, socket) {
  room.clients.delete(socket);
  if (room.clients.size === 0) resetRoomGame(room);
  else {
    normalizeRoomClientSlots(room);
    assignRoomPlayers(room);
  }
  return room;
}
