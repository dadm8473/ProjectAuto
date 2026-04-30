# ProjectAuto Reboot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ProjectAuto into a portrait mobile cooperative random board-rescue TD centered on `소환`, `합성`, and `구원`.

**Architecture:** Add a new reboot combat contract and engine beside the legacy implementation, then switch the public `src/shared/game.js` API through an adapter so the existing server and client can migrate safely. Split the large client app into action, render, screen, and online modules before rebuilding the combat UI.

**Tech Stack:** Vanilla JavaScript ES modules, Node `node:test`, Canvas 2D, WebSocket server, generated PNG/WebP assets, existing `npm test` command.

---

## Source Documents

- `docs/gdd/10_competitor_genre_analysis.md`
- `docs/gdd/11_core_combat_prototype_spec.md`
- `docs/gdd/12_reboot_modification_plan.md`
- `docs/design/generation/reboot_asset_prompts.md`

## File Map

### Create

- `src/shared/reboot_content.js`: Reboot units, enemies, waves, seeds, rules.
- `src/shared/reboot_game.js`: Reboot combat engine.
- `src/client/reboot_actions.js`: Button/action state and command mapping.
- `src/client/reboot_render.js`: Canvas battle renderer for toy-board combat.
- `src/client/reboot_screens.js`: Lobby, unit collection, shop, missions, season builders.
- `src/client/reboot_online.js`: WebSocket connection and action dispatch.
- `test/reboot_content.test.js`: Contract data tests.
- `test/reboot_game.test.js`: Seed suite simulation tests.
- `test/game_adapter.test.js`: Public API adapter tests.
- `test/reboot_multiplayer_contract.test.js`: Server action/seed/result contract tests.
- `test/reboot_result.test.js`: Result screen flow and retry contract tests.

### Modify

- `src/shared/game.js`: Public API adapter to reboot engine.
- `src/shared/event_text.js`: Reboot event labels.
- `src/shared/run_highlights.js`: Reboot result highlights.
- `src/shared/meta.js`: Cosmetic progress and fair reward flow.
- `src/client/app.js`: Bootstrap only; delegate action/render/screen/online work.
- `src/client/styles.css`: Portrait mobile game shell and 3-button battle controls.
- `src/client/render_layout.js`: 390x844 combat viewport and safe area rules.
- `server/server.js`: Authoritative WebSocket action dispatch.
- `server/room.js`: Seed/runId sync and action whitelist.
- `server/ws.js`: Reject or no-op legacy actions.
- `index.html`: Three battle buttons and reboot screen containers.
- Existing tests: update legacy assertions to reboot behavior when adapter lands.

## Task 0: Art Gate And Prompt Approval

**Files:**
- Created: `docs/design/generation/reboot_asset_prompts.md`
- Later create from this task: generated style lock images under `docs/design/generation/source/reboot/`

- [ ] **Step 1: Review the asset prompt document**

Read:

```bash
sed -n '1,260p' docs/design/generation/reboot_asset_prompts.md
```

Expected: The document defines home mockup, battle mockup, unit/enemy sample, reward/currency sample, runtime atlas prompts, reject rules, and approval checklist.

- [ ] **Step 2: Generate the four style lock images**

Use the prompts in:

```text
docs/design/generation/reboot_asset_prompts.md
```

Required outputs:

```text
docs/design/generation/source/reboot/style-lock/home-mockup.png
docs/design/generation/source/reboot/style-lock/battle-mockup.png
docs/design/generation/source/reboot/style-lock/unit-enemy-sample.png
docs/design/generation/source/reboot/style-lock/reward-currency-sample.png
```

- [ ] **Step 3: Reject weak images before coding**

Reject an image if any of these are true:

- It contains text, numbers, watermark, or logo-like accidental glyphs.
- It looks like a web dashboard.
- It looks like a dark sci-fi control panel.
- Units cannot be distinguished at 64px.
- Enemies look like square UI cards.
- The battle mockup does not show enemy path, player board, partner board, danger, and actions.

