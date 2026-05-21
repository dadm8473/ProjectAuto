import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import * as rebootPreload from '../src/client/reboot_preload.js';

const {
  CRITICAL_REBOOT_ASSETS,
  preloadCriticalRebootAssets
} = rebootPreload;

const REBOOT_WARMUP_ASSETS = rebootPreload.REBOOT_WARMUP_ASSETS ?? [];
const warmRebootAssets = rebootPreload.warmRebootAssets ?? (async () => ({ loaded: 0, failed: 0, total: 0 }));

test('critical reboot preload blocks only first-paint splash and lobby assets', () => {
  const required = [
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
    '/src/client/assets/generated/reboot-lobby-operation-title-plate-v1.png?v=operation-title-plate1',
    '/src/client/assets/generated/reboot-lobby-launch-bay.png?v=lobby-launch-bay1',
    '/src/client/assets/generated/reboot-launch-primary.png?v=gold-cta-alpha1',
    '/src/client/assets/generated/reboot-launch-secondary.png?v=gold-cta-alpha1',
    '/src/client/assets/generated/reboot-screen-chrome.png',
    '/src/client/assets/generated/reboot-nav-icons.png'
  ];

  for (const asset of required) {
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(asset), true, asset);
  }

  for (const deferred of [
    '/src/client/assets/generated/reboot-mission-command-board-v1.png?v=mission-command-board1',
    '/src/client/assets/generated/reboot-battle-backdrop-v2.png?v=battle-backdrop-v2',
    '/src/client/assets/generated/reboot-meta-objective-command-slots-v1.png?v=objective-slots1',
    '/src/client/assets/generated/reboot-partner-standby-sigils-v2.png?v=partner-standby2',
    '/src/client/assets/generated/reboot-online-waiting-field-v1.png?v=online-wait-field1',
    '/src/client/assets/generated/reboot-result-screen-lighting.png?v=screen-lighting1',
    '/src/client/assets/generated/reboot-result-reward-board-v1.png?v=result-reward-board1',
    '/src/client/assets/generated/reboot-result-command-board-v1.png?v=result-command-board1',
    '/src/client/assets/generated/reboot-meta-shelf-nameplates-v1.png?v=meta-shelf-nameplates1',
    '/src/client/assets/generated/reboot-meta-title-wordmarks-v1.png?v=meta-title-wordmark1',
    '/src/client/assets/generated/reboot-collection-training-board-v1.png?v=collection-training-board1',
    '/src/client/assets/generated/reboot-shop-display-board-v1.png?v=shop-display-board1'
  ]) {
    assert.equal(CRITICAL_REBOOT_ASSETS.includes(deferred), false, `${deferred} should be staged after first paint`);
  }

  assert.equal(CRITICAL_REBOOT_ASSETS.length <= 20, true, `critical preload is too heavy: ${CRITICAL_REBOOT_ASSETS.length}`);
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

test('warmup preload includes generated meta combat mission and result assets', () => {
  const required = [
    '/src/client/assets/generated/reboot-meta-title-wordmarks-v1.png?v=meta-title-wordmark1',
    '/src/client/assets/generated/reboot-meta-screen-lighting.png?v=screen-lighting1',
    '/src/client/assets/generated/reboot-result-screen-lighting.png?v=screen-lighting1',
    '/src/client/assets/generated/reboot-result-reward-board-v1.png?v=result-reward-board1',
    '/src/client/assets/generated/reboot-result-command-board-v1.png?v=result-command-board1',
    '/src/client/assets/generated/reboot-meta-shelf-nameplates-v1.png?v=meta-shelf-nameplates1',
    '/src/client/assets/generated/reboot-reward-reveal-payoff-stage.png?v=reward-payoff-stage1',
    '/src/client/assets/generated/reboot-collection-training-board-v1.png?v=collection-training-board1',
    '/src/client/assets/generated/reboot-shop-display-board-v1.png?v=shop-display-board1',
    '/src/client/assets/generated/reboot-mission-command-board-v1.png?v=mission-command-board1',
    '/src/client/assets/generated/reboot-season-reward-board-v1.png?v=season-reward-board1',
    '/src/client/assets/generated/reboot-meta-objective-command-slots-v1.png?v=objective-slots1',
    '/src/client/assets/generated/reboot-meta-lower-console.png?v=meta-lower-console2',
    '/src/client/assets/generated/reboot-battle-backdrop-v2.png?v=battle-backdrop-v2',
    '/src/client/assets/generated/reboot-combat-operation-badge-v1.png?v=combat-op-badge1',
    '/src/client/assets/generated/reboot-combat-meter-sockets-v2.png?v=meter-sockets-v2',
    '/src/client/assets/generated/reboot-partner-standby-sigils-v2.png?v=partner-standby2',
    '/src/client/assets/generated/reboot-online-waiting-field-v1.png?v=online-wait-field1',
    '/src/client/assets/generated/reboot-combat-action-dock.png?v=command-console1'
  ];

  for (const asset of required) {
    assert.equal(REBOOT_WARMUP_ASSETS.includes(asset), true, asset);
  }

  const overlap = CRITICAL_REBOOT_ASSETS.filter((asset) => REBOOT_WARMUP_ASSETS.includes(asset));
  assert.deepEqual(overlap, []);
});

test('critical reboot preload follows generated polish css asset urls', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  const variables = [
    '--reward-reveal-payoff-stage',
    '--meta-lower-console',
    '--splash-season-badge',
    '--combat-operation-badge',
    '--combat-meter-sockets',
    '--collection-training-board',
    '--shop-display-board',
    '--mission-command-board',
    '--season-reward-board',
    '--meta-objective-command-slots',
    '--lobby-operation-title-plate',
    '--meta-title-wordmarks',
    '--meta-caption-plate',
    '--meta-shelf-nameplates',
    '--result-reward-board',
    '--result-command-board'
  ];

  for (const variable of variables) {
    const match = css.match(new RegExp(`${variable}: url\\("([^"]+)"\\)`));
    assert.notEqual(match, null, variable);
    assert.equal([...CRITICAL_REBOOT_ASSETS, ...REBOOT_WARMUP_ASSETS].includes(match[1]), true, match[1]);
  }
});

test('critical reboot preload entries point to committed generated assets', async () => {
  for (const asset of [...CRITICAL_REBOOT_ASSETS, ...REBOOT_WARMUP_ASSETS]) {
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

test('warmRebootAssets preloads staged assets without blocking critical preload', async () => {
  const requested = [];

  class FakeImage {
    set src(value) {
      requested.push(value);
      queueMicrotask(() => this.onload?.());
    }
  }

  const result = await warmRebootAssets({
    ImageCtor: FakeImage,
    assets: ['/warm-a.png', '/warm-b.png'],
    timeoutMs: 100
  });

  assert.deepEqual(requested, ['/warm-a.png', '/warm-b.png']);
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
