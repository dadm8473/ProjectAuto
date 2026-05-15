import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { drawRebootBattle } from '../src/client/reboot_render.js';
import { buildMissionScreen, buildRebootCollection, buildRebootShop, buildSeasonScreen } from '../src/client/reboot_screens.js';
import { createRebootGame, serializeRebootState, tickRebootGame } from '../src/shared/reboot_game.js';

function cssPxVar(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(\\d+)px;`));
  assert.ok(match, `${name} token is missing`);
  return Number(match[1]);
}

function cssRuleBlock(css, selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} block is missing`);
  const end = css.indexOf('\n}', start);
  assert.notEqual(end, -1, `${selector} block is not closed`);
  return css.slice(start, end + 2);
}

function fakeImage(width = 256, height = 256, complete = true) {
  return { complete, naturalWidth: complete ? width : 0, naturalHeight: complete ? height : 0 };
}

function fakeRebootAssets(overrides = {}) {
  return {
    backdrop: fakeImage(390, 620),
    board: fakeImage(1280, 256),
    playerBoardTray: fakeImage(780, 320),
    units: fakeImage(1280, 256),
    enemies: fakeImage(1024, 256),
    ui: fakeImage(1536, 256),
    startCutin: fakeImage(390, 112),
    bossCutin: fakeImage(390, 128),
    rescueCutin: fakeImage(390, 112),
    killBurst: fakeImage(1024, 256),
    hitBeam: fakeImage(320, 64),
    hitBolts: fakeImage(768, 128),
    actionStamps: fakeImage(768, 128),
    partnerAssistPings: fakeImage(640, 100),
    crisisOverlays: fakeImage(780, 160),
    rewardPickups: fakeImage(768, 128),
    bossAuras: fakeImage(768, 192),
    fieldFinaleBursts: fakeImage(780, 260),
    firstCommandSpotlight: fakeImage(256, 128),
    ...overrides
  };
}

function recordingCanvasContext() {
  const calls = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    { calls, globalAlpha: 1 },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
        if (prop === 'measureText') return (text) => ({ width: String(text).length * 8 });
        return (...args) => {
          calls.push({ name: String(prop), args });
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    }
  );
  return ctx;
}

function stateWithPartnerAutoPing() {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
  advanceRebootGameTo(game, 18.1);
  return serializeRebootState(game);
}

function stateWithPartnerRescuePing() {
  const game = createRebootGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
  advanceRebootGameTo(game, 88.1);
  return serializeRebootState(game);
}

function advanceRebootGameTo(game, time, step = 0.25) {
  while (game.now < time) {
    tickRebootGame(game, Math.min(step, time - game.now));
  }
}

test('client app is split into reboot modules and keeps app.js as bootstrap', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const lines = app.split('\n').length;

  assert.equal(lines <= 900, true, `app.js line budget exceeded: ${lines}`);
  for (const marker of [
    "from './reboot_actions.js?v=merge-reason1'",
    "from './reboot_action_ui.js?v=action-focus2'",
    "from './reboot_render.js?v=pre-summon-cue1'",
    "from './reboot_screens.js?v=objective-stamps1'",
    "from './reboot_online.js'"
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }
  for (const forbidden of [
    'function drawRebootBattle',
    'function buildRebootLobby',
    'function buildRebootCollection',
    'function buildRebootShop',
    'function createRebootOnlineClient',
    'function drawNoise',
    'function drawRelayIcon',
    'noiseEnemyAtlas',
    'relayWorldSprites',
    'noiseWorldSprites'
  ]) {
    assert.equal(app.includes(forbidden), false, forbidden);
  }
});

test('battle markup exposes exactly three Korean combat actions and no BM buttons', async () => {
  const html = await readFile('index.html', 'utf8');

  for (const marker of [
    'id="summonButton"',
    'id="mergeButton"',
    'id="rescueButton"',
    '>소환<',
    '>합성<',
    '>구원<'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }
  for (const forbidden of [
    'id="powerButton"',
    'id="pulseButton"',
    'id="shopButton"',
    'id="passButton"',
    'id="adButton"',
    'id="paidReviveButton"',
    '전투 중 상점',
    '광고 부활'
  ]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

test('player-facing app branding is Korean and no longer exposes the repository name', async () => {
  const html = await readFile('index.html', 'utf8');
  const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
  const server = await readFile('server/server.js', 'utf8');

  for (const marker of [
    '<title>신호릴레이</title>',
    'aria-label="신호릴레이 협동 타워디펜스 전장"',
    '<strong>신호릴레이</strong>'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }

  assert.equal(manifest.name, '신호릴레이');
  assert.equal(manifest.short_name, '신호릴레이');
  assert.equal(html.includes('ProjectAuto'), false);
  assert.equal(JSON.stringify(manifest).includes('ProjectAuto'), false);
  assert.equal(server.includes('신호릴레이 실행 중'), true);
  assert.equal(server.includes('ProjectAuto 시그널 릴레이'), false);
});

test('reboot render uses only reboot atlases and manifest keys', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'REBOOT_ATLAS_MANIFEST',
    'REBOOT_BACKDROP_MANIFEST',
    'reboot-battle-backdrop.png',
    'reboot-unit-atlas.png',
    'reboot-enemy-atlas.png',
    'reboot-ui-icons.png',
    'reboot-reward-icons.png',
    'reboot-board-accents.png',
    'order.indexOf(spriteKey)',
    'createRebootAssetImages',
    'drawAtlasSprite',
    'drawBattleBackdrop'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
  for (const forbidden of [
    'relay-unit-atlas.png',
    'relay-world-sprites.png',
    'noise-world-sprites.png',
    'boss-disruption-atlas.png',
    'atlasIndex',
    'void assets'
  ]) {
    assert.equal(render.includes(forbidden), false, forbidden);
  }
});

test('home collection shop and result are app-game screens, not combat BM drawers', async () => {
  const html = await readFile('index.html', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'id="splashScreen"',
    'id="lobbyScreen"',
    'id="collectionScreen"',
    'id="shopScreen"',
    'id="resultOverlay"',
    'buildRebootLobby',
    'buildRebootCollection',
    'buildRebootShop',
    'buildRebootResultModel',
    'startRebootRetry'
  ]) {
    assert.equal(`${html}\n${screens}`.includes(marker), true, marker);
  }
  for (const forbidden of [
    'paid_power',
    'paid_revive',
    'paid_reroll',
    'paid_summon_odds'
  ]) {
    assert.equal(screens.includes(forbidden), false, forbidden);
  }

  assert.equal(
    html.indexOf('<nav class="bottom-dock"') > html.indexOf('id="seasonScreen"'),
    true,
    'meta nav should be shared across lobby and hub screens instead of being trapped inside the lobby page'
  );
  for (const marker of [
    '.screen-overlay[data-screen="splash"] > .bottom-dock',
    '.bottom-dock button[data-nav-active="true"]',
    'function updateNavState()',
    "button.setAttribute('aria-current', 'page');",
    'button.dataset.navActive = \'true\';',
    'updateNavState();'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }
  assert.match(cssRuleBlock(css, '.bottom-dock'), /z-index:\s*32;/);
  assert.match(cssRuleBlock(css, '.screen-overlay,\n.result-overlay'), /z-index:\s*30;/);
  const overlayButtonBlock = cssRuleBlock(css, '.screen-overlay button,\n.result-overlay button');
  assert.match(overlayButtonBlock, /background:\s*transparent;/);
  assert.equal(overlayButtonBlock.includes('background: rgba(10, 16, 16, 0.28);'), false);
  const finalResultOverlayBlock = css.slice(css.lastIndexOf('.result-overlay {'), css.indexOf('\n}', css.lastIndexOf('.result-overlay {')) + 2);
  assert.match(finalResultOverlayBlock, /z-index:\s*30;/);
});

test('online entry has app-game fallback instead of trapping players in a dead connection', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const online = await readFile('src/client/reboot_online.js', 'utf8');

  for (const marker of [
    'const ONLINE_CONNECT_FALLBACK_MS = 2600;',
    'let onlineFallbackTimer = null;',
    'function clearOnlineFallback()',
    'function fallbackToBotPartner(reason)',
    'function scheduleOnlineFallback()',
    "showToast('온라인 응답이 없어 봇 파트너로 전환합니다', 'warning');",
    "game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });",
    "onStatus(status) {",
    "if (status.state === 'open') dom.netStatus.textContent = '온라인 입장';",
    'if (!online?.send(action)) {',
    "showToast('온라인 연결 대기 중', 'warning');",
    'let nextOnline = null;',
    'if (online !== nextOnline) return;',
    'online = nextOnline;',
    'nextOnline.connect();'
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }

  for (const marker of [
    'onStatus',
    "onStatus?.({ state: 'connecting' });",
    "onStatus?.({ state: 'open' });",
    "onStatus?.({ state: 'closed' });",
    "onError?.('온라인 연결 대기 중');",
    "return false;",
    "return true;",
    "onError?.('온라인 메시지 오류');"
  ]) {
    assert.equal(online.includes(marker), true, marker);
  }

  const startOnlineRun = app.slice(app.indexOf('function startOnlineRun()'), app.indexOf('function executeLocal', app.indexOf('function startOnlineRun()')));
  assert.equal(
    startOnlineRun.indexOf('online = nextOnline;') < startOnlineRun.indexOf('scheduleOnlineFallback();')
      && startOnlineRun.indexOf('scheduleOnlineFallback();') < startOnlineRun.indexOf('nextOnline.connect();'),
    true,
    'current online instance and fallback timer must exist before connect so fast initial state can clear it'
  );
});

test('online waiting state blocks combat until the second player arrives', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const server = await readFile('server/server.js', 'utf8');

  for (const marker of [
    'function waitingForOnlinePartner(current)',
    "return current.mode === 'online' && current.players?.some((player) => player.bot);",
    'const onlineWaiting = waitingForOnlinePartner(current);',
    'buildCombatStatusPrompt({ current, localBoardId, onlineWaiting })',
    "button.title = onlineWaiting ? '파트너 입장 대기 중' : actions[key].reason;",
    "if (game.mode === 'online' && waitingForOnlinePartner(game)) {",
    "showToast('파트너 입장 대기 중', 'warning');"
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }

  for (const marker of [
    'roomReadyForOnlineCombat',
    'if (!roomReadyForOnlineCombat(room))',
    'if (isRebootGame(targetRoom.game) && targetRoom.game.mode === \'online\' && !roomReadyForOnlineCombat(targetRoom))',
    "result = { ok: false, reason: '파트너 입장 대기 중.' };"
  ]) {
    assert.equal(server.includes(marker), true, marker);
  }
});

test('online waiting state turns the command dock into a generated matchmaking lock', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const source = `${app}\n${css}`;

  for (const marker of [
    "document.body.dataset.onlineWaiting = 'true';",
    'delete document.body.dataset.onlineWaiting',
    'body[data-app-screen="battle"][data-online-waiting="true"] .primary-actions::before',
    'background-image: var(--online-matchmaking-panels);',
    'body[data-app-screen="battle"][data-online-waiting="true"] .status-line',
    'body[data-app-screen="battle"][data-online-waiting="true"] .primary-actions button {\n  display: none;',
    'body[data-app-screen="battle"][data-online-waiting="true"] .primary-actions button',
    'opacity: 0;',
    '파트너 매칭 중'
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
});

test('online matchmaking states use generated app-game panels instead of plain text status', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const qa = await readFile('tools/reboot_online_browser_qa.mjs', 'utf8');

  for (const marker of [
    'id="matchmakingBanner"',
    'id="matchmakingBannerTitle"',
    'id="matchmakingBannerDetail"'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }

  for (const marker of [
    '--online-matchmaking-panels: url("/src/client/assets/generated/reboot-online-matchmaking-panels.png?v=online-matchmaking")',
    '--online-partner-link: url("/src/client/assets/generated/reboot-online-partner-link.png?v=partner-link1")',
    '.matchmaking-banner',
    'background-image: var(--online-partner-link);',
    'background-image: var(--online-matchmaking-panels);',
    '.matchmaking-banner[data-match-state="waiting"]',
    '.matchmaking-banner[data-match-state="ready"]',
    '.matchmaking-banner[data-match-state="reset"]',
    'body:not([data-app-screen="battle"]) .matchmaking-banner'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  for (const marker of [
    'const MATCH_BANNER_FLASH_MS = 1500;',
    'function hideMatchmakingBanner()',
    'function isMatchmakingResetHoldActive()',
    'function showMatchmakingBanner(kind, title, detail, options = {})',
    'showMatchmakingBanner.holdUntil = kind === \'reset\' ? performance.now() + MATCH_BANNER_FLASH_MS : 0;',
    'const previousRunId = game.runId;',
    'const previousOnlineWaiting = waitingForOnlinePartner(game);',
    'const previousOnlineReady = game.mode === \'online\' && !previousOnlineWaiting;',
    'const nextOnlineWaiting = waitingForOnlinePartner(nextState);',
    'const partnerDisconnected = previousOnlineReady && nextOnlineWaiting && previousRunId !== nextState.runId;',
    "showMatchmakingBanner('waiting', '파트너 대기', '온라인 매칭 중', { persistent: true });",
    "showMatchmakingBanner('ready', '협동 시작', '파트너가 입장했습니다');",
    "showMatchmakingBanner('reset', '파트너 이탈', '새 파트너를 찾는 중');",
    'if (!isMatchmakingResetHoldActive())'
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }

  for (const marker of [
    '#matchmakingBanner',
    'body[data-app-screen="battle"]',
    '파트너 대기',
    '협동 시작',
    '파트너 이탈',
    'waitForTimeout(800)'
  ]) {
    assert.equal(qa.includes(marker), true, marker);
  }
});

test('app screen changes use a generated game wipe instead of instant web page swapping', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'id="screenTransitionFx"',
    'class="screen-transition-fx"',
    '--screen-transition-wipe: url("/src/client/assets/generated/reboot-screen-transition-wipe.png?v=screen-wipe")',
    '.screen-transition-fx',
    'background-image: var(--screen-transition-wipe);',
    'body[data-screen-wipe][data-screen-wipe-pulse="a"] .screen-transition-fx',
    'body[data-screen-wipe][data-screen-wipe-pulse="b"] .screen-transition-fx',
    '@keyframes screenWipeSweepA',
    '@keyframes screenWipeSweepB',
    'function playScreenTransition(screen)',
    'playScreenTransition.flip = !playScreenTransition.flip;',
    'document.body.dataset.screenWipe = screen;',
    'document.body.dataset.screenWipePulse = playScreenTransition.flip ? \'a\' : \'b\';',
    'delete document.body.dataset.screenWipe;',
    'delete document.body.dataset.screenWipePulse;',
    'playScreenTransition(screen);'
  ]) {
    assert.equal(`${html}\n${css}\n${app}`.includes(marker), true, marker);
  }
});

test('screen transition wipe stays brief and does not hide the next playable screen', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'animation: screenWipeSweepA 260ms cubic-bezier(0.22, 0.8, 0.2, 1) both;',
    'animation: screenWipeSweepB 260ms cubic-bezier(0.22, 0.8, 0.2, 1) both;',
    'body[data-screen-wipe][data-screen-wipe-pulse="a"] .screen-transition-fx',
    'body[data-screen-wipe][data-screen-wipe-pulse="b"] .screen-transition-fx',
    '18% { opacity: 0.18; }',
    '58% { opacity: 0.08;',
    'filter: saturate(1.02) drop-shadow(0 8px 14px rgba(0, 0, 0, 0.18));',
    'const SCREEN_TRANSITION_MS = 280;'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('animation: screenWipeSweepA 340ms'), false);
  assert.equal(css.includes('18% { opacity: 0.34; }'), false);
  assert.equal(css.includes('18% { opacity: 0.58; }'), false);
  assert.equal(app.includes('const SCREEN_TRANSITION_MS = 360;'), false);
  assert.equal(css.includes('animation: screenWipeSweep 520ms'), false);
  assert.equal(app.includes('const SCREEN_TRANSITION_MS = 520;'), false);
  assert.equal(css.includes('18% { opacity: 0.9; }'), false);
});

test('portrait CSS keeps the app shell fixed and thumb-first', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--app-safe-area-top: env(safe-area-inset-top);',
    '--app-safe-area-bottom: env(safe-area-inset-bottom);',
    'height: 100dvh',
    'width: min(100vw, 430px)',
    '.action-panel',
    '.primary-actions',
    '#summonButton',
    '#mergeButton',
    '#rescueButton',
    'body:not([data-app-screen="battle"]) .action-panel',
    'touch-action: manipulation'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('combat canvas preserves the full imagegen map instead of cropping short phones', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const canvasBlock = css.slice(css.indexOf('#gameCanvas {'), css.indexOf('.toast {'));

  for (const marker of [
    'aspect-ratio: 390 / 620;',
    'object-fit: contain;',
    'object-position: center center;'
  ]) {
    assert.equal(canvasBlock.includes(marker), true, marker);
  }

  assert.equal(canvasBlock.includes('object-fit: cover;'), false, 'cover can crop the lower player board on short screens');
});

test('app shell cache-busts the game stylesheet for visual asset updates', async () => {
  const html = await readFile('index.html', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const render = await readFile('src/client/reboot_render.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=first-command-dock1">'), true);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=launch-console1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=objective-rails1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-verdict1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-outcome-aura1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=objective-stamps1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=first-summon-console1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=nav-selector1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=cooldown-label1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=combat-cooldown-shutters1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-hero-stage1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=online-partner-link1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-command-ribbons1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=locked-sockets1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=combat-directive1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-progress-board1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-shelf-grid1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-room-banners1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-passive-icon1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=lobby-cta1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=action-focus1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-claim-primary1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=combat-disabled1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=screen-wipe1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=row-surface1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=chrome-surface1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-badges1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-clarity1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=combat-dock1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-density1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=online-matchmaking1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=frame-alpha1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-nav1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-readability1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=command-console1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=action-press1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=board-labels1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=battle-brand1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=mission-track1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-showcase1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=player-tray1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=first-command1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=lobby-start1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=lobby-next1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=battle-cosmetic1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=cosmetic-equip1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=result-medals1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=reward-reveal1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-card-states1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=meta-progress1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=critical-action-rings1">'), false);
  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=reboot-action-ready1">'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=battle-brand1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=mission-track1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=meta-showcase1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=online-fallback2"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=online-fallback1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=player-tray1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=lobby-start1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=lobby-next1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=battle-cosmetic1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=cosmetic-equip1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=result-medals1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=reward-reveal1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=reboot-action-ready1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=action-focus1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=merge-reason1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=pre-summon-cue1"></script>'), true);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=objective-stamps1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=cooldown-label1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=action-stamps1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=enemy-impact-bursts1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=enemy-track-trails1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=view-perspective1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=dual-crisis1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=online-partner-link1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=post-reward-route1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=meta-progress-board1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=meta-shelf-grid1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=start-cutin1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=result-claim-primary1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=screen-wipe1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=meta-badges1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=moment-callout1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=result-claim1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=reveal-vfx1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=status-prompt1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=meta-nav1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=retry-seeds1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=boss-finale1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=rescue-reward1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=merge-reward1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=summon-reward1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=board-labels1"></script>'), false);
  assert.equal(app.includes("from './reboot_render.js?v=pre-summon-cue1'"), true);
  assert.equal(app.includes("from './reboot_render.js?v=action-stamps1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=enemy-impact-bursts1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=enemy-track-trails1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=view-perspective1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=dual-crisis1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=merge-ready1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=start-cutin1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=moment-callout1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=reveal-vfx1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=boss-finale1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=rescue-reward1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=merge-reward1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=summon-reward1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=board-labels1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=player-tray1'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=battle-cosmetic1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=objective-stamps1'"), true);
  assert.equal(app.includes("from './reboot_screens.js?v=post-reward-route1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=meta-shelf-grid1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=meta-badges1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=meta-passive1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=result-claim1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=retry-seeds1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=mission-track1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=meta-showcase1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=lobby-start1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=lobby-next1'"), false);
  assert.equal(app.includes("from './reboot_screens.js'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=reboot-action-ready1'"), false);
  assert.equal(render.includes("src: '/src/client/assets/generated/reboot-battle-backdrop.png?v=reboot-action-ready1'"), true);
  assert.equal(render.includes("src: '/src/client/assets/generated/reboot-combat-first-command-spotlight.png?v=summon-reward1'"), true);
  assert.equal(css.includes('--combat-action-dock: url("/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1")'), true);
  assert.equal(css.includes('--combat-action-dock: url("/src/client/assets/generated/reboot-combat-action-dock.png?v=reboot-action-ready1")'), false);
});

test('meta screens use reboot sprite tokens instead of placeholder swatches', async () => {
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const { buildRebootCollection } = await import('../src/client/reboot_screens.js');
  const collection = buildRebootCollection();

  for (const marker of [
    'class="sprite-token unit-sprite"',
    'class="sprite-token shop-cosmetic"',
    'data-sprite="${unit.spriteKey}"',
    'data-shop-cosmetic="${item.id}"',
    'ROLE_LABELS[unit.role]',
    'reboot-unit-atlas.png',
    'reboot-shop-cosmetics.png',
    'grid-template-columns: 78px 1fr 96px'
  ]) {
    assert.equal(`${screens}\n${css}`.includes(marker), true, marker);
  }

  for (const label of ['공격', '지원', '제어', '구원']) {
    assert.equal(collection.includes(label), true, label);
  }
  for (const forbiddenRole of ['>attack<', '>support<', '>control<', '>rescue<']) {
    assert.equal(collection.includes(forbiddenRole), false, forbiddenRole);
  }

  assert.equal(css.includes('.unit-card i'), false);
  assert.equal(css.includes('linear-gradient(90deg, var(--teal), var(--amber))'), false);
});

test('meta screens use imagegen app backdrops instead of pure css scenery', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--lobby-backdrop: url("/src/client/assets/generated/reboot-lobby-backdrop.png")',
    '--meta-backdrop: url("/src/client/assets/generated/reboot-meta-backdrop.png")',
    '.screen-overlay::before',
    '[data-screen="splash"]::before',
    '[data-screen="lobby"]::before',
    '[data-screen="collection"]::before',
    '[data-screen="shop"]::before',
    '[data-screen="missions"]::before',
    '[data-screen="season"]::before'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('meta screen lists can scroll after larger imagegen unit sprites', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'overflow-y: auto',
    '-webkit-overflow-scrolling: touch',
    '.screen-list::-webkit-scrollbar'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('meta screen lists fill the lower app area instead of stopping like a sparse web list', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  const hubBlock = cssRuleBlock(css, '.hub-screen');
  const listBlock = css.slice(css.indexOf('.screen-list {'), css.indexOf('.screen-list::-webkit-scrollbar'));
  const cardBlock = css.slice(css.indexOf('.unit-card,\n.shop-card,'), css.indexOf('.unit-card::before,'));
  for (const marker of [
    'display: grid;',
    'grid-template-rows: auto minmax(0, 1fr);',
    'min-height: 0;'
  ]) {
    assert.equal(hubBlock.includes(marker), true, marker);
  }
  for (const marker of [
    'height: 100%;',
    'min-height: 0;',
    'max-height: none;',
    'align-content: start;',
    'grid-auto-rows: minmax(clamp(98px, 27vw, 112px), auto);',
    '-webkit-mask-image: linear-gradient(',
    'mask-image: linear-gradient(',
    'calc(100% - 28px)',
    'padding-bottom: calc(var(--lobby-bottom-dock-rendered-height) + 16px);',
    'transparent 100%'
  ]) {
    assert.equal(listBlock.includes(marker), true, marker);
  }
  for (const marker of [
    'min-height: clamp(98px, 27vw, 112px);',
    'padding: 10px 12px;',
    'box-shadow: 0 10px 20px rgba(0, 0, 0, 0.42);'
  ]) {
    assert.equal(cardBlock.includes(marker), true, marker);
  }
});

test('meta screens keep generated floor art separate from scroll-list clipping', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const selector = [
    'body[data-app-screen="collection"] .app-screen::after',
    'body[data-app-screen="shop"] .app-screen::after',
    'body[data-app-screen="missions"] .app-screen::after',
    'body[data-app-screen="season"] .app-screen::after'
  ].join(',\n');
  const block = cssRuleBlock(css, selector);

  assert.equal(css.includes('--meta-list-shutter: url("/src/client/assets/generated/reboot-meta-list-shutter.png?v=meta-list-shutter2")'), true);
  for (const marker of [
    'height: clamp(138px, 22dvh, 184px);',
    'z-index: 2;',
    'background-image: var(--meta-list-shutter);',
    'background-position: center bottom;',
    'background-size: 100% 100%;',
    'pointer-events: none;'
  ]) {
    assert.equal(block.includes(marker), true, marker);
  }
  assert.equal(css.includes('.screen-list::after'), false);
});

test('meta screens use generated footer shroud instead of exposing lower console slots', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const selector = [
    'body[data-app-screen="collection"] .shell::after',
    'body[data-app-screen="shop"] .shell::after',
    'body[data-app-screen="missions"] .shell::after',
    'body[data-app-screen="season"] .shell::after'
  ].join(',\n');
  const block = cssRuleBlock(css, selector);

  assert.equal(css.includes('--meta-footer-shroud: url("/src/client/assets/generated/reboot-meta-footer-shroud.png?v=meta-footer-shroud")'), true);
  for (const marker of [
    'z-index: 24;',
    'height: clamp(86px, 14dvh, 116px);',
    'background-image: var(--meta-footer-shroud);',
    'background-position: center bottom;',
    'background-size: 100% 100%;',
    'pointer-events: none;'
  ]) {
    assert.equal(block.includes(marker), true, marker);
  }

  for (const screen of ['battle', 'splash', 'lobby', 'result']) {
    assert.equal(css.includes(`body[data-app-screen="${screen}"] .shell::after,\nbody[data-app-screen="collection"]`), false, screen);
    assert.equal(css.includes(`body[data-app-screen="${screen}"] .shell::after {\n  content: "";\n  position: absolute;\n  left: 50%;\n  bottom: 0;\n  z-index: 24;`), false, screen);
  }
  assert.equal(block.includes('var(--splash-footer-shroud)'), false);
  assert.equal(block.includes('var(--splash-floor-cap)'), false);
});

test('canvas renderer does not duplicate shell resource HUD text', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const forbidden of [
    'fillText(`소환',
    'fillText(`구원',
    'fillText(`파트너 위험'
  ]) {
    assert.equal(render.includes(forbidden), false, forbidden);
  }
});