- [ ] **Step 4: Commit approved prompt/style gate**

Run:

```bash
git add docs/design/generation/reboot_asset_prompts.md docs/design/generation/source/reboot
git commit -m "lock reboot asset direction"
```

Expected: A commit containing only prompt/style gate files.

## Task 1: Reboot Combat Contract Data

**Files:**
- Create: `src/shared/reboot_content.js`
- Create: `test/reboot_content.test.js`

- [ ] **Step 1: Write the failing contract test**

Create `test/reboot_content.test.js` with tests that assert:

- `REBOOT_SEEDS` includes `tutorial_success`, `lucky_clutch`, `bad_recoverable`, `greed_loss`, `rescue_miss`, `boss_clutch`.
- `REBOOT_UNITS` includes `spark_pin`, `toktok_amp`, `slow_coil`, `burst_pin`, `rescue_coil`.
- `REBOOT_ENEMIES` includes `noise_shard`, `quick_noise`, `heavy_noise`, `mini_boss`.
- `REBOOT_RULES.summon.cost` is `10`.
- `REBOOT_RULES.rescue.tutorialWindowSeconds` is `10`.
- `REBOOT_RULES.screen.reference` is `390x844`.

Run:

```bash
node --test test/reboot_content.test.js
```

Expected: FAIL because `src/shared/reboot_content.js` does not exist yet.

- [ ] **Step 2: Implement `src/shared/reboot_content.js`**

Create exports:

```js
export const REBOOT_RULES = {
  screen: { width: 390, height: 844, combatHeight: 620, reference: '390x844' },
  path: { length: 640 },
  summon: { startCurrency: 10, cost: 10, grants: [{ at: 18, amount: 10 }, { at: 32, amount: 10 }, { at: 58, amount: 10 }, { at: 92, amount: 10 }] },
  merge: { requiredSameGrade: 2, revealMs: 700 },
  rescue: {
    chargeRequired: 100,
    tutorialWarningStart: 62,
    tutorialWindowStart: 76,
    tutorialWindowSeconds: 10,
    standardWindowSeconds: 6,
    partnerDangerWarning: 70,
    partnerDangerCritical: 80,
    dangerReduction: 45,
    knockbackPx: 120,
    slowSeconds: 3,
    slowPercent: 0.35
  },
  leakDamage: { normal: 12, heavy: 18, boss: 45 },
  defeatDanger: 100
};

export const REBOOT_UNITS = {
  spark_pin: { id: 'spark_pin', name: '스파크 핀', grade: 1, role: 'attack', damage: 8, cycle: 0.8, range: 150 },
  toktok_amp: { id: 'toktok_amp', name: '톡톡 앰프', grade: 1, role: 'support', amp: 1.2 },
  slow_coil: { id: 'slow_coil', name: '느림 코일', grade: 1, role: 'control', damage: 4, cycle: 1.1, slow: 0.2, slowSeconds: 1.5 },
  burst_pin: { id: 'burst_pin', name: '버스트 핀', grade: 2, role: 'attack', damage: 18, cycle: 0.75, range: 165 },
  rescue_coil: { id: 'rescue_coil', name: '구원 코일', grade: 2, role: 'rescue', damage: 10, rescueChargeOnPartnerDanger: 10 }
};

export const REBOOT_ENEMIES = {
  noise_shard: { id: 'noise_shard', name: '잡음 조각', hp: 20, speed: 42, leakDamage: 12 },
  quick_noise: { id: 'quick_noise', name: '빠른 잡음', hp: 14, speed: 58, leakDamage: 12 },
  heavy_noise: { id: 'heavy_noise', name: '무거운 잡음', hp: 46, speed: 32, leakDamage: 18 },
  mini_boss: { id: 'mini_boss', name: '소형 보스', hp: 220, speed: 24, leakDamage: 45 }
};
```

Also export `REBOOT_WAVES` and `REBOOT_SEEDS` using the exact seed names and wave timings from `docs/gdd/11_core_combat_prototype_spec.md`.

- [ ] **Step 3: Run the contract test**

