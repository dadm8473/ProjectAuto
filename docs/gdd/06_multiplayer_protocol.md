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
| simulationTickRate | 20Hz |
| snapshotRate | 10Hz |

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
  "reconnectToken": "rt_opaque_128bit",
  "snapshot": {
    "tick": 0,
    "state": {}
  }
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
- team Charge enough using `20 + floor(personalSupplyCount / 5) * 3`
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
    "signal": {
      "integrity": 92,
      "saturation": 34,
      "linkEnergy": 58,
      "teamCharge": 126
    },
    "players": [
      {
        "playerId": "p1",
        "name": "Player",
        "connected": true,
        "swapCharge": 2,
        "personalSupplyCount": 8,
        "pityBasic": 2,
        "pityPrime": 8
      }
    ],
    "boards": {
      "p1": {
        "anchorIndex": 5,
        "overclockCooldown": 0,
        "relays": [
          {
            "unitId": "u_1",
            "socket": 0,
            "type": "needle_beam",
            "tier": 1,
            "grade": "Basic",
            "heat": 24,
            "cooldown": 0.35,
            "linkShape": ["E", "W"],
            "activeLinks": [1],
            "anchorLinked": false,
            "shutdownUntilTick": 0
          }
        ]
      }
    },
    "noise": [
      {
        "noiseId": "n_1",
        "type": "crawler",
        "hp": 42,
        "maxHp": 55,
        "progress": 0.42,
        "speed": 38,
        "lane": 0
      }
    ],
    "wave": {
      "index": 3,
      "active": true,
      "spawnQueueRemaining": 18,
      "nextSpawnIn": 0.42,
      "bossTimer": 31.5
    },
    "cooldowns": {
      "linkPulseUntilTick": 590
    },
    "events": [
      {
        "eventId": "ev_22",
        "kind": "damage",
        "tick": 523,
        "source": "u_1",
        "target": "n_1",
        "amount": 18
      }
    ]
  }
}
```

Snapshot schema rules:

- `teamCharge` and `linkEnergy` live under `signal` because they are team shared.
- `swapCharge`, `personalSupplyCount`, and pity counters live under each player.
- `boards.<playerId>.relays` contains only occupied sockets; empty sockets are implied.
- `activeLinks` stores adjacent socket indexes, not directions.
- All server times are derived from `tick`; clients do not submit combat results.

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
  "reconnectToken": "rt_opaque_128bit",
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
- commands are processed in server receive order within the next simulation tick
- duplicate `requestId` from the same `clientId` returns the original result and does not execute twice
- commands older than `currentTick - 40` are rejected with `STALE_COMMAND`
- bot commands are generated server-side and use `clientId: "server_bot"`

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
| STALE_COMMAND | command arrived too late |
| DUPLICATE_REQUEST | requestId already processed |
| INVALID_RECONNECT_TOKEN | reconnect token mismatch |
