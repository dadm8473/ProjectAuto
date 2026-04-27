export function boardForPlayer(players, playerId) {
  return playerId === players[1]?.id ? 'p2' : 'p1';
}
