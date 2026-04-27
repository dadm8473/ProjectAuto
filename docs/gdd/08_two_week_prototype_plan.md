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

If Day 8 core-loop smoke band or full-roster fixture proof fails, Day 9 multiplayer is deferred and the show build uses the `bot-only fallback branch` until the core loop passes.

Branches:

| branch | trigger | Day 9 scope | Day 10 online QA |
|---|---|---|---|
| core-loop pass branch | Day 8 core-loop smoke band and full-roster fixtures pass | local two-tab WebSocket | required |
| bot-only fallback branch | Day 8 smoke band or fixture proof fails | local bot-only polish | not required; record as deferred |

Minimum Day 10 content:

- 10-wave deterministic sim remains required.
- Day 8 random sim uses the 10 core Relays; Day 8 targeted fixtures must cover the full v0 roster from the Balance Sheet.
- Playable roster may cut visual polish and tutorial emphasis to 10 core Relays: Needle Beam, Prism Lance, Coolant Moss, Rain Pump, Pulse Drum, Thunder Bowl, Amber Field, Null Cage, Signal Amp, Sink Stone.
- `coreLoopRosterProfile` is exactly those 10 core Relays. Day 8 smoke sim passes this filtered roster to Supply, Merge candidate generation, `computeMergePreview`, ScriptedHuman, and CasualBot helpers.
- The non-highlighted roster may use placeholder art/UI in Day 10. It must pass targeted fixtures, but it is disabled in random smoke sim and optional in the show build combat roster.
- Full roster means all Relay Effect Rules v0 rows are executable by Day 8: 20 Relay ids, 3 boss disruptions, Supply/Merge/Swap/Link Pulse/Overclock, and bot-visible logs.
- In cut scope, `utility Relay` means Repair, Amp, Sink, or Field tags. It does not require the Support tag.
- Boss Orchid, Boss Mirror, and Origin Null disruptions remain required in both branches. Cut boss visual polish before cutting named board-level disruption logs.
- Core-loop pass branch only: multiplayer scope is local two-tab WebSocket.
- Bot-only fallback branch: multiplayer is deferred and the show build must run fully with a local bot.
- Reconnect, AWS deploy, accounts, and payments are outside the 2-week show build in both branches.
- Any cut content must be listed in `known issues` and must not break docs for the implemented subset.

## Week 1

### Day 1: Core state and deterministic sim

Deliver:

- Relay, board, signal, noise data models
- seeded RNG
- Supply command
- Merge command
- `computeMergePreview` and `countEffectiveActiveLinks(board, disabledLinks, currentTick)`
- Heat tick
- unit tests

Exit criteria:

- same seed gives same first 20 Supply results
- invalid Merge rejected
- heat shutdown test passes
- expired `disabledLinks` do not affect active link counts

### Day 2: Combat loop

Deliver:

- Noise loop
- damage formula
- Signal/Saturation rules
- 10-wave table
- boss timers
- Beam/Pulse/Field damage effects: Needle Beam, Prism Lance, Split Ray, Pulse Drum, Thunder Bowl, Storm Heart, Amber Field, Gravity Loom, Null Cage
- speed/saturation modifier resolver

Exit criteria:

- automated sim can win/lose
- wave 3 boss triggers
- Saturation 100 loss works
- chain, slow, cage, and saturation mark tests pass

### Day 3: Co-op actions

Deliver:

- Link Pulse
- Overclock
- Swap
- shared Signal
- partner board events
- Repair/Amp/Sink/Support effects: Coolant Moss, Rain Pump, Root Clinic, Signal Amp, Bloom Amp, Aurora Amp, Sink Stone, Dusk Sink, Mirror Port, Twin Gate

Exit criteria:

- Link Pulse lowers partner heat
- Overclock creates real risk
- Swap changes linkMultiplier
- Mirror Support, Twin Gate, Aurora Amp, and Dusk Sink tests pass

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
- all 20 Relay ids have readable placeholder icon/name/state in portrait UI

### Day 5: Bot partner

Deliver:

- Casual bot policy
- first 20s wait
- resource reserve
- Link Pulse rescue
- Merge behavior
- bot uses full-roster public helpers for Merge preview, DPS, heat, and support estimates

Exit criteria:

- bot does not steal first action
- bot rescues heat 90+ in 70% of test cases
- solo run reaches wave 3 in most seeds
- bot-only sim covers every Relay id at least once across seeded fixture cases

## Week 2

### Day 6: Local playable loop and first playtest

Deliver:

- complete local bot run
- basic telemetry log
- 2-person observer playtest
- loss reason validation
- Boss Orchid, Boss Mirror, and Origin Null disruption implementations

Exit criteria:

- two testers can play the local bot build
- at least one tester reaches wave 3
- loss reason matches telemetry
- each boss disruption has at least one deterministic unit test or fixture replay

