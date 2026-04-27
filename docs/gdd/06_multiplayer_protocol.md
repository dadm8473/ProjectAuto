# Multiplayer Protocol Spec

## 1. Architecture

Prototype server is authoritative.

Client sends commands:

- join room
- supply
- select/swap/merge
- link pulse
- overclock
- emote/ping

Server sends snapshots:

- game state
- rejected command
- event feed
- reconnect payload

## 2. Room Model

| field | description |
|---|---|
| roomId | short code or UUID |
| seed | deterministic run seed |
| players | p1, p2 |
| spectators | optional later |
| createdAt | timestamp |
| status | waiting, playing, ended |
| tickRate | 10 snapshots/sec prototype |

Room starts when:

- two humans join, or
- one human chooses bot partner, or
- local test mode creates room with bot.

## 3. Client Commands

### join

```json
{
  "type": "join",
  "clientId": "c_abc",
  "name": "Player",
  "roomId": "AUTO",
  "version": "0.2.0"
}
```

Server response:

```json
{
  "type": "joined",
  "playerId": "p1",
  "roomId": "R7K2",
  "snapshot": {}
}
```

### supply

```json
{
  "type": "supply",
  "requestId": "cmd_101",
  "playerId": "p1"
}
```

Validation:

- player is in room
- room status is playing
- board has empty slot
- team Charge enough
- player command cooldown ok

### swap

```json
{
  "type": "swap",
  "requestId": "cmd_102",
  "playerId": "p1",
  "a": 2,
  "b": 7
}
```

Validation:

- both slots contain Relay
- player owns board
- Swap Charge > 0
- slots are valid indexes 0-11

### merge

```json
{
  "type": "merge",
  "requestId": "cmd_103",
  "playerId": "p1",
  "slots": [1, 5, 9]
}
```

Validation:

- three slots
- same type
- same tier
- player owns board

### linkPulse

```json
{
  "type": "linkPulse",
  "requestId": "cmd_104",
  "playerId": "p1"
}
```

Validation:

- Link Energy >= 40
- team cooldown ready
- partner has at least one Relay

### overclock

```json
{
  "type": "overclock",
  "requestId": "cmd_105",
  "playerId": "p1"
}
```

Validation:

- player cooldown ready
- board has at least one Relay
- not in post-run state

## 4. Server Messages

### snapshot

```json
{
  "type": "snapshot",
  "serverTime": 1714200000.123,
  "tick": 523,
  "state": {
    "signal": {},
    "players": [],
    "boards": {},
    "noise": [],
    "wave": {},
    "events": []
  }
}
```

### commandRejected

```json
{
  "type": "commandRejected",
  "requestId": "cmd_103",
  "code": "MERGE_NOT_MATCHING",
  "message": "Select three matching Relays."
}
```

### event

```json
{
  "type": "event",
  "event": {
    "kind": "clutch_link",
    "playerId": "p2",
    "targetPlayerId": "p1",
    "signalSaved": 8
  }
}
```

## 5. Reconnect

Client reconnect window: 45 seconds.

Reconnect command:

```json
{
  "type": "reconnect",
  "clientId": "c_abc",
  "roomId": "R7K2",
  "lastSeenTick": 501
}
```

Server:

- reassign same playerId if token matches
- send full snapshot
- mark player as reconnected
- if both players disconnected for 45s, pause room for 20s, then end

## 6. Latency Handling

Prototype:

- no client prediction for combat
- optimistic button feedback allowed
- server rejection rolls UI back
- snapshots at 10Hz
- input commands timestamped

Later:

- local animation prediction
- deterministic replay
- binary frames if needed

## 7. Anti-cheat v0

Server ignores:

- client-provided RNG results
- client-provided damage
- client-provided rewards
- commands from wrong player board

Server owns:

- seed
- Supply roll
- Merge result
- damage ticks
- wave spawns
- rewards

## 8. Error Codes

| code | meaning |
|---|---|
| ROOM_NOT_FOUND | room missing |
| VERSION_MISMATCH | client version unsupported |
| NOT_YOUR_BOARD | command targets partner board |
| NO_EMPTY_SLOT | board full |
| NOT_ENOUGH_CHARGE | Charge too low |
| NOT_ENOUGH_LINK | Link Energy too low |
| COOLDOWN | action cooldown active |
| MERGE_NOT_MATCHING | invalid merge |
| GAME_ALREADY_ENDED | command after result |
