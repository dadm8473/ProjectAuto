# App Screen Architecture

## 1. Goal

`Signal Relay` should read as a complete portrait mobile game app, not a battle demo with overlays. The app shell owns all non-combat systems: splash, lobby, relay lab, shop, missions, season pass, battle, and result.

The battle screen stays focused on play. Growth, shop, missions, pass, and monetization entry points live outside combat.

## 2. Screen Map

```text
Splash
  -> Lobby

Lobby
  -> Battle (bot)
  -> Battle (online)
  -> Relay Lab
  -> Shop
  -> Missions
  -> Season Pass

Battle
  -> Result

Result
  -> Battle (retry)
  -> Lobby
```

## 3. Screen Responsibilities

### Splash

Purpose:
- Create the app-like first impression.
- Gate sound and haptics behind a player gesture.
- Keep loading/start simple.

Content:
- Game title: `시그널 릴레이`
- Season label: `시즌 01`
- Short mood line: `두 신호장을 연결하세요`
- Primary action: `탭해서 시작`

Rules:
- No BM entry here.
- No long explanation.
- Audio/haptics can only unlock after the start tap.

### Lobby

Purpose:
- Serve as the main home screen.
- Make the next action obvious.
- Expose long-term systems without interrupting combat.

Content:
- Player profile summary: mode, gems, season XP.
- Main action: `봇과 시작`
- Secondary action: `온라인 매칭`
- Four app menu entries: `릴레이`, `상점`, `미션`, `시즌`
- Today mission preview.
- Season progress preview.
- Battle visual preview.

Rules:
- `봇과 시작` is visually dominant.
- Menu entries are compact and icon-like, not explanatory paragraphs.
- Growth/BM systems are visible here, not in the battle HUD.

### Relay Lab

Purpose:
- Teach and present units outside the pressure of combat.
- Give the player a collection/growth screen.

Content:
- Featured relay cards.
- Role chips: 공격, 수리, 증폭, 냉각.
- Grade/tier language.
- Cosmetic ownership or unlock state.

Initial v1 scope:
- Static roster preview using existing `RELAY_TYPES`.
- No paid power upgrade.
- No gameplay stat mutation yet.

Future expansion:
- Relay mastery.
- Recommended combinations.
- Cosmetic equip.

### Shop

Purpose:
- Show monetization/BM boundaries clearly.
- Sell or preview earned-gem cosmetics.

Content:
- Current gem balance.
- Cosmetic items from `SHOP.items`.
- Trust copy: `획득 젬 전용`, `전투력 판매 없음`.

Rules:
- No combat revive.
- No boss-failure purchase.
- No paid-only relay power.
- Purchases remain profile cosmetic/unlock oriented.

### Missions

Purpose:
- Give repeat-play goals.

Content:
- Daily mission list from `SHOP.dailyMissions`.
- Reward amount.
- Claimed/pending state.

Rules:
- Missions reward cooperative play or clean combat actions.
- Mission UI is never opened during active battle.

### Season Pass

Purpose:
- Give long-term progression.

Content:
- Season XP.
- Free reward track from `SHOP.pass.tiers`.
- Claim state.

Rules:
- Prototype pass is free/earned only.
- Future premium track is cosmetic-only.

### Battle

Purpose:
- Run the active co-op tower defense.

Content:
- Two-board combat canvas.
- HUD: wave, signal, saturation, boss timer, earned combat resources.
- Actions: `강화`, `구원`.

Rules:
- No shop, lab, pass, or mission entry.
- No BM buttons.
- No long text panels.

### Result

Purpose:
- Close the run and encourage another attempt.

Content:
- Win/loss reason.
- Run stats.
- Cooperative highlights.
- Earned rewards and progress summary.
- Actions: `다시 도전`, `준비실`.

Rules:
- Result can summarize rewards, but does not open shop directly.
- Returning to `준비실` exposes growth/shop/mission/season.

## 4. Navigation Model

The client keeps a single `appScreen` state:

```text
splash | lobby | lab | shop | missions | season | battle | result
```

Rendering rules:
- `splash/lobby/lab/shop/missions/season`: app overlay visible.
- `battle`: app overlay hidden, canvas/action panel active.
- `result`: result overlay visible.
- `lobby/lab/shop/missions/season` are full app home screens, not small modal cards over combat.
- The combat HUD and action panel are visually de-emphasized or hidden while app home screens are active.

Back rules:
- Lab/shop/missions/season back button returns to lobby.
- Result lobby button returns to lobby.
- Retry starts a new bot battle immediately.

## 5. Implementation Boundaries

Files:
- `index.html`: app screen markup and buttons.
- `src/client/app.js`: screen state, navigation handlers, screen content builders.
- `src/client/styles.css`: app shell layout and screen presentation.
- `test/presentation.test.js`: structural regression checks.

No server protocol change is required for the first implementation pass.

Existing growth drawer migration:
- Remove the old `drawer`, `launchGrowthButton`, and `closeDrawer` path.
- Reuse `shopList` only as the shop screen list container.
- Add separate list containers for relay lab, missions, and season pass.
- Result never links directly to shop/growth.

## 6. Acceptance Criteria

- A first-time player sees splash before any battle or growth screen.
- The lobby looks like the app home, not a modal.
- `릴레이`, `상점`, `미션`, `시즌` are accessible from the lobby.
- Result screen has no direct shop/growth button.
- Battle screen has no BM/growth/menu entry.
- There is no legacy growth drawer entry path.
- Lobby includes profile summary, mission preview, season preview, and battle visual preview.
- Relay Lab cards show role, grade/tier language, and ownership/unlock state.
- The current bot and online start flows still work.
- All visible text remains Korean.
- Full test suite passes.
