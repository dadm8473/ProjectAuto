import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

async function readRequiredFile(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    assert.fail(`${path} is missing: ${error.code}`);
  }
}

test('client registers a root service worker without blocking gameplay startup', async () => {
  const app = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'function registerServiceWorker()',
    "'serviceWorker' in navigator",
    "location.protocol === 'file:'",
    "navigator.serviceWorker.register('/sw.js')",
    'registerServiceWorker();'
  ]) {
    assert.equal(app.includes(marker), true, marker);
  }

  assert.equal(app.lastIndexOf('registerServiceWorker();') < app.lastIndexOf('requestAnimationFrame(loop);'), true);
});

test('service worker keeps the installable mobile game shell available after first load', async () => {
  const sw = await readRequiredFile('sw.js');

  for (const marker of [
    "const CACHE_NAME = 'projectauto-reboot-shell-v131';",
    "self.addEventListener('install'",
    "self.addEventListener('activate'",
    "self.addEventListener('fetch'",
    "self.skipWaiting();",
    'self.clients.claim();',
    "request.method !== 'GET'",
    "url.pathname === '/ws'",
    'event.request.mode === \'navigate\'',
    "caches.match('/index.html')",
    '/manifest.webmanifest',
    '/src/client/styles.css?v=result-highlight-label1',
    '/src/client/app.js?v=start-cutin-focus1',
    '/src/client/reboot_audio.js?v=audio-safe1',
    '/src/client/reboot_actions.js?v=combat-meter2',
    '/src/client/reboot_hud.js?v=board-copy1',
    '/src/client/reboot_playtest.js?v=playtest2',
    '/src/client/reboot_preload.js?v=lobby-defer1',
    '/src/client/reboot_render.js?v=start-cutin-focus1',
    '/src/client/reboot_result_ui.js?v=result-hook1',
    '/src/client/reboot_screens.js?v=operation-poster-map1',
    '/src/client/reboot_action_ui.js?v=hud-meter1',
    '/src/client/reboot_online.js',
    '/src/shared/game.js?v=retry-context1',
    '/src/shared/reboot_game.js?v=retry-context1',
    '/src/shared/reboot_content.js',
    '/src/client/assets/generated/reboot-app-shell-backdrop.png',
    '/src/client/assets/generated/reboot-sound-toggle.png?v=sound-toggle1',
    '/src/client/assets/generated/reboot-title-wordmark-v1.png?v=title-wordmark1',
    '/src/client/assets/generated/reboot-lobby-operation-posters.png?v=operation-posters1',
    '/src/client/assets/generated/reboot-result-title-won-v1.png?v=result-title2',
    '/src/client/assets/generated/reboot-result-title-lost-v1.png?v=result-title2',
    '/src/client/assets/generated/reboot-result-detail-strips.png?v=result-detail-alpha1',
    '/src/client/assets/generated/reboot-result-copy-plates.png?v=result-copy-alpha1',
    '/src/client/assets/generated/reboot-result-medals.png?v=result-medals',
    '/src/client/assets/generated/reboot-result-reward-board-v1.png?v=result-reward-board1',
    '/src/client/assets/generated/reboot-result-command-board-v1.png?v=result-command-board1',
    '/src/client/assets/generated/reboot-meta-shelf-nameplates-v1.png?v=meta-shelf-nameplates1',
    '/src/client/assets/generated/reboot-combat-meter-sockets-v2.png?v=meter-sockets-v2',
    '/src/client/assets/generated/reboot-meta-title-wordmarks-v1.png?v=meta-title-wordmark1',
    '/src/client/assets/generated/reboot-meta-caption-plate.png?v=meta-caption1',
    '/src/client/assets/generated/reboot-lobby-operation-title-plate-v1.png?v=operation-title-plate1',
    '/src/client/assets/generated/reboot-meta-showcase-copy-plates.png?v=showcase-nameplate1',
    '/src/client/assets/generated/reboot-collection-training-board-v1.png?v=collection-training-board1',
    '/src/client/assets/generated/reboot-shop-display-board-v1.png?v=shop-display-board1',
    '/src/client/assets/generated/reboot-shop-banner-v2.png?v=shop-banner2',
    '/src/client/assets/generated/reboot-mission-command-board-v1.png?v=mission-command-board1',
    '/src/client/assets/generated/reboot-season-reward-board-v1.png?v=season-reward-board1',
    '/src/client/assets/generated/reboot-meta-objective-rails.png?v=objective-rails1',
    '/src/client/assets/generated/reboot-meta-objective-command-slots-v1.png?v=objective-slots1',
    '/src/client/assets/generated/reboot-lobby-launch-bay.png?v=lobby-launch-bay1',
    '/src/client/assets/generated/reboot-lobby-coop-diorama-preview.jpg?v=lobby-coop-diorama-preview1',
    '/src/client/assets/generated/reboot-lobby-operation-progress-rail.png?v=operation-progress1',
    '/src/client/assets/generated/reboot-lobby-intel-strips.png?v=intel-strips-alpha1',
    '/src/client/assets/generated/reboot-unit-atlas.png',
    '/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3',
    '/src/client/assets/generated/reboot-player-board-tray.png?v=player-tray',
    '/src/client/assets/generated/reboot-unit-activation-ring.png?v=unit-activation-ring1',
    '/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2',
    '/src/client/assets/generated/reboot-splash-season-badge-v1.png?v=splash-season-badge1',
    '/src/client/assets/generated/reboot-combat-operation-badge-v1.png?v=combat-op-badge1',
    '/src/client/assets/generated/reboot-partner-standby-sigils-v2.png?v=partner-standby2',
    '/src/client/assets/generated/reboot-online-waiting-field-v1.png?v=online-wait-field1',
    '/src/client/assets/generated/reboot-combat-moment-callouts.png?v=moment-callouts1',
    '/src/client/assets/generated/reboot-app-icon-192.png',
    '/src/client/assets/generated/reboot-app-icon-512.png'
  ]) {
    assert.equal(sw.includes(marker), true, marker);
  }
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v91';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v124';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v125';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v126';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v127';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v128';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v129';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v130';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v107';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v105';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v104';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v103';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v102';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v101';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v100';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v90';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v89';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v88';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v87';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v86';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v85';"), false);
  assert.equal(sw.includes('/src/client/styles.css?v=objective-slots1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=result-reward-board1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=mission-season-rails1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=battle-backdrop-v2'), false);
  assert.equal(sw.includes('/src/client/app.js?v=partner-ready1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=objective-focus1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=objective-stamps1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=defense-pressure1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=shelf-select1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=shelf-select1'), false);
  assert.equal(sw.includes('/src/client/reboot_result_ui.js?v=result-ui2'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=shelf-select1'), false);
  assert.equal(sw.includes('/src/client/assets/generated/reboot-lobby-coop-diorama.png?v=lobby-coop-diorama1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=objective-stamps1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=objective-stamps1'), false);
  assert.equal(sw.includes('/src/client/reboot_preload.js?v=battle-backdrop-v2'), false);
  assert.equal(sw.includes('/src/client/reboot_render.js?v=battle-backdrop-v2'), false);
  assert.equal(sw.includes('/src/client/reboot_render.js?v=first-payoff1'), false);
  assert.equal(sw.includes('/src/client/reboot_render.js?v=partner-ready1'), false);
  assert.equal(sw.includes('/src/client/reboot_render.js?v=route-core1'), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v106';"), false);
  assert.equal(sw.includes('/src/client/app.js?v=partner-standby2'), false);
  assert.equal(sw.includes('/src/client/reboot_preload.js?v=partner-standby2'), false);
  assert.equal(sw.includes('/src/client/reboot_render.js?v=partner-standby2'), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v84';"), false);
  assert.equal(sw.includes('/src/client/styles.css?v=meta-unified-board1'), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v82';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v81';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v80';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v79';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v78';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v77';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v76';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v75';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v74';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v73';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v72';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v71';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v70';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v69';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v68';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v67';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v66';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v65';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v64';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v63';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v32';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v31';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v30';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v29';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v28';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v27';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v26';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v25';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v24';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v23';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v22';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v21';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v20';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v19';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v18';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v17';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v16';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v15';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v14';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v13';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v12';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v11';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v10';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v9';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v6';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v5';"), false);
  assert.equal(sw.includes("const CACHE_NAME = 'projectauto-reboot-shell-v4';"), false);
  assert.equal(sw.includes('/src/client/styles.css?v=result-title2'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=title-wordmark1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=result-title1'), false);
  assert.equal(sw.includes('/src/client/reboot_result_ui.js?v=result-ui1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=shop-title1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=shop-banner2'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=hero-squad2'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=feature-cta1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=profile-plate1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=result-xp2'), false);
  assert.equal(sw.includes('/src/client/app.js?v=playtest-feedback1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=online-ready-copy1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=reward-detail1'), false);
  assert.equal(sw.includes('/src/client/reboot_playtest.js?v=playtest1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-action-label2'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-action-label1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-xp1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=combat-meter1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=lobby-intel1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=lobby-focus1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=hud-meter1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=shop-copy1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=reward-copy1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-home1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=pending-copy1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=shop-chips1'), false);
  assert.equal(sw.includes('/src/client/reboot_hud.js?v=hud-meter1'), false);
  assert.equal(sw.includes('/src/client/reboot_hud.js?v=shop-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_hud.js?v=reward-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_hud.js?v=result-home1'), false);
  assert.equal(sw.includes('/src/client/reboot_hud.js?v=pending-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_hud.js?v=shop-chips1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=result-xp1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile8'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile7'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile6'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile5'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile4'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile3'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile2'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-profile1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=meta-station1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=lobby-intel1'), false);
  assert.equal(sw.includes('/src/client/reboot_actions.js?v=merge-reason1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=result-action-label2'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=result-action-label1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=result-goal1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=board-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=shop-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=reward-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=result-home1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=pending-copy1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=shop-chips1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=lobby-profile2'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=lobby-focus1'), false);
  assert.equal(sw.includes('/src/client/reboot_screens.js?v=boss-vitality1'), false);
  assert.equal(sw.includes("\n  '/src/shared/game.js',"), false);
  assert.equal(sw.includes("\n  '/src/shared/reboot_game.js',"), false);
});

test('every precached service worker URL points to a committed app shell file', async () => {
  const sw = await readRequiredFile('sw.js');
  const match = sw.match(/const APP_SHELL_URLS = \[([\s\S]*?)\];/);
  assert.ok(match, 'APP_SHELL_URLS list is missing');

  const urls = [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
  assert.equal(urls.length >= 40, true, `app shell list too small: ${urls.length}`);
  for (const url of urls) {
    const path = (url === '/' ? '/index.html' : url).split('?')[0];
    await stat(`.${path}`);
  }
});

test('browser QA verifies the runtime service worker cache activation', async () => {
  const qa = await readFile('tools/reboot_browser_qa.mjs', 'utf8');

  for (const marker of [
    'async function verifyInstallableShell(page)',
    'navigator.serviceWorker.ready',
    "cacheName === 'projectauto-reboot-shell-v131'",
    "await cache.match('/index.html')",
    "await cache.match('/src/client/styles.css?v=result-highlight-label1')",
    "await cache.match('/src/client/app.js?v=start-cutin-focus1')",
    "await cache.match('/src/client/reboot_audio.js?v=audio-safe1')",
    "await cache.match('/src/client/reboot_actions.js?v=combat-meter2')",
    "await cache.match('/src/client/reboot_hud.js?v=board-copy1')",
    "await cache.match('/src/client/reboot_playtest.js?v=playtest2')",
    "await cache.match('/src/client/reboot_preload.js?v=lobby-defer1')",
    "await cache.match('/src/client/reboot_render.js?v=start-cutin-focus1')",
    "await cache.match('/src/client/reboot_result_ui.js?v=result-hook1')",
    "await cache.match('/src/client/reboot_screens.js?v=operation-poster-map1')",
    "await cache.match('/src/shared/game.js?v=retry-context1')",
    "await cache.match('/src/shared/reboot_game.js?v=retry-context1')",
    "await cache.match('/src/client/reboot_action_ui.js?v=hud-meter1')",
    "await cache.match('/src/client/assets/generated/reboot-app-shell-backdrop.png?v=shell-backdrop1')",
    "await cache.match('/src/client/assets/generated/reboot-sound-toggle.png?v=sound-toggle1')",
    "await cache.match('/src/client/assets/generated/reboot-title-wordmark-v1.png?v=title-wordmark1')",
    "await cache.match('/src/client/assets/generated/reboot-lobby-operation-posters.png?v=operation-posters1')",
    "await cache.match('/src/client/assets/generated/reboot-result-title-won-v1.png?v=result-title2')",
    "await cache.match('/src/client/assets/generated/reboot-result-title-lost-v1.png?v=result-title2')",
    "await cache.match('/src/client/assets/generated/reboot-result-detail-strips.png?v=result-detail-alpha1')",
    "await cache.match('/src/client/assets/generated/reboot-result-copy-plates.png?v=result-copy-alpha1')",
    "await cache.match('/src/client/assets/generated/reboot-result-medals.png?v=result-medals')",
    "await cache.match('/src/client/assets/generated/reboot-result-reward-board-v1.png?v=result-reward-board1')",
    "await cache.match('/src/client/assets/generated/reboot-result-command-board-v1.png?v=result-command-board1')",
    "await cache.match('/src/client/assets/generated/reboot-meta-shelf-nameplates-v1.png?v=meta-shelf-nameplates1')",
    "await cache.match('/src/client/assets/generated/reboot-combat-meter-sockets-v2.png?v=meter-sockets-v2')",
    "await cache.match('/src/client/assets/generated/reboot-meta-title-wordmarks-v1.png?v=meta-title-wordmark1')",
    "await cache.match('/src/client/assets/generated/reboot-meta-caption-plate.png?v=meta-caption1')",
    "await cache.match('/src/client/assets/generated/reboot-lobby-operation-title-plate-v1.png?v=operation-title-plate1')",
    "await cache.match('/src/client/assets/generated/reboot-meta-showcase-copy-plates.png?v=showcase-nameplate1')",
    "await cache.match('/src/client/assets/generated/reboot-collection-training-board-v1.png?v=collection-training-board1')",
    "await cache.match('/src/client/assets/generated/reboot-shop-display-board-v1.png?v=shop-display-board1')",
    "await cache.match('/src/client/assets/generated/reboot-shop-banner-v2.png?v=shop-banner2')",
    "await cache.match('/src/client/assets/generated/reboot-mission-command-board-v1.png?v=mission-command-board1')",
    "await cache.match('/src/client/assets/generated/reboot-season-reward-board-v1.png?v=season-reward-board1')",
    "await cache.match('/src/client/assets/generated/reboot-meta-objective-rails.png?v=objective-rails1')",
    "await cache.match('/src/client/assets/generated/reboot-meta-objective-command-slots-v1.png?v=objective-slots1')",
    "await cache.match('/src/client/assets/generated/reboot-lobby-launch-bay.png?v=lobby-launch-bay1')",
    "await cache.match('/src/client/assets/generated/reboot-lobby-coop-diorama-preview.jpg?v=lobby-coop-diorama-preview1')",
    "await cache.match('/src/client/assets/generated/reboot-lobby-operation-progress-rail.png?v=operation-progress1')",
    "await cache.match('/src/client/assets/generated/reboot-lobby-intel-strips.png?v=intel-strips-alpha1')",
    "await cache.match('/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3')",
    "await cache.match('/src/client/assets/generated/reboot-unit-atlas.png')",
    "await cache.match('/src/client/assets/generated/reboot-player-board-tray.png?v=player-tray')",
    "await cache.match('/src/client/assets/generated/reboot-unit-activation-ring.png?v=unit-activation-ring1')",
    "await cache.match('/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2')",
    "await cache.match('/src/client/assets/generated/reboot-splash-season-badge-v1.png?v=splash-season-badge1')",
    "await cache.match('/src/client/assets/generated/reboot-combat-operation-badge-v1.png?v=combat-op-badge1')",
    "await cache.match('/src/client/assets/generated/reboot-partner-standby-sigils-v2.png?v=partner-standby2')",
    "await cache.match('/src/client/assets/generated/reboot-online-waiting-field-v1.png?v=online-wait-field1')",
    "await cache.match('/src/client/assets/generated/reboot-combat-moment-callouts.png?v=moment-callouts1')",
    'await verifyInstallableShell(page);'
  ]) {
    assert.equal(qa.includes(marker), true, marker);
  }
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v91'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v124'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v125'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v126'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v127'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v128'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v129'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v130'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v107'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v105'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v104'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v103'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v102'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v101'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v100'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v90'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v89'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v88'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v87'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v86'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v85'"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=partner-standby2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=partner-ready1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=route-core1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_preload.js?v=partner-standby2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=battle-backdrop-v2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=objective-focus1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=objective-stamps1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=defense-pressure1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=shelf-select1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=shelf-select1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_result_ui.js?v=result-ui2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=shelf-select1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/assets/generated/reboot-lobby-coop-diorama.png?v=lobby-coop-diorama1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=objective-stamps1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_preload.js?v=battle-backdrop-v2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_render.js?v=battle-backdrop-v2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_render.js?v=first-payoff1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_render.js?v=partner-ready1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_render.js?v=route-core1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=objective-focus1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=objective-stamps1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=objective-slots1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=mission-season-rails1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_render.js?v=partner-standby2')"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v106'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v84'"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=meta-unified-board1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=result-reward-board1')"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v26'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v78'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v77'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v76'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v75'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v74'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v73'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v72'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v71'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v70'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v69'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v68'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v67'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v66'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v65'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v64'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v63'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v32'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v31'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v30'"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=shop-title1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=hud-meter1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=shop-banner2')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=hero-squad2')"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v25'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v24'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v23'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v22'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v21'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v20'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v19'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v18'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v17'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v16'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v15'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v14'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v13'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v12'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v11'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v10'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v9'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v6'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v5'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v4'"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=combat-meter1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=online-ready-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=lobby-focus1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=hud-meter1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=shop-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=reward-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=result-home1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=pending-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=shop-chips1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_hud.js?v=hud-meter1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_hud.js?v=shop-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_hud.js?v=reward-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_hud.js?v=result-home1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_hud.js?v=pending-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_hud.js?v=shop-chips1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=lobby-focus1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=board-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=result-goal1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=shop-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=reward-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=result-home1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=pending-copy1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=shop-chips1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=boss-vitality1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_actions.js?v=merge-reason1')"), false);
});
