import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { drawRebootBattle } from '../src/client/reboot_render.js';
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
    momentCallouts: fakeImage(1170, 144),
    partnerAssistPings: fakeImage(640, 100),
    crisisOverlays: fakeImage(780, 160),
    rewardPickups: fakeImage(768, 128),
    bossAuras: fakeImage(768, 192),
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
    "from './reboot_actions.js'",
    "from './reboot_render.js?v=player-tray1'",
    "from './reboot_screens.js?v=lobby-start1'",
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
    'body[data-screen-wipe] .screen-transition-fx',
    '@keyframes screenWipeSweep',
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

test('portrait CSS keeps the app shell fixed and thumb-first', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
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

  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=player-tray1">'), true);
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
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=online-fallback2"></script>'), true);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=online-fallback1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=player-tray1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=lobby-start1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=lobby-next1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=battle-cosmetic1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=cosmetic-equip1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=result-medals1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=reward-reveal1"></script>'), false);
  assert.equal(html.includes('<script type="module" src="/src/client/app.js?v=reboot-action-ready1"></script>'), false);
  assert.equal(app.includes("from './reboot_render.js?v=player-tray1'"), true);
  assert.equal(app.includes("from './reboot_render.js?v=battle-cosmetic1'"), false);
  assert.equal(app.includes("from './reboot_screens.js?v=lobby-start1'"), true);
  assert.equal(app.includes("from './reboot_screens.js?v=lobby-next1'"), false);
  assert.equal(app.includes("from './reboot_screens.js'"), false);
  assert.equal(app.includes("from './reboot_render.js?v=reboot-action-ready1'"), false);
  assert.equal(render.includes("src: '/src/client/assets/generated/reboot-battle-backdrop.png?v=reboot-action-ready1'"), true);
  assert.equal(css.includes('--combat-action-dock: url("/src/client/assets/generated/reboot-combat-action-dock.png?v=reboot-action-ready1")'), true);
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

test('meta screen lists frame a summary plus two app cards instead of a sparse web list', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  const listBlock = css.slice(css.indexOf('.screen-list {'), css.indexOf('.screen-list::-webkit-scrollbar'));
  const cardBlock = css.slice(css.indexOf('.unit-card,\n.shop-card,'), css.indexOf('.unit-card::before,'));
  for (const marker of [
    'max-height: min(calc(100dvh - 300px), 396px);',
    '-webkit-mask-image: linear-gradient(',
    'mask-image: linear-gradient(',
    'calc(100% - 12px)',
    'padding-bottom: 40px;',
    'transparent 100%'
  ]) {
    assert.equal(listBlock.includes(marker), true, marker);
  }
  assert.equal(cardBlock.includes('min-height: 122px;'), true);
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
    'const showBoardText = !imageBackdrop || compact;',
    'const showDangerText = showBoardText || board.danger >= 50;',
    'if (showBoardText) {',
    'ctx.fillText(title, x + 12, y + 18);',
    'if (showDangerText) {'
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
    '--combat-action-buttons: url("/src/client/assets/generated/reboot-combat-action-buttons.png?v=action-buttons")',
    '--combat-action-ready-pulses: url("/src/client/assets/generated/reboot-action-ready-pulses.png?v=action-ready")',
    '--combat-first-command-spotlight: url("/src/client/assets/generated/reboot-combat-first-command-spotlight.png?v=first-command")',
    '--combat-critical-action-rings: url("/src/client/assets/generated/reboot-critical-action-rings.png?v=critical-action-rings")',
    '--combat-coach-cues: url("/src/client/assets/generated/reboot-combat-coach-cues.png?v=combat-coach")',
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
    '.primary-actions button::after',
    'background-image: var(--combat-action-ready-pulses);',
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
    "from './reboot_action_ui.js'",
    'buildCombatCoachCue',
    "const coachCue = appScreen === 'battle'",
    'document.body.dataset.coachCue = coachCue;',
    'delete document.body.dataset.coachCue;',
    'button.dataset.critical = String(isCriticalRebootAction({ actionKey: key, current, localBoardId, enabled: actions[key].enabled }));'
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
    'mergeReadyKeys',
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
    'drawBoard(ctx, state.boards.p1, 24, 392, 342, 138,',
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
});

