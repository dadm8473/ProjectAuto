import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function cssPxVar(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(\\d+)px;`));
  assert.ok(match, `${name} token is missing`);
  return Number(match[1]);
}

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

test('app shell cache-busts the game stylesheet for visual asset updates', async () => {
  const html = await readFile('index.html', 'utf8');

  assert.equal(html.includes('<link rel="stylesheet" href="/src/client/styles.css?v=reboot-meta-badges">'), true);
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
    '--combat-action-buttons: url("/src/client/assets/generated/reboot-combat-action-buttons.png?v=action-buttons")',
    '.primary-actions button {\n  display: inline-flex;',
    'background-image: var(--combat-action-buttons);',
    'background-size: 300% 100%;',
    '.primary-actions button::before',
    'background-image: url("/src/client/assets/generated/reboot-ui-icons.png")',
    '#summonButton::before',
    '#mergeButton::before',
    '#rescueButton::before',
    '#summonButton { background-position: 0 0; }',
    '#mergeButton { background-position: 50% 0; }',
    '#rescueButton { background-position: 100% 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }

  const actionBlock = css.slice(css.indexOf('.primary-actions button {\n  display: inline-flex;'), css.indexOf('.primary-actions button::before'));
  assert.equal(actionBlock.includes('background-image: var(--screen-chrome);'), false);
  assert.equal(actionBlock.includes('background-size: 500% 100%;'), false);
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

test('hit effects draw generated beam sprites from unit sockets to targets', async () => {
  const render = await readFile('src/client/reboot_render.js', 'utf8');

  for (const marker of [
    'reboot-hit-beam.png',
    'hitBeam',
    'drawBeamSprite',
    'drawHitBeams',
    "effect.type === 'hit'",
    'boardSlotPoint(effect.playerId, effect.slot)',
    'trackPointFromProgress(effect.targetProgress, effect.targetLane)',
    'drawBeamSprite(ctx, assets.hitBeam'
  ]) {
    assert.equal(render.includes(marker), true, marker);
  }
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

  assert.equal(html.includes('<button data-open-screen="collection" data-nav-icon="collection"><span>유닛</span></button>'), true);
  assert.equal(html.includes('<button data-open-screen="shop" data-nav-icon="shop"><span>상점</span></button>'), true);
  assert.equal(html.includes('<button data-open-screen="missions" data-nav-icon="missions"><span>미션</span></button>'), true);
  assert.equal(html.includes('<button data-open-screen="season" data-nav-icon="season"><span>시즌</span></button>'), true);
  assert.equal(css.includes('.bottom-dock button {\n  background: linear-gradient'), false);
  assert.equal(css.includes('inset: -2px -3px;'), false);
  assert.equal(css.includes('.screen-overlay .bottom-dock button {\n  background: transparent;\n  background-image: none;'), true);
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
    'class="lobby-intel-strip reward-hook"',
    'class="lobby-intel-strip next-hook"',
    'class="lobby-intel-frame"',
    '/src/client/assets/generated/reboot-lobby-intel-gems.png?v=intel-strips',
    '/src/client/assets/generated/reboot-lobby-intel-next.png?v=intel-strips',
    '.lobby-intel-strip',
    '.lobby-intel-frame',
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

test('combat action toasts use generated callout frames instead of web alert boxes', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '--toast-callouts: url("/src/client/assets/generated/reboot-toast-callouts.png?v=toast-callouts")',
    "showToast({ summon: '소환 완료', merge: '합성 완료', rescue: '구원 성공' }[actionName], 'combat')",
    '.toast {\n  position: absolute;',
    'background-image: var(--toast-callouts);',
    'background-size: 200% 100%;',
    'background-position: 0 0;',
    'border-color: transparent;',
    'border-radius: 0;',
    '.toast[data-toast-kind="combat"]',
    'min-width: 168px;',
    'body[data-app-screen="battle"] .toast {\n  bottom: calc(126px + env(safe-area-inset-bottom));'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }

  const toastBlock = css.slice(css.indexOf('.toast {'), css.indexOf('body[data-app-screen="battle"] .toast'));
  assert.equal(toastBlock.includes('background: rgba(12, 18, 18, 0.92);'), false);
  assert.equal(toastBlock.includes('border: 1px solid var(--line);'), false);
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
    '--combat-action-dock: url("/src/client/assets/generated/reboot-combat-action-dock.png")',
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

test('combat shell chrome preserves generated asset ratios on phone widths', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '--combat-hud-row: clamp(72px, 22.33vw, 96px);',
    '--combat-action-row: clamp(112px, 29.77vw, 128px);',
    'grid-template-rows: calc(var(--combat-hud-row) + env(safe-area-inset-top)) minmax(0, 1fr) calc(var(--combat-action-row) + env(safe-area-inset-bottom));',
    'background-size: 100% auto;',
    'background-position: center bottom;',
    'background-position: center top;',
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