Run:

```bash
node --test test/reboot_content.test.js
```

Expected: PASS.

- [ ] **Step 4: Run full tests**

Run:

```bash
npm test
```

Expected: Existing tests plus new contract test pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/shared/reboot_content.js test/reboot_content.test.js
git commit -m "add reboot combat contract"
```

## Task 2: Reboot Engine Seed Suite

**Files:**
- Create: `src/shared/reboot_game.js`
- Create: `test/reboot_game.test.js`

- [ ] **Step 1: Write seed simulation tests**

Create tests for:

- `tutorial_success`: summon, merge, rescue events occur within 120 seconds.
- `lucky_clutch`: result contains `boss_final_hit` or equivalent positive clutch highlight.
- `bad_recoverable`: bad roll still leads to win or near-win with slow/rescue utility.
- `greed_loss`: result reason is `greed`.
- `rescue_miss`: result reason is `rescue_missed`.
- `boss_clutch`: summon/merge/wait branches produce distinct result reasons.

Use these exact helper contracts in the test file:

```js
function advance(game, seconds, step = 0.25) {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    tickRebootGame(game, Math.min(step, seconds - elapsed));
  }
  return game;
}

function types(game) {
  return game.events.map((event) => event.type);
}

function lastResult(game) {
  assert.ok(game.result, 'expected game.result to be set');
  return game.result;
}
```

Expected event shape:

```js
{
  type: 'summon' | 'merge' | 'rescue' | 'enemy_leaked' | 'boss_final_hit' | 'result',
  at: 0,
  playerId: 'p1',
  unitId: 'spark_pin',
  enemyId: 'noise_shard',
  reason: 'greed',
  highlight: true
}
```

Expected result shape:

```js
{
  status: 'won' | 'lost',
  reason: 'boss_final_hit' | 'boss_slowed' | 'partner_rescued' | 'greed' | 'rescue_missed' | 'boss_leaked' | 'merge_gap' | 'bad_luck',
  nextGoal: 'next_run_goal_key',
  highlights: ['summon_first', 'partner_rescued']
}
```

Use these seed action scripts:

```js
const SCRIPTS = {
  tutorial_success: [
    [6, 'summon'],
    [19, 'summon'],
    [38, 'summon'],
    [51, 'merge'],
    [78, 'rescue']
  ],
  lucky_clutch: [
    [6, 'summon'],
    [18, 'summon'],
    [35, 'merge'],
    [74, 'rescue'],
    [105, 'merge']
  ],
  bad_recoverable: [
    [6, 'summon'],
    [20, 'summon'],
    [42, 'summon'],
    [62, 'merge'],
    [79, 'rescue']
  ],
  greed_loss: [
    [6, 'summon'],
    [18, 'summon'],
    [34, 'summon'],
    [52, 'merge'],
    [77, 'merge']
  ],
  rescue_miss: [
    [6, 'summon'],
    [19, 'summon'],
    [39, 'summon'],
    [52, 'merge']
  ]
};
```

`boss_clutch` must run three branches:

- summon slow branch: extra `summon` at 96 seconds with seed result `slow_coil`; status `won`, reason `boss_slowed`, highlight `boss_slowed`, boss remaining HP <= 28 at 116 seconds, no boss leak.
- summon burst branch: extra `summon` at 96 seconds with seed result `burst_pin`; status `won`, reason or highlight `boss_final_hit`, boss defeated between 114 and 116 seconds.
- merge branch: extra `merge` at 96 seconds using the visible `spark_pin` pair; status `won`, reason or highlight `boss_final_hit`, boss defeated before 116 seconds.
- wait branch: no action after 78 seconds; status `lost`, reason `boss_leaked`.

Do not encode a 92-101 second `summon` as an automatic loss. The source GDD defines late summon as a positive boss response when it produces `slow_coil` or `burst_pin`.

Run:

```bash
node --test test/reboot_game.test.js
```

Expected: FAIL because `src/shared/reboot_game.js` does not exist yet.

- [ ] **Step 2: Implement the engine state shape**

`createRebootGame({ mode, seedName, seed, players })` returns:

```js
{
  mode: 'bot',
  seedName: 'tutorial_success',
  now: 0,
  runId: 'reboot-...',
  boards: {
    p1: { playerId: 'p1', units: [], danger: 0 },
    p2: { playerId: 'p2', units: [], danger: 0 }
  },
  enemies: [],
  resources: {
    p1: { summon: 10, rescue: 0 },
    p2: { summon: 10, rescue: 0 }
  },
  result: null,
  events: [],
  actionState: {
    p1: { summon: true, merge: false, rescue: false },
    p2: { summon: true, merge: false, rescue: false }
  }
}
```

- [ ] **Step 3: Implement actions**

Implement:

```js
export function summonToy(game, { playerId = 'p1' } = {}) {}
export function mergeToys(game, { playerId = 'p1', unitIds = [] } = {}) {}
export function castRescue(game, { playerId = 'p1' } = {}) {}
export function tickRebootGame(game, dt) {}
export function serializeRebootState(game) {}
```

Required behavior:

- `summonToy` consumes 10 summon currency and uses the seed script result.
- `mergeToys` uses the first recommended pair during the first 120 seconds.
- `castRescue` is only enabled at rescue charge 100.
- `tickRebootGame` processes each tick in this order:
  1. grant timed summon currency
  2. spawn due wave enemies
  3. run bot partner scripted action
  4. acquire unit targets
  5. apply damage, amp, slow, rescue charge gains
  6. move enemies along the shared path
  7. resolve leaks and danger
  8. open/close rescue windows
  9. resolve boss branch flags
  10. set result once terminal condition is reached

The engine must stay deterministic for a given `{ seedName, seed }`; no call to `Math.random()` is allowed inside `src/shared/reboot_game.js`.

- [ ] **Step 4: Run seed suite tests**

Run:

```bash
node --test test/reboot_game.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/shared/reboot_game.js test/reboot_game.test.js
git commit -m "add reboot seed suite engine"
```

## Task 3: Game Adapter And Test Transition

**Files:**
- Modify: `src/shared/game.js`
- Create: `test/game_adapter.test.js`
- Modify: `test/game.test.js`

- [ ] **Step 1: Add adapter tests**

Tests must assert:

- `createGame({ mode: 'bot', seedName: 'tutorial_success' })` returns reboot state.
- `supplyRelay(game, { playerId: 'p1' })` maps to summon.
- `mergeRelays(game, { playerId: 'p1' })` maps to recommended merge.
- `castLinkPulse(game, { playerId: 'p1' })` maps to rescue.
- `swapRelays`, `upgradeSupplyFocus`, and `overclockRelay` are disabled/no-op in the first 120 seconds.

Run:

```bash
node --test test/game_adapter.test.js
```

Expected: FAIL until adapter is implemented.

- [ ] **Step 2: Convert public API**

Keep these exports stable:

```js
export function createGame(options) {}
export function tickGame(game, dt) {}
export function serializeState(game) {}
export function supplyRelay(game, payload) {}
export function mergeRelays(game, payload) {}
export function castLinkPulse(game, payload) {}
```

Map them to reboot functions from `src/shared/reboot_game.js`.

- [ ] **Step 3: Transition old tests**

Update `test/game.test.js` so it no longer asserts legacy-only behavior:

- Remove expectations for supply cost 20.
- Remove expectations for swap charges.
- Remove overclock/heat/link-shape assertions from the active reboot path.
- Keep general expectations for create, tick, action availability, result, and serialization.

- [ ] **Step 4: Run adapter and full tests**

Run:

```bash
node --test test/game_adapter.test.js test/game.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/shared/game.js test/game_adapter.test.js test/game.test.js
git commit -m "switch public game API to reboot adapter"
```

## Task 4: Server Multiplayer Contract

**Files:**
- Modify: `server/server.js`
- Modify: `server/room.js`
- Modify: `server/ws.js`
- Create: `test/reboot_multiplayer_contract.test.js`
- Modify: `test/ws.test.js`

- [ ] **Step 1: Write server contract tests**

Assert:

- Only `summon`, `merge`, `rescue` are active battle actions.
- Legacy actions are rejected or ignored with a known response.
- `seedName` and `runId` match for both players.
- Partner disconnect enables bot takeover.
- Result reason is identical for both players.
- Tests exercise the live action dispatch path, not only source-code string checks.

Use one of these harnesses:

1. Export a test-only pure dispatcher from `server/server.js`:

```js
export function handleActionForTest({ room, socket, action, send }) {}
```

2. Or run an in-process WebSocket round trip against `server/server.js`.

Required behavioral assertions:

- Sending `{ type: 'summon' }` mutates summon currency and broadcasts serialized reboot state.
- Sending `{ type: 'merge' }` uses the recommended merge path when available.
- Sending `{ type: 'rescue' }` mutates rescue state only when charge is full.
- Sending legacy `{ type: 'swap' }`, `{ type: 'focus' }`, `{ type: 'chance' }`, `{ type: 'pulse' }`, `{ type: 'boost' }`, or `{ type: 'overclock' }` returns a known reject/no-op result and does not change serialized state.
- Sending `{ type: 'buy' }` during active combat cannot mutate battle state and is handled only through the profile/shop path outside combat.

- [ ] **Step 2: Update room action handling**

Keep room lifecycle but route payloads to reboot adapter:

```js
const REBOOT_ACTIONS = new Set(['summon', 'merge', 'rescue']);
```

Update the actual WebSocket action dispatch in `server/server.js`, especially `handleAction`, so battle input enters only through the reboot action whitelist. `server/room.js` may own room state and seed sync, but it must not be the only file changed because the current server receives action messages through `server/server.js`.

Legacy action handling:

- `swap`
- `focus`
- `chance`
- `pulse`
- `boost`
- `overclock`

These must not mutate the reboot game during active combat.

Purchase, profile, shop, pass, mission, and cosmetic messages must stay outside active combat action dispatch. They can exist in profile/shop routes, but they cannot be accepted as battle actions.

- [ ] **Step 3: Run server tests**

Run:

```bash
node --test test/reboot_multiplayer_contract.test.js test/ws.test.js
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add server/server.js server/room.js server/ws.js test/reboot_multiplayer_contract.test.js test/ws.test.js
git commit -m "lock reboot multiplayer contract"
```

## Task 5: Client Module Split

**Files:**
- Create: `src/client/reboot_actions.js`
- Create: `src/client/reboot_render.js`
- Create: `src/client/reboot_screens.js`
- Create: `src/client/reboot_online.js`
- Modify: `src/client/app.js`

- [ ] **Step 1: Create module shells**

Each new module must export named functions:

```js
// reboot_actions.js
export function buildRebootActionState(state, playerId) {}
export function commandForRebootAction(action) {}