test('combat board renderer suppresses player-board labels on imagegen map floors', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'const compactBoardActive = compact && ((board.units?.length ?? 0) > 0 || board.danger >= 50);',
    'const showBoardText = !imageBackdrop || compactBoardActive;',
    'const showDangerText = !imageBackdrop || board.danger >= 50;',
    'if (showBoardText) {',
    'ctx.fillText(title, x + 12, y + 18);',
    'if (showDangerText) {'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat board labels use generated status plates on the canvas', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'boardLabelPlates: {',
    "src: '/src/client/assets/generated/reboot-combat-status-plates.png?v=board-labels-alpha1'",
    'width: 780,\n    height: 80,',
    'const boardLabelPlates = new Image();',
    'boardLabelPlates.src = REBOOT_EFFECT_MANIFEST.boardLabelPlates.src;',
    'function drawBoardLabelPlate',
    "drawBoardLabelPlate(ctx, assets, 'board'",
    "drawBoardLabelPlate(ctx, assets, 'danger'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat renderer keeps imagegen enemy sprites readable on phone canvas', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    "const size = enemy.enemyId === 'mini_boss' ? 54 : 36",
    "drawAtlasSprite(ctx, assets, 'enemies'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat action buttons use generated icons instead of text-only web buttons', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '--combat-action-buttons: url("/src/client/assets/generated/reboot-combat-action-buttons.png?v=action-buttons-alpha1")',
    '--combat-action-ready-pulses: url("/src/client/assets/generated/reboot-action-ready-pulses.png?v=action-ready")',
    '--combat-first-command-spotlight: url("/src/client/assets/generated/reboot-combat-first-command-spotlight.png?v=first-command")',
    '--combat-first-summon-console: url("/src/client/assets/generated/reboot-combat-first-summon-console.png?v=first-summon-console1")',
    '--combat-critical-action-rings: url("/src/client/assets/generated/reboot-critical-action-rings.png?v=critical-action-rings")',
    '--combat-coach-cues: url("/src/client/assets/generated/reboot-combat-coach-cues.png?v=combat-coach")',
    '--combat-directive-banner: url("/src/client/assets/generated/reboot-combat-directive-banner.png?v=combat-directive1")',
    '.primary-actions button {\n  display: inline-flex;',
    'z-index: 1;',
    'background-image: var(--combat-action-buttons);',
    'background-size: 300% 100%;',
    '.primary-actions::before',
    'background-image: var(--combat-first-command-spotlight);',
    'body[data-app-screen="battle"][data-coach-cue="summon"] .primary-actions::before',
    '.primary-actions button::before',
    '.primary-actions button > span',
    '.primary-actions::after',
    'top: clamp(2px, 1.4vw, 6px);',
    'width: clamp(52px, 17.67vw, 72px);',
    'background-image: var(--combat-coach-cues);',
    'body[data-app-screen="battle"][data-coach-cue="summon"] .primary-actions::after',
    'body[data-app-screen="battle"][data-coach-cue="merge"] .primary-actions::after',
    'body[data-app-screen="battle"][data-coach-cue="rescue"] .primary-actions::after',
    'body[data-app-screen="battle"] .status-line:has(#bossMeter[hidden]) #timeMeter',
    'background-image: var(--combat-directive-banner);',
    'min-height: clamp(38px, 10.7vw, 46px);',
    '.primary-actions button::after',
    'background-image: var(--combat-action-ready-pulses);',
    '.primary-actions button:active:not(:disabled)',
    '.primary-actions button:active:not(:disabled)::after',
    'animation: actionTapBurst 220ms ease-out both;',
    '@keyframes actionTapBurst',
    'background-image: var(--combat-critical-action-rings);',
    'animation: actionReadyPulse 1.15s ease-in-out infinite;',
    'background-image: url("/src/client/assets/generated/reboot-ui-icons.png")',
    '#summonButton::before',
    '#mergeButton::before',
    '#rescueButton::before',
    '#summonButton { background-position: 0 0; }',
    '#mergeButton { background-position: 50% 0; }',
    '#rescueButton { background-position: 100% 0; }',
    '#summonButton[data-critical="true"]::after { background-position: 0 0; }',
    '#mergeButton[data-critical="true"]::after { background-position: 50% 0; }',
    '#rescueButton[data-critical="true"]::after { background-position: 100% 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(css.includes('body[data-app-screen="battle"][data-coach-cue="merge"] .primary-actions::before'), false);
  assert.equal(css.includes('body[data-app-screen="battle"][data-coach-cue="rescue"] .primary-actions::before'), false);

  for (const marker of [
    "from './reboot_action_ui.js?v=action-focus2'",
    'buildCombatCoachCue',
    'buildCombatCommandLabels',
    'buildCombatStatusPrompt',
    'buildCombatActionExposure',
    'const commandLabels = buildCombatCommandLabels({ current, localBoardId, actions, onlineWaiting });',
    "const coachCue = appScreen === 'battle'",
    'dom.primaryActions.dataset.focus = exposure.focus;',
    'button.dataset.unlocked = String(exposure[key]);',
    'button.dataset.focus = String(exposure.focus === key);',
    'document.body.dataset.coachCue = coachCue;',
    'delete document.body.dataset.coachCue;',
    "button.querySelector('span').textContent = label;",
    "button.setAttribute('aria-label', label === ACTION_LABELS[key] ? ACTION_LABELS[key] : `${ACTION_LABELS[key]} ${label} 후 가능`);",
    'button.dataset.critical = String(isCriticalRebootAction({ actionKey: key, current, localBoardId, enabled }));'
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }

  const actionBlock = css.slice(css.indexOf('.primary-actions button {\n  display: inline-flex;'), css.indexOf('.primary-actions button::before'));
  assert.equal(actionBlock.includes('background-image: var(--screen-chrome);'), false);
  assert.equal(actionBlock.includes('background-size: 500% 100%;'), false);

  const spotlightBlock = cssRuleBlock(css, '.primary-actions::before');
  assert.equal(spotlightBlock.includes('z-index: 0;'), true, 'first command spotlight must sit behind button labels');
  assert.equal(actionBlock.includes('z-index: 1;'), true, 'action buttons must render above the first command spotlight');
});

test('combat disabled action buttons keep generated command frames readable', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  const disabledBlock = cssRuleBlock(css, '.primary-actions button:disabled');
  for (const marker of [
    'opacity: 0.74;',
    'filter: grayscale(0.22) brightness(0.74) saturate(0.82);'
  ]) {
    assert.equal(disabledBlock.includes(marker), true, marker);
  }

  assert.equal(disabledBlock.includes('opacity: 0.4;'), false);
  assert.equal(css.includes('.primary-actions button:disabled {\n  background-image: none;'), false);
});

