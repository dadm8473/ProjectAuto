const CACHE_NAME = 'projectauto-reboot-shell-v20';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/client/styles.css?v=result-xp2',
  '/src/client/app.js?v=result-xp1',
  '/src/client/reboot_actions.js?v=combat-meter2',
  '/src/client/reboot_action_ui.js?v=action-simplify1',
  '/src/client/reboot_playtest.js?v=playtest1',
  '/src/client/reboot_preload.js?v=shell-backdrop1',
  '/src/client/reboot_render.js?v=opening-route1',
  '/src/client/reboot_screens.js?v=lobby-profile2',
  '/src/client/reboot_online.js',
  '/src/shared/game.js?v=boss-vitality1',
  '/src/shared/reboot_game.js?v=boss-vitality1',
  '/src/shared/content.js',
  '/src/shared/meta.js',
  '/src/shared/reboot_content.js',
  '/src/shared/reboot_content.js?v=unit-roster1',
  '/src/client/assets/generated/reboot-app-icon-192.png',
  '/src/client/assets/generated/reboot-app-icon-512.png',
  '/src/client/assets/generated/reboot-app-shell-backdrop.png',
  '/src/client/assets/generated/reboot-app-shell-backdrop.png?v=shell-backdrop1',
  '/src/client/assets/generated/reboot-title-emblem.png',
  '/src/client/assets/generated/reboot-hero-squad.png',
  '/src/client/assets/generated/reboot-splash-title-plate.png?v=splash-title',
  '/src/client/assets/generated/reboot-splash-bottom-deck.png?v=splash-bottom-deck2',
  '/src/client/assets/generated/reboot-lobby-backdrop.png',
  '/src/client/assets/generated/reboot-meta-screen-lighting.png?v=screen-lighting1',
  '/src/client/assets/generated/reboot-meta-lower-console.png?v=meta-lower-console2',
  '/src/client/assets/generated/reboot-result-screen-lighting.png?v=screen-lighting1',
  '/src/client/assets/generated/reboot-reward-reveal-payoff-stage.png?v=reward-payoff-stage1',
  '/src/client/assets/generated/reboot-lobby-operation-posters.png?v=operation-posters1',
  '/src/client/assets/generated/reboot-lobby-launch-console.png?v=launch-console1',
  '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta-alpha1',
  '/src/client/assets/generated/reboot-launch-secondary.png?v=gold-cta-alpha1',
  '/src/client/assets/generated/reboot-screen-chrome.png',
  '/src/client/assets/generated/reboot-nav-icons.png',
  '/src/client/assets/generated/reboot-nav-button-glow.png?v=nav-selector1',
  '/src/client/assets/generated/reboot-nav-alert-badges.png?v=nav-alerts',
  '/src/client/assets/generated/reboot-battle-backdrop.png?v=reboot-action-ready1',
  '/src/client/assets/generated/reboot-combat-hud-frame.png',
  '/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1',
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
