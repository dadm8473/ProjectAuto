# App Screen Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current combat overlay shell into a mobile game app shell with splash, lobby, relay lab, shop, missions, season pass, battle, and result screens.

**Architecture:** Keep the existing vanilla HTML/CSS/canvas stack. Add an `appScreen` client state that drives full-screen non-combat app screens; hide those screens for battle and keep the existing result overlay for run completion. Replace the legacy growth drawer with independent lobby, relay lab, shop, missions, and season screens. Use the existing `SHOP`, `RELAY_TYPES`, and meta profile data to populate first-pass screens without introducing server changes.

**Tech Stack:** Vanilla JavaScript modules, HTML, CSS, Node test runner, current canvas combat renderer.

---

### Task 1: Lock The Screen Contract In Tests

**Files:**
- Modify: `test/presentation.test.js`
- Reference: `docs/gdd/09_app_screen_architecture.md`

- [ ] **Step 1: Write the failing test**

Add a presentation test named `app shell exposes splash, lobby, and non-combat menu screens`.

The test should assert these HTML markers:

```js
for (const marker of [
  'id="splashScreen"',
  'id="splashStartButton"',
  'id="lobbyScreen"',
  'id="labScreen"',
  'id="shopScreen"',
  'id="missionsScreen"',
  'id="seasonScreen"',
  'data-open-screen="lab"',
  'data-open-screen="shop"',
  'data-open-screen="missions"',
  'data-open-screen="season"',
  'class="lobby-profile"',
  'class="lobby-primary"',
  'class="lobby-preview"',
  'class="lobby-menu"'
]) {
  assert.equal(html.includes(marker), true, marker);
}

assert.equal(html.includes('id="drawer"'), false);
assert.equal(html.includes('id="launchGrowthButton"'), false);
assert.equal(html.includes('id="resultRewardButton"'), false);
assert.equal(html.includes('전투 성장과 미션 보기'), false);
```

The test should assert these JS markers:

```js
for (const marker of [
  "let appScreen = 'splash';",
  'function showAppScreen',
  'function showLobby',
  'function renderAppScreens',
  'function buildRelayLab',
  'function buildMissionScreen',
  'function buildSeasonScreen',
  "launchOverlay.dataset.screen = appScreen",
  "document.body.dataset.appScreen = appScreen",
  "showAppScreen('battle')",
  "showAppScreen('result')"
]) {
  assert.equal(js.includes(marker), true, marker);
}

assert.equal(js.includes("document.querySelector('#drawer')"), false);
assert.equal(js.includes('openRewardsDrawer'), false);
assert.equal(js.includes('closeDrawer'), false);
```

The test should assert these CSS markers:

```js
for (const marker of [
  '.app-screen',
  '.splash-screen',
  '.lobby-screen',
  '.lobby-profile',
  '.lobby-menu',
  '.lobby-preview',
  '.screen-grid',
  '.screen-back',
  '.screen-card'
]) {
  assert.equal(css.includes(marker), true, marker);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/presentation.test.js`

Expected: FAIL because `splashScreen`, `appScreen`, and new screen CSS do not exist.

- [ ] **Step 3: Commit is not allowed yet**

Do not commit after red. Implement Task 2 first.

### Task 2: Add Screen Markup

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the launch panel structure**

Inside `#launchOverlay`, create these panels. The overlay is the app home layer, not a drawer or modal:

```html
<div id="splashScreen" class="app-screen splash-screen" data-screen-panel="splash">
  <span class="launch-kicker">시즌 01</span>
  <strong>시그널 릴레이</strong>
  <p>두 신호장을 연결하세요</p>
  <button id="splashStartButton">탭해서 시작</button>
</div>

<div id="lobbyScreen" class="app-screen lobby-screen" data-screen-panel="lobby" hidden>
  <section class="lobby-profile">
    <span>플레이어</span>
    <strong id="lobbyGemMeter">0젬</strong>
    <em id="lobbyXpMeter">0 XP</em>
  </section>
  <section class="lobby-primary">
    <div class="lobby-preview" aria-hidden="true"></div>
    <button id="launchBotButton">봇과 시작</button>
    <button id="launchOnlineButton">온라인 매칭</button>
  </section>
  <section class="lobby-menu" aria-label="준비실 메뉴">
    <button data-open-screen="lab">릴레이</button>
    <button data-open-screen="shop">상점</button>
    <button data-open-screen="missions">미션</button>
    <button data-open-screen="season">시즌</button>
  </section>
  <section class="lobby-contract">
    <span>오늘의 미션</span>
    <strong id="lobbyMissionPreview">보스 웨이브에서 파트너 구원</strong>
    <em id="lobbySeasonPreview">시즌 진행 0 XP</em>
  </section>
</div>

<div id="labScreen" class="app-screen hub-screen" data-screen-panel="lab" hidden>
  <button class="screen-back" data-open-screen="lobby">준비실</button>
  <strong>릴레이 연구소</strong>
  <div id="labList" class="screen-list"></div>
</div>

<div id="shopScreen" class="app-screen hub-screen" data-screen-panel="shop" hidden>
  <button class="screen-back" data-open-screen="lobby">준비실</button>
  <strong>상점</strong>
  <p>획득 젬 전용 · 전투력 판매 없음</p>
  <div id="shopList" class="screen-list"></div>
</div>

<div id="missionsScreen" class="app-screen hub-screen" data-screen-panel="missions" hidden>
  <button class="screen-back" data-open-screen="lobby">준비실</button>
  <strong>미션</strong>
  <div id="missionsList" class="screen-list"></div>
</div>

<div id="seasonScreen" class="app-screen hub-screen" data-screen-panel="season" hidden>
  <button class="screen-back" data-open-screen="lobby">준비실</button>
  <strong>시즌 패스</strong>
  <div id="seasonList" class="screen-list"></div>
</div>
```

Lobby must contain:

```html
<button id="launchBotButton">봇과 시작</button>
<button id="launchOnlineButton">온라인 매칭</button>
<button data-open-screen="lab">릴레이</button>
<button data-open-screen="shop">상점</button>
<button data-open-screen="missions">미션</button>
<button data-open-screen="season">시즌</button>
```

Sub-screens must use unique content list IDs:

```html
<button class="screen-back" data-open-screen="lobby">준비실</button>
<div id="labList" class="screen-list"></div>
<div id="shopList" class="screen-list"></div>
<div id="missionsList" class="screen-list"></div>
<div id="seasonList" class="screen-list"></div>
```

Remove the old drawer:

```html
<!-- Delete the previous section id="drawer". -->
```

- [ ] **Step 2: Run test to verify partial failure**

Run: `npm test -- test/presentation.test.js`

Expected: FAIL on JS/CSS markers only.

### Task 3: Add App Screen State And Rendering

**Files:**
- Modify: `src/client/app.js`

- [ ] **Step 1: Add DOM references and state**

Add:

```js
const appScreenPanels = [...document.querySelectorAll('[data-screen-panel]')];
const splashStartButton = document.querySelector('#splashStartButton');
const lobbyGemMeter = document.querySelector('#lobbyGemMeter');
const lobbyXpMeter = document.querySelector('#lobbyXpMeter');
const lobbyMissionPreview = document.querySelector('#lobbyMissionPreview');
const lobbySeasonPreview = document.querySelector('#lobbySeasonPreview');
const labList = document.querySelector('#labList');
const missionsList = document.querySelector('#missionsList');
const seasonList = document.querySelector('#seasonList');
let appScreen = 'splash';
```

Remove these legacy references:

```js
const drawer = document.querySelector('#drawer');
const launchGrowthButton = document.querySelector('#launchGrowthButton');
document.querySelector('#closeDrawer')
```

- [ ] **Step 2: Add screen functions**

Add:

```js
function showAppScreen(screen) {
  appScreen = screen;
  launchOverlay.dataset.screen = appScreen;
  document.body.dataset.appScreen = appScreen;
  if (screen === 'battle') {
    launchOverlay.hidden = true;
    resultOverlay.hidden = true;
    return;
  }
  launchOverlay.hidden = screen === 'result';
  appScreenPanels.forEach((panel) => {
    panel.hidden = panel.dataset.screenPanel !== screen;
  });
  if (screen !== 'splash') renderAppScreens();
}

function showLobby() {
  runStarted = false;
  online = false;
  closeSocket();
  setLaunchConnecting(false);
  clearResultOverlay();
  selected = [];
  localBoardId = 'p1';
  activeRunProfileGems = metaProfile.gems;
  onlineProfileSpentGems = 0;
  game = createProfiledGame({ mode: 'bot', seed: Date.now() % 100000 });
  attachFeedbackBaseline();
  netStatus.textContent = '봇 협동';
  showAppScreen('lobby');
}
```

- [ ] **Step 3: Update battle/result transitions**

In `hideLaunchOverlay`, call `showAppScreen('battle')`.

In `syncResultOverlay`, when result is visible call `showAppScreen('result')`.

In `resultLobbyButton` handler, call `showLobby()`.

- [ ] **Step 4: Add content builders**

Add:

```js
function renderAppScreens() {
  renderLobbySummary();
  buildShop();
  buildRelayLab();
  buildMissionScreen();
  buildSeasonScreen();
}
```

`renderLobbySummary()` should update gems, XP, today mission preview, and season progress preview.

`buildRelayLab()` should render at least 6 relay cards from `RELAY_TYPES`. Each card must include:
- relay name
- `Lv1`
- role chip from tags: `공격`, `수리`, `증폭`, `냉각`, or `지원`
- grade text from `minGrade`
- ownership/unlock text: `보유`

`buildMissionScreen()` should render `SHOP.dailyMissions`.

`buildSeasonScreen()` should render `SHOP.pass.tiers`.

Delete `openRewardsDrawer()`.

- [ ] **Step 5: Wire navigation**

Add:

```js
splashStartButton.addEventListener('click', () => {
  unlockSensoryFeedback();
  showAppScreen('lobby');
});

document.querySelectorAll('[data-open-screen]').forEach((button) => {
  button.addEventListener('click', () => {
    unlockSensoryFeedback();
    showAppScreen(button.dataset.openScreen);
  });
});
```

- [ ] **Step 6: Run test**

Run: `npm test -- test/presentation.test.js`

Expected: FAIL on missing CSS markers only.

### Task 4: Add Screen Styling

**Files:**
- Modify: `src/client/styles.css`

- [ ] **Step 1: Add app screen CSS**

Add:

```css
.app-screen {
  width: 100%;
  height: 100%;
  max-height: none;
  overflow: auto;
}

.splash-screen,
.lobby-screen,
.hub-screen {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(13, 18, 17, 0.94);
}

.screen-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.screen-card {
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(245, 240, 220, 0.055);
}

.screen-back {
  min-height: 36px;
}

body:not([data-app-screen="battle"]) .hud,
body:not([data-app-screen="battle"]) .action-panel {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 2: Run presentation test**

Run: `npm test -- test/presentation.test.js`

Expected: PASS.

### Task 5: Full Verification And Commit

**Files:**
- Modified files from Tasks 1-4

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
node --check src/client/app.js
git diff --check
```

Expected:
- all tests pass
- no syntax errors
- no whitespace errors

- [ ] **Step 2: Confirm local git identity**

Run:

```bash
git config --local user.name
git config --local user.email
```

Expected:

```text
dadm8473
dadm8473@gmail.com
```

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/gdd/09_app_screen_architecture.md docs/superpowers/plans/2026-04-29-app-screen-architecture.md index.html src/client/app.js src/client/styles.css test/presentation.test.js
git commit -m "add app screen architecture"
```