test('combat cooldown buttons use generated shutter overlays instead of a web disabled fade', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-cooldown-shutters: url("/src/client/assets/generated/reboot-combat-cooldown-shutters.png?v=cooldown-shutters1")',
    '.primary-actions button:disabled:not([data-unlocked="false"])::after',
    'background-image: var(--combat-cooldown-shutters);',
    'background-size: 300% 100%;',
    'mix-blend-mode: normal;',
    'z-index: 2;',
    '#summonButton:disabled:not([data-unlocked="false"])::after { background-position: 0 0; }',
    '#mergeButton:disabled:not([data-unlocked="false"])::after { background-position: 50% 0; }',
    '#rescueButton:disabled:not([data-unlocked="false"])::after { background-position: 100% 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const baseDisabledAfter = css.indexOf('.primary-actions button:disabled::after');
  const shutterAfter = css.indexOf('.primary-actions button:disabled:not([data-unlocked="false"])::after');
  assert.equal(shutterAfter > baseDisabledAfter, true, 'cooldown shutter must override the generic disabled after rule');
  const shutterBlock = cssRuleBlock(css, '.primary-actions button:disabled:not([data-unlocked="false"])::after');
  assert.equal(shutterBlock.includes('opacity: 0;'), false);
  assert.equal(shutterBlock.includes('background-image: none;'), false);
});

test('combat actions collapse unearned verbs into quiet locked command sockets', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '--combat-locked-sockets: url("/src/client/assets/generated/reboot-combat-locked-sockets.png?v=locked-sockets1")',
    '.primary-actions[data-focus="summon"]',
    '.primary-actions[data-focus="merge"]',
    '.primary-actions[data-focus="rescue"]',
    '.primary-actions[data-open-count="1"]',
    '.primary-actions[data-open-count="2"]',
    '.primary-actions button[data-unlocked="false"]',
    'background-image: var(--combat-locked-sockets);',
    'gap: 0;',
    'body[data-app-screen="battle"][data-coach-cue] .status-line',
    '.primary-actions button[data-unlocked="false"] > span',
    'max-width: 0;',
    '.primary-actions button[data-focus="true"]:not(:disabled)'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(app.includes('dom.primaryActions.dataset.openCount = String(exposure.openCount);'), true);

  const lockedBlock = cssRuleBlock(css, '.primary-actions button[data-unlocked="false"]');
  assert.equal(lockedBlock.includes('display: none;'), false);
  assert.equal(lockedBlock.includes('visibility: hidden;'), false);
  assert.equal(lockedBlock.includes('background-image: none;'), false);
});

test('first battle command stage is one imagegen summon pod, not three equal web buttons', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const html = await readFile('index.html', 'utf8');

  for (const marker of [
    '--combat-first-summon-console: url("/src/client/assets/generated/reboot-combat-first-summon-console.png?v=first-summon-console1")',
    '.primary-actions[data-open-count="1"]::before',
    'body[data-app-screen="battle"][data-coach-cue="summon"] .primary-actions[data-open-count="1"]::before',
    'background-image: var(--combat-first-summon-console);',
    'mix-blend-mode: normal;',
    '.primary-actions[data-open-count="1"] button[data-unlocked="false"]',
    'display: none;',
    '.primary-actions[data-open-count="1"] button[data-focus="true"]:not(:disabled)',
    'min-height: clamp(74px, 20.47vw, 88px);',
    'justify-self: stretch;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(html.includes('/src/client/styles.css?v=first-command-dock1'), true);

  const coachConsole = cssRuleBlock(css, 'body[data-app-screen="battle"][data-coach-cue="summon"] .primary-actions[data-open-count="1"]::before');
  assert.equal(coachConsole.includes('animation: none;'), true);
  assert.equal(coachConsole.includes('opacity: 1;'), true);
});

test('combat command focus uses game feedback instead of a browser outline rectangle', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'button:focus-visible {\n  outline: none;',
    'box-shadow: 0 0 0 1px rgba(105, 243, 255, 0.44), 0 0 14px rgba(105, 243, 255, 0.24);',
    'filter: brightness(1.1) saturate(1.08);',
    '.primary-actions button:focus-visible:not(:disabled)',
    '.primary-actions button:focus-visible:not(:disabled)::after',
    '.primary-actions[data-open-count="1"] button[data-focus="true"]:focus-visible:not(:disabled)::after',
    '.primary-actions[data-open-count="1"] #summonButton[data-ready="true"]',
    'background-image: none;',
    'border-color: transparent;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const firstCommandFocus = cssRuleBlock(css, '.primary-actions[data-open-count="1"] button[data-focus="true"]:focus-visible:not(:disabled)::after');
  assert.equal(firstCommandFocus.includes('outline'), false);
  assert.equal(firstCommandFocus.includes('opacity: 0.72;'), true);
});

test('combat coach cues remove duplicate status text for every taught action', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'body[data-app-screen="battle"][data-coach-cue] .status-line',
    'body[data-app-screen="battle"][data-coach-cue] .action-panel',
    'body[data-app-screen="battle"][data-coach-cue="summon"] .primary-actions::after',
    'body[data-app-screen="battle"][data-coach-cue="merge"] .primary-actions::after',
    'body[data-app-screen="battle"][data-coach-cue="rescue"] .primary-actions::after'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(css.includes('body[data-app-screen="battle"][data-coach-cue="merge"] .status-line'), false);
  assert.equal(css.includes('body[data-app-screen="battle"][data-coach-cue="rescue"] .status-line'), false);
});

test('combat summon cooldown moves from the directive banner onto the command button', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'const statusPrompt = buildCombatStatusPrompt({ current, localBoardId, onlineWaiting });',
    'dom.timeMeter.textContent = statusPrompt;',
    "document.body.dataset.statusKind = statusPrompt.startsWith('충전 ') ? 'cooldown' : 'active';",
    'delete document.body.dataset.statusKind;',
    'body[data-app-screen="battle"][data-status-kind="cooldown"] .status-line',
    'display: none;',
    'buildCombatCommandLabels',
    'const commandLabels = buildCombatCommandLabels({ current, localBoardId, actions, onlineWaiting });',
    'const label = commandLabels[key];',
    "button.querySelector('span').textContent = label;",
    "button.setAttribute('aria-label', label === ACTION_LABELS[key] ? ACTION_LABELS[key] : `${ACTION_LABELS[key]} ${label} 후 가능`);"
  ]) {
    const source = marker.startsWith('body[') || marker === 'display: none;' ? css : app;
    assert.equal(source.includes(marker), true, marker);
  }
});

test('result screen uses imagegen reward backdrop instead of a plain overlay', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--result-backdrop: url("/src/client/assets/generated/reboot-result-backdrop.png")',
    '.result-overlay::before',
    '.result-overlay::after',
    'background-image: var(--result-backdrop)',
    '.result-reward::before',
    'background-image: url("/src/client/assets/generated/reboot-reward-icons.png")'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('combat board renderer uses generated merge and danger accent frames', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    "import { REBOOT_RULES } from '../shared/reboot_content.js';",
    'mergeReadyGrades',
    'Number(grade) < 2',
    'unitCount >= REBOOT_RULES.merge.requiredSameGrade',
    "'merge_ready_frame'",
    "'danger_pulse_frame'",
    "'rescue_beam_segment'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat board renderer uses compact landing markers over imagegen map floors', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    "src: '/src/client/assets/generated/reboot-player-board-tray.png?v=player-tray'",
    'const playerBoardTray = new Image();',
    'playerBoardTray.src = REBOOT_EFFECT_MANIFEST.playerBoardTray.src;',
    'function drawPlayerBoardTray(ctx, assets, x, y, w, h) {',
    'const partnerId = partnerBoardId(localBoardId);',
    'drawBoard(ctx, state.boards[localBoardId], 24, 392, 342, 138,',
    'if (imageBackdrop && !compact) drawPlayerBoardTray(ctx, assets, x - 6, y - 14, w + 12, h + 10);',
    "const socketKey = compact ? 'partner_socket' : 'player_socket';",
    'const shouldDrawSocket = !imageBackdrop;',
    'const socketScale = imageBackdrop ? 0.44 : 1.08;',
    'const socketAlpha = imageBackdrop ? 0.18 : 0.7;',
    "const drewSocket = shouldDrawSocket && drawAtlasSprite(ctx, assets, 'board', socketKey, sx + size / 2, sy + size / 2, size * socketScale, socketAlpha);",
    'if (!drewSocket && !imageBackdrop) {'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('meta screens use generated game chrome instead of css-only panels', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--screen-chrome: url("/src/client/assets/generated/reboot-screen-chrome.png")',
    'background-image: var(--screen-chrome)',
    '.lobby-card::before',
    '.screen-card::before',
    '.bottom-dock::before',
    '.launch-button-frame'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const sharedCardSurface = css.slice(
    css.indexOf('.lobby-card,\n.screen-card,\n.result-panel'),
    css.indexOf('.lobby-card::before')
  );
  assert.equal(sharedCardSurface.includes('linear-gradient'), false);
  assert.equal(sharedCardSurface.includes('backdrop-filter'), false);
});

test('collection and shop start with generated showcase stages instead of list-first cards', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const collection = buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 1 } });
  const shop = buildRebootShop({ gems: 120, unlocks: [] });

  for (const marker of [
    '--meta-showcase-stage: url("/src/client/assets/generated/reboot-meta-showcase-stage.png?v=showcase-stage")',
    'function buildMetaShowcase',
    'class="meta-showcase"',
    'class="meta-showcase-preview"',
    'class="meta-showcase-copy"',
    'class="meta-showcase-stats"',
    'class="meta-showcase-chip"',
    '.meta-showcase-stats',
    'grid-template-rows: minmax(0, 1fr) auto;',
    'data-showcase-kind="collection"',
    'data-showcase-kind="shop"',
    '.meta-showcase',
    'background-image: var(--meta-showcase-stage);',
    '.meta-showcase-preview .sprite-token'
  ]) {
    assert.equal(`${css}\n${screens}\n${collection}\n${shop}`.includes(marker), true, marker);
  }

  assert.equal(collection.indexOf('class="meta-showcase"') < collection.indexOf('class="screen-card unit-card"'), true);
  assert.equal(shop.indexOf('class="meta-showcase"') < shop.indexOf('class="screen-card shop-card"'), true);

  const showcaseBlock = css.slice(css.indexOf('.meta-showcase'), css.indexOf('.meta-showcase-preview'));
  assert.equal(showcaseBlock.includes('linear-gradient'), false);
  assert.equal(showcaseBlock.includes('backdrop-filter'), false);
});

test('meta list rows use dedicated generated game row frames', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--meta-row-frames: url("/src/client/assets/generated/reboot-meta-row-frames.png?v=meta-row-alpha1")',
    'class="screen-card unit-card"',
    'class="screen-card shop-card"',
    'class="screen-card mission-card"',
    'class="screen-card season-card"',
    '.unit-card::before,\n.shop-card::before,\n.mission-card::before,\n.season-card::before',
    'background-image: var(--meta-row-frames);',
    'background-size: 400% 100%;',
    '.unit-card::before { background-position: 0 0; }',
    '.shop-card::before { background-position: 33.333% 0; }',
    '.mission-card::before { background-position: 66.666% 0; }',
    '.season-card::before { background-position: 100% 0; }',
    '.unit-card,\n.shop-card,\n.mission-card,\n.season-card {\n  border-color: transparent;',
    '.shop-card[data-owned="true"],\n.mission-card[data-owned="true"],\n.season-card[data-owned="true"] {\n  filter: saturate(1.12) brightness(1.08);'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  const rowSurfaceBlock = css.slice(
    css.indexOf('.unit-card,\n.shop-card,\n.mission-card,\n.season-card'),
    css.indexOf('.unit-card::before')
  );
  assert.equal(rowSurfaceBlock.includes('background: rgba(2, 7, 8, 0.58);'), true);
  assert.equal(rowSurfaceBlock.includes('linear-gradient'), false);
  assert.equal(rowSurfaceBlock.includes('backdrop-filter'), false);

  for (const marker of [
    '.shop-card button,\n.unit-card button,\n.mission-card button,\n.season-card button',
    'min-height: 44px;',
    'min-width: 88px;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(css.includes('min-height: 34px;'), false);
  assert.equal(css.includes('background: transparent;\n  box-shadow: 0 10px 20px'), false);
});

test('meta row compact chips use generated mini badge frames', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--meta-mini-badges: url("/src/client/assets/generated/reboot-meta-mini-badges.png?v=meta-badges-alpha1")',
    'class="role-pill"',
    'class="unit-cost"',
    'class="shop-price"',
    '.role-pill,\n.unit-cost,\n.shop-price',
    'background-image: var(--meta-mini-badges);',
    'background-size: 300% 100%;',
    '.role-pill { background-position: 0 0; }',
    '.unit-cost { background-position: 50% 0; }',
    '.shop-price { background-position: 100% 0; }'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  const chipBlock = css.slice(css.indexOf('.role-pill,\n.unit-cost,\n.shop-price'), css.indexOf('.role-pill { background-position: 0 0; }'));
  assert.equal(chipBlock.includes('background: rgba'), false);
  assert.equal(chipBlock.includes('border: 1px solid rgba'), false);
  assert.equal(css.includes('.role-pill::before'), false);
});

test('meta rows use generated progress bars for growth and pass progress', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--meta-progress-bars: url("/src/client/assets/generated/reboot-meta-progress-bars.png?v=meta-progress")',
    'function progressFillPercent',
    'function buildMetaProgress',
    'class="meta-progress"',
    'data-progress-kind="training"',
    'data-progress-kind="mission"',
    'data-progress-kind="season"',
    'style="--progress-fill:${progressFillPercent',
    'role="progressbar"',
    'aria-valuemin="0"',
    'aria-valuemax="${target}"',
    'aria-valuenow="${valueNow}"',
    '.meta-progress',
    'background-image: var(--meta-progress-bars);',
    'background-size: 300% 200%;',
    '.meta-progress::before',
    'clip-path: inset(0 calc(100% - var(--progress-fill)) 0 0);',
    '.meta-progress[data-progress-kind="training"]',
    '.meta-progress[data-progress-kind="mission"]',
    '.meta-progress[data-progress-kind="season"]'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  const progressBlock = css.slice(css.indexOf('.meta-progress {'), css.indexOf('.meta-progress[data-progress-kind="training"]'));
  assert.equal(progressBlock.includes('linear-gradient'), false);
  assert.equal(progressBlock.includes('border: 1px solid'), false);
});

test('meta cards use generated state badges instead of text-only ownership cues', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--meta-card-state-badges: url("/src/client/assets/generated/reboot-meta-card-state-badges.png?v=meta-card-states")',
    'function cardStateBadge',
    'class="card-state-badge"',
    'data-card-state="ready"',
    'data-card-state="owned"',
    'data-card-state="locked"',
    '.card-state-badge',
    'background-image: var(--meta-card-state-badges);',
    'background-size: 300% 100%;',
    '.card-state-badge[data-card-state="ready"]',
    '.card-state-badge[data-card-state="owned"]',
    '.card-state-badge[data-card-state="locked"]'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  const stateBlock = css.slice(css.indexOf('.card-state-badge'), css.indexOf('.card-state-badge[data-card-state="ready"]'));
  assert.equal(stateBlock.includes('linear-gradient'), false);
  assert.equal(stateBlock.includes('border-radius'), false);
});

test('meta card state badges stay in the icon lane instead of the action button lane', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const stateBlock = cssRuleBlock(css, '.card-state-badge');

  assert.equal(stateBlock.includes('left: clamp('), true);
  assert.equal(stateBlock.includes('right:'), false);

  const leftMax = Number(stateBlock.match(/left: clamp\(\d+px, [^)]+, (\d+)px\);/)?.[1]);
  const widthMax = Number(stateBlock.match(/width: clamp\(\d+px, [^)]+, (\d+)px\);/)?.[1]);
  assert.equal(Number.isFinite(leftMax), true, stateBlock);
  assert.equal(Number.isFinite(widthMax), true, stateBlock);
  assert.equal(leftMax + widthMax <= 72, true, `badge can overlap copy/action lanes: ${leftMax + widthMax}px`);
});

