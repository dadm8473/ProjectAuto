const CACHE_NAME = 'projectauto-reboot-shell-v119';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/client/styles.css?v=objective-route1',
  '/src/client/app.js?v=moment-scenes1',
  '/src/client/reboot_audio.js?v=audio-safe1',
  '/src/client/reboot_actions.js?v=combat-meter2',
  '/src/client/reboot_action_ui.js?v=hud-meter1',
  '/src/client/reboot_hud.js?v=board-copy1',
  '/src/client/reboot_playtest.js?v=playtest2',
  '/src/client/reboot_preload.js?v=lobby-defer1',
  '/src/client/reboot_render.js?v=moment-scenes1',
  '/src/client/reboot_result_ui.js?v=result-hook1',
  '/src/client/reboot_screens.js?v=objective-route1',
  '/src/client/reboot_online.js',
  '/src/shared/game.js?v=retry-context1',
  '/src/shared/reboot_game.js?v=retry-context1',
  '/src/shared/content.js',
  '/src/shared/meta.js',
  '/src/shared/reboot_content.js',
  '/src/shared/reboot_content.js?v=unit-roster1',
  '/src/client/assets/generated/reboot-app-icon-192.png',
  '/src/client/assets/generated/reboot-app-icon-512.png',
  '/src/client/assets/generated/reboot-sound-toggle.png?v=sound-toggle1',
  '/src/client/assets/generated/reboot-title-wordmark-v1.png?v=title-wordmark1',
  '/src/client/assets/generated/reboot-result-title-won-v1.png?v=result-title2',
  '/src/client/assets/generated/reboot-result-title-lost-v1.png?v=result-title2',
  '/src/client/assets/generated/reboot-meta-title-wordmarks-v1.png?v=meta-title-wordmark1',
  '/src/client/assets/generated/reboot-meta-caption-plate.png?v=meta-caption1',
  '/src/client/assets/generated/reboot-app-shell-backdrop.png',
  '/src/client/assets/generated/reboot-app-shell-backdrop.png?v=shell-backdrop1',
  '/src/client/assets/generated/reboot-collection-training-board-v1.png?v=collection-training-board1',
  '/src/client/assets/generated/reboot-shop-display-board-v1.png?v=shop-display-board1',
  '/src/client/assets/generated/reboot-shop-banner-v2.png?v=shop-banner2',
  '/src/client/assets/generated/reboot-mission-command-board-v1.png?v=mission-command-board1',
  '/src/client/assets/generated/reboot-season-reward-board-v1.png?v=season-reward-board1',
  '/src/client/assets/generated/reboot-meta-objective-command-slots-v1.png?v=objective-slots1',
  '/src/client/assets/generated/reboot-title-emblem.png',
  '/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2',
  '/src/client/assets/generated/reboot-splash-title-plate.png?v=splash-title',
  '/src/client/assets/generated/reboot-splash-season-badge-v1.png?v=splash-season-badge1',
  '/src/client/assets/generated/reboot-splash-bottom-deck.png?v=splash-bottom-deck2',
  '/src/client/assets/generated/reboot-lobby-backdrop.png',
  '/src/client/assets/generated/reboot-meta-screen-lighting.png?v=screen-lighting1',
  '/src/client/assets/generated/reboot-meta-lower-console.png?v=meta-lower-console2',
  '/src/client/assets/generated/reboot-meta-showcase-copy-plates.png?v=showcase-nameplate1',
  '/src/client/assets/generated/reboot-meta-shelf-nameplates-v1.png?v=meta-shelf-nameplates1',
  '/src/client/assets/generated/reboot-result-screen-lighting.png?v=screen-lighting1',
  '/src/client/assets/generated/reboot-result-reward-board-v1.png?v=result-reward-board1',
  '/src/client/assets/generated/reboot-result-command-board-v1.png?v=result-command-board1',
  '/src/client/assets/generated/reboot-reward-reveal-payoff-stage.png?v=reward-payoff-stage1',
  '/src/client/assets/generated/reboot-lobby-coop-diorama-preview.jpg?v=lobby-coop-diorama-preview1',
  '/src/client/assets/generated/reboot-lobby-operation-title-plate-v1.png?v=operation-title-plate1',
  '/src/client/assets/generated/reboot-lobby-operation-progress-rail.png?v=operation-progress1',
  '/src/client/assets/generated/reboot-lobby-intel-strips.png?v=intel-strips-alpha1',
  '/src/client/assets/generated/reboot-lobby-launch-bay.png?v=lobby-launch-bay1',
  '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta-alpha1',
  '/src/client/assets/generated/reboot-launch-secondary.png?v=gold-cta-alpha1',
  '/src/client/assets/generated/reboot-unit-atlas.png',
  '/src/client/assets/generated/reboot-screen-chrome.png',
  '/src/client/assets/generated/reboot-nav-icons.png',
  '/src/client/assets/generated/reboot-nav-button-glow.png?v=nav-selector1',
  '/src/client/assets/generated/reboot-nav-alert-badges.png?v=nav-alerts',
  '/src/client/assets/generated/reboot-battle-backdrop-v2.png?v=battle-backdrop-v2',
  '/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3',
  '/src/client/assets/generated/reboot-combat-hud-frame.png',
  '/src/client/assets/generated/reboot-combat-operation-badge-v1.png?v=combat-op-badge1',
  '/src/client/assets/generated/reboot-combat-meter-sockets-v2.png?v=meter-sockets-v2',
  '/src/client/assets/generated/reboot-partner-standby-sigils-v2.png?v=partner-standby2',
  '/src/client/assets/generated/reboot-online-waiting-field-v1.png?v=online-wait-field1',
  '/src/client/assets/generated/reboot-combat-moment-callouts.png?v=moment-callouts1',
  '/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1',
  '/src/client/assets/generated/reboot-player-board-tray.png?v=player-tray',
  '/src/client/assets/generated/reboot-unit-activation-ring.png?v=unit-activation-ring1',
  '/src/client/assets/generated/reboot-player-board-bridge.png?v=player-board-bridge1'
];

function cacheableSameOrigin(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.pathname === '/ws' || url.pathname === '/sw.js') return false;
  return url.origin === self.location.origin;
}

async function cacheFirst(request) {
  let cached = null;
  try {
    cached = await caches.match(request);
  } catch {}
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    caches.open(CACHE_NAME)
      .then((cache) => cache.put(request, response.clone()))
      .catch(() => {});
  }
  return response;
}

async function networkFirstDocument(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      caches.open(CACHE_NAME)
        .then((cache) => cache.put('/index.html', response.clone()))
        .catch(() => {});
    }
    return response;
  } catch {
    return caches.match('/index.html').catch(() => Response.error());
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => {
        self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('projectauto-reboot-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => {
        self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!cacheableSameOrigin(request)) return;

  const url = new URL(request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (
    url.pathname === '/manifest.webmanifest'
    || url.pathname.startsWith('/src/')
    || url.pathname.startsWith('/server/')
  ) {
    event.respondWith(cacheFirst(request));
  }
});