test('meta list rows use dedicated generated game row frames', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--meta-row-frames: url("/src/client/assets/generated/reboot-meta-row-frames.png?v=meta-row")',
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
    '.unit-card,\n.shop-card,\n.mission-card,\n.season-card {\n  border-color: transparent;\n  background: transparent;',
    'backdrop-filter: none;',
    '.shop-card[data-owned="true"],\n.mission-card[data-owned="true"],\n.season-card[data-owned="true"] {\n  filter: saturate(1.12) brightness(1.08);'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }

  for (const marker of [
    '.shop-card button,\n.unit-card button,\n.mission-card button,\n.season-card button',
    'min-height: 44px;',
    'min-width: 88px;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(css.includes('min-height: 34px;'), false);
});

test('meta row compact chips use generated mini badge frames', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--meta-mini-badges: url("/src/client/assets/generated/reboot-meta-mini-badges.png?v=meta-badges")',
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

  const progressBlock = css.slice(css.indexOf('.meta-progress'), css.indexOf('.meta-progress[data-progress-kind="training"]'));
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
    'margin: 0 0 10px;',
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
    '--meta-action-buttons: url("/src/client/assets/generated/reboot-meta-action-buttons.png?v=meta-actions")',
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
    '.result-overlay[data-result-status="won"] .result-finale { background-position: 0 0; }',
    '.result-overlay[data-result-status="lost"] .result-finale { background-position: 50% 0; }'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  const finaleBlock = css.slice(css.indexOf('.result-finale {'), css.indexOf('.result-overlay[data-result-status="won"] .result-finale'));
  assert.equal(finaleBlock.includes('linear-gradient'), false);
  assert.equal(finaleBlock.includes('radial-gradient'), false);
});

test('result screen uses a dedicated generated debrief panel frame', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--result-panel-frame: url("/src/client/assets/generated/reboot-result-panel-frame.png")',
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
    '--result-action-buttons: url("/src/client/assets/generated/reboot-result-action-buttons.png?v=result-actions")',
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
    '--result-detail-strips: url("/src/client/assets/generated/reboot-result-detail-strips.png?v=result-detail")',
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
    '--result-copy-plates: url("/src/client/assets/generated/reboot-result-copy-plates.png?v=result-copy")',
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

test('shop equipped cosmetics use generated expression aura instead of inert owned buttons', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--cosmetic-equip-aura: url("/src/client/assets/generated/reboot-cosmetic-equip-aura.png?v=cosmetic-equip")',
    'data-equipped="${equipped}"',
    'class="cosmetic-equip-aura"',
    'data-cosmetic-effect="${item.id}"',
    'equipped ? \'장착중\' : owned ? \'착용\' : locked ? \'젬 부족\' : \'해금\'',
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
    'drawCombatVfx',
    'recentEvents',
    "'summon_flash'",
    "'merge_burst'",
    "'rescue_flare'",
    "'enemy_hit_spark'",
    "'boss_warning_flare'",
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
    'drawRebootBattle(ctx, current, { width: dom.canvas.width, height: dom.canvas.height }, rebootAssets, {',
    'equippedCosmetic: profile.equippedCosmetic',
    'reducedMotion: reduceMotion.matches'
  ]) {
    assert.equal(`${app}\n${render}`.includes(marker), true, marker);
  }

  const signatureBlock = render.slice(render.indexOf('function drawBattleCosmeticSignature'), render.indexOf('function drawCombatCrisisOverlays'));
  assert.equal(signatureBlock.includes('state.resources'), false);
  assert.equal(signatureBlock.includes('state.boards.p1.units'), false);
  assert.equal(signatureBlock.includes('fillText'), false);
});

