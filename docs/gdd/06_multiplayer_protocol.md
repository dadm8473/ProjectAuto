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
- commandResult for accepted/rejected commands
- event feed
- reconnect payload in M2, not in the 2-week thin slice

## 2. Room Model

| field | description |
|---|---|
| roomId | short code or UUID |
| seed | deterministic run seed |
| players | p1, p2 |
| spectators | optional later |
| createdAt | timestamp |
| status | waiting, playing, ended |
| mode | tutorial, normal, localTest |
| simulationTickRate | 20Hz |
| snapshotRate | 10Hz |

Room starts when:

- two humans join, or
- one human chooses bot partner, or
- local test mode creates room with bot.

## 3. Client Commands

All gameplay commands use the same envelope. Server ignores client-provided combat results, costs, rolls, and rewards.

```json
{
  "type": "supply",
  "requestId": "cmd_101",
  "clientId": "c_abc",
  "playerId": "p1",
  "roomId": "R7K2",
  "clientTick": 512,
  "sentAt": 1714200000.100
}
```

Envelope rules:

- `requestId` is unique per `clientId` for the room lifetime.
- `clientTick` is the last snapshot tick the client had processed when the command was sent.
- `sentAt` is client wall-clock time for telemetry only; server receive order is authoritative.
- Server rejects commands older than `currentTick - 40` using `STALE_COMMAND`.
- Duplicate `requestId` from the same `clientId` returns the stored `commandResult` and does not execute again.
- Reusing the same `clientId + requestId` with a different payload is rejected with `DUPLICATE_REQUEST`.

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

`reconnectToken` may be omitted in the 2-week thin slice. If sent before M2, clients store it but do not call reconnect.

### supply

```json
{
  "type": "supply",
  "requestId": "cmd_101",
  "clientId": "c_abc",
  "playerId": "p1",
  "roomId": "R7K2",
  "clientTick": 512,
  "sentAt": 1714200000.100
}
```

Validation:

- player is in room
- room status is playing
- board has empty slot
- team Charge enough using the Core Game Spec canonical Supply formula
- no Supply command cooldown in v0; spam is limited by Charge and empty sockets
- server computes grade odds from team Chance Level and player pity
- server applies first-run tutorial override before RNG only when room mode is `tutorial`
- server consumes `pendingSupplyDiscountPct` only after a successful Supply

### swap

```json
{
  "type": "swap",
  "requestId": "cmd_102",
  "clientId": "c_abc",
  "playerId": "p1",
  "roomId": "R7K2",
  "clientTick": 520,
  "sentAt": 1714200000.500,
  "a": 2,
  "b": 7
}
```

Validation:

- both slots contain Relay
- player owns board
- Swap Charge > 0
- slots are valid indexes 0-11
- if bossActive, `currentTick >= board.swapCooldownUntilTick`
- successful bossActive Swap sets `board.swapCooldownUntilTick = currentTick + 40`

### merge

```json
{
  "type": "merge",
  "requestId": "cmd_103",
  "clientId": "c_abc",
  "playerId": "p1",
  "roomId": "R7K2",
  "clientTick": 528,
  "sentAt": 1714200000.900,
  "slots": [1, 5, 9]
}
```

Validation:

- three slots
- destination socket is `slots[0]`
- same type
- same tier
- player owns board

### linkPulse

```json
{
  "type": "linkPulse",
  "requestId": "cmd_104",
  "clientId": "c_abc",
  "playerId": "p1",
  "roomId": "R7K2",
  "clientTick": 540,
  "sentAt": 1714200001.400
}
```

Validation:

- Link Energy >= 40
- team cooldown ready
- partner has at least one Relay
- server computes `partnerDanger` and `linkPulseSignalGain` using Core Game Spec

### overclock