test('inactive meta state chips use generated icons and compact copy', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    "function passiveCardState(label, state = 'locked', displayLabel = label)",
    'aria-label="${label}"',
    '${displayLabel}',
    "passiveCardState('경험치 부족', 'locked', '부족')",
    "passiveCardState('젬 부족', 'locked', '부족')",
    '.card-passive-state::before',
    'background-image: var(--meta-card-state-badges);',
    '.card-passive-state[data-passive-state="locked"]::before',
    '.card-passive-state[data-passive-state="owned"]::before'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  assert.equal(screens.includes('>경험치 부족<'), false);
  assert.equal(screens.includes('>젬 부족<'), false);
});

test('meta screen titles use generated header plates instead of browser default h1', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const html = await readFile('index.html', 'utf8');

  for (const marker of [
    '--meta-title-plate: url("/src/client/assets/generated/reboot-meta-title-plate.png?v=meta-title")',
    '<h1>유닛 강화</h1>',
    '<h1>상점</h1>',
    '<h1>미션</h1>',
    '<h1>시즌</h1>',
    '.hub-screen h1',
    'background-image: var(--meta-title-plate);',
    'background-size: 100% 100%;',
    'margin: 0 0 8px;',
    '.hub-screen .screen-back',
    'position: absolute;',
    '.hub-screen .screen-back::before',
    'opacity: 0;'
  ]) {
    assert.equal(`${css}\n${html}`.includes(marker), true, marker);
  }

  const titleBlock = css.slice(css.indexOf('.hub-screen h1'), css.indexOf('.screen-list'));
  assert.equal(titleBlock.includes('font-size: 2em'), false);
  assert.equal(titleBlock.includes('margin-block-start'), false);
});

test('meta row actions use generated state buttons instead of generic web buttons', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--meta-action-buttons: url("/src/client/assets/generated/reboot-meta-action-buttons.png?v=meta-actions-alpha1")',
    '.shop-card button,\n.unit-card button,\n.mission-card button,\n.season-card button',
    'background-image: var(--meta-action-buttons);',
    'background-size: 300% 100%;',
    'border-color: transparent;',
    'box-shadow: none;',
    '.unit-card button::before,\n.shop-card button::before,\n.mission-card button::before,\n.season-card button::before',
    'background-image: none;',
    '.shop-card button:not(:disabled),\n.unit-card button:not(:disabled),\n.mission-card button:not(:disabled),\n.season-card button:not(:disabled)',
    'background-position: 0 0;',
    '.shop-card[data-owned="true"] button,\n.mission-card[data-owned="true"] button,\n.season-card[data-owned="true"] button',
    'background-position: 50% 0;',
    '.shop-card button:disabled,\n.unit-card button:disabled,\n.mission-card button:disabled,\n.season-card button:disabled',
    'background-position: 100% 0;',
    'opacity: 0.92;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const actionBlock = css.slice(
    css.indexOf('.shop-card button,\n.unit-card button,\n.mission-card button,\n.season-card button'),
    css.indexOf('.unit-card button')
  );
  assert.equal(actionBlock.includes('background: linear-gradient'), false);
  assert.equal(actionBlock.includes('background-image: var(--screen-chrome);'), false);
});

test('meta shelf cards use generated command ribbons for labels prices and states', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--meta-command-ribbons: url("/src/client/assets/generated/reboot-meta-command-ribbons.png?v=meta-command-ribbons1")',
    '.meta-shelf-grid .card-copy strong',
    'background-image: var(--meta-command-ribbons)',
    '.meta-shelf-grid .unit-cost,',
    '.meta-shelf-grid .shop-price',
    '.meta-shelf-grid .unit-card .card-copy p',
    '.meta-shelf-grid .card-passive-state',
    '.meta-shelf-grid .unit-card button,',
    '.meta-shelf-grid .shop-card button',
    'background-size: 400% 100%'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const genericReadyIndex = css.indexOf('.shop-card button:not(:disabled),');
  const shelfReadyOverrideIndex = css.indexOf('.meta-shelf-grid .unit-card button:not(:disabled),');
  assert.equal(shelfReadyOverrideIndex > genericReadyIndex, true, 'shelf command ribbon button state must override generic card button states');

  const shelfReadyOverrideBlock = css.slice(shelfReadyOverrideIndex, css.indexOf('.result-overlay', shelfReadyOverrideIndex));
  assert.equal(shelfReadyOverrideBlock.includes('background-image: var(--meta-command-ribbons);'), true);
  assert.equal(shelfReadyOverrideBlock.includes('background-size: 400% 100%;'), true);
  assert.equal(shelfReadyOverrideBlock.includes('background-position: 66.666% 0;'), true);
});

test('result screen uses generated status badges for win and loss peaks', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '--result-badges: url("/src/client/assets/generated/reboot-result-badges.png")',
    '.result-panel::after',
    'background-image: var(--result-badges)',
    '.result-overlay[data-result-status="won"] .result-panel::after',
    '.result-overlay[data-result-status="lost"] .result-panel::after',
    'dom.resultOverlay.dataset.resultStatus = model.status'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }
});

test('result screen uses a generated finale burst instead of css-only celebration', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<span id="resultFinale" class="result-finale" aria-hidden="true"></span>',
    '--result-finale-bursts: url("/src/client/assets/generated/reboot-result-finale-bursts.png?v=result-finale")',
    '.result-finale {',
    'background-image: var(--result-finale-bursts);',
    'background-size: 300% 100%;',
    'width: clamp(96px, calc(var(--result-panel-width) * 0.32), 126px);',
    'opacity: 0.38;',
    '.result-overlay[data-result-status="won"] .result-finale { background-position: 0 0; }',
    '.result-overlay[data-result-status="lost"] .result-finale { background-position: 50% 0; }'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const finaleBlock = css.slice(css.indexOf('.result-finale {'), css.indexOf('.result-overlay[data-result-status="won"] .result-finale'));
  assert.equal(finaleBlock.includes('linear-gradient'), false);
  assert.equal(finaleBlock.includes('radial-gradient'), false);
  assert.equal(finaleBlock.includes('calc(var(--result-panel-width) * 0.48)'), false);
  assert.equal(finaleBlock.includes('opacity: 0.62;'), false);
  assert.equal(finaleBlock.includes('calc(var(--result-panel-width) * 0.72)'), false);
  assert.equal(finaleBlock.includes('opacity: 0.94;'), false);
});

test('result screen uses a generated outcome stage instead of an empty medal header', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<span id="resultHeroStage" class="result-hero-stage" aria-hidden="true"></span>',
    '--result-hero-stage: url("/src/client/assets/generated/reboot-result-hero-stage.png?v=result-hero-stage1")',
    '.result-hero-stage {',
    'background-image: var(--result-hero-stage);',
    'background-size: 200% 100%;',
    '.result-overlay[data-result-status="won"] .result-hero-stage',
    '.result-overlay[data-result-status="lost"] .result-hero-stage'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const heroBlock = css.slice(css.indexOf('.result-hero-stage {'), css.indexOf('.result-overlay[data-result-status="won"] .result-hero-stage'));
  assert.equal(heroBlock.includes('background:'), false);
  assert.equal(heroBlock.includes('border'), false);
  assert.equal(heroBlock.includes('box-shadow'), false);
});

test('result screen fills the upper payoff area with generated outcome aura art', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<span id="resultOutcomeAura" class="result-outcome-aura" aria-hidden="true"></span>',
    '--result-outcome-auras: url("/src/client/assets/generated/reboot-result-outcome-auras.png?v=result-outcome-aura1")',
    '.result-outcome-aura {',
    'background-image: var(--result-outcome-auras);',
    'background-size: 200% 100%;',
    '.result-overlay[data-result-status="won"] .result-outcome-aura',
    '.result-overlay[data-result-status="lost"] .result-outcome-aura'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const auraBlock = cssRuleBlock(css, '.result-outcome-aura');
  assert.equal(auraBlock.includes('width: clamp(270px, calc(var(--result-panel-width) * 0.88), 344px);'), true);
  assert.equal(auraBlock.includes('top: clamp(34px, calc(var(--result-panel-width) * 0.125), 48px);'), true);
  assert.equal(auraBlock.includes('pointer-events: none;'), true);
  assert.equal(auraBlock.includes('linear-gradient'), false);
  assert.equal(auraBlock.includes('radial-gradient'), false);
  assert.equal(auraBlock.includes('border'), false);
});

