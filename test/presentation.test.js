import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('client app is split into reboot modules and keeps app.js as bootstrap', async () => {
  const app = await readFile('src/client/app.js', 'utf8');
  const lines = app.split('\n').length;

  assert.equal(lines <= 900, true, `app.js line budget exceeded: ${lines}`);
  for (const marker of [
    "from './reboot_actions.js'",
    "from './reboot_render.js'",
    "from './reboot_screens.js'",
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

test('meta screens use reboot sprite tokens instead of placeholder swatches', async () => {
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const { buildRebootCollection } = await import('../src/client/reboot_screens.js');
  const collection = buildRebootCollection();

  for (const marker of [
    'class="sprite-token unit-sprite"',
    'class="sprite-token shop-token"',
    'data-sprite="${unit.spriteKey}"',
    'data-shop-icon="${icon}"',
    'ROLE_LABELS[unit.role]',
    'reboot-unit-atlas.png',
    'reboot-ui-icons.png',
    'reboot-reward-icons.png',
    'grid-template-columns: 88px 1fr'
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

  for (const marker of [
    '.primary-actions button::before',
    'background-image: url("/src/client/assets/generated/reboot-ui-icons.png")',
    '#summonButton::before',
    '#mergeButton::before',
    '#rescueButton::before'
  ]) {
    assert.equal(css.includes(marker), true, marker);
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
    'mergeReadyKeys',
    "'merge_ready_frame'",
    "'danger_pulse_frame'",
    "'rescue_beam_segment'"
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
    '.play-button::before',
    '.match-button::before'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
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
