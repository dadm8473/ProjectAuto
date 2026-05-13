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

test('lobby operation card uses a dedicated generated mission banner', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const screens = await readFile('src/client/reboot_screens.js', 'utf8');

  for (const marker of [
    '--lobby-operation: url("/src/client/assets/generated/reboot-lobby-operation-banner.png")',
    'class="lobby-card operation-card"',
    '.operation-card',
    '.operation-card::after',
    'background-image: var(--lobby-operation)',
    'min-height: 156px'
  ]) {
    assert.equal(`${css}\n${screens}`.includes(marker), true, marker);
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
    'dom.resultLobbyButton.textContent = model.secondaryAction.label',
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
    'background-image: var(--reward-burst)',
    'reboot-reward-icons.png'
  ]) {
    assert.equal(`${css}\n${app}`.includes(marker), true, marker);
  }
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
    '#summonMeter::before',
    '#rescueMeter::before',
    '#dangerMeter::before',
    'background-image: url("/src/client/assets/generated/reboot-ui-icons.png")',
    '#summonMeter::before { background-position: 0 0; }',
    '#rescueMeter::before { background-position: -36px 0; }',
    '#dangerMeter::before { background-position: -54px 0; }'
  ]) {
    assert.equal(css.includes(marker), true, marker);
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
