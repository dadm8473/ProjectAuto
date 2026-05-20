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
    "const CACHE_NAME = 'projectauto-reboot-shell-v49';",
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
    '/src/client/styles.css?v=coop-briefing1',
    '/src/client/app.js?v=partner-ready1',
    '/src/client/reboot_actions.js?v=combat-meter2',
    '/src/client/reboot_playtest.js?v=playtest2',
    '/src/client/reboot_render.js?v=partner-ready1',
    '/src/client/reboot_screens.js?v=partner-identity1',
    '/src/client/reboot_action_ui.js?v=danger-label2',
    '/src/client/reboot_online.js',
    '/src/shared/game.js?v=partner-identity1',
    '/src/shared/reboot_game.js?v=partner-identity1',
    '/src/shared/reboot_content.js',
    '/src/client/assets/generated/reboot-app-shell-backdrop.png',
    '/src/client/assets/generated/reboot-meta-showcase-copy-plates.png?v=showcase-nameplate1',
    '/src/client/assets/generated/reboot-shop-banner-v2.png?v=shop-banner2',
    '/src/client/assets/generated/reboot-unit-atlas.png',
    '/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3',
    '/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2',
    '/src/client/assets/generated/reboot-app-icon-192.png',
    '/src/client/assets/generated/reboot-app-icon-512.png'
  ]) {
    assert.equal(sw.includes(marker), true, marker);
  }
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
  assert.equal(sw.includes('/src/client/styles.css?v=shop-title1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=shop-banner2'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=hero-squad2'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=feature-cta1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=profile-plate1'), false);
  assert.equal(sw.includes('/src/client/styles.css?v=result-xp2'), false);
  assert.equal(sw.includes('/src/client/app.js?v=playtest-feedback1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=reward-detail1'), false);
  assert.equal(sw.includes('/src/client/reboot_playtest.js?v=playtest1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-action-label2'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-action-label1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=result-xp1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=combat-meter1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=lobby-intel1'), false);
  assert.equal(sw.includes('/src/client/app.js?v=lobby-focus1'), false);
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
    "cacheName === 'projectauto-reboot-shell-v49'",
    "await cache.match('/index.html')",
    "await cache.match('/src/client/styles.css?v=coop-briefing1')",
    "await cache.match('/src/client/app.js?v=partner-ready1')",
    "await cache.match('/src/client/reboot_actions.js?v=combat-meter2')",
    "await cache.match('/src/client/reboot_playtest.js?v=playtest2')",
    "await cache.match('/src/client/reboot_render.js?v=partner-ready1')",
    "await cache.match('/src/client/reboot_screens.js?v=partner-identity1')",
    "await cache.match('/src/shared/game.js?v=partner-identity1')",
    "await cache.match('/src/shared/reboot_game.js?v=partner-identity1')",
    "await cache.match('/src/client/reboot_action_ui.js?v=danger-label2')",
    "await cache.match('/src/client/assets/generated/reboot-app-shell-backdrop.png?v=shell-backdrop1')",
    "await cache.match('/src/client/assets/generated/reboot-meta-showcase-copy-plates.png?v=showcase-nameplate1')",
    "await cache.match('/src/client/assets/generated/reboot-shop-banner-v2.png?v=shop-banner2')",
    "await cache.match('/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3')",
    "await cache.match('/src/client/assets/generated/reboot-unit-atlas.png')",
    "await cache.match('/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2')",
    'await verifyInstallableShell(page);'
  ]) {
    assert.equal(qa.includes(marker), true, marker);
  }
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v26'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v32'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v31'"), false);
  assert.equal(qa.includes("cacheName === 'projectauto-reboot-shell-v30'"), false);
  assert.equal(qa.includes("await cache.match('/src/client/styles.css?v=shop-title1')"), false);
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
  assert.equal(qa.includes("await cache.match('/src/client/app.js?v=lobby-focus1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=lobby-focus1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_screens.js?v=boss-vitality1')"), false);
  assert.equal(qa.includes("await cache.match('/src/client/reboot_actions.js?v=merge-reason1')"), false);
});
