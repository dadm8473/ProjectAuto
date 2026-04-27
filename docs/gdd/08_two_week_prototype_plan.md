# 2-week Prototype Plan

## Goal

Build a playable vertical co-op prototype that validates Relay supply, link-based board puzzle, heat pressure, partner rescue, and boss tension.

## Non-goals

- Native iOS/Android packaging
- real-money payment
- account persistence
- ranked matchmaking
- large content library
- final art
- tutorial polish beyond first-run prompts

## Success Metrics

| metric | target |
|---|---:|
| average session length | 6-8 minutes |
| first Merge within 2 minutes | 70% of testers |
| Link Pulse used during boss | 50% of boss waves |
| players understand loss reason | 80% after result screen |
| “one more run” response | 60% of testers |
| browser console errors | 0 |

## Show Build Hard Cutline

If Day 8 50-seed pass band fails, Day 9 multiplayer is deferred and the show build uses the `bot-only fallback branch` until the core loop passes.

Branches:

| branch | trigger | Day 9 scope | Day 10 online QA |
|---|---|---|---|
| core-loop pass branch | Day 8 pass band passes | local two-tab WebSocket | required |
| bot-only fallback branch | Day 8 pass band fails | local bot-only polish | not required; record as deferred |

Minimum Day 10 content:

- 10-wave deterministic sim remains required.
- Playable roster may cut to 10 core Relays: Needle Beam, Prism Lance, Coolant Moss, Rain Pump, Pulse Drum, Thunder Bowl, Amber Field, Null Cage, Signal Amp, Sink Stone.
- In cut scope, `utility Relay` means Repair, Amp, Sink, or Field tags. It does not require the Support tag.
- Boss implementation may cut Boss Mirror disruption first; Boss Orchid and Origin Null remain required.
- Multiplayer scope is local two-tab WebSocket only; reconnect, AWS deploy, accounts, and payments are outside the 2-week show build.
- Any cut content must be listed in `known issues` and must not break docs for the implemented subset.

## Week 1

### Day 1: Core state and deterministic sim

Deliver:

- Relay, board, signal, noise data models
- seeded RNG
- Supply command
- Merge command
- Heat tick
- unit tests

Exit criteria:

- same seed gives same first 20 Supply results
- invalid Merge rejected
- heat shutdown test passes

### Day 2: Combat loop

Deliver:

- Noise loop
- damage formula
- Signal/Saturation rules
- 10-wave table
- boss timers

Exit criteria:

- automated sim can win/lose
- wave 3 boss triggers
- Saturation 100 loss works

### Day 3: Co-op actions

Deliver:

- Link Pulse
- Overclock
- Swap
- shared Signal
- partner board events

Exit criteria:

- Link Pulse lowers partner heat
- Overclock creates real risk
- Swap changes linkMultiplier

### Day 4: Vertical UI

Deliver:

- top HUD
- partner board
- central Signal loop
- my board
- bottom actions

Exit criteria:

- one-hand portrait layout readable at 390x844
- Supply/Merge/Link visible without scrolling
- heat states clear in screenshot

### Day 5: Bot partner

Deliver:

- Casual bot policy
- first 20s wait
- resource reserve
- Link Pulse rescue
- Merge behavior

Exit criteria:

- bot does not steal first action
- bot rescues heat 90+ in 70% of test cases
- solo run reaches wave 3 in most seeds

## Week 2

### Day 6: Local playable loop and first playtest

Deliver:

- complete local bot run
- basic telemetry log
- 2-person observer playtest
- loss reason validation

Exit criteria:

- two testers can play the local bot build
- at least one tester reaches wave 3
- loss reason matches telemetry

### Day 7: Feedback and readability

Deliver:

- Merge effect
- Link Pulse effect
- boss warning
- result reason
- damage/repair numbers

Exit criteria:

- tester can identify who used Link Pulse
- loss reason matches log
- Prime+ Merge feels visually distinct

### Day 8: Balance pass 1

Deliver:

- tune wave hp/speed
- tune heat costs
- tune Supply cost
- run 50-seed simulations with ScriptedHuman + CasualBot

Exit criteria:

- ScriptedHuman + CasualBot simulation win rate 35-65%
- no early unavoidable loss before wave 3
- final boss lasts 25-55 seconds

### Day 9: Multiplayer thin slice

Deliver:

- WebSocket room
- join
- authoritative commands
- snapshot state
- no reconnect yet

Exit criteria:

- two browser tabs share one run
- wrong-board command rejected
- duplicate requestId does not double-execute

### Cut Scope for 2-week Build

These are intentionally cut unless the core fun is already validated:

- reconnect
- BM shell UI
- season pass UI
- account persistence
- native app packaging
- full cosmetics preview

### Day 10: Playtest build

Deliver:

- README run instructions
- QA checklist
- known issues
- test logging
- playable URL
- originality gate artifacts

Exit criteria:

- 5-person playtest possible
- browser/mobile test checklist complete
- originality gate complete
- all unit tests pass
- no console errors in 10-minute run

### Originality Gate

Required artifacts before showing the build:

- 390x844 screenshots: wave 1, wave 5, final boss.
- 360x800 screenshot: wave 5.
- 10-second clips: Supply to first Swap/link decision, Link Pulse rescue, Merge decision.
- telemetry: Supply is not the only high-frequency action; at least two non-Supply verbs occur in first 60 seconds.
- telemetry: utility Relay retention is >= 20% of kept Relays after wave 6 in at least one win log.
- log: at least one Link Pulse rescue prevents shutdown or Signal collapse.
- visual review: screen does not read as dice/guardian/random-summon UI at a glance.

## QA Checklist

- [ ] New run starts with empty player board and bot waiting.
- [ ] Supply fills a slot and spends Charge.
- [ ] Merge requires exact type/tier match.
- [ ] Heat reaches shutdown and recovers.
- [ ] Link Pulse affects partner board.
- [ ] Boss timer can win and lose.
- [ ] Saturation 100 loses.
- [ ] Result screen states one true cause.
- [ ] Core-loop pass branch only: online two-tab run syncs commands.
- [ ] Core-loop pass branch only: refresh/disconnect during Day 9 shows reconnect unsupported notice and does not corrupt the room.
- [ ] Bot-only fallback branch only: online QA is marked deferred in known issues.
- [ ] Originality gate artifacts are present and pass.

## Deliverable Definition

The prototype is ready to show only when:

- gameplay is fun enough for internal testers to ask for another run
- logs support the result screen
- bot partner does not frustrate the player
- co-op action is visible, not hidden in numbers
- docs match implemented rules