// reboot_render.js
export function drawRebootBattle(ctx, state, layout, assets) {}

// reboot_screens.js
export function buildRebootLobby(model) {}
export function buildRebootCollection(model) {}
export function buildRebootShop(model) {}

// reboot_online.js
export function createRebootOnlineClient(options) {}
```

- [ ] **Step 2: Move only wiring into `app.js`**

`app.js` remains responsible for:

- DOM lookup
- bootstrapping
- screen state
- animation loop
- module wiring

`app.js` must not directly own full battle render, online protocol, or screen builder logic after this task.

- [ ] **Step 3: Add measurable split guards**

Add assertions to `test/presentation.test.js` or a dedicated client structure test:

- `src/client/app.js` must be 900 lines or fewer after the split.
- `src/client/app.js` imports from all four reboot modules.
- `src/client/app.js` must not define these functions:
  - `drawRebootBattle`
  - `buildRebootLobby`
  - `buildRebootCollection`
  - `buildRebootShop`
  - `createRebootOnlineClient`
- `src/client/app.js` must not contain the legacy renderer anchors:
  - `function drawNoise`
  - `function drawRelayIcon`
  - `noiseEnemyAtlas`

Useful one-off guard:

```bash
node -e "const fs=require('fs'); const lines=fs.readFileSync('src/client/app.js','utf8').split('\n').length; if (lines > 900) { console.error('app.js line budget exceeded:', lines); process.exit(1); }"
```

- [ ] **Step 4: Run syntax and presentation tests**

Run:

```bash
node --check src/client/app.js
node -e "const fs=require('fs'); const lines=fs.readFileSync('src/client/app.js','utf8').split('\n').length; if (lines > 900) { console.error('app.js line budget exceeded:', lines); process.exit(1); }"
node --test test/presentation.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/client/app.js src/client/reboot_actions.js src/client/reboot_render.js src/client/reboot_screens.js src/client/reboot_online.js
git commit -m "split reboot client modules"
```

## Task 6: Three-Button Battle UI

**Files:**
- Modify: `index.html`
- Modify: `src/client/reboot_actions.js`
- Modify: `src/client/reboot_render.js`
- Modify: `src/client/app.js`
- Modify: `src/client/styles.css`
- Modify: `test/presentation.test.js`

- [ ] **Step 1: Update markup**

Battle action area contains exactly:

- `소환`
- `합성`
- `구원`

No battle entry for shop, pass, mission, ad, or paid revive.

- [ ] **Step 2: Implement action state**

Rules:

- `소환` enabled when summon currency >= 10.
- `합성` enabled only when recommended pair exists.
- `구원` enabled only when rescue charge is 100.
- First 120 seconds merge uses one recommended pair only.

- [ ] **Step 3: Update render**

`drawRebootBattle` must draw:

- shared track
- player board
- partner board
- partner danger
- summon currency
- rescue gauge
- merge ready cue
- boss warning
- rescue beam

- [ ] **Step 4: Test presentation constraints**

Update tests to assert:

- There are no more than 3 active battle buttons.
- Battle markup has no shop/pass/mission/ad button.
- Korean labels are present.

Run:

```bash
node --test test/presentation.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add index.html src/client/app.js src/client/reboot_actions.js src/client/reboot_render.js src/client/styles.css test/presentation.test.js
git commit -m "add reboot three-button battle UI"
```

## Task 7: Result And Retry Loop

**Files:**
- Modify: `src/shared/event_text.js`
- Modify: `src/shared/run_highlights.js`
- Modify: `src/shared/meta.js`
- Modify: `src/client/app.js`
- Modify: `src/client/reboot_screens.js`
- Create: `test/reboot_result.test.js`
- Modify: `test/event_text.test.js`
- Modify: `test/run_highlights.test.js`
- Modify: `test/meta.test.js`

- [ ] **Step 1: Add reboot result reasons**

Required reasons:

- `greed`
- `rescue_missed`
- `boss_leaked`
- `merge_gap`
- `bad_luck`
- `boss_final_hit`
- `boss_slowed`
- `partner_rescued`

- [ ] **Step 2: Result screen priority**

Result screen order:

1. Win/loss title
2. One run highlight
3. One failure reason or success reason
4. One next-run goal
5. One or two rewards
6. `다시 도전`
7. `홈`

- [ ] **Step 3: Keep failure monetization clean**

Assert no result failure button opens:

- shop
- ad
- paid revive
- pass purchase

- [ ] **Step 4: Add result flow integration test**

Create `test/reboot_result.test.js` and simulate at least these flows:

1. `tutorial_success` through the public adapter:
   - run action script from Task 2
   - assert result reason `partner_rescued` or `boss_final_hit`
   - assert result screen model priority is title, highlight, reason, next goal, reward, retry, home
   - assert primary action is `다시 도전`

2. `rescue_miss` through the public adapter:
   - run action script without rescue
   - assert result reason `rescue_missed`
   - assert next-run goal tells the player to save rescue for partner danger
   - assert no failure action opens shop, ad, paid revive, pass, or purchase

3. `greed_loss` through the public adapter:
   - run action script that spends the rescue window on merge
   - assert result reason `greed`
   - assert one readable corrective goal exists

The result screen model should be testable without a browser. Export a pure builder from `src/client/reboot_screens.js`, for example:

```js
export function buildRebootResultModel({ result, rewards }) {}
export function startRebootRetry({ previousGame, action }) {}
```

Expected model shape:

```js
{
  title: '승리' | '패배',
  highlight: { label: '파트너를 구했습니다', kind: 'success' },
  reason: { label: '구원을 쓰지 못했습니다', reason: 'rescue_missed' },
  nextGoal: { label: '다음 판에는 파트너 위험 80 전에 구원을 준비하세요', goal: 'save_rescue' },
  rewards: [{ type: 'soft', amount: 20 }],
  primaryAction: { label: '다시 도전', action: 'retry' },
  secondaryAction: { label: '홈', action: 'home' },
  forbiddenActions: []
}
```

Also simulate pressing retry:

```js
const retry = buildRebootResultModel({ result, rewards }).primaryAction;
const nextGame = startRebootRetry({ previousGame: game, action: retry });
```

Assert:

- `nextGame.runId !== previousGame.runId`.
- `nextGame.seedName === previousGame.seedName` when retrying a named training seed.
- `nextGame.result === null`.
- `nextGame.events.length === 0`.
- `nextGame.now === 0`.
- `nextGame.resources.p1.summon === 10`.
- no retry path calls shop, ad, paid revive, pass, or purchase.

- [ ] **Step 5: Run tests**

Run:

```bash
node --test test/reboot_result.test.js
node --test test/event_text.test.js test/run_highlights.test.js test/meta.test.js
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/shared/event_text.js src/shared/run_highlights.js src/shared/meta.js src/client/app.js src/client/reboot_screens.js test/reboot_result.test.js test/event_text.test.js test/run_highlights.test.js test/meta.test.js
git commit -m "add reboot result retry loop"
```

## Task 8: Home, Collection, Shop Reskin

**Files:**
- Modify: `src/client/reboot_screens.js`
- Modify: `src/client/styles.css`
- Modify: `src/shared/content.js`
- Modify: `server/profile_purchase.js`
- Modify: `test/profile_purchase.test.js`
- Modify: `test/presentation.test.js`

- [ ] **Step 1: Home screen**

Home must show:

- central deck/track preview
- one dominant `시작` button
- one reward hook
- compact currency/player status
- icon-first bottom dock

- [ ] **Step 2: Collection screen**

Collection must show:

- 5 reboot units
- role
- rarity/grade
- approved temporary silhouette asset or final sprite
- preview state

- [ ] **Step 3: Shop screen**

Shop must sell only:

- skins
- board themes
- merge effects
- rescue effects
- emotes
- profile frames

Reject:

- paid power
- paid revive
- paid reroll
- paid summon odds

- [ ] **Step 4: Run tests**

Run:

```bash
node --test test/profile_purchase.test.js test/presentation.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/client/reboot_screens.js src/client/styles.css src/shared/content.js server/profile_purchase.js test/profile_purchase.test.js test/presentation.test.js
git commit -m "reskin reboot home collection shop"
```

## Task 9: Asset Runtime Integration

**Files:**
- Add: `src/client/assets/generated/reboot-unit-atlas.png`
- Add: `src/client/assets/generated/reboot-enemy-atlas.png`
- Add: `src/client/assets/generated/reboot-ui-icons.png`
- Add: `src/client/assets/generated/reboot-reward-icons.png`
- Add: `src/client/assets/generated/reboot-board-accents.png`
- Modify: `src/client/reboot_render.js`
- Modify: `test/assets.test.js`

- [ ] **Step 1: Add approved processed assets**

Only add assets that passed:

- transparent background check
- atlas slicing check
- 24/48/64px readability
- in-game screenshot proof

- [ ] **Step 2: Update renderer asset loading**

Renderer must use reboot atlases for:

- unit sprites
- enemy sprites
- summon/merge/rescue icons
- danger frame
- reward shard
- reward icons
- board accents

`src/client/reboot_render.js` must define or import a reboot-only manifest matching `docs/design/generation/reboot_asset_prompts.md`:

```js
const REBOOT_ATLAS_MANIFEST = {
  units: { src: '/src/client/assets/generated/reboot-unit-atlas.png', columns: 5, rows: 1, order: ['spark_pin', 'toktok_amp', 'slow_coil', 'burst_pin', 'rescue_coil'] },
  enemies: { src: '/src/client/assets/generated/reboot-enemy-atlas.png', columns: 4, rows: 1, order: ['noise_shard', 'quick_noise', 'heavy_noise', 'mini_boss'] },
  ui: { src: '/src/client/assets/generated/reboot-ui-icons.png', columns: 6, rows: 1, order: ['summon_charge', 'merge_action', 'rescue_action', 'partner_danger', 'boss_warning', 'reward_shard'] },
  rewards: { src: '/src/client/assets/generated/reboot-reward-icons.png', columns: 4, rows: 1, order: ['soft_currency', 'cosmetic_shard', 'season_progress', 'unlock_capsule'] },
  board: { src: '/src/client/assets/generated/reboot-board-accents.png', columns: 5, rows: 1, order: ['player_socket', 'partner_socket', 'merge_ready_frame', 'rescue_beam_segment', 'danger_pulse_frame'] }
};
```

Do not reuse legacy `relay-unit-atlas.png`, `relay-world-sprites.png`, `noise-world-sprites.png`, `boss-disruption-atlas.png`, or old numeric `atlasIndex` mappings in reboot render code.

- [ ] **Step 3: Update asset tests**

Test:

- atlas dimensions divisible by cell count
- files exist
- image byte size is nonzero
- old black-card enemy artifact is not referenced by reboot renderer
- manifest `columns`, `rows`, `cell`, and `order` match the PNG dimensions and processed metadata
- reboot content uses manifest keys like `spriteKey: 'spark_pin'`, not legacy numeric atlas indexes

- [ ] **Step 4: Run tests**

Run:

```bash
node --test test/assets.test.js test/reboot_content.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/client/assets/generated/reboot-unit-atlas.png src/client/assets/generated/reboot-enemy-atlas.png src/client/assets/generated/reboot-ui-icons.png src/client/assets/generated/reboot-reward-icons.png src/client/assets/generated/reboot-board-accents.png src/client/reboot_render.js test/assets.test.js test/reboot_content.test.js
git commit -m "integrate reboot runtime assets"
```

## Task 10: Browser QA

**Files:**
- Modify only if QA finds defects.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Server available at `http://localhost:4173`.