test('result screen uses a dedicated generated debrief panel frame', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--result-panel-frame: url("/src/client/assets/generated/reboot-result-panel-frame.png?v=frame-alpha1")',
    '--result-panel-width: min(calc(100vw - 28px), calc((100dvh - 52px) * 0.6964), 390px);',
    '--result-panel-top-pad: clamp(108px, calc(var(--result-panel-width) * 0.31), 128px);',
    '.result-panel::before',
    'background-image: var(--result-panel-frame)',
    'width: var(--result-panel-width);',
    'aspect-ratio: 39 / 56;',
    'padding: var(--result-panel-top-pad) clamp(16px, calc(var(--result-panel-width) * 0.056), 22px) clamp(16px, calc(var(--result-panel-width) * 0.056), 22px);',
    'border-color: transparent;',
    'backdrop-filter: none;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('result debrief stays usable on short portrait phones', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--result-panel-top-pad: clamp(108px, calc(var(--result-panel-width) * 0.31), 128px);',
    '@media (max-height: 620px)',
    '.result-panel {\n    gap: 6px;',
    '.result-panel strong {\n    font-size: 24px;',
    '.result-panel p {\n    line-height: 1.12;',
    '.result-highlights span,\n  .result-reward {\n    min-height: 44px;',
    '.result-reward::before {\n    width: 28px;',
    '.result-reward::after {\n    width: 38px;',
    '.result-overlay .result-action-button {\n    min-height: 44px;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('result actions use dedicated generated button frames', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '--result-action-buttons: url("/src/client/assets/generated/reboot-result-action-buttons.png?v=result-actions-alpha1")',
    '<button id="resultRetryButton" class="result-action-button result-action-primary"><span>다시 도전</span></button>',
    '<button id="resultLobbyButton" class="result-action-button result-action-secondary"><span>홈</span></button>',
    'resultLobbyLabel: qs(\'#resultLobbyButton span\')',
    'dom.resultLobbyLabel.textContent = model.secondaryAction.label',
    '.result-overlay .result-action-button',
    'background-image: var(--result-action-buttons);',
    'background: transparent;',
    'background-size: 200% 100%;',
    'display: grid;',
    'place-items: center;',
    'padding: 0 8px;',
    'line-height: 1;',
    '.result-overlay .result-action-primary { background-position: 0 0; }',
    '.result-overlay .result-action-secondary { background-position: 100% 0; }',
    '.result-overlay .result-action-button::before {\n  background-image: none;',
    '.result-action-button > span',
    'min-height: 48px;'
  ]) {
    assert.equal(`${html}\n${css}\n${app}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.result-actions button {\n    min-height: 40px;'), false);
  assert.equal(/(^|\n)\.result-action-button \{\n  display: grid;/.test(css), false);
  assert.equal(/(^|\n)\.result-action-secondary \{ background-position: 100% 0; \}/.test(css), false);
});

test('result reward claim action is promoted to the generated primary button', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    "const rewardClaimActions = new Set(['claim-missions', 'claim-season']);",
    "dom.resultOverlay.dataset.resultCta = rewardClaimActions.has(model.secondaryAction.action) ? 'claim' : 'default';",
    '.result-overlay[data-result-cta="claim"] .result-action-secondary',
    'order: -1;',
    'background-position: 0 0;',
    '.result-overlay[data-result-cta="claim"] .result-action-primary',
    'background-position: 100% 0;'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.result-overlay[data-result-cta="claim"] .result-action-secondary {\n  display: none;'), false);
});

test('result reward copy names the earned currency instead of a generic reward number', async () => {
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'function formatResultRewards(rewards)',
    "if (reward.type === 'soft') return `젬 +${reward.amount}`;",
    'dom.resultReward.textContent = formatResultRewards(model.rewards);'
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }

  assert.equal(app.includes('`보상 ${reward.amount}`'), false);
});

test('result highlights and reward use generated strip frames', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--result-detail-strips: url("/src/client/assets/generated/reboot-result-detail-strips.png?v=result-detail-alpha1")',
    '.result-highlights span,\n.result-reward',
    'background-image: var(--result-detail-strips);',
    'background-size: 200% 100%;',
    'min-height: 48px;',
    'border: 0;',
    '.result-highlights span {\n  background-position: 0 0;',
    '.result-reward {\n  display: flex;',
    'background-position: 100% 0;',
    '.result-highlights span,\n  .result-reward {\n    min-height: 44px;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const stripBlock = css.slice(
    css.indexOf('.result-highlights span,\n.result-reward'),
    css.indexOf('.result-reward::before')
  );
  assert.equal(stripBlock.includes('background: rgba(88, 215, 255, 0.1);'), false);
  assert.equal(stripBlock.includes('border: 1px solid rgba(88, 215, 255, 0.22);'), false);
});

test('result highlights use generated run medal badges instead of text-only callouts', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--result-medals: url("/src/client/assets/generated/reboot-result-medals.png?v=result-medals")',
    'function resultHighlightMarkup(model)',
    'class="result-medal"',
    'data-result-medal="${model.highlight.medal}"',
    'model.highlight.medal',
    'medal: resultMedalForReason(reason)',
    'function resultMedalForReason(reason)',
    '.result-medal',
    'background-image: var(--result-medals);',
    'background-size: 300% 100%;',
    '.result-medal[data-result-medal="rescue"]',
    '.result-medal[data-result-medal="boss"]',
    '.result-medal[data-result-medal="tactics"]'
  ]) {
    assert.equal(`${css}\n${app}\n${screens}`.includes(marker), true, marker);
  }

  const medalBlock = css.slice(css.indexOf('.result-medal {'), css.indexOf('.result-medal[data-result-medal="rescue"]'));
  assert.equal(medalBlock.includes('linear-gradient'), false);
  assert.equal(medalBlock.includes('border:'), false);
});

test('result title and guidance copy use generated plate frames', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--result-copy-plates: url("/src/client/assets/generated/reboot-result-copy-plates.png?v=result-copy-alpha1")',
    '#resultTitle',
    'background-image: var(--result-copy-plates);',
    'background-size: 200% 100%;',
    'background-position: 0 0;',
    '#resultReason,\n#resultNextGoal',
    'background-position: 100% 0;',
    'min-height: 36px;',
    '#resultCode',
    '#resultTitle {\n    min-height: 52px;',
    '#resultReason,\n  #resultNextGoal {\n    min-height: 30px;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const copyBlock = css.slice(css.indexOf('#resultTitle'), css.indexOf('.result-actions'));
  assert.equal(copyBlock.includes('border: 1px solid'), false);
  assert.equal(copyBlock.includes('linear-gradient'), false);
});

test('result verdict copy is grouped inside one generated victory or loss ribbon', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<div class="result-verdict-stack">',
    '--result-verdict-ribbons: url("/src/client/assets/generated/reboot-result-verdict-ribbons.png?v=result-verdict1")',
    '.result-verdict-stack {',
    'background-image: var(--result-verdict-ribbons);',
    'background-size: 200% 100%;',
    '.result-overlay[data-result-status="won"] .result-verdict-stack',
    '.result-overlay[data-result-status="lost"] .result-verdict-stack',
    '#resultCode,\n#resultTitle,\n#resultReason,\n#resultNextGoal'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const stackBlock = cssRuleBlock(css, '.result-verdict-stack');
  assert.equal(stackBlock.includes('min-height: clamp(128px, calc(var(--result-panel-width) * 0.41), 160px);'), true);
  assert.equal(stackBlock.includes('background: transparent;'), true);
  assert.equal(stackBlock.includes('border'), false);
  assert.equal(stackBlock.includes('linear-gradient'), false);
  assert.equal(stackBlock.includes('radial-gradient'), false);
});

test('result debrief copy plates protect text from generated finale effects', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '#resultTitle,\n#resultReason,\n#resultNextGoal',
    'z-index: 3;',
    '-webkit-text-stroke: 1px rgba(0, 0, 0, 0.24);',
    'box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.52), 0 8px 16px rgba(0, 0, 0, 0.28);',
    '.result-highlights span,\n.result-reward',
    'box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.46), 0 6px 14px rgba(0, 0, 0, 0.24);'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const copyBlock = css.slice(css.indexOf('#resultTitle'), css.indexOf('.result-actions'));
  assert.equal(copyBlock.includes('linear-gradient'), false);
  assert.equal(copyBlock.includes('backdrop-filter'), false);
});

test('shop equipped cosmetics use generated expression aura instead of inert owned buttons', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--cosmetic-equip-aura: url("/src/client/assets/generated/reboot-cosmetic-equip-aura.png?v=cosmetic-equip")',
    'data-equipped="${equipped}"',
    'class="cosmetic-equip-aura"',
    'data-cosmetic-effect="${item.id}"',
    'const action = equipped',
    'passiveCardState(\'장착중\', \'owned\')',
    'equippedCosmetic: cosmetic',
    'showRewardReveal(\'외형 장착\'',
    '.cosmetic-equip-aura',
    'background-image: var(--cosmetic-equip-aura);',
    'background-size: 500% 100%;',
    '.shop-card[data-equipped="true"] .cosmetic-equip-aura',
    '.cosmetic-equip-aura[data-cosmetic-effect="mythic-aura"]',
    '.cosmetic-equip-aura[data-cosmetic-effect="profile-frame"]',
    '@media (prefers-reduced-motion: reduce)',
    '.shop-card[data-equipped="true"] .cosmetic-equip-aura {\n    animation: none;'
  ]) {
    assert.equal(`${css}\n${app}\n${screens}`.includes(marker), true, marker);
  }

  const equipBlock = css.slice(css.indexOf('.cosmetic-equip-aura {'), css.indexOf('.shop-card[data-equipped="true"] .cosmetic-equip-aura'));
  assert.equal(equipBlock.includes('linear-gradient'), false);
  assert.equal(equipBlock.includes('border:'), false);
});

test('combat renderer uses generated VFX atlas for action feedback', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'reboot-combat-vfx.png',
    'reboot-summon-ignition-vfx.png?v=summon-ignition1',
    'summonIgnition',
    'function drawSummonIgnitionSprite',
    'function drawFirstSummonIgnition',
    'drawFirstSummonIgnition(ctx, state, assets, localBoardId);',
    "src: '/src/client/assets/generated/reboot-combat-reveal-vfx.png?v=reveal-vfx1'",
    'combatRevealVfx',
    'function drawCombatRevealVfxSprite',
    'drawCombatVfx',
    'recentEvents',
    "'summon_flash'",
    "'merge_burst'",
    "'rescue_flare'",
    "'enemy_hit_spark'",
    "'boss_warning_flare'",
    'drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 0',
    'drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 1',
    'drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 2',
    'drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 3',
    "drawAtlasSprite(ctx, assets, 'vfx'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('equipped cosmetics appear in battle as generated expression sigils only', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'cosmeticSigils',
    "src: '/src/client/assets/generated/reboot-battle-cosmetic-sigils.png?v=battle-cosmetic'",
    'COSMETIC_SIGIL_INDEX',
    'function drawBattleCosmeticSignature',
    'options.equippedCosmetic',
    'drawBattleCosmeticSignature(ctx, assets, options.equippedCosmetic, state.now, options.reducedMotion);',
    'if (!options.onlineWaiting) drawCombatStartCutin(ctx, state, assets);',
    'drawRebootBattle(ctx, current, { width: dom.canvas.width, height: dom.canvas.height }, rebootAssets, {',
    'equippedCosmetic: profile.equippedCosmetic',
    'reducedMotion: reduceMotion.matches',
    'localBoardId',
    'onlineWaiting: waitingForOnlinePartner(current)'
  ]) {
    assert.equal(`${app}\n${render}`.includes(marker), true, marker);
  }

  const signatureBlock = render.slice(render.indexOf('function drawBattleCosmeticSignature'), render.indexOf('function drawCombatCrisisOverlays'));
  assert.equal(signatureBlock.includes('state.resources'), false);
  assert.equal(signatureBlock.includes('state.boards.p1.units'), false);
  assert.equal(signatureBlock.includes('fillText'), false);
});

test('combat renderer uses compact generated action stamps for successful actions', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'actionStamps',
    "src: '/src/client/assets/generated/reboot-combat-action-stamps.png?v=action-stamps1'",
    'drawCombatMomentCallout',
    'drawActionStampPanel',
    'const MOMENT_CALLOUT_DURATION = 1.85;',
    'const MOMENT_CALLOUT_FADE_SECONDS = 0.5;',
    'function momentCalloutAlpha(state, event)',
    "recentEvents(state, 'summon', MOMENT_CALLOUT_DURATION)",
    "recentEvents(state, 'merge', MOMENT_CALLOUT_DURATION)",
    "recentEvents(state, 'rescue', MOMENT_CALLOUT_DURATION)",
    'if (!assets.actionStamps?.complete || assets.actionStamps.naturalWidth <= 0) return;',
    'drawActionStampPanel(ctx, assets.actionStamps, meta.index, x, y, w, h, alpha);',
    'const alpha = momentCalloutAlpha(state, event);',
    'const h = 74;',
    'const w = 252;',
    'const y = 326 - rise;',
    'MOMENT_CALLOUTS',
    "'소환 성공'",
    "'합성 성공'",
    "'구원 발동'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const calloutBlock = render.slice(render.indexOf('function drawCombatMomentCallout'), render.indexOf('function drawPartnerAssistPing'));
  assert.equal(render.includes('momentCallouts'), false);
  assert.equal(calloutBlock.includes('assets.momentCallouts'), false);
  assert.equal(calloutBlock.includes('drawMomentCalloutPanel'), false);
  assert.equal(calloutBlock.includes('meta.body'), false);
});

test('combat renderer uses generated partner assist pings for bot co-op actions', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'partnerAssistPings',
    "src: '/src/client/assets/generated/reboot-partner-assist-pings.png?v=partner-assist2'",
    'width: 640',
    'height: 100',
    'const partnerAssistPings = new Image();',
    'partnerAssistPings.src = REBOOT_EFFECT_MANIFEST.partnerAssistPings.src;',
    'PARTNER_ASSIST_PINGS',
    'function drawPartnerAssistSprite',
    'function drawPartnerAssistPing',
    "recentEvents(state, 'partner_auto', 1.35)",
    'const meta = PARTNER_ASSIST_PINGS[event?.action] ?? PARTNER_ASSIST_PINGS.summon;',
    'drawPartnerAssistSprite(ctx, assets.partnerAssistPings, meta.index, x, y, w, h, alpha);',
    "ctx.fillText('파트너 지원'",
    "ctx.fillText(meta.body",
    'drawPartnerAssistPing(ctx, state, assets)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat renderer draws partner assist ping without flattening the imagegen banner', () => {
  const partnerAssistPings = fakeImage(640, 100);
  const ctx = recordingCanvasContext();

  drawRebootBattle(ctx, stateWithPartnerAutoPing(), { width: 390, height: 620 }, fakeRebootAssets({ partnerAssistPings }));

  const pingDraw = ctx.calls.find((call) => call.name === 'drawImage' && call.args[0] === partnerAssistPings);
  assert.ok(pingDraw, 'partner assist sprite was not drawn');
  const [, sx, sy, sw, sh, dx, dy, dw, dh] = pingDraw.args;
  assert.deepEqual([sx, sy, sw, sh], [0, 0, 320, 100]);
  assert.equal(dw, 288);
  assert.equal(dh, 90);
  assert.equal(dw / dh, sw / sh);
  assert.equal(dx, 52);
  assert.equal(dy > 130 && dy < 139, true);
  assert.equal(ctx.calls.some((call) => call.name === 'fillText' && call.args[0] === '파트너 지원'), true);
});

test('combat renderer skips partner assist copy when the generated banner has not loaded', () => {
  const partnerAssistPings = fakeImage(640, 100, false);
  const ctx = recordingCanvasContext();

  drawRebootBattle(ctx, stateWithPartnerAutoPing(), { width: 390, height: 620 }, fakeRebootAssets({ partnerAssistPings }));

  assert.equal(ctx.calls.some((call) => call.name === 'drawImage' && call.args[0] === partnerAssistPings), false);
  assert.equal(ctx.calls.some((call) => call.name === 'fillText' && call.args[0] === '파트너 지원'), false);
});

test('combat renderer draws the rescue variant of partner assist pings', () => {
  const partnerAssistPings = fakeImage(640, 100);
  const ctx = recordingCanvasContext();

  drawRebootBattle(ctx, stateWithPartnerRescuePing(), { width: 390, height: 620 }, fakeRebootAssets({ partnerAssistPings }));

  const pingDraw = ctx.calls.find((call) => call.name === 'drawImage' && call.args[0] === partnerAssistPings);
  assert.ok(pingDraw, 'partner rescue sprite was not drawn');
  const [, sx, sy, sw, sh, dx, dy, dw, dh] = pingDraw.args;
  assert.deepEqual([sx, sy, sw, sh], [320, 0, 320, 100]);
  assert.equal(dw / dh, sw / sh);
  assert.equal(dx, 52);
  assert.equal(dy > 130 && dy < 139, true);
  assert.equal(ctx.calls.some((call) => call.name === 'fillText' && call.args[0] === '구원 지원'), true);
});

test('combat renderer avoids stacking partner danger cutin over rescue support ping', () => {
  const rescueCutin = fakeImage(390, 112);
  const partnerAssistPings = fakeImage(640, 100);
  const ctx = recordingCanvasContext();

  drawRebootBattle(ctx, stateWithPartnerRescuePing(), { width: 390, height: 620 }, fakeRebootAssets({ partnerAssistPings, rescueCutin }));

  assert.equal(ctx.calls.some((call) => call.name === 'drawImage' && call.args[0] === partnerAssistPings), true);
  assert.equal(ctx.calls.some((call) => call.name === 'drawImage' && call.args[0] === rescueCutin), false);
  assert.equal(ctx.calls.some((call) => call.name === 'fillText' && call.args[0] === '파트너 위험'), false);
});

test('combat renderer uses generated crisis overlays for boss and partner danger', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'crisisOverlays',
    "src: '/src/client/assets/generated/reboot-combat-crisis-overlays.png?v=combat-crisis-overlays'",
    'drawCombatCrisisOverlays',
    'drawCrisisOverlayPanel',
    'state.now >= 92 && state.now < 102',
    "function partnerBoardId(localBoardId = 'p1')",
    'const partnerId = partnerBoardId(localBoardId);',
    'return (state.boards?.[partnerId]?.danger ?? 0) >= 80;',
    'drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 0, 0, 210, 390, 160',
    'drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 1, 0, 126, 390, 160',
    'drawCombatCrisisOverlays(ctx, state, assets, localBoardId)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const overlayBlock = render.slice(
    render.indexOf('function drawCombatCrisisOverlays'),
    render.indexOf('function drawBossWarningCutin')
  );
  assert.equal(overlayBlock.includes('fillStyle'), false);
  assert.equal(overlayBlock.includes('roundedRect'), false);
});

test('combat renderer anchors a generated boss aura under boss enemies', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'bossAuras: {',
    "src: '/src/client/assets/generated/reboot-boss-aura-rings.png?v=boss-aura-rings'",
    'const bossAuras = new Image();',
    'bossAuras.src = REBOOT_EFFECT_MANIFEST.bossAuras.src;',
    'drawBossAuraSprite(ctx, assets.bossAuras',
    "if (enemy.enemyId === 'mini_boss') {",
    'drawBossAura(ctx, assets, x, y, state.now);'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const trackBlock = render.slice(render.indexOf('function drawTrack'), render.indexOf('function enemyScreenPoint'));
  assert.equal(trackBlock.indexOf('drawBossAura(ctx, assets, x, y, state.now);') < trackBlock.indexOf("drawAtlasSprite(ctx, assets, 'enemies'"), true);
  const auraBlock = render.slice(render.indexOf('function drawBossAuraSprite'), render.indexOf('function drawHitBoltSprite'));
  assert.equal(auraBlock.includes('fillStyle'), false);
  assert.equal(auraBlock.includes('roundRect'), false);
});

test('boss crisis presentation takes priority over partner danger overlays', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'function normalizeBoardId',
    'function rescuePriorityCrisis',
    'const selfId = normalizeBoardId(localBoardId);',
    'const rescueReady = state.actionState?.[selfId]?.rescue === true || (state.resources?.[selfId]?.rescue ?? 0) >= 100;',
    'if (bossWarning) {',
    'if (rescuePriorityCrisis(state, localBoardId)) {',
    'return drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 1, 0, 126, 390, 160',
    'return drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 0, 0, 210, 390, 160',
    'function drawDualCrisisCutin',
    'const image = assets?.dualCrisisCutin;',
    "ctx.fillText('구원 우선'",
    "ctx.fillText('파트너 위험 · 보스 접근'",
    'if (state.now >= 92 && state.now < 102) return false;'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat cutins do not leak canvas state while generated images load', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');
  const bossBlock = render.slice(
    render.indexOf('function drawBossWarningCutin'),
    render.indexOf('function drawPartnerDangerCutin')
  );
  const partnerBlock = render.slice(
    render.indexOf('function drawPartnerDangerCutin'),
    render.indexOf('function drawCombatStartCutin')
  );
  const startBlock = render.slice(
    render.indexOf('function drawCombatStartCutin'),
    render.indexOf('function drawTrack')
  );
  const loadedGuard = 'if (!image?.complete || image.naturalWidth <= 0) return false;';

  for (const block of [bossBlock, partnerBlock, startBlock]) {
    const guardIndex = block.indexOf(loadedGuard);
    const saveIndex = block.indexOf('ctx.save();');
    const restoreIndex = block.indexOf('ctx.restore();');
    assert.equal(guardIndex >= 0, true);
    assert.equal(guardIndex < saveIndex, true);
    assert.equal(block.slice(saveIndex, restoreIndex).includes('return false'), false);
  }
});

test('boss warning uses a dedicated generated combat cutin', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'REBOOT_CUTIN_MANIFEST',
    'reboot-boss-cutin.png',
    'bossCutin',
    'drawImageCover(ctx, image, 0, 205, 390, 128',
    'drawBossWarningCutin',
    'drawBossWarningCutin(ctx, state, assets)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('combat starts with a generated operation cutin instead of a silent canvas spawn', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'operationStart',
    "src: '/src/client/assets/generated/reboot-combat-start-cutin.png?v=combat-start'",
    'const startCutin = new Image();',
    'startCutin.src = REBOOT_CUTIN_MANIFEST.operationStart.src;',
    'drawCombatStartCutin',
    'if (state.now >= 0.82) return false;',
    '0.82 - state.now',
    'drawImageCover(ctx, image, 0, 180, 390, 86',
    "ctx.fillText('작전 시작'",
    "ctx.fillText('소환 준비'",
    'drawCombatStartCutin(ctx, state, assets)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  assert.equal(render.includes('if (state.now >= 3.25) return false;'), false);
  assert.equal(render.includes('drawImageCover(ctx, image, 0, 238, 390, 112'), false);
});

test('partner danger uses a dedicated generated rescue cutin', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'reboot-rescue-cutin.png',
    'rescueCutin',
    'drawPartnerDangerCutin',
    'const partnerDanger = partnerDangerActive(state, localBoardId);',
    'drawImageCover(ctx, image, 0, 160, 390, 112',
    'drawPartnerDangerCutin(ctx, state, assets, localBoardId)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('death burst effects use a dedicated transparent generated VFX asset', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'REBOOT_EFFECT_MANIFEST',
    'reboot-kill-burst.png',
    'fieldFinaleBursts',
    "src: '/src/client/assets/generated/reboot-result-finale-bursts.png?v=boss-finale1'",
    'killBurst',
    'drawFinaleBurstSprite',
    'drawDeathBursts',
    "effect.type === 'death_burst'",
    'trackPointFromProgress(effect.targetProgress, effect.targetLane)',
    'if (boss) drawFinaleBurstSprite(ctx, assets.fieldFinaleBursts, 0',
    'drawImageCover(ctx, assets.killBurst',
    "drawAtlasSprite(ctx, assets, 'rewards'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('death bursts use generated reward pickup sprites instead of plain reward icons only', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'rewardPickups',
    "src: '/src/client/assets/generated/reboot-reward-pickup-bursts.png?v=reward-pickups'",
    'drawRewardPickupSprite',
    'drawRewardPickups',
    "effect.targetType === 'boss' || effect.targetType === 'mini_boss'",
    'effect.rewardCharge > 0',
    'effect.rewardLink > 1',
    'const pickupIndex = boss ? 2 : effect.rewardLink > 1 ? 1 : 0;',
    'drawRewardPickupSprite(ctx, assets.rewardPickups, pickupIndex',
    'drawRewardPickups(ctx, assets, effect, point, boss, alpha);'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const rewardBlock = render.slice(
    render.indexOf('function drawRewardPickups'),
    render.indexOf('function drawDeathBursts')
  );
  assert.equal(rewardBlock.includes('fillStyle'), false);
  assert.equal(rewardBlock.includes('roundedRect'), false);
});

test('hit effects draw generated short bolt sprites without screen-crossing beams', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'reboot-hit-bolts.png',
    "src: '/src/client/assets/generated/reboot-hit-bolts.png?v=reboot-hit-bolts1'",
    'hitBolts',
    'drawHitBoltSprite',
    'drawHitBeams',
    "effect.type === 'hit'",
    'boardSlotPoint(effect.playerId, effect.slot, localBoardId)',
    'trackPointFromProgress(effect.targetProgress, effect.targetLane)',
    'const boltLength = Math.min(Math.max(48, length * 0.34), 108);',
    'const centerX = to.x - Math.cos(angle) * boltLength * 0.42;',
    'drawHitBoltSprite(ctx, assets.hitBolts'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const boltBlock = render.slice(render.indexOf('function drawHitBoltSprite'), render.indexOf('function drawHitBeams'));
  assert.equal(boltBlock.includes('ctx.drawImage(image, 0, -height / 2, length, height);'), false);
});

test('hit effects land with generated enemy impact bursts at the target', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'enemyImpactBursts',
    "src: '/src/client/assets/generated/reboot-enemy-impact-bursts.png?v=enemy-impact-bursts1'",
    'drawEnemyImpactBurst',
    'drawEnemyImpactBurst(ctx, assets.enemyImpactBursts, to.x, to.y, effect.targetType, alpha);',
    "drawAtlasSprite(ctx, assets, 'vfx', 'enemy_hit_spark'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const hitBlock = render.slice(render.indexOf('function drawHitBeams'), render.indexOf('function drawCombatVfx'));
  assert.equal(
    hitBlock.indexOf('drawEnemyImpactBurst(ctx, assets.enemyImpactBursts, to.x, to.y, effect.targetType, alpha);') <
      hitBlock.indexOf("drawAtlasSprite(ctx, assets, 'vfx', 'enemy_hit_spark'"),
    true
  );
  const impactBlock = render.slice(render.indexOf('function drawEnemyImpactBurst'), render.indexOf('function drawBoard'));
  assert.equal(impactBlock.includes('fillStyle'), false);
  assert.equal(impactBlock.includes('strokeStyle'), false);
});

test('combat renderer grounds enemies with generated track trail sprites', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'enemyTrackTrails',
    "src: '/src/client/assets/generated/reboot-enemy-track-trails.png?v=enemy-track-trails1'",
    'drawEnemyTrackTrail',
    'drawEnemyTrackTrail(ctx, assets, enemy, x, y, state.now);',
    "drawAtlasSprite(ctx, assets, 'enemies'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const trackBlock = render.slice(render.indexOf('function drawTrack'), render.indexOf('function enemyScreenPoint'));
  assert.equal(
    trackBlock.indexOf('drawEnemyTrackTrail(ctx, assets, enemy, x, y, state.now);') <
      trackBlock.indexOf("drawAtlasSprite(ctx, assets, 'enemies'"),
    true
  );
  const trailBlock = render.slice(render.indexOf('function drawEnemyTrackTrail'), render.indexOf('function drawPlayerBoardTray'));
  assert.equal(trailBlock.includes('fillStyle'), false);
  assert.equal(trailBlock.includes('roundRect'), false);
});

test('rescue link feedback avoids a screen-crossing white stroke on the battlefield', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'function drawRescueBeam',
    "drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 118, 220, 90, 0.3);",
    "drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 272, 420, 104, 0.24);"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }

  const rescueBlock = render.slice(render.indexOf('function drawRescueBeam'), render.indexOf('function drawRewardPickups'));
  assert.equal(rescueBlock.includes("ctx.strokeStyle = '#dff9ff';"), false);
  assert.equal(rescueBlock.includes('ctx.bezierCurveTo(135, 230, 250, 395, 312, 500);'), false);
});

test('home navigation uses generated app-game icons instead of plain text buttons', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'reboot-nav-icons.png',
    '.bottom-dock button::before',
    '.screen-back::before',
    'data-nav-icon="collection"',
    'data-nav-icon="shop"',
    'data-nav-icon="missions"',
    'data-nav-icon="season"',
    'data-nav-icon="home"',
    '[data-nav-icon="collection"]::before',
    '[data-nav-icon="shop"]::before',
    '[data-nav-icon="missions"]::before',
    '[data-nav-icon="season"]::before',
    '[data-nav-icon="home"]::before',
    '.screen-back[data-nav-icon="home"]::before'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }
});

test('home navigation buttons use generated tactile selector pads', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--nav-button-glow: url("/src/client/assets/generated/reboot-nav-button-glow.png?v=nav-selector1")',
    '.bottom-dock button::after',
    '.screen-overlay .bottom-dock button',
    'background-image: var(--nav-button-glow)',
    'background-size: 400% 100%',
    'width: var(--nav-button-glow-size);',
    'height: var(--nav-button-glow-size);',
    'left: 50%;',
    'top: 50%;',
    'transform: translate(-50%, -50%);',
    'mix-blend-mode: screen',
    'pointer-events: none;',
    '.bottom-dock button {\n  position: relative;',
    '.bottom-dock button > span',
    'position: relative;\n  z-index: 1;',
    '[data-nav-icon="collection"]::after { background-position: 0 0; }',
    '[data-nav-icon="shop"]::after { background-position: 33.333% 0; }',
    '[data-nav-icon="missions"]::after { background-position: 66.666% 0; }',
    '[data-nav-icon="season"]::after { background-position: 100% 0; }',
    '.bottom-dock button:active,\n.bottom-dock button:focus-visible',
    'transform: translateY(1px);',
    '.bottom-dock button:active::after,\n.bottom-dock button:focus-visible::after',
    'opacity: 0.9;'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  assert.equal(html.includes('<button data-open-screen="collection" data-nav-icon="collection"><span class="nav-alert-badge" aria-hidden="true"></span><span>유닛</span></button>'), true);
  assert.equal(html.includes('<button data-open-screen="shop" data-nav-icon="shop"><span class="nav-alert-badge" aria-hidden="true"></span><span>상점</span></button>'), true);
  assert.equal(html.includes('<button data-open-screen="missions" data-nav-icon="missions"><span class="nav-alert-badge" aria-hidden="true"></span><span>미션</span></button>'), true);
  assert.equal(html.includes('<button data-open-screen="season" data-nav-icon="season"><span class="nav-alert-badge" aria-hidden="true"></span><span>시즌</span></button>'), true);
  assert.equal(css.includes('.bottom-dock button {\n  background: linear-gradient'), false);
  assert.equal(css.includes('inset: -2px -3px;'), false);
  assert.equal(css.includes('.screen-overlay .bottom-dock button {\n  background: transparent;\n  background-image: none;'), true);
});

test('home navigation exposes generated action-ready badges without adding more buttons', async () => {
  const html = await readFile('index.html', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'buildMetaNavAlerts',
    'function updateNavAlerts()',
    'button.dataset.navAlert = screen;',
    'delete button.dataset.navAlert;',
    'updateNavAlerts();',
    '--nav-alert-badges: url("/src/client/assets/generated/reboot-nav-alert-badges.png?v=nav-alerts")',
    '.nav-alert-badge',
    '.bottom-dock button[data-nav-alert] .nav-alert-badge',
    'background-image: var(--nav-alert-badges)',
    'background-size: 400% 100%',
    'width: clamp(25px, 7vw, 30px);',
    '[data-nav-alert="collection"] .nav-alert-badge { background-position: 0 0; }',
    '[data-nav-alert="shop"] .nav-alert-badge { background-position: 33.333% 0; }',
    '[data-nav-alert="missions"] .nav-alert-badge { background-position: 66.666% 0; }',
    '[data-nav-alert="season"] .nav-alert-badge { background-position: 100% 0; }',
    '@keyframes navAlertPulse',
    '@media (prefers-reduced-motion: reduce)',
    'animation: none;'
  ]) {
    assert.equal(`${app}\n${css}\n${screens}`.includes(marker), true, marker);
  }

  assert.equal((html.match(/class="nav-alert-badge"/g) ?? []).length, 4);
});

test('lobby launch actions use dedicated generated button frames', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<span>첫 구원 작전 시작</span>',
    '<span>온라인 협동</span>',
    '<div class="launch-command-console">',
    '--lobby-launch-console: url("/src/client/assets/generated/reboot-lobby-launch-console.png?v=launch-console1")',
    '--lobby-online-button-height: 46px;',
    '--launch-buttons: url("/src/client/assets/generated/reboot-launch-buttons.png?v=gold-cta-alpha1")',
    '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta-alpha1',
    '/src/client/assets/generated/reboot-launch-secondary.png?v=gold-cta-alpha1',
    'class="launch-button-frame"',
    '.launch-button-frame',
    'background-image: var(--launch-buttons)',
    'background-size: 200% 100%',
    '.play-button {\n  background-color: transparent;\n  background-image: var(--launch-buttons);',
    '.match-button {',
    'background-color: transparent;',
    'background-image: var(--launch-buttons);',
    'min-height: var(--lobby-online-button-height);',
    'width: min(82%, 320px);',
    'opacity: 0.74;',
    '.screen-overlay .play-button,\n.screen-overlay .match-button {\n  background: transparent;',
    '.screen-overlay .play-button::before,\n.screen-overlay .match-button::before {\n  background-image: none;',
    '.play-button > span,\n.match-button > span'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.play-button {\n  background: linear-gradient'), false);
});

test('lobby launch actions sit inside one generated command console', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<div class="launch-command-console">',
    '<button id="launchBotButton" class="play-button">',
    '<button id="launchOnlineButton" class="match-button">',
    '.launch-command-console {',
    'background-image: var(--lobby-launch-console);',
    'background-size: 100% 100%;',
    'min-height: clamp(122px, 32vw, 134px);',
    'padding: 8px clamp(10px, 3.2vw, 14px) 10px;'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const consoleStart = html.indexOf('<div class="launch-command-console">');
  assert.equal(consoleStart < html.indexOf('<button id="launchBotButton"'), true);
  assert.equal(consoleStart < html.indexOf('<button id="launchOnlineButton"'), true);

  const consoleBlock = cssRuleBlock(css, '.launch-command-console');
  assert.equal(consoleBlock.includes('linear-gradient'), false);
  assert.equal(consoleBlock.includes('border:'), false);
});

test('splash and lobby use generated hero squad art instead of empty landing space', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--hero-squad: url("/src/client/assets/generated/reboot-hero-squad.png")',
    '.splash-screen::before',
    '.lobby-screen::before',
    'background-image: var(--hero-squad)',
    'pointer-events: none'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('lobby operation card uses a dedicated generated mission poster', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--lobby-operation-poster: url("/src/client/assets/generated/reboot-lobby-operation-poster.png?v=operation-poster")',
    'class="operation-card"',
    'class="operation-poster-frame"',
    '/src/client/assets/generated/reboot-lobby-operation-poster.png?v=operation-poster',
    '.operation-card',
    '.operation-poster-frame',
    'background-image: var(--lobby-operation-poster)',
    '--lobby-operation-poster-height: 154px',
    'min-height: var(--lobby-operation-poster-height);',
    'class="operation-copy"',
    '<p>파트너 구원 · 보스 저지</p>'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  for (const forbidden of [
    'class="lobby-card operation-card"',
    '세 버튼으로 파트너 라인을 살리고 보스를 막으세요',
    '.operation-card::after'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(forbidden), false, forbidden);
  }
});

test('lobby portrait layout budget keeps poster actions and dock from overlapping', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const layout = {
    topPad: cssPxVar(css, '--lobby-screen-top-pad'),
    bottomPad: cssPxVar(css, '--lobby-screen-bottom-pad'),
    gap: cssPxVar(css, '--lobby-screen-gap'),
    poster: cssPxVar(css, '--lobby-operation-poster-height'),
    intel: cssPxVar(css, '--lobby-intel-strip-height'),
    launch: cssPxVar(css, '--lobby-launch-button-height'),
    onlineLaunch: cssPxVar(css, '--lobby-online-button-height'),
    dockButton: cssPxVar(css, '--lobby-bottom-dock-button-height'),
    dockPaddingY: cssPxVar(css, '--lobby-bottom-dock-padding-y'),
    dockRendered: cssPxVar(css, '--lobby-bottom-dock-rendered-height'),
    dockBottom: cssPxVar(css, '--lobby-bottom-dock-bottom')
  };
  const stackHeight = layout.poster + layout.intel * 2 + layout.launch + layout.onlineLaunch + layout.gap * 2;
  const dockHeight = layout.dockRendered;

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 }
  ]) {
    const stackBottom = viewport.height - layout.bottomPad;
    const stackTop = stackBottom - stackHeight;
    const dockTop = viewport.height - layout.dockBottom - dockHeight;
    const dockGap = dockTop - stackBottom;

    assert.ok(stackTop >= layout.topPad + 104, `${viewport.width} stack starts too high: ${stackTop}`);
    assert.ok(dockGap >= 32, `${viewport.width} dock overlaps lobby actions: ${dockGap}`);
    assert.ok(layout.launch >= 54, `${viewport.width} launch CTA lost touch height`);
    assert.ok(layout.onlineLaunch >= 42, `${viewport.width} online option lost touch height`);
    assert.ok(layout.dockButton >= 64, `${viewport.width} dock buttons lost touch height`);
    assert.ok(layout.dockRendered >= layout.dockButton + layout.dockPaddingY * 2 + 4, `${viewport.width} dock render budget is too optimistic`);
  }
});

test('lobby reward and next hooks use generated intel strips instead of web cards', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--lobby-intel-strips: url("/src/client/assets/generated/reboot-lobby-intel-strips.png?v=intel-strips-alpha1")',
    '--lobby-next-beacons: url("/src/client/assets/generated/reboot-lobby-next-beacons.png?v=lobby-next")',
    '--lobby-battle-ready-cue: url("/src/client/assets/generated/reboot-lobby-battle-ready-cue.png?v=battle-ready-cue")',
    'class="lobby-intel-strip reward-hook"',
    'class="lobby-intel-strip next-hook"',
    'class="lobby-intel-frame"',
    'class="lobby-next-beacon"',
    'class="lobby-battle-cue"',
    'data-next-beacon="${nextAction.beacon}"',
    "nextAction.screen === 'battle'",
    '/src/client/assets/generated/reboot-lobby-intel-gems.png?v=intel-strips-alpha1',
    '/src/client/assets/generated/reboot-lobby-intel-next.png?v=intel-strips-alpha1',
    '.lobby-intel-strip',
    '.lobby-intel-frame',
    '.lobby-next-beacon',
    '.lobby-intel-strip > .lobby-next-beacon',
    '.lobby-battle-cue',
    '.lobby-intel-strip > .lobby-battle-cue',
    '.next-hook[data-next-beacon="battle"] .lobby-battle-cue',
    '[data-next-beacon="mission"]',
    '[data-next-beacon="season"]',
    '[data-next-beacon="training"]',
    '[data-next-beacon="shop"]',
    '[data-next-beacon="battle"]',
    'background-image: var(--lobby-next-beacons);',
    'background-image: var(--lobby-battle-ready-cue);',
    '.lobby-intel-strip > span,\n.lobby-intel-strip > strong,\n.lobby-intel-strip > p,\n.lobby-intel-strip > button',
    '.reward-hook .lobby-intel-frame',
    '.next-hook .lobby-intel-frame',
    'pointer-events: none;',
    'min-width: 76px;',
    'min-height: 44px;',
    'right: 14px;',
    '.next-hook > p {\n  display: none;'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('min-height: 32px;'), false);

  for (const forbidden of [
    'class="lobby-card reward-hook"',
    'class="lobby-card next-hook"',
    'data-lobby-open="battle"',
    '전투력 판매 없이 외형만 해금합니다',
    '보상을 모아 유닛과 외형을 여세요'
  ]) {
    assert.equal(screens.includes(forbidden), false, forbidden);
  }
});

test('splash uses a generated title emblem instead of plain text only branding', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--title-emblem: url("/src/client/assets/generated/reboot-title-emblem.png")',
    'class="splash-title-emblem"',
    '.splash-title-emblem',
    'background-image: var(--title-emblem)'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }
});

test('splash title copy sits inside a generated game title plate', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--splash-title-plate: url("/src/client/assets/generated/reboot-splash-title-plate.png?v=splash-title")',
    'class="splash-title-lockup"',
    'class="splash-season"',
    '.splash-title-lockup',
    'background-image: var(--splash-title-plate);',
    'background-size: 100% 100%;',
    '.splash-title-lockup strong',
    '.splash-title-lockup p',
    'letter-spacing: 0;',
    '.splash-screen > strong'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const splashStrongBlock = css.slice(css.indexOf('.splash-screen > strong'), css.indexOf('.splash-title-lockup'));
  assert.equal(splashStrongBlock.includes('font-size: 42px;'), false);
});

test('splash title remains readable on 360px portrait screens', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  const lockupBlock = css.slice(css.indexOf('.splash-title-lockup'), css.indexOf('.splash-title-lockup strong'));
  const titleBlock = css.slice(css.indexOf('.splash-title-lockup strong'), css.indexOf('.splash-title-lockup p'));
  assert.equal(lockupBlock.includes('padding: clamp(40px, 11.16vw, 48px) 58px'), false);
  for (const marker of [
    'width: min(418px, calc(100vw - 8px));',
    'padding: clamp(40px, 11.16vw, 48px) clamp(38px, 10.56vw, 58px) clamp(25px, 7.44vw, 32px);',
    'font-size: clamp(29px, 8.55vw, 42px);',
    'max-width: 100%;',
    'white-space: nowrap;'
  ]) {
    assert.equal(`${lockupBlock}\n${titleBlock}`.includes(marker), true, marker);
  }
});

test('splash uses a generated bottom deck instead of an empty lower web footer', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<span class="splash-floor-cap" aria-hidden="true"></span>',
    '--splash-footer-shroud: url("/src/client/assets/generated/reboot-splash-footer-shroud.png?v=splash-footer-depth-clean3")',
    '--splash-bottom-deck: url("/src/client/assets/generated/reboot-splash-bottom-deck.png?v=splash-bottom-deck2")',
    '--splash-floor-cap: url("/src/client/assets/generated/reboot-splash-floor-cap.png?v=splash-floor-cap-matte4")',
    '[data-screen="splash"]::after',
    'inset: auto 0 0;',
    'height: clamp(86px, 14dvh, 116px);',
    'background-image: var(--splash-bottom-deck);',
    'background-position: center bottom;',
    'background-size: 100% 100%;',
    '.splash-screen::after',
    'position: fixed;',
    'background-image: var(--splash-bottom-deck);',
    'background-position: center bottom;',
    'background-size: 100% 100%;',
    'bottom: calc(var(--app-safe-area-bottom) - 10px);',
    'height: clamp(210px, 34dvh, 270px);',
    '.splash-screen > .splash-floor-cap',
    'z-index: 0;',
    'background-color: #010405;',
    'background-image: var(--splash-bottom-deck);',
    'bottom: calc(var(--app-safe-area-bottom) - 10px);',
    'width: min(100vw, 430px);',
    'height: clamp(210px, 34dvh, 270px);',
    'background-position: center bottom;',
    'background-size: 100% 100%;',
    'body[data-app-screen="splash"] .shell::after',
    'z-index: 30;',
    'height: clamp(86px, 14dvh, 116px);',
    'background-image: var(--splash-bottom-deck);',
    'background-size: 100% 100%;',
    'pointer-events: none;'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const overlayBlock = cssRuleBlock(css, '[data-screen="splash"]::after');
  assert.equal(overlayBlock.includes('z-index: 0;'), true);
  assert.equal(overlayBlock.includes('var(--splash-footer-shroud)'), false);

  const shellMaskBlock = cssRuleBlock(css, 'body[data-app-screen="splash"] .shell::after');
  assert.equal(shellMaskBlock.includes('z-index: 30;'), true);
  assert.equal(shellMaskBlock.includes('background-image: var(--splash-bottom-deck);'), true);
  assert.equal(shellMaskBlock.includes('background-size: 100% auto;'), true);
  assert.equal(shellMaskBlock.includes('var(--splash-footer-shroud)'), false);
  assert.equal(shellMaskBlock.includes('var(--splash-floor-cap)'), false);
  assert.equal(css.includes('body[data-app-screen="battle"] .shell::after'), false);
  assert.equal(cssPxVar(css, '--lobby-screen-bottom-pad') >= 126, true);

  const footerBlock = css.slice(css.indexOf('.splash-screen::after'), css.indexOf('.splash-screen > *,'));
  assert.equal(footerBlock.includes('display: none;'), false);

  const capBlock = css.slice(css.indexOf('.splash-screen > .splash-floor-cap'), css.indexOf('.splash-screen > *,'));
  assert.equal(capBlock.includes('background-size: 100% 100%;'), true);
  assert.equal(capBlock.includes('var(--splash-floor-cap)'), false);
  assert.equal(capBlock.includes('rgba(255, 0, 0'), false);
  assert.equal(css.includes('content: "";\n  display: none;\n  position: absolute;\n  inset: -1px;'), false);
});

test('client settles result rewards into profile and wires shop purchases', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    "from '../shared/meta.js'",
    'PROFILE_STORAGE_KEY',
    'loadProfile',
    'saveProfile',
    'settleResultRewards',
    'handleShopPurchase',
    'profile.processedRuns.includes(current.runId)',
    'buildRebootShop(profile)',
    'data-shop-buy="${item.id}"',
    'dom.shopList.addEventListener'
  ]) {
    assert.equal(`${app}\n${screens}`.includes(marker), true, marker);
  }
});

test('result reward strip uses generated reward burst art', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--reward-burst: url("/src/client/assets/generated/reboot-reward-burst.png")',
    '.result-reward::after',
    'background-image: var(--reward-burst)',
    '.result-overlay[data-result-status="won"] .result-reward::after',
    '.result-overlay[data-result-status="lost"] .result-reward::after'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('result secondary action can claim ready rewards without an extra tap', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'buildRebootResultModel({ result: current.result, rewards, profile })',
    'dom.resultLobbyLabel.textContent = model.secondaryAction.label',
    'dom.resultLobbyButton.dataset.resultOpen = model.secondaryAction.action',
    "action: 'claim-missions'",
    "action: 'claim-season'",
    'function claimReadyMissionsFromResult()',
    'function claimReadySeasonFromResult()',
    'postRewardRoute,',
    "if (target === 'claim-missions')",
    "if (target === 'claim-season')",
    "setScreen(postRewardRoute(profile, 'missions'), { preserveRewardReveal: true });",
    "setScreen(postRewardRoute(profile, 'season'), { preserveRewardReveal: true });",
    'function setScreen(screen, options = {})',
    'changed && !options.preserveRewardReveal',
    "showRewardReveal('미션 보상'",
    "showRewardReveal('시즌 보상'",
    'function handleResultSecondary()',
    "setScreen(target === 'home' ? 'lobby' : target)",
    "return { label: nextAction.cta, action: nextAction.screen",
    'title: nextAction.title',
    'nextLobbyAction(profile)'
  ]) {
    assert.equal(`${app}\n${screens}`.includes(marker), true, marker);
  }
});

test('profile rewards use generated burst feedback instead of plain text toasts', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    "function showToast(text, kind = 'info')",
    'dom.toast.dataset.toastKind = kind',
    "showToast(`${item.name} 해금`, 'reward')",
    "showToast(`${unit.name} Lv.${currentLevel + 1}`, 'reward')",
    "showToast(`${mission.title} 보상`, 'reward')",
    "showToast(`${index + 1}단계 보상`, 'reward')",
    'const TOAST_VISIBLE_MS = 1400',
    '}, TOAST_VISIBLE_MS)',
    '.toast[data-toast-kind="reward"]',
    '.toast[data-toast-kind="reward"]::before',
    '.toast[data-toast-kind="reward"]::after',
    'background-image: var(--toast-callouts);',
    'background-position: 100% 0;',
    'background-image: var(--reward-burst)',
    'reboot-reward-icons.png'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }
});

test('profile rewards use a generated reveal panel instead of toast-only feedback', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '<section id="rewardReveal" class="reward-reveal" hidden aria-live="polite">',
    'id="rewardRevealIcon"',
    'id="rewardRevealTitle"',
    'id="rewardRevealDetail"',
    '--reward-reveal-panel: url("/src/client/assets/generated/reboot-reward-reveal-panel.png?v=reward-reveal")',
    '.reward-reveal',
    '.reward-reveal[hidden]',
    'background-image: var(--reward-reveal-panel);',
    '.reward-reveal-icon',
    'data-reveal-icon="soft_currency"',
    'function showRewardReveal(title, detail, icon = \'soft_currency\')',
    'dom.rewardReveal.hidden = false;',
    'clearTimeout(showRewardReveal.timer);',
    'function hideRewardReveal()',
    "showRewardReveal('외형 해금', item.name, 'unlock_capsule');",
    "showRewardReveal('훈련 완료', `${unit.name} Lv.${currentLevel + 1}`, 'season_progress');",
    "showRewardReveal('미션 보상', `${mission.reward.gems} 젬`, 'soft_currency');",
    "showRewardReveal('시즌 보상', tier.grant.cosmetic ? '외형 해금' : `${tier.grant.gems ?? 0} 젬`, tier.grant.cosmetic ? 'cosmetic_shard' : 'season_progress');"
  ]) {
    assert.equal(`${html}\n${css}\n${app}`.includes(marker), true, marker);
  }

  const revealBlock = css.slice(css.indexOf('.reward-reveal {'), css.indexOf('.reward-reveal[hidden]'));
  assert.equal(revealBlock.includes('background: rgba'), false);
  assert.equal(revealBlock.includes('linear-gradient'), false);
});

test('meta reward actions flash their source cards with generated claim bursts', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '--meta-claim-bursts: url("/src/client/assets/generated/reboot-meta-claim-bursts.png?v=claim-bursts")',
    'function flashMetaClaim(container, selector, kind)',
    'target.dataset.claimFlash = kind;',
    'delete target.dataset.claimFlash;',
    "flashMetaClaim(dom.shopList, `[data-item=\"${selectorValue(item.id)}\"]`, 'shop');",
    "flashMetaClaim(dom.collectionList, `[data-unit-card=\"${selectorValue(unit.id)}\"]`, 'training');",
    "flashMetaClaim(dom.missionsList, `[data-mission=\"${selectorValue(mission.id)}\"]`, 'mission');",
    "flashMetaClaim(dom.seasonList, `.season-card[data-pass-tier=\"${index}\"]`, 'season');",
    '.unit-card[data-claim-flash]::after,\n.shop-card[data-claim-flash]::after,\n.mission-card[data-claim-flash]::after,\n.season-card[data-claim-flash]::after',
    'background-image: var(--meta-claim-bursts);',
    '.unit-card[data-claim-flash="training"]::after { background-position: 0 0; }',
    '.shop-card[data-claim-flash="shop"]::after { background-position: 33.333% 0; }',
    '.mission-card[data-claim-flash="mission"]::after { background-position: 66.666% 0; }',
    '.season-card[data-claim-flash="season"]::after { background-position: 100% 0; }',
    '@keyframes metaClaimBurst'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }
  assert.equal(app.includes('flashMetaClaim(dom.seasonList, `[data-pass-tier='), false);
});