```json
{
  "type": "overclock",
  "requestId": "cmd_105",
  "clientId": "c_abc",
  "playerId": "p1",
  "roomId": "R7K2",
  "clientTick": 548,
  "sentAt": 1714200001.800
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
      "teamCharge": 126,
      "chanceLevel": 1,
      "pendingSupplyDiscountPct": 25
    },
    "players": [
      {
        "playerId": "p1",
        "name": "Player",
        "connected": true,
        "swapCharge": 2,
        "personalSupplyCount": 8,
        "tutorialSupplyOverridesUsed": 2,
        "pityBasic": 2,
        "pityPrime": 8
      }
    ],
    "boards": {
      "p1": {
        "anchorIndex": 5,
        "overclockCooldown": 0,
        "swapCooldownUntilTick": 0,
        "overclockActiveUntilTick": 0,
        "anchorSlowedUntilTick": 0,
        "disabledLinks": [
          {
            "a": 0,
            "b": 1,
            "untilTick": 560,
            "source": "boss_mirror_linkbreak"
          }
        ],
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
            "activeLinks": [],
            "anchorLinked": false,
            "shutdownUntilTick": 0,
            "linkPulseUntilTick": 0,
            "debuffs": []
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
      "lanesRemaining": 2,
      "nextLaneSpawnIn": 0.42,
      "spawnEndReached": false,
      "bossTimer": 31.5
    },
    "cooldowns": {
      "linkPulseUntilTick": 590,
      "dualOverclockBossUntilTick": 548
    },
    "room": {
      "mode": "tutorial"
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
- `chanceLevel` and `pendingSupplyDiscountPct` also live under `signal` because they affect team-level Supply resolution.
- `swapCharge`, `personalSupplyCount`, and pity counters live under each player.
- `tutorialSupplyOverridesUsed` is per player and increments only when `room.mode = tutorial` grants the fixed first or second Supply.
- `boards.<playerId>.relays` contains only occupied sockets; empty sockets are implied.
- `wave.lanesRemaining`, `wave.nextLaneSpawnIn`, and `wave.spawnEndReached` mirror the lane-based spawn schedule. Do not expose legacy sequential-spawn fields in v0.
- `room.mode` controls tutorial override behavior and local test behavior.
- `overclockActiveUntilTick`, `anchorSlowedUntilTick`, `disabledLinks`, `linkPulseUntilTick`, `dualOverclockBossUntilTick`, `shutdownUntilTick`, and Relay `debuffs` are authoritative display state for two-tab UI.
- `dualOverclockBossUntilTick` lives under `cooldowns` because it is team-level.
- `disabledLinks` stores socket pairs disabled by boss effects.
- `activeLinks` is the effective combat/display links list after disabled link filtering. Clients and combat code must not count disabled pairs from `disabledLinks`.
- `activeLinks` stores adjacent socket indexes, not directions.
- All server times are derived from `tick`; clients do not submit combat results.

### commandResult

All gameplay commands return `commandResult`. Rejections use the same message type with `accepted: false`; there is no separate idempotency path for rejected commands.

Accepted example:

```json
{
  "type": "commandResult",
  "requestId": "cmd_101",
  "clientId": "c_abc",
  "accepted": true,
  "duplicate": false,
  "serverTick": 524,
  "result": {
    "spentCharge": 23,
    "unitId": "u_44",
    "socket": 6,
    "tutorialOverrideApplied": false
  }
}
```

Rejected example:

```json
{
  "type": "commandResult",
  "requestId": "cmd_103",
  "clientId": "c_abc",
  "accepted": false,
  "duplicate": false,
  "serverTick": 524,
  "code": "MERGE_NOT_MATCHING",
  "message": "Select three matching Relays."
}
```

Link Pulse result includes Signal recovery:

```json
{
  "type": "commandResult",
  "requestId": "cmd_104",
  "clientId": "c_abc",
  "accepted": true,
  "duplicate": false,
  "serverTick": 548,
  "result": {
    "heatReducedUnitIds": ["u_12", "u_18"],
    "signalGain": 4,
    "partnerDanger": true,
    "waveSignalGainUsed": 4,
    "saveEventTriggered": true,
    "pendingSupplyDiscountPct": 25
  }
}
```

Duplicate handling:

- Server stores the final `commandResult` for every gameplay command, accepted or rejected.
- If the same `clientId + requestId` arrives again, server sends the stored `commandResult`.
- `duplicate` is set to true in the resent response, but `serverTick`, `result`, `code`, `message`, and state mutations remain the original result.
- If another `clientId` reuses the same `requestId`, it is a separate command.

### event

```json
{
  "type": "event",
  "event": {
    "kind": "link_pulse_save",
    "playerId": "p2",
    "targetPlayerId": "p1",
    "savedUnitIds": ["u_12", "u_18"],
    "signalGain": 4,
    "pendingSupplyDiscountPct": 25
  }
}
```

## 5. Reconnect M2

Reconnect is specified for the post-prototype multiplayer milestone. It is not required for the 2-week thin slice in the prototype plan.

In the 2-week prototype, a reconnect command can return `NOT_IMPLEMENTED` and must not corrupt the active room.

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
- input commands include `clientTick` and `sentAt` from the common envelope
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
| DUPLICATE_REQUEST | same clientId/requestId reused with different payload |
| INVALID_RECONNECT_TOKEN | reconnect token mismatch |
| NOT_IMPLEMENTED | command belongs to a later milestone |
