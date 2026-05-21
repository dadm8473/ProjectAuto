import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { CRITICAL_REBOOT_ASSETS, preloadCriticalRebootAssets } from '../src/client/reboot_preload.js';

test('critical reboot preload list starts with generated game identity and first-play assets', () => {
  const required = [
    '/src/client/assets/generated/reboot-app-icon-192.png',
    '/src/client/assets/generated/reboot-sound-toggle.png?v=sound-toggle1',
    '/src/client/assets/generated/reboot-title-emblem.png',
    '/src/client/assets/generated/reboot-title-wordmark-v1.png?v=title-wordmark1',
    '/src/client/assets/generated/reboot-meta-caption-plate.png?v=meta-caption1',
    '/src/client/assets/generated/reboot-hero-squad-v2.png?v=hero-squad-v2',
    '/src/client/assets/generated/reboot-splash-title-plate.png?v=splash-title',
    '/src/client/assets/generated/reboot-lobby-backdrop.png',
    '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta-alpha1',
    '/src/client/assets/generated/reboot-unit-atlas.png',
    '/src/client/assets/generated/reboot-battle-backdrop.png?v=reboot-action-ready1',
    '/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3',
    '/src/client/assets/generated/reboot-combat-hud-frame.png',
    '/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1',
    '/src/client/assets/generated/reboot-player-board-bridge.png?v=player-board-bridge1'
  ];

  for (const asset of required) {
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(asset), true, asset);
  }

  assert.equal(CRITICAL_REBOOT_ASSETS.every((asset) => asset.startsWith('/src/client/assets/generated/')), true);
});

test('critical reboot preload includes generated lobby navigation dock assets', () => {
  const required = [
    '/src/client/assets/generated/reboot-screen-chrome.png',
    '/src/client/assets/generated/reboot-nav-icons.png',
    '/src/client/assets/generated/reboot-nav-button-glow.png?v=nav-selector1',
    '/src/client/assets/generated/reboot-nav-alert-badges.png?v=nav-alerts'
  ];

  for (const asset of required) {
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(asset), true, asset);
  }
});

test('critical reboot preload includes generated meta and result screen lighting mattes', () => {
  const required = [
    '/src/client/assets/generated/reboot-app-shell-backdrop.png?v=shell-backdrop1',
    '/src/client/assets/generated/reboot-meta-screen-lighting.png?v=screen-lighting1',
    '/src/client/assets/generated/reboot-result-screen-lighting.png?v=screen-lighting1'
  ];

  for (const asset of required) {
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(asset), true, asset);
  }

  assert.equal(CRITICAL_REBOOT_ASSETS.some((asset) => asset.includes('reboot-result-title-')), false);
});

test('critical reboot preload includes generated reward and meta polish overlays', () => {
  const required = [
    '/src/client/assets/generated/reboot-reward-reveal-payoff-stage.png?v=reward-payoff-stage1',
    '/src/client/assets/generated/reboot-meta-lower-console.png?v=meta-lower-console2'
  ];

  for (const asset of required) {
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(asset), true, asset);
  }
});

test('critical reboot preload follows generated polish css asset urls', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const variables = [
    '--reward-reveal-payoff-stage',
    '--meta-lower-console',
    '--meta-caption-plate'
  ];

  for (const variable of variables) {
    const match = css.match(new RegExp(`${variable}: url\\("([^"]+)"\\)`));
    assert.notEqual(match, null, variable);
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(match[1]), true, match[1]);
  }
});

test('critical reboot preload entries point to committed generated assets', async () => {
  for (const asset of CRITICAL_REBOOT_ASSETS) {
    const pathname = asset.slice(1).split('?')[0];
    await access(pathname);
  }
});

test('preloadCriticalRebootAssets resolves after loading every requested image', async () => {
  const requested = [];

  class FakeImage {
    set src(value) {
      requested.push(value);
      queueMicrotask(() => this.onload?.());
    }
  }

  const result = await preloadCriticalRebootAssets({
    ImageCtor: FakeImage,
    assets: ['/a.png', '/b.png'],
    timeoutMs: 100
  });

  assert.deepEqual(requested, ['/a.png', '/b.png']);
  assert.deepEqual(result, { loaded: 2, failed: 0, total: 2 });
});

test('preloadCriticalRebootAssets degrades gracefully when an image fails', async () => {
  class FakeImage {
    set src(value) {
      queueMicrotask(() => {
        if (value.includes('broken')) this.onerror?.(new Error('missing asset'));
        else this.onload?.();
      });
    }
  }

  const result = await preloadCriticalRebootAssets({
    ImageCtor: FakeImage,
    assets: ['/ok.png', '/broken.png'],
    timeoutMs: 100
  });

  assert.deepEqual(result, { loaded: 1, failed: 1, total: 2 });
});