test('successful combat actions use canvas action stamps instead of duplicate toasts', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    '--toast-callouts: url("/src/client/assets/generated/reboot-toast-callouts.png?v=toast-callouts")',
    'drawCombatMomentCallout',
    'softFeedback(actionName)',
    '.toast {\n  position: absolute;',
    'background-image: var(--toast-callouts);',
    'background-size: 200% 100%;',
    'background-position: 0 0;',
    'border-color: transparent;',
    'border-radius: 0;',
    'min-width: 168px;',
    'body[data-app-screen="battle"] .toast {\n  bottom: calc(var(--combat-action-row) + var(--combat-action-safe-lift) + clamp(10px, 3.26vw, 14px) + var(--app-safe-area-bottom));'
  ]) {
    assert.equal(`${css}\n${app}\n${render}`.includes(marker), true, marker);
  }

  const toastBlock = css.slice(css.indexOf('.toast {'), css.indexOf('body[data-app-screen="battle"] .toast'));
  assert.equal(toastBlock.includes('background: rgba(12, 18, 18, 0.92);'), false);
  assert.equal(toastBlock.includes('border: 1px solid var(--line);'), false);
  assert.equal(app.includes("showToast({ summon: '소환 완료', merge: '합성 완료', rescue: '구원 성공' }[actionName], 'combat')"), false);
  assert.equal(css.includes('.toast[data-toast-kind="combat"]'), false);
});

