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
- run 50 seed simulations

Exit criteria:

- bot+player simulation win rate 35-65%
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

Exit criteria:

- 5-person playtest possible
- browser/mobile test checklist complete
- all unit tests pass
- no console errors in 10-minute run

## QA Checklist

- [ ] New run starts with empty player board and bot waiting.
- [ ] Supply fills a slot and spends Charge.
- [ ] Merge requires exact type/tier match.
- [ ] Heat reaches shutdown and recovers.
- [ ] Link Pulse affects partner board.
- [ ] Boss timer can win and lose.
- [ ] Saturation 100 loses.
- [ ] Result screen states one true cause.
- [ ] Online two-tab run syncs commands.
- [ ] Reconnect restores player seat.

## Deliverable Definition

The prototype is ready to show only when:

- gameplay is fun enough for internal testers to ask for another run
- logs support the result screen
- bot partner does not frustrate the player
- co-op action is visible, not hidden in numbers
- docs match implemented rules
