# Commercial Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise Signal Relay from a functional co-op tower-defense prototype into a more cohesive vertical mobile game screen with richer combat feedback and service-game flow.

**Architecture:** Keep the existing single-canvas battle renderer and app shell. Add polish through small renderer helpers, CSS shell integration, and focused presentation tests rather than restructuring networking or simulation internals.

**Tech Stack:** Vite-style static client, Canvas 2D renderer, Node test runner, shared JavaScript game simulation.

---

### Task 1: Vertical App Playfield Integration

**Files:**
- Modify: `test/presentation.test.js`
- Modify: `src/client/styles.css`
- Modify: `src/client/app.js`

- [ ] **Step 1: Write failing presentation markers**

Add tests that require shell frame layers, short-phone compaction, full canvas fill, and canvas-side board connectors.

- [ ] **Step 2: Run focused test**

Run: `npm test test/presentation.test.js`
Expected: FAIL until CSS and renderer helpers exist.

- [ ] **Step 3: Implement shell and canvas integration**

Add `.shell::before`, `.shell::after`, `.action-panel::after`, full `#gameCanvas` sizing, `@media (max-height: 720px)`, `drawBoardConnectors(state)`, and `drawRunSpine(state)`.

- [ ] **Step 4: Re-run focused test**

Run: `npm test test/presentation.test.js`
Expected: PASS.

### Task 2: Combat Feedback Density

**Files:**
- Modify: `test/presentation.test.js`
- Modify: `src/client/app.js`

- [ ] **Step 1: Write failing presentation markers**

Require projectile signatures, reward flyouts, and subtle screen shake for major effects.

- [ ] **Step 2: Run focused test**

Run: `npm test test/presentation.test.js`
Expected: FAIL until renderer helpers exist.

- [ ] **Step 3: Implement tactile combat layers**

Add `screenShakeOffset(state)`, `drawProjectileSignature(state, effect, from, to, spec, alpha)`, and `drawRewardFlyout(effect, pos, alpha)`.

- [ ] **Step 4: Re-run focused test**

Run: `npm test test/presentation.test.js`
Expected: PASS.

### Task 3: Service Flow Polish

**Files:**
- Modify: `test/presentation.test.js`
- Modify: `index.html`
- Modify: `src/client/styles.css`
- Modify: `src/client/app.js`

- [ ] **Step 1: Write failing shell-flow markers**

Require launch art, ready-room loadout chips, and a sectioned BM/Missions drawer.

- [ ] **Step 2: Run focused test**

Run: `npm test test/presentation.test.js`
Expected: FAIL until markup, CSS, and drawer builder exist.

- [ ] **Step 3: Implement service shell polish**

Add launch loadout markup, asset-backed launch panel styling, and `buildShopSection()` for sectioned missions and reward track rows.

- [ ] **Step 4: Run full verification**

Run: `npm test`, `node --check src/client/app.js`, `git diff --check`, then browser-smoke localhost.