test('reward toast sits above app overlays instead of inside the blurred battle stage', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const stageStart = html.indexOf('<section class="stage-wrap">');
  const stageEnd = html.indexOf('</section>', stageStart);
  const toastIndex = html.indexOf('id="toast"');

  assert.equal(stageStart >= 0, true);
  assert.equal(stageEnd >= 0, true);
  assert.equal(toastIndex > stageEnd, true, 'toast must be a shell-level overlay, not a child of stage-wrap');
  for (const marker of [
    'z-index: 40',
    'body[data-app-screen="battle"] .toast',
    'body[data-app-screen="lobby"] .toast',
    'body[data-app-screen="collection"] .toast',
    'body[data-app-screen="shop"] .toast',
    'body[data-app-screen="missions"] .toast',
    'body[data-app-screen="season"] .toast'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
  assert.equal(css.includes('z-index: 12'), false);
});

test('hidden toast does not leave an empty game panel on the battle screen', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  assert.equal(
    css.includes('.toast[hidden] {\n  display: none;\n}'),
    true,
    'hidden toasts must not render their imagegen frame as an empty floating panel'
  );
});

test('client wires unit training to profile XP and collection rerender', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'unitLevels',
    'unitUpgradeCost',
    'data-unit-upgrade="${unit.id}"',
    'handleUnitUpgrade',
    'profile.xp < cost',
    'profile.unitLevels?.[unit.id]',
    'dom.collectionList.addEventListener',
    'buildRebootCollection(profile)'
  ]) {
    assert.equal(`${app}\n${screens}`.includes(marker), true, marker);
  }
});

test('client wires missions and season pass claim loops', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'REBOOT_MISSIONS',
    'data-mission-claim="${mission.id}"',
    'data-pass-claim="${index}"',
    'handleMissionClaim',
    'handlePassClaim',
    'claimedMissions',
    'claimedPassTiers',
    'buildMissionScreen(profile)',
    'buildSeasonScreen(profile)',
    'dom.missionsList.addEventListener',
    'dom.seasonList.addEventListener'
  ]) {
    assert.equal(`${app}\n${screens}`.includes(marker), true, marker);
  }
});

test('lobby next-action card can navigate to profile screens', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'nextLobbyAction',
    'data-lobby-open="${nextAction.screen}"',
    'handleLobbyOpen',
    'dom.lobbyContent.addEventListener',
    '미션 보상',
    '훈련 가능',
    '외형 해금'
  ]) {
    assert.equal(`${app}\n${screens}`.includes(marker), true, marker);
  }
});

test('meta screens expose game-like status headers before scroll lists', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const collection = buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 1 } });
  const shop = buildRebootShop({ gems: 120, unlocks: [] });
  const missions = buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  for (const marker of [
    'buildMetaShowcase',
    'buildMissionStampBoard',
    'buildSeasonTrackBoard',
    'class="meta-showcase"',
    'class="mission-stamp-board"',
    'class="season-track-board"',
    'data-showcase-kind="collection"',
    'data-showcase-kind="shop"',
    '.meta-showcase',
    '.mission-stamp-board',
    '.season-track-board'
  ]) {
    assert.equal(`${css}\n${screens}\n${collection}\n${shop}\n${missions}\n${season}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.meta-summary'), false);
  assert.equal(screens.includes('function buildMetaSummary'), false);
});

test('unit training screen uses the active generated showcase stage', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const collection = buildRebootCollection({ xp: 80, unitLevels: { spark_pin: 1 } });

  for (const marker of [
    '--meta-showcase-stage: url("/src/client/assets/generated/reboot-meta-showcase-stage.png?v=showcase-stage")',
    'background-image: var(--meta-showcase-stage);',
    '--training-banner: url("/src/client/assets/generated/reboot-training-banner.png")',
    '.meta-showcase[data-showcase-kind="collection"]',
    'background-image: var(--training-banner);',
    'function buildMetaShowcase',
    'data-showcase-kind="collection"',
    '대표 유닛',
    'stats: [`Lv.${featuredLevel}`, `${Math.min(xp, featuredCost)}/${featuredCost} 경험치`]',
    'class="meta-showcase-preview"',
    'class="sprite-token unit-sprite"'
  ]) {
    assert.equal(`${css}\n${screens}\n${collection}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.meta-summary[data-summary-kind="collection"]'), false);
});