test('combat renderer uses generated moment callouts for successful actions', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'momentCallouts',
    "src: '/src/client/assets/generated/reboot-combat-moment-callouts.png?v=combat-moment-callouts'",
    'drawCombatMomentCallout',
    'drawMomentCalloutPanel',
    "recentEvents(state, 'summon', 1.15)",
    "recentEvents(state, 'merge', 1.15)",
    "recentEvents(state, 'rescue', 1.15)",
    'if (!assets.momentCallouts?.complete || assets.momentCallouts.naturalWidth <= 0) return;',
    'drawMomentCalloutPanel(ctx, assets.momentCallouts, meta.index, x, y, w, h, alpha);',
    'const h = 122;',
    'const w = 330;',
    'MOMENT_CALLOUTS',
    "'소환 성공'",
    "'합성 성공'",
    "'구원 발동'"
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
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
    'state.boards.p2.danger >= 80',
    'drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 0, 0, 210, 390, 160',
    'drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 1, 0, 126, 390, 160',
    'drawCombatCrisisOverlays(ctx, state, assets)'
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
    'if (bossWarning) {',
    'return drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 0, 0, 210, 390, 160',
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
    'if (state.now >= 3.25) return false;',
    'drawImageCover(ctx, image, 0, 238, 390, 112',
    "ctx.fillText('작전 시작'",
    "ctx.fillText('소환 준비'",
    'drawCombatStartCutin(ctx, state, assets)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('partner danger uses a dedicated generated rescue cutin', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'reboot-rescue-cutin.png',
    'rescueCutin',
    'drawPartnerDangerCutin',
    'state.boards.p2.danger >= 80',
    'drawImageCover(ctx, image, 0, 160, 390, 112',
    'drawPartnerDangerCutin(ctx, state, assets)'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
});

test('death burst effects use a dedicated transparent generated VFX asset', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'REBOOT_EFFECT_MANIFEST',
    'reboot-kill-burst.png',
    'killBurst',
    'drawDeathBursts',
    "effect.type === 'death_burst'",
    'trackPointFromProgress(effect.targetProgress, effect.targetLane)',
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
    'boardSlotPoint(effect.playerId, effect.slot)',
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
    '--nav-button-glow: url("/src/client/assets/generated/reboot-nav-button-glow.png?v=nav-glow")',
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
    '--launch-buttons: url("/src/client/assets/generated/reboot-launch-buttons.png?v=gold-cta")',
    '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta',
    '/src/client/assets/generated/reboot-launch-secondary.png?v=gold-cta',
    'class="launch-button-frame"',
    '.launch-button-frame',
    'background-image: var(--launch-buttons)',
    'background-size: 200% 100%',
    '.play-button {\n  background-color: transparent;\n  background-image: var(--launch-buttons);',
    '.match-button {\n  background-color: transparent;\n  background-image: var(--launch-buttons);',
    '.screen-overlay .play-button,\n.screen-overlay .match-button {\n  background: transparent;',
    '.screen-overlay .play-button::before,\n.screen-overlay .match-button::before {\n  background-image: none;',
    '.play-button > span,\n.match-button > span'
  ]) {
    assert.equal(`${html}\n${css}`.includes(marker), true, marker);
  }

  assert.equal(css.includes('.play-button {\n  background: linear-gradient'), false);
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
    dockButton: cssPxVar(css, '--lobby-bottom-dock-button-height'),
    dockPaddingY: cssPxVar(css, '--lobby-bottom-dock-padding-y'),
    dockRendered: cssPxVar(css, '--lobby-bottom-dock-rendered-height'),
    dockBottom: cssPxVar(css, '--lobby-bottom-dock-bottom')
  };
  const stackHeight = layout.poster + layout.intel * 2 + layout.launch * 2 + layout.gap * 2;
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
    assert.ok(layout.dockButton >= 64, `${viewport.width} dock buttons lost touch height`);
    assert.ok(layout.dockRendered >= layout.dockButton + layout.dockPaddingY * 2 + 4, `${viewport.width} dock render budget is too optimistic`);
  }
});