- [ ] **Step 2: Open muted test URL**

Use:

```text
http://localhost:4173/?mute=1
```

- [ ] **Step 3: Test viewports**

Check:

- 375x812
- 390x844
- 430x932

- [ ] **Step 4: Verify battle screen**

Pass criteria:

- exactly 3 battle actions
- enemy path visible
- player board visible
- partner board visible
- danger state visible
- summon/merge/rescue readable
- no BM buttons during combat
- no sound while `?mute=1`

- [ ] **Step 5: Verify result screen**

Pass criteria:

- one result reason
- one next-run goal
- retry primary
- no paid revive/ad/shop prompt after failure

- [ ] **Step 6: Commit QA fixes**

If fixes were needed:

```bash
git add <changed-files>
git commit -m "fix reboot browser QA issues"
```

## Completion Gate

Do not call the reboot implementation complete until all commands pass:

```bash
npm test
node --check src/client/app.js
git diff --check
```

And browser QA passes at:

```text
http://localhost:4173/?mute=1
```

Viewports:

- 375x812
- 390x844
- 430x932

## Handoff

Preferred execution mode:

1. Use subagent-driven development for independent tasks:
   - Task 1-2 combat contract/engine
   - Task 5-6 client split/UI
   - Task 8 screens/BM
   - Task 9 assets

2. Main session integrates and verifies after each task.

3. Every task ends with:
   - tests
   - focused commit
   - short review