### Day 7: Feedback and readability

Deliver:

- Merge effect
- Link Pulse effect
- boss warning
- result reason
- damage/repair numbers
- full-roster fixture checklist for all Relay effect rows

Exit criteria:

- tester can identify who used Link Pulse
- loss reason matches log
- Prime+ Merge feels visually distinct
- all 20 Relay effect fixtures pass before Day 8 balance tuning starts, including `origin_seed` boss execute

### Day 8: Balance pass 1

Deliver:

- tune wave hp/speed
- tune heat costs
- tune Supply cost
- run 20-seed core-loop simulations with ScriptedHuman + CasualBot using `coreLoopRosterProfile`
- run full-roster targeted fixture suite for all 20 Relay ids and 3 boss disruptions
- record known issues for full-roster random 50-seed balance if not yet stable
- verify `origin_seed` execute appears in at least one targeted fixture and is not required to appear naturally in random 50-seed runs
- defer full-roster random balance and Hard Carry tuning to post-prototype unless the smoke gate finishes early

Exit criteria:

- core-loop smoke seed set is fixed: seeds `1000..1019`
- core-loop 20-seed smoke band passes: `deterministicCrashCount = 0`, `preWave3LossCount <= 1`, `wave6BossReachedCount >= 8`
- full-roster fixture checklist remains green before tuning numbers are trusted
- full-roster fixture checklist remains green after tuning

Full Balance Sheet 50-seed pass band remains the target for core-loop pass branch polish after Day 9 branch selection. It is not required before Day 9 branch selection; if it fails, record the balance gap in known issues and keep the branch decision based on the Day 8 smoke band plus full-roster fixture proof.

### Day 9: Branch Work

Core-loop pass branch deliver:

- WebSocket room
- join
- authoritative commands
- snapshot state
- no reconnect yet

Core-loop pass branch exit criteria:

- two browser tabs share one run
- wrong-board command rejected
- duplicate requestId does not double-execute

Bot-only fallback branch deliver:

- local bot-only polish
- telemetry gaps fixed
- known issues updated with deferred multiplayer
- originality gate artifacts captured from local run

Bot-only fallback branch exit criteria:

- fallback is internal diagnostic only unless the criteria below pass
- showable fallback must reach wave 6 boss in at least one scripted/dev-seeded run
- showable fallback must run at least 5 minutes without console errors
- showable fallback must demonstrate Supply, Swap, Merge, Link Pulse, Overclock, heat shutdown, and named disruption logs for all reached bosses
- because showable fallback must reach wave 6 boss, Boss Orchid and Boss Mirror disruption logs are minimum required proof
- known issues name why Day 8 smoke band, full-roster fixture proof, or optional 50-seed balance target failed
- no online QA is required in this branch

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
- branch-specific originality gate complete: full artifacts for core-loop pass branch; fallback subset plus explicit known-issues deferrals for bot-only fallback branch
- all unit tests pass
- no console errors in 10-minute run

### Originality Gate

Core-loop pass branch required artifacts before showing the build:

- 390x844 screenshots: wave 1, wave 5, final boss.
- 360x800 screenshot: wave 5.
- 10-second clips: Supply to first Swap/link decision, Link Pulse rescue, Merge decision.
- telemetry: Supply is not the only high-frequency action; at least two non-Supply verbs occur in first 60 seconds.
- telemetry: utility Relay retention is >= 20% of kept Relays after wave 6 in at least one win log.
- log: at least one Link Pulse rescue prevents shutdown or Signal collapse.
- visual review: screen does not read as dice/guardian/random-summon UI at a glance.

Bot-only fallback branch originality subset:

- 390x844 screenshots: wave 1, wave 5, highest reached boss.
- 360x800 screenshot: wave 5.
- 10-second clips: Supply to first Swap/link decision, Link Pulse rescue, Merge decision.
- telemetry: at least two non-Supply verbs occur in first 60 seconds.
- log: at least one Link Pulse rescue prevents shutdown or Signal collapse.
- visual review: screen does not read as dice/guardian/random-summon UI at a glance.
- known issues must state that final boss screenshot and win-log retention proof are deferred until core-loop pass branch.
- Boss disruption logs are still required for every boss reached in the fallback run; if a boss is not reached, the missing proof is listed as deferred rather than passed.

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
- [ ] Core-loop pass branch: full originality gate artifacts are present and pass.
- [ ] Bot-only fallback branch: fallback originality subset is present and known-issues deferrals are explicit.

## Deliverable Definition

The prototype is ready to show only when:

- gameplay is fun enough for internal testers to ask for another run
- logs support the result screen
- bot partner does not frustrate the player
- co-op action is visible, not hidden in numbers
- docs match implemented rules