test('shop cosmetics use a dedicated imagegen item atlas', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--shop-cosmetics: url("/src/client/assets/generated/reboot-shop-cosmetics.png")',
    'data-shop-cosmetic="${item.id}"',
    '.shop-cosmetic',
    '[data-shop-cosmetic="mythic-aura"]',
    '[data-shop-cosmetic="profile-frame"]'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }
});

test('shop screen uses the active generated showcase stage', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const shop = buildRebootShop({ gems: 120, unlocks: [] });

  for (const marker of [
    '--meta-showcase-stage: url("/src/client/assets/generated/reboot-meta-showcase-stage.png?v=showcase-stage")',
    'background-image: var(--meta-showcase-stage);',
    '--shop-banner: url("/src/client/assets/generated/reboot-shop-banner.png")',
    '.meta-showcase[data-showcase-kind="shop"]',
    'background-image: var(--shop-banner);',
    'function buildMetaShowcase',
    'data-showcase-kind="shop"',
    '추천 외형',
    'stats: [`보유 ${gems} 젬`, `가격 ${featuredItem.price?.gems ?? 0} 젬`]',
    'class="meta-showcase-preview"',
    'class="sprite-token shop-cosmetic"'
  ]) {
    assert.equal(`${css}\n${screens}\n${shop}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.meta-summary[data-summary-kind="shop"]'), false);
});

test('collection and shop use a generated display shelf instead of list-only rows', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const collection = buildRebootCollection({ xp: 0, unitLevels: {} });
  const shop = buildRebootShop({ gems: 0, unlocks: [] });

  assert.equal(css.includes('--meta-shelf-grid: url("/src/client/assets/generated/reboot-meta-shelf-grid.png?v=meta-shelf-grid1")'), true);
  assert.equal(collection.includes('class="meta-shelf-grid" data-shelf-kind="collection"'), true);
  assert.equal(shop.includes('class="meta-shelf-grid" data-shelf-kind="shop"'), true);

  const shelfBlock = cssRuleBlock(css, '.meta-shelf-grid');
  for (const marker of [
    'grid-template-columns: repeat(2, minmax(0, 1fr));',
    'background-image: var(--meta-shelf-grid);',
    'background-size: 100% 100%;',
    'min-height: clamp(520px, 132vw, 640px);'
  ]) {
    assert.equal(shelfBlock.includes(marker), true, marker);
  }

  const shelfCardBlock = css.slice(css.indexOf('.meta-shelf-grid .unit-card,'), css.indexOf('.meta-shelf-grid .unit-card::before,'));
  for (const marker of [
    'background: transparent;',
    'box-shadow: none;',
    'grid-template-rows: minmax(84px, 1fr) auto auto;'
  ]) {
    assert.equal(shelfCardBlock.includes(marker), true, marker);
  }

  const shelfFrameBlock = css.slice(css.indexOf('.meta-shelf-grid .unit-card::before,'), css.indexOf('.meta-shelf-grid .card-state-badge'));
  assert.equal(shelfFrameBlock.includes('background-image: none;'), true);

  const shelfActionBlock = css.slice(css.indexOf('.meta-shelf-grid .unit-card button,'), css.indexOf('.meta-shelf-grid .card-passive-state'));
  assert.equal(shelfActionBlock.includes('min-height: 44px;'), true);
});

test('mission and season use a generated progress board instead of bare stacked rows', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const missions = buildMissionScreen({ processedRuns: [], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 0, claimedPassTiers: [] });

  assert.equal(css.includes('--meta-progress-board: url("/src/client/assets/generated/reboot-meta-progress-board.png?v=meta-progress-board1")'), true);
  assert.equal(css.includes('--meta-objective-rails: url("/src/client/assets/generated/reboot-meta-objective-rails.png?v=objective-rails1")'), true);
  assert.equal(missions.includes('class="meta-progress-board" data-progress-board="missions"'), true);
  assert.equal(season.includes('class="meta-progress-board" data-progress-board="season"'), true);

  const boardBlock = cssRuleBlock(css, '.meta-progress-board');
  for (const marker of [
    'grid-template-rows: repeat(4, minmax(0, 1fr));',
    'background-image: var(--meta-progress-board);',
    'background-size: 100% 100%;',
    'min-height: clamp(520px, 132vw, 640px);'
  ]) {
    assert.equal(boardBlock.includes(marker), true, marker);
  }

  const boardCardBlock = css.slice(css.indexOf('.meta-progress-board .mission-card,'), css.indexOf('.meta-progress-board .mission-card::before,'));
  for (const marker of [
    'background: transparent;',
    'box-shadow: none;',
    'grid-template-columns: clamp(58px, 17vw, 74px) 1fr clamp(62px, 18vw, 82px);'
  ]) {
    assert.equal(boardCardBlock.includes(marker), true, marker);
  }

  const boardFrameBlock = css.slice(css.indexOf('.meta-progress-board .mission-card::before,'), css.indexOf('.meta-progress-board .card-state-badge'));
  for (const marker of [
    'background-image: var(--meta-objective-rails);',
    'background-size: 200% 100%;',
    'inset: clamp(1px, 0.8vw, 4px) clamp(2px, 1.2vw, 5px);',
    '.meta-progress-board .mission-card::before { background-position: 0 0; }',
    '.meta-progress-board .season-card::before { background-position: 100% 0; }'
  ]) {
    assert.equal(boardFrameBlock.includes(marker), true, marker);
  }
  assert.equal(boardFrameBlock.includes('background-image: none;'), false);
});

test('mission and season screens use generated stamp and reward-track boards', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const missions = buildMissionScreen({ processedRuns: ['run-1'], claimedMissions: [] });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });

  for (const marker of [
    '--missions-banner: url("/src/client/assets/generated/reboot-missions-banner.png")',
    '--season-banner: url("/src/client/assets/generated/reboot-season-banner.png")',
    'function buildMissionStampBoard',
    'function buildSeasonTrackBoard',
    'class="mission-stamp-board"',
    'class="mission-stamp-grid"',
    'class="mission-stamp-slot"',
    'class="season-track-board"',
    'class="season-track-rail"',
    'class="season-track-node"',
    '.mission-stamp-board',
    '.season-track-board',
    '.mission-stamp-slot .reward-token',
    'background-size: 136px 34px;',
    '.mission-stamp-slot .reward-token[data-reward-icon="cosmetic_shard"]',
    'background-position: -34px 0;',
    '.season-track-node .reward-token[data-reward-icon="season_progress"]',
    'background-position: -68px 0;',
    'var(--missions-banner)',
    'var(--season-banner)'
  ]) {
    assert.equal(`${css}\n${screens}\n${missions}\n${season}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.meta-summary[data-summary-kind="missions"]'), false);
  assert.equal(css.includes('.meta-summary[data-summary-kind="season"]'), false);
});

test('mission and season rows show generated reward tokens', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'class="reward-token mission-reward-token"',
    'class="reward-token season-reward-token"',
    'data-reward-icon="${rewardIconForGrant(mission.reward, \'mission\')}"',
    'data-reward-icon="${rewardIconForGrant(tier.grant, \'season\')}"',
    '.reward-token',
    '[data-reward-icon="soft_currency"]',
    '[data-reward-icon="cosmetic_shard"]',
    'reboot-reward-icons.png'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }
});

test('mission and season rows use generated objective status stamps instead of text-heavy list actions', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const missions = buildMissionScreen({
    processedRuns: ['run-1'],
    unitLevels: { spark_pin: 2 },
    unlocks: [],
    claimedMissions: ['first-run']
  });
  const season = buildSeasonScreen({ xp: 80, claimedPassTiers: [0] });
  const combined = `${css}\n${missions}\n${season}`;

  for (const marker of [
    '--meta-objective-status-stamps: url("/src/client/assets/generated/reboot-meta-objective-status-stamps.png?v=objective-stamps1")',
    'class="objective-action"',
    'class="objective-status-stamp"',
    'class="objective-detail"',
    'class="objective-cost shop-price"',
    'data-objective-kind="mission"',
    'data-objective-kind="season"',
    'data-objective-state="claimed"',
    'data-objective-state="ready"',
    'data-objective-state="locked"',
    '.objective-status-stamp',
    'background-image: var(--meta-objective-status-stamps);',
    'background-size: 300% 100%;',
    '.objective-status-stamp[data-objective-state="claimed"]',
    'background-position: 50% 0;',
    '.objective-status-stamp[data-objective-state="locked"]',
    'background-position: 100% 0;'
  ]) {
    assert.equal(combined.includes(marker), true, marker);
  }

  const detailBlock = cssRuleBlock(css, '.meta-progress-board .objective-detail,\n.meta-progress-board .objective-cost');
  assert.equal(detailBlock.includes('position: absolute;'), true);
  assert.equal(detailBlock.includes('clip: rect(0 0 0 0);'), true);
  assert.equal(detailBlock.includes('white-space: nowrap;'), true);

  const claimButtonBlock = cssRuleBlock(css, '.meta-progress-board .mission-card button,\n.meta-progress-board .season-card button');
  assert.equal(claimButtonBlock.includes('min-height: 44px;'), true);
  assert.equal(claimButtonBlock.includes('min-height: 26px;'), false);
});

test('combat resource HUD uses generated icons instead of text-only chips', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-meter-sockets: url("/src/client/assets/generated/reboot-combat-meter-sockets.png?v=meter-sockets")',
    '#summonMeter::before',
    '#rescueMeter::before',
    '#dangerMeter::before',
    'background-image: url("/src/client/assets/generated/reboot-ui-icons.png")',
    '.meters span {\n  display: inline-flex;',
    'background-image: var(--combat-meter-sockets);',
    'background-size: 300% 100%;',
    '#summonMeter::before { background-position: 0 0; }',
    '#rescueMeter::before { background-position: -36px 0; }',
    '#dangerMeter::before { background-position: -54px 0; }',
    '#summonMeter { background-position: 0 0; }',
    '#rescueMeter { background-position: 50% 0; }',
    '#dangerMeter { background-position: 100% 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const meterBlock = css.slice(css.indexOf('.meters span {\n  display: inline-flex;'), css.indexOf('.meters span::before'));
  assert.equal(meterBlock.includes('background: rgba(3, 9, 10, 0.34);'), false);
  assert.equal(meterBlock.includes('border: 1px solid rgba(245, 240, 220, 0.1);'), false);
});

test('combat status line uses generated game plates instead of plain web chips', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-status-plates: url("/src/client/assets/generated/reboot-combat-status-plates.png?v=status-plates-alpha1")',
    '.status-line span {\n  display: inline-flex;',
    'background-image: var(--combat-status-plates);',
    'background-size: 200% 100%;',
    '#timeMeter { background-position: 0 0; }',
    '#bossMeter { background-position: 100% 0; }',
    '.status-line:has(#bossMeter[hidden])',
    '.status-line span[hidden] {\n  display: none;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const statusBlock = css.slice(css.indexOf('.status-line span {\n  display: inline-flex;'), css.indexOf('.primary-actions {'));
  assert.equal(statusBlock.includes('background: rgba(3, 9, 10, 0.34);'), false);
  assert.equal(statusBlock.includes('border: 1px solid rgba(245, 240, 220, 0.1);'), false);
});

test('combat status hides the idle boss chip until the boss warning matters', async () => {
  const html = await readFile('index.html', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  assert.equal(html.includes('<span id="bossMeter" hidden>보스 경고</span>'), true);
  assert.equal(app.includes('const bossWarning = current.now >= 92 && current.now < 120;'), true);
  assert.equal(app.includes('dom.bossMeter.hidden = !bossWarning;'), true);
  assert.equal(app.includes("dom.bossMeter.textContent = bossWarning ? '보스 경고' : '';"), true);
  assert.equal(app.includes("'보스 대기'"), false);
});

test('combat shell uses generated HUD and action dock chrome', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-hud-frame: url("/src/client/assets/generated/reboot-combat-hud-frame.png")',
    '--combat-action-dock: url("/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1")',
    'body[data-app-screen="battle"] .hud::before',
    'body[data-app-screen="battle"] .action-panel::before',
    'background-image: var(--combat-hud-frame)',
    'background-image: var(--combat-action-dock)',
    'background-size: 100% auto',
    '.hud > *,',
    '.action-panel > *'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('combat HUD brand reads as a generated operation badge, not a web header', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<strong>신호릴레이</strong>',
    '.brand::before',
    'background-image: var(--title-emblem);',
    'grid-template-columns: clamp(28px, 8vw, 34px) minmax(0, 1fr);',
    'text-shadow: 0 2px 8px rgba(0, 0, 0, 0.74);',
    'white-space: nowrap;'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const hudBlock = html.slice(html.indexOf('<section class="hud">'), html.indexOf('</section>', html.indexOf('<section class="hud">')));
  assert.equal(hudBlock.includes('<strong>ProjectAuto</strong>'), false);
});

test('combat shell chrome renders the generated action dock as a full command console', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-hud-row: clamp(72px, 22.33vw, 96px);',
    '--combat-action-row: clamp(132px, 34.42vw, 148px);',
    '--combat-action-safe-lift: clamp(10px, 3.26vw, 14px);',
    'grid-template-rows: calc(var(--combat-hud-row) + var(--app-safe-area-top)) minmax(0, 1fr) calc(var(--combat-action-row) + var(--combat-action-safe-lift) + var(--app-safe-area-bottom));',
    'padding: clamp(8px, 2.79vw, 12px) clamp(10px, 3.26vw, 14px) calc(clamp(18px, 5.12vw, 22px) + var(--combat-action-safe-lift) + var(--app-safe-area-bottom));',
    'inset: 0 0 var(--combat-action-safe-lift);',
    'background-size: 100% auto;',
    'background-position: center bottom;',
    'background-size: 100% 100%;',
    'opacity: 0.92;',
    'border-top: 1px solid rgba(244, 201, 93, 0.22);',
    'min-height: clamp(48px, 13.02vw, 56px);'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(css.includes('body[data-app-screen="battle"] .hud::before {\n  background-image: var(--combat-hud-frame);'), true);
});

test('first combat command state covers empty dock sockets with a generated one-button shroud', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-first-command-dock: url("/src/client/assets/generated/reboot-combat-first-command-dock.png?v=first-command-dock1")',
    'body[data-app-screen="battle"] .action-panel:has(.primary-actions[data-open-count="1"])::after',
    'background-image: var(--combat-first-command-dock);',
    'inset: 0 0 var(--combat-action-safe-lift);',
    'background-size: 100% 100%;',
    'z-index: 0;',
    'pointer-events: none;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const block = cssRuleBlock(css, 'body[data-app-screen="battle"] .action-panel:has(.primary-actions[data-open-count="1"])::after');
  assert.equal(block.includes('linear-gradient'), false);
  assert.equal(block.includes('border:'), false);
});

test('combat HUD keeps three resource meters bounded on compact phones', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '.hud {\n  gap: 4px;',
    'flex: 0 0 clamp(220px, 60vw, 258px);',
    'grid-template-columns: repeat(3, minmax(0, 1fr));',
    'white-space: nowrap;',
    '@media (max-width: 360px)',
    '.brand span {\n    display: none;',
    '.meters span::before {\n    width: 14px;',
    '#rescueMeter::before { background-position: -28px 0; }',
    '#dangerMeter::before { background-position: -42px 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('combat HUD meter labels explain their values without adding extra controls', async () => {
  const html = await readFile('index.html', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '>소환 10<',
    '>구원 0%<',
    '>위험 0<',
    'dom.summonMeter.textContent = `소환 ${resources.summon}`',
    'dom.rescueMeter.textContent = `구원 ${Math.round(resources.rescue)}%`',
    'dom.dangerMeter.textContent = `위험 ${Math.round(current.boards[partner]?.danger ?? 0)}`',
    'margin-left: clamp(34px, 10vw, 46px);',
    'padding: clamp(4px, 1.4vw, 6px) clamp(3px, 1.2vw, 5px);'
  ]) {
    assert.equal(`${html}\n${app}\n${css}`.includes(marker), true, marker);
  }

  for (const forbidden of ['>소10<', '>구0%<', '>위0<']) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

test('install metadata uses dedicated generated app icons', async () => {
  const html = await readFile('index.html', 'utf8');
  const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));

  assert.equal(html.includes('<link rel="icon" href="/src/client/assets/generated/reboot-app-icon-192.png">'), true);
  assert.equal(html.includes('ui-icon-atlas.png'), false);
  assert.deepEqual(
    manifest.icons,
    [
      {
        src: '/src/client/assets/generated/reboot-app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/src/client/assets/generated/reboot-app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  );
});