test('lobby reward and next hooks use generated intel strips instead of web cards', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--lobby-intel-strips: url("/src/client/assets/generated/reboot-lobby-intel-strips.png?v=intel-strips")',
    '--lobby-next-beacons: url("/src/client/assets/generated/reboot-lobby-next-beacons.png?v=lobby-next")',
    '--lobby-battle-ready-cue: url("/src/client/assets/generated/reboot-lobby-battle-ready-cue.png?v=battle-ready-cue")',
    'class="lobby-intel-strip reward-hook"',
    'class="lobby-intel-strip next-hook"',
    'class="lobby-intel-frame"',
    'class="lobby-next-beacon"',
    'class="lobby-battle-cue"',
    'data-next-beacon="${nextAction.beacon}"',
    "nextAction.screen === 'battle'",
    '/src/client/assets/generated/reboot-lobby-intel-gems.png?v=intel-strips',
    '/src/client/assets/generated/reboot-lobby-intel-next.png?v=intel-strips',
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

test('splash uses a generated footer shroud to hide unused lower console slots', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '<span class="splash-floor-cap" aria-hidden="true"></span>',
    '--splash-footer-shroud: url("/src/client/assets/generated/reboot-splash-footer-shroud.png?v=splash-footer-depth-clean3")',
    '--splash-floor-cap: url("/src/client/assets/generated/reboot-splash-floor-cap.png?v=splash-floor-cap-matte4")',
    '[data-screen="splash"]::after',
    'inset: auto 0 0;',
    'height: clamp(86px, 14dvh, 116px);',
    'background-image: var(--splash-floor-cap);',
    'background-position: center bottom;',
    'background-size: min(260px, 61vw) min(96px, 22.5vw);',
    '.splash-screen::after',
    'position: fixed;',
    'background-image: var(--splash-floor-cap), var(--splash-footer-shroud);',
    'background-position: center bottom, center bottom;',
    'background-size: min(260px, 61vw) min(96px, 22.5vw), 100% 100%;',
    'bottom: calc(env(safe-area-inset-bottom) - 10px);',
    'height: clamp(210px, 34dvh, 270px);',
    '.splash-screen > .splash-floor-cap',
    'z-index: 0;',
    'background-color: #010405;',
    'background-image: var(--splash-floor-cap), var(--splash-footer-shroud);',
    'bottom: calc(env(safe-area-inset-bottom) - 10px);',
    'width: min(100vw, 430px);',
    'height: clamp(210px, 34dvh, 270px);',
    'background-position: center bottom, center bottom;',
    'background-size: min(260px, 61vw) min(96px, 22.5vw), 100% 100%;',
    'body[data-app-screen="splash"] .shell::after',
    'z-index: 30;',
    'height: clamp(86px, 14dvh, 116px);',
    'background-image: var(--splash-footer-shroud);',
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
  assert.equal(shellMaskBlock.includes('background-image: var(--splash-footer-shroud);'), true);
  assert.equal(shellMaskBlock.includes('var(--splash-floor-cap)'), false);
  assert.equal(css.includes('body[data-app-screen="battle"] .shell::after'), false);
  assert.equal(cssPxVar(css, '--lobby-screen-bottom-pad') >= 126, true);

  const footerBlock = css.slice(css.indexOf('.splash-screen::after'), css.indexOf('.splash-screen > *,'));
  assert.equal(footerBlock.includes('display: none;'), false);

  const capBlock = css.slice(css.indexOf('.splash-screen > .splash-floor-cap'), css.indexOf('.splash-screen > *,'));
  assert.equal(capBlock.includes('background-size: min(260px, 61vw) min(96px, 22.5vw), 100% 100%;'), true);
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

test('result secondary action opens the recommended growth screen', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    'buildRebootResultModel({ result: current.result, rewards, profile })',
    'dom.resultLobbyLabel.textContent = model.secondaryAction.label',
    'dom.resultLobbyButton.dataset.resultOpen = model.secondaryAction.action',
    'function handleResultSecondary()',
    "setScreen(target === 'home' ? 'lobby' : target)",
    'label: nextAction.cta',
    'action: nextAction.screen',
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
    "flashMetaClaim(dom.shopList, `[data-shop-buy=\"${selectorValue(item.id)}\"]`, 'shop');",
    "flashMetaClaim(dom.collectionList, `[data-unit-upgrade=\"${selectorValue(unit.id)}\"]`, 'training');",
    "flashMetaClaim(dom.missionsList, `[data-mission-claim=\"${selectorValue(mission.id)}\"]`, 'mission');",
    "flashMetaClaim(dom.seasonList, `[data-pass-claim=\"${index}\"]`, 'season');",
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
});

test('successful combat actions use canvas moment callouts instead of duplicate toasts', async () => {
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
    'body[data-app-screen="battle"] .toast {\n  bottom: calc(126px + env(safe-area-inset-bottom));'
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
    'z-index: 12',
    'body[data-app-screen="battle"] .toast',
    'body[data-app-screen="lobby"] .toast'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
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

  for (const marker of [
    'buildMetaSummary',
    'class="meta-summary screen-card"',
    'data-summary-kind="collection"',
    'data-summary-kind="shop"',
    'data-summary-kind="missions"',
    'data-summary-kind="season"',
    '.meta-summary',
    '.meta-summary::after'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
  }
});

test('unit training screen uses a dedicated generated training banner', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--training-banner: url("/src/client/assets/generated/reboot-training-banner.png")',
    '.meta-summary[data-summary-kind="collection"]',
    'background-image:',
    'var(--training-banner)',
    'min-height: 132px',
    '.meta-summary[data-summary-kind="collection"]::before'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
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

test('shop screen uses a dedicated generated storefront banner', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--shop-banner: url("/src/client/assets/generated/reboot-shop-banner.png")',
    '.meta-summary[data-summary-kind="shop"]',
    'var(--shop-banner)',
    '.meta-summary[data-summary-kind="shop"]::before'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('mission and season screens use dedicated generated progress banners', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--missions-banner: url("/src/client/assets/generated/reboot-missions-banner.png")',
    '--season-banner: url("/src/client/assets/generated/reboot-season-banner.png")',
    '.meta-summary[data-summary-kind="missions"]',
    '.meta-summary[data-summary-kind="season"]',
    'var(--missions-banner)',
    'var(--season-banner)',
    '.meta-summary[data-summary-kind="missions"]::before',
    '.meta-summary[data-summary-kind="season"]::before'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
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
    '--combat-status-plates: url("/src/client/assets/generated/reboot-combat-status-plates.png?v=status-plates")',
    '.status-line span {\n  display: inline-flex;',
    'background-image: var(--combat-status-plates);',
    'background-size: 200% 100%;',
    '#timeMeter { background-position: 0 0; }',
    '#bossMeter { background-position: 100% 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const statusBlock = css.slice(css.indexOf('.status-line span {\n  display: inline-flex;'), css.indexOf('.primary-actions {'));
  assert.equal(statusBlock.includes('background: rgba(3, 9, 10, 0.34);'), false);
  assert.equal(statusBlock.includes('border: 1px solid rgba(245, 240, 220, 0.1);'), false);
});

test('combat shell uses generated HUD and action dock chrome', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-hud-frame: url("/src/client/assets/generated/reboot-combat-hud-frame.png")',
    '--combat-action-dock: url("/src/client/assets/generated/reboot-combat-action-dock.png?v=reboot-action-ready1")',
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

test('combat shell chrome uses generated art as compact button backing on phone widths', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-hud-row: clamp(72px, 22.33vw, 96px);',
    '--combat-action-row: clamp(112px, 29.77vw, 128px);',
    'grid-template-rows: calc(var(--combat-hud-row) + env(safe-area-inset-top)) minmax(0, 1fr) calc(var(--combat-action-row) + env(safe-area-inset-bottom));',
    'background-size: 100% auto;',
    'background-position: center bottom;',
    'background-size: 100% 86px;',
    'opacity: 0.2;',
    'min-height: clamp(48px, 13.02vw, 56px);'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  assert.equal(css.includes('body[data-app-screen="battle"] .hud::before {\n  background-image: var(--combat-hud-frame);'), true);
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

test('combat HUD meter labels stay compact enough for generated chrome sockets', async () => {
  const html = await readFile('index.html', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '>소10<',
    '>구0%<',
    '>위0<',
    'dom.summonMeter.textContent = `소${resources.summon}`',
    'dom.rescueMeter.textContent = `구${Math.round(resources.rescue)}%`',
    'dom.dangerMeter.textContent = `위${Math.round(current.boards[partner]?.danger ?? 0)}`',
    'margin-left: clamp(38px, 12vw, 56px);',
    'padding: clamp(4px, 1.4vw, 6px) clamp(3px, 1.2vw, 5px);'
  ]) {
    assert.equal(`${html}\n${app}\n${css}`.includes(marker), true, marker);
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
