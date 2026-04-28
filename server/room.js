import { createGame } from '../src/shared/game.js';

export function boardForPlayer(players, playerId) {
  return playerId === players[1]?.id ? 'p2' : 'p1';
}

export function createOnlineRoom(seed = Date.now() % 100000) {
  return {
    game: createGame({ mode: 'online', seed }),
    clients: new Map(),
    lastTick: Date.now(),
    resetAt: null
  };
}

export function resetRoomGame(room, seed = Date.now() % 100000) {
  room.game = createGame({ mode: 'online', seed });
  room.lastTick = Date.now();
  room.resetAt = null;
  return room.game;
}

export function resetFinishedRoomForJoin(room, seed = Date.now() % 100000) {
  if (room.game.over) resetRoomGame(room, seed);
  return room.game;
}
