# ProjectAuto: Signal Relay

`Signal Relay` is a vertical cooperative tower-defense game prototype built around Relay supply, link geometry, heat risk, partner rescue, and boss pressure. The current build is no longer a dice-like MVP surface: the playable loop uses Signal, Saturation, Heat, Link Pulse, Swap, Overclock, and earned-only BM scaffolding.

## Run

```bash
npm run dev
```

Open `http://localhost:4173`.

## Current Play Loop

- `Supply`: spend shared Charge to place a random Relay into the first empty socket.
- `Merge x3`: select three matching Relays to create a higher-tier Relay.
- `Swap`: select two sockets to reshape active links.
- `Focus`: spend Charge to improve future Supply grade odds.
- `Link Pulse`: spend Link Energy to cool the partner's hottest Relay. The UI only says `Saved by Link Pulse` when an actual save event occurs.
- `Overclock`: spike one Relay's output and heat, risking shutdown.
- The central Signal loop spawns Noise. Loop completion increases Saturation and damages Signal integrity.
- Boss waves run on a timer and fire visible disruption events.

## Art Direction

Generated project-bound assets live in `src/client/assets/generated/`.

- `signal-relay-art-direction.png`: production reference for screen density, palette, material, and co-op board composition.
- `relay-unit-atlas.png`: 4x5 generated Relay icon atlas used by the canvas renderer.

The repeatable generation guide is in `docs/design/generation/asset_generation_guide.md`.

## Multiplayer

- Without a server, the local bot partner plays with you.
- The bot waits until the player starts before spending shared Charge.
- `Online` connects to the Node WebSocket room on the same server.
- On the same network, open `http://<server-ip>:4173` from another device to share a room.

## BM Structure

Real-money payment is intentionally not connected in this build. BM objects are represented as data and must remain earned-only until payment, account, and compliance work are explicitly added.

- Run boost: Lucky Cache
- Cosmetic: Mythic Aura, Founder Board
- Season track: Season Zero
- Daily missions: merge, rescue, signal clutch

## Deployment Note

For an EC2-style server with Node.js 20+:

```bash
PORT=4173 npm run start
```

Open TCP `4173` in the security group. Before live service, add HTTPS, accounts, matchmaking, persistence, abuse controls, and payment SDKs.

## Structure

- `src/shared/content.js`: Relay roster, Noise, waves, BM data.
- `src/shared/game.js`: shared deterministic game rules.
- `src/client/app.js`: portrait canvas UI and controls.
- `src/client/assets/generated/`: generated art references and icon atlas.
- `server/server.js`: static server and WebSocket room.
- `server/ws.js`: dependency-free WebSocket frame utilities.
- `test/`: rules and protocol tests.
