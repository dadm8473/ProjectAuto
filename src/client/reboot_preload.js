export const CRITICAL_REBOOT_ASSETS = [
  '/src/client/assets/generated/reboot-app-icon-192.png',
  '/src/client/assets/generated/reboot-sound-toggle.png?v=sound-toggle1',
  '/src/client/assets/generated/reboot-title-emblem.png',
  '/src/client/assets/generated/reboot-title-wordmark-v1.png?v=title-wordmark1',
  '/src/client/assets/generated/reboot-meta-caption-plate.png?v=meta-caption1',
  '/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2',
  '/src/client/assets/generated/reboot-splash-title-plate.png?v=splash-title',
  '/src/client/assets/generated/reboot-splash-season-badge-v1.png?v=splash-season-badge1',
  '/src/client/assets/generated/reboot-splash-bottom-deck.png?v=splash-bottom-deck2',
  '/src/client/assets/generated/reboot-lobby-backdrop.png',
  '/src/client/assets/generated/reboot-app-shell-backdrop.png?v=shell-backdrop1',
  '/src/client/assets/generated/reboot-lobby-operation-posters.png?v=operation-posters1',
  '/src/client/assets/generated/reboot-lobby-operation-title-plate-v1.png?v=operation-title-plate1',
  '/src/client/assets/generated/reboot-lobby-launch-bay.png?v=lobby-launch-bay1',
  '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta-alpha1',
  '/src/client/assets/generated/reboot-launch-secondary.png?v=gold-cta-alpha1',
  '/src/client/assets/generated/reboot-screen-chrome.png',
  '/src/client/assets/generated/reboot-nav-icons.png',
  '/src/client/assets/generated/reboot-nav-button-glow.png?v=nav-selector1',
  '/src/client/assets/generated/reboot-nav-alert-badges.png?v=nav-alerts'
];

export const REBOOT_WARMUP_ASSETS = [
  '/src/client/assets/generated/reboot-meta-title-wordmarks-v1.png?v=meta-title-wordmark1',
  '/src/client/assets/generated/reboot-meta-screen-lighting.png?v=screen-lighting1',
  '/src/client/assets/generated/reboot-meta-lower-console.png?v=meta-lower-console2',
  '/src/client/assets/generated/reboot-result-screen-lighting.png?v=screen-lighting1',
  '/src/client/assets/generated/reboot-reward-reveal-payoff-stage.png?v=reward-payoff-stage1',
  '/src/client/assets/generated/reboot-mission-command-board-v1.png?v=mission-command-board1',
  '/src/client/assets/generated/reboot-lobby-operation-progress-rail.png?v=operation-progress1',
  '/src/client/assets/generated/reboot-lobby-intel-strips.png?v=intel-strips-alpha1',
  '/src/client/assets/generated/reboot-unit-atlas.png',
  '/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3',
  '/src/client/assets/generated/reboot-battle-backdrop.png?v=reboot-action-ready1',
  '/src/client/assets/generated/reboot-combat-hud-frame.png',
  '/src/client/assets/generated/reboot-combat-operation-badge-v1.png?v=combat-op-badge1',
  '/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1',
  '/src/client/assets/generated/reboot-player-board-bridge.png?v=player-board-bridge1'
];

function preloadOneImage(src, ImageCtor, timeoutMs) {
  return new Promise((resolve) => {
    const image = new ImageCtor();
    let settled = false;
    const settle = (status) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(status);
    };
    const timeout = setTimeout(() => settle('failed'), timeoutMs);

    image.onload = () => settle('loaded');
    image.onerror = () => settle('failed');
    image.decoding = 'async';
    image.src = src;
    if (image.complete) settle('loaded');
  });
}

export async function preloadCriticalRebootAssets({
  ImageCtor = globalThis.Image,
  assets = CRITICAL_REBOOT_ASSETS,
  timeoutMs = 2400
} = {}) {
  if (!ImageCtor) return { loaded: 0, failed: assets.length, total: assets.length };

  const results = await Promise.all(
    assets.map((asset) => preloadOneImage(asset, ImageCtor, timeoutMs))
  );
  return {
    loaded: results.filter((status) => status === 'loaded').length,
    failed: results.filter((status) => status !== 'loaded').length,
    total: assets.length
  };
}

export async function warmRebootAssets({
  ImageCtor = globalThis.Image,
  assets = REBOOT_WARMUP_ASSETS,
  timeoutMs = 3200
} = {}) {
  return preloadCriticalRebootAssets({ ImageCtor, assets, timeoutMs });
}
