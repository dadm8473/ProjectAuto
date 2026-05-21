import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

import { NOISE_TYPES } from '../src/shared/content.js';

const GENERATED_ASSETS = [
  'src/client/assets/generated/signal-relay-playfield-frame.png',
  'src/client/assets/generated/noise-enemy-atlas.png',
  'src/client/assets/generated/noise-world-sprites.png',
  'src/client/assets/generated/relay-world-sprites.png',
  'src/client/assets/generated/boss-disruption-atlas.png',
  'src/client/assets/generated/ui-icon-atlas.png'
];

const GRID_ASSETS = [
  { path: 'src/client/assets/generated/noise-enemy-atlas.png', columns: 4, rows: 2 },
  { path: 'src/client/assets/generated/noise-world-sprites.png', columns: 4, rows: 2 },
  { path: 'src/client/assets/generated/relay-world-sprites.png', columns: 4, rows: 5 },
  { path: 'src/client/assets/generated/boss-disruption-atlas.png', columns: 3, rows: 1 },
  { path: 'src/client/assets/generated/ui-icon-atlas.png', columns: 4, rows: 3 }
];

const REBOOT_GRID_ASSETS = [
  { path: 'src/client/assets/generated/reboot-unit-atlas.png', width: 2048, height: 256, columns: 8, rows: 1 },
  { path: 'src/client/assets/generated/reboot-enemy-atlas-v3.png', width: 1024, height: 256, columns: 4, rows: 1 },
  { path: 'src/client/assets/generated/reboot-ui-icons.png', width: 1536, height: 256, columns: 6, rows: 1 },
  { path: 'src/client/assets/generated/reboot-reward-icons.png', width: 1024, height: 256, columns: 4, rows: 1 },
  { path: 'src/client/assets/generated/reboot-result-badges.png', width: 1024, height: 256, columns: 4, rows: 1 },
  { path: 'src/client/assets/generated/reboot-board-accents.png', width: 1280, height: 256, columns: 5, rows: 1 },
  { path: 'src/client/assets/generated/reboot-screen-chrome.png', width: 1280, height: 256, columns: 5, rows: 1 },
  { path: 'src/client/assets/generated/reboot-combat-vfx.png', width: 1280, height: 256, columns: 5, rows: 1 },
  { path: 'src/client/assets/generated/reboot-nav-icons.png', width: 1280, height: 256, columns: 5, rows: 1 },
  { path: 'src/client/assets/generated/reboot-reward-burst.png', width: 1024, height: 256, columns: 4, rows: 1 },
  { path: 'src/client/assets/generated/reboot-shop-cosmetics.png', width: 480, height: 96, columns: 5, rows: 1 }
];

const IMAGEGEN_REBOOT_BACKDROPS = [
  { path: 'src/client/assets/generated/reboot-battle-backdrop.png', width: 390, height: 620 },
  { path: 'src/client/assets/generated/reboot-lobby-backdrop.png', width: 430, height: 932 },
  { path: 'src/client/assets/generated/reboot-meta-backdrop.png', width: 430, height: 932 },
  { path: 'src/client/assets/generated/reboot-result-backdrop.png', width: 430, height: 932 }
];

const IMAGEGEN_REBOOT_OVERLAYS = [
  {
    path: 'src/client/assets/generated/reboot-title-emblem.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-title-emblem-imagegen.png',
    width: 512,
    height: 256,
    minRuntimeBytes: 30_000
  },
  {
    path: 'src/client/assets/generated/reboot-title-wordmark-v1.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260519-title-wordmark-v1-chromakey-imagegen.png',
    width: 1920,
    height: 819,
    minRuntimeBytes: 900_000
  },
  {
    path: 'src/client/assets/generated/reboot-hero-squad-v2.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260519-hero-squad-v2-imagegen.png',
    width: 640,
    height: 512,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-sound-toggle.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260520-sound-toggle-imagegen.png',
    width: 256,
    height: 256,
    minRuntimeBytes: 60_000
  }
];

const IMAGEGEN_REBOOT_UI_SCENES = [
  {
    path: 'src/client/assets/generated/reboot-lobby-operation-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-lobby-operation-banner-imagegen.png',
    width: 430,
    height: 180,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-operation-poster.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-lobby-operation-poster-imagegen.png',
    width: 430,
    height: 184,
    minRuntimeBytes: 100_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-operation-posters.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-lobby-operation-posters-imagegen.png',
    width: 1720,
    height: 184,
    minRuntimeBytes: 240_000
  },
  {
    path: 'src/client/assets/generated/reboot-splash-bottom-deck.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-splash-bottom-deck-imagegen.png',
    width: 430,
    height: 270,
    minRuntimeBytes: 120_000
  },
  {
    path: 'src/client/assets/generated/reboot-training-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-training-banner-imagegen.png',
    width: 430,
    height: 160,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-shop-banner-v2.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260519-shop-banner-v2-imagegen.png',
    width: 430,
    height: 160,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-showcase-stage.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-meta-backdrop-imagegen.png',
    width: 430,
    height: 160,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-missions-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-missions-banner-imagegen.png',
    width: 430,
    height: 160,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-season-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-season-banner-imagegen.png',
    width: 430,
    height: 160,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-boss-cutin.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-boss-cutin-imagegen.png',
    width: 390,
    height: 128,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-rescue-cutin.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-rescue-cutin-imagegen.png',
    width: 390,
    height: 112,
    minRuntimeBytes: 60_000
  },
  {
    path: 'src/client/assets/generated/reboot-dual-crisis-cutin.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-dual-crisis-cutin-imagegen.png',
    width: 390,
    height: 128,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-start-cutin.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-start-cutin-chromakey-imagegen.png',
    width: 390,
    height: 112,
    minRuntimeBytes: 50_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-hud-frame.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-shell-chrome-imagegen.png',
    width: 430,
    height: 96,
    minRuntimeBytes: 60_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-action-dock.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-shell-chrome-imagegen.png',
    width: 430,
    height: 128,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-first-command-dock.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-combat-first-command-dock-chromakey-imagegen.png',
    width: 390,
    height: 150,
    minRuntimeBytes: 55_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-command-console-v2.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260517-combat-command-console-v2-chromakey-imagegen.png',
    width: 1024,
    height: 384,
    minRuntimeBytes: 480_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-meter-sockets.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-meter-sockets-imagegen.png',
    width: 768,
    height: 96,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-status-plates.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-status-plates-imagegen.png',
    width: 780,
    height: 80,
    minRuntimeBytes: 40_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-directive-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-combat-directive-banner-chromakey-imagegen.png',
    width: 780,
    height: 112,
    minRuntimeBytes: 40_000
  },
  {
    path: 'src/client/assets/generated/reboot-online-matchmaking-panels.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-online-matchmaking-panels-imagegen.png',
    width: 1170,
    height: 144,
    minRuntimeBytes: 60_000
  },
  {
    path: 'src/client/assets/generated/reboot-online-partner-link.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-online-partner-link-readable-imagegen.png',
    width: 1170,
    height: 144,
    minRuntimeBytes: 150_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-action-buttons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-action-buttons-imagegen.png',
    width: 1170,
    height: 112,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-locked-sockets.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-combat-locked-sockets-chromakey-imagegen.png',
    width: 768,
    height: 256,
    minRuntimeBytes: 120_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-cooldown-shutters.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-combat-cooldown-shutters-chromakey-imagegen.png',
    width: 1170,
    height: 112,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-panel-frame.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-panel-frame-imagegen.png',
    width: 390,
    height: 560,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-action-buttons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-action-buttons-imagegen.png',
    width: 780,
    height: 96,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-detail-strips.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-detail-strips-imagegen.png',
    width: 780,
    height: 80,
    minRuntimeBytes: 30_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-reward-capsules.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-result-reward-capsules-chromakey-imagegen.png',
    width: 2048,
    height: 768,
    minRuntimeBytes: 500_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-copy-plates.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-copy-plates-imagegen.png',
    width: 780,
    height: 112,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-hero-stage.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-result-hero-stage-imagegen.png',
    width: 780,
    height: 180,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-screen-lighting.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260518-meta-screen-lighting-imagegen.png',
    width: 430,
    height: 932,
    minRuntimeBytes: 260_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-screen-lighting.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260518-result-screen-lighting-imagegen.png',
    width: 430,
    height: 932,
    minRuntimeBytes: 300_000
  },
  {
    path: 'src/client/assets/generated/reboot-app-shell-backdrop.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260518-app-shell-backdrop-imagegen.png',
    width: 430,
    height: 932,
    minRuntimeBytes: 280_000
  },
  {
    path: 'src/client/assets/generated/reboot-toast-callouts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-toast-callouts-imagegen.png',
    width: 1024,
    height: 128,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-moment-callouts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-moment-callouts-imagegen.png',
    width: 1170,
    height: 144,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-crisis-overlays.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-crisis-overlays-imagegen.png',
    width: 780,
    height: 160,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-launch-buttons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-launch-buttons-imagegen.png',
    width: 860,
    height: 112,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-launch-primary.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-launch-buttons-imagegen.png',
    width: 430,
    height: 112,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-launch-secondary.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-launch-buttons-imagegen.png',
    width: 430,
    height: 112,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-launch-console.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-lobby-launch-console-chromakey-imagegen.png',
    width: 390,
    height: 150,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-launch-bay.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-lobby-launch-bay-chromakey-imagegen.png',
    width: 860,
    height: 320,
    minRuntimeBytes: 300_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-intel-strips.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-lobby-intel-strips-imagegen.png',
    width: 860,
    height: 112,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-intel-gems.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-lobby-intel-strips-imagegen.png',
    width: 430,
    height: 112,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-intel-next.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-lobby-intel-strips-imagegen.png',
    width: 430,
    height: 112,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-nav-button-glow.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-nav-selector-pads-chromakey-imagegen.png',
    width: 512,
    height: 128,
    minRuntimeBytes: 28_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-row-frames.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-row-frames-imagegen.png',
    width: 1720,
    height: 120,
    minRuntimeBytes: 120_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-mini-badges.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-mini-badges-imagegen.png',
    width: 768,
    height: 96,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-title-plate.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-title-plate-imagegen.png',
    width: 430,
    height: 96,
    minRuntimeBytes: 60_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-title-wordmarks-v1.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260521-meta-title-wordmarks-chromakey-imagegen.png',
    width: 1200,
    height: 170,
    minRuntimeBytes: 120_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-action-buttons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-action-buttons-imagegen.png',
    width: 720,
    height: 96,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-command-ribbons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-meta-command-ribbons-chromakey-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 40_000
  },
  {
    path: 'src/client/assets/generated/reboot-splash-title-plate.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-splash-title-plate-imagegen.png',
    width: 430,
    height: 184,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-splash-footer-shroud.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-splash-footer-shroud-imagegen.png',
    width: 430,
    height: 184,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-footer-shroud.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-footer-shroud-imagegen.png',
    width: 430,
    height: 184,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-lower-console.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260518-meta-lower-console-dense-imagegen.png',
    width: 430,
    height: 184,
    minRuntimeBytes: 100_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-shelf-grid.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-meta-shelf-grid-imagegen.png',
    width: 1024,
    height: 1536,
    minRuntimeBytes: 200_000,
    requiresAlpha: false
  },
  {
    path: 'src/client/assets/generated/reboot-meta-progress-board.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-meta-progress-board-imagegen.png',
    width: 1024,
    height: 1536,
    minRuntimeBytes: 200_000,
    requiresAlpha: false
  },
  {
    path: 'src/client/assets/generated/reboot-screen-transition-wipe.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-screen-transition-wipe-chromakey-imagegen.png',
    width: 430,
    height: 932,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-splash-floor-cap.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-splash-footer-shroud-imagegen.png',
    width: 260,
    height: 96,
    minRuntimeBytes: 8_000
  }
];

const IMAGEGEN_REBOOT_APP_ICONS = [
  {
    path: 'src/client/assets/generated/reboot-app-icon-192.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-app-icon-imagegen.png',
    width: 192,
    height: 192,
    minRuntimeBytes: 12_000
  },
  {
    path: 'src/client/assets/generated/reboot-app-icon-512.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-app-icon-imagegen.png',
    width: 512,
    height: 512,
    minRuntimeBytes: 40_000
  }
];

const TRANSPARENT_UI_FRAME_ASSETS = [
  {
    path: 'src/client/assets/generated/reboot-result-panel-frame.png',
    minSoftCoverage: 0.1,
    maxSoftCoverage: 0.24
  },
  {
    path: 'src/client/assets/generated/reboot-result-action-buttons.png',
    minSoftCoverage: 0.32,
    maxSoftCoverage: 0.58
  },
  {
    path: 'src/client/assets/generated/reboot-result-detail-strips.png',
    minSoftCoverage: 0.06,
    maxSoftCoverage: 0.16
  },
  {
    path: 'src/client/assets/generated/reboot-meta-row-frames.png',
    minSoftCoverage: 0.16,
    maxSoftCoverage: 0.32
  },
  {
    path: 'src/client/assets/generated/reboot-result-copy-plates.png',
    minSoftCoverage: 0.12,
    maxSoftCoverage: 0.24
  },
  {
    path: 'src/client/assets/generated/reboot-combat-action-buttons.png',
    minSoftCoverage: 0.2,
    maxSoftCoverage: 0.36
  },
  {
    path: 'src/client/assets/generated/reboot-combat-locked-sockets.png',
    minSoftCoverage: 0.18,
    maxSoftCoverage: 0.44
  },
  {
    path: 'src/client/assets/generated/reboot-combat-cooldown-shutters.png',
    minSoftCoverage: 0.18,
    maxSoftCoverage: 0.44,
    maxCornerAlpha: 24
  },
  {
    path: 'src/client/assets/generated/reboot-combat-status-plates.png',
    minSoftCoverage: 0.12,
    maxSoftCoverage: 0.24
  },
  {
    path: 'src/client/assets/generated/reboot-combat-directive-banner.png',
    minSoftCoverage: 0.42,
    maxSoftCoverage: 0.62
  },
  {
    path: 'src/client/assets/generated/reboot-meta-action-buttons.png',
    minSoftCoverage: 0.14,
    maxSoftCoverage: 0.28,
    maxCornerAlpha: 32
  },
  {
    path: 'src/client/assets/generated/reboot-meta-command-ribbons.png',
    minSoftCoverage: 0.16,
    maxSoftCoverage: 0.36,
    maxCornerAlpha: 24
  },
  {
    path: 'src/client/assets/generated/reboot-meta-mini-badges.png',
    minSoftCoverage: 0.22,
    maxSoftCoverage: 0.36
  },
  {
    path: 'src/client/assets/generated/reboot-launch-buttons.png',
    minSoftCoverage: 0.44,
    maxSoftCoverage: 0.62
  },
  {
    path: 'src/client/assets/generated/reboot-launch-primary.png',
    minSoftCoverage: 0.72,
    maxSoftCoverage: 0.88
  },
  {
    path: 'src/client/assets/generated/reboot-launch-secondary.png',
    minSoftCoverage: 0.16,
    maxSoftCoverage: 0.3
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-intel-strips.png',
    minSoftCoverage: 0.14,
    maxSoftCoverage: 0.28
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-intel-gems.png',
    minSoftCoverage: 0.15,
    maxSoftCoverage: 0.3
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-intel-next.png',
    minSoftCoverage: 0.13,
    maxSoftCoverage: 0.27
  },
  {
    path: 'src/client/assets/generated/reboot-online-matchmaking-panels.png',
    minSoftCoverage: 0.7,
    maxSoftCoverage: 0.92,
    maxCornerAlpha: 24
  },
  {
    path: 'src/client/assets/generated/reboot-online-partner-link.png',
    minSoftCoverage: 0.7,
    maxSoftCoverage: 0.82,
    maxCornerAlpha: 8
  },
  {
    path: 'src/client/assets/generated/reboot-combat-command-console-v2.png',
    minSoftCoverage: 0.68,
    maxSoftCoverage: 0.8,
    maxCornerAlpha: 8
  }
];

const IMAGEGEN_REBOOT_META_FEEDBACK = [
  {
    path: 'src/client/assets/generated/reboot-meta-claim-bursts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-claim-bursts-chromakey-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 30_000
  },
  {
    path: 'src/client/assets/generated/reboot-nav-alert-badges.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-nav-alert-badges-chromakey-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 24_000
  }
];

const IMAGEGEN_REBOOT_REWARD_REVEAL_PAYOFF_STAGE = {
  path: 'src/client/assets/generated/reboot-reward-reveal-payoff-stage.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260518-reward-reveal-payoff-stage-chromakey-imagegen.png',
  width: 430,
  height: 260,
  minRuntimeBytes: 45_000
};

const IMAGEGEN_REBOOT_OBJECTIVE_STAMPS = {
  path: 'src/client/assets/generated/reboot-meta-objective-status-stamps.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260516-meta-objective-status-stamps-chromakey-imagegen.png',
  width: 768,
  height: 256,
  minRuntimeBytes: 24_000
};

const IMAGEGEN_REBOOT_META_STATUS_PLAQUES = {
  path: 'src/client/assets/generated/reboot-meta-status-plaques.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260517-meta-status-plaques-chromakey-imagegen.png',
  width: 768,
  height: 180,
  minRuntimeBytes: 42_000
};

const IMAGEGEN_REBOOT_LOADING_GATE_METER = {
  path: 'src/client/assets/generated/reboot-loading-gate-meter.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260517-loading-gate-meter-chromakey-imagegen.png',
  width: 1024,
  height: 128,
  minRuntimeBytes: 72_000
};

const IMAGEGEN_REBOOT_LOBBY_OPERATION_PROGRESS_RAIL = {
  path: 'src/client/assets/generated/reboot-lobby-operation-progress-rail.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260517-lobby-operation-progress-rail-chromakey-imagegen.png',
  width: 512,
  height: 128,
  minRuntimeBytes: 36_000
};

const IMAGEGEN_REBOOT_NAV_LABEL_PLATE = {
  path: 'src/client/assets/generated/reboot-nav-label-plate.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260517-nav-label-plate-chromakey-imagegen.png',
  width: 512,
  height: 160,
  minRuntimeBytes: 40_000
};

const IMAGEGEN_REBOOT_META_CAPTION_PLATE = {
  path: 'src/client/assets/generated/reboot-meta-caption-plate.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260518-meta-caption-plate-chromakey-imagegen.png',
  width: 512,
  height: 128,
  minRuntimeBytes: 32_000
};

const IMAGEGEN_REBOOT_META_SHOWCASE_COPY_PLATES = {
  path: 'src/client/assets/generated/reboot-meta-showcase-copy-plates.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260519-meta-showcase-copy-plates-chromakey-imagegen.png',
  width: 860,
  height: 160,
  minRuntimeBytes: 52_000
};

const IMAGEGEN_REBOOT_RESULT_AURAS = {
  path: 'src/client/assets/generated/reboot-result-outcome-auras.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260516-result-outcome-auras-chromakey-imagegen.png',
  width: 780,
  height: 260,
  minRuntimeBytes: 45_000
};

const IMAGEGEN_REBOOT_RESULT_VERDICT_RIBBONS = {
  path: 'src/client/assets/generated/reboot-result-verdict-ribbons.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260516-result-verdict-ribbons-chromakey-imagegen.png',
  width: 780,
  height: 176,
  minRuntimeBytes: 55_000
};

const IMAGEGEN_REBOOT_RESULT_TITLE_WORDMARKS = [
  {
    path: 'src/client/assets/generated/reboot-result-title-won-v1.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260521-result-title-won-chromakey-imagegen.png',
    width: 860,
    height: 327,
    minRuntimeBytes: 180_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-title-lost-v1.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260521-result-title-lost-chromakey-imagegen.png',
    width: 860,
    height: 366,
    minRuntimeBytes: 180_000
  }
];

const IMAGEGEN_REBOOT_META_OBJECTIVE_RAILS = {
  path: 'src/client/assets/generated/reboot-meta-objective-rails.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260516-meta-objective-rails-chromakey-imagegen.png',
  width: 780,
  height: 112,
  minRuntimeBytes: 50_000
};

const IMAGEGEN_REBOOT_META_ITEM_STATUS_OVERLAYS = {
  path: 'src/client/assets/generated/reboot-meta-item-status-overlays.png',
  source: 'docs/design/generation/source/reboot/style-lock/20260516-meta-item-status-overlays-chromakey-imagegen.png',
  width: 896,
  height: 512,
  minRuntimeBytes: 300_000
};

const IMAGEGEN_REBOOT_TRANSPARENT_EFFECTS = [
  {
    path: 'src/client/assets/generated/reboot-kill-burst.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-kill-burst-chromakey-imagegen.png',
    width: 256,
    height: 256,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-hit-beam.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-hit-beam-chromakey-imagegen.png',
    width: 320,
    height: 64,
    minRuntimeBytes: 8_000
  },
  {
    path: 'src/client/assets/generated/reboot-hit-bolts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-hit-bolts-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-action-ready-pulses.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-action-ready-pulses-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-first-command-spotlight.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-first-command-spotlight-chromakey-imagegen.png',
    width: 256,
    height: 128,
    minRuntimeBytes: 10_000
  },
  {
    path: 'src/client/assets/generated/reboot-first-summon-landing-beacon.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-first-summon-landing-beacon-chromakey-imagegen.png',
    width: 512,
    height: 512,
    minRuntimeBytes: 250_000
  },
  {
    path: 'src/client/assets/generated/reboot-unit-activation-ring.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-unit-activation-ring-chromakey-imagegen.png',
    width: 512,
    height: 512,
    minRuntimeBytes: 180_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-action-surges.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-combat-action-surges-chromakey-imagegen.png',
    width: 780,
    height: 620,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-first-summon-console.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-combat-first-summon-console-chromakey-imagegen.png',
    width: 780,
    height: 180,
    minRuntimeBytes: 48_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-first-tap-cue.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-combat-first-tap-cue-chromakey-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 60_000
  },
  {
    path: 'src/client/assets/generated/reboot-player-board-tray.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-player-board-tray-imagegen.png',
    width: 780,
    height: 320,
    minRuntimeBytes: 40_000
  },
  {
    path: 'src/client/assets/generated/reboot-player-board-bridge.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260518-player-board-bridge-chromakey-imagegen.png',
    width: 780,
    height: 220,
    minRuntimeBytes: 60_000
  },
  {
    path: 'src/client/assets/generated/reboot-critical-action-rings.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-critical-action-rings-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-progress-bars.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-progress-bars-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 24_000
  },
  {
    path: 'src/client/assets/generated/reboot-meta-card-state-badges.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-card-state-badges-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-reward-reveal-panel.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-reward-reveal-panel-chromakey-imagegen.png',
    width: 430,
    height: 260,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-medals.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-medals-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-cosmetic-equip-aura.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-cosmetic-equip-aura-chromakey-imagegen.png',
    width: 640,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-battle-cosmetic-sigils.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-battle-cosmetic-sigils-chromakey-imagegen.png',
    width: 960,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-lobby-next-beacons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-lobby-next-beacons-chromakey-imagegen.png',
    width: 640,
    height: 128,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-coach-cues.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-coach-cues-chromakey-imagegen.png',
    width: 768,
    height: 144,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-action-stamps.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-combat-action-stamps-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 24_000
  },
  {
    path: 'src/client/assets/generated/reboot-partner-assist-pings.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-partner-assist-pings-chromakey-imagegen.png',
    width: 640,
    height: 100,
    minRuntimeBytes: 18_000
  },
  {
    path: 'src/client/assets/generated/reboot-partner-standby-sigils.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-partner-standby-sigils-chromakey-imagegen.png',
    width: 512,
    height: 160,
    minRuntimeBytes: 28_000
  },
  {
    path: 'src/client/assets/generated/reboot-reward-pickup-bursts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-reward-pickup-bursts-chromakey-imagegen.png',
    width: 768,
    height: 128,
    minRuntimeBytes: 24_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-finale-bursts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-finale-bursts-chromakey-imagegen.png',
    width: 780,
    height: 260,
    minRuntimeBytes: 45_000
  },
  {
    path: 'src/client/assets/generated/reboot-boss-aura-rings.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-boss-aura-rings-chromakey-imagegen.png',
    width: 768,
    height: 192,
    minRuntimeBytes: 28_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-reveal-vfx.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-combat-reveal-vfx-imagegen.png',
    width: 1920,
    height: 512,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-summon-ignition-vfx.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260515-summon-ignition-vfx-chromakey-imagegen.png',
    width: 768,
    height: 256,
    minRuntimeBytes: 24_000
  },
  {
    path: 'src/client/assets/generated/reboot-enemy-track-trails.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-enemy-track-trails-chromakey-imagegen.png',
    width: 1024,
    height: 128,
    minRuntimeBytes: 28_000
  },
  {
    path: 'src/client/assets/generated/reboot-enemy-impact-bursts.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-enemy-impact-bursts-chromakey-imagegen.png',
    width: 768,
    height: 160,
    minRuntimeBytes: 30_000
  },
  {
    path: 'src/client/assets/generated/reboot-enemy-spawn-gates.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-enemy-spawn-gates-chromakey-imagegen.png',
    width: 768,
    height: 192,
    minRuntimeBytes: 35_000
  },
  {
    path: 'src/client/assets/generated/reboot-opening-threat-preview.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260517-opening-threat-preview-chromakey-imagegen.png',
    width: 512,
    height: 256,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-signal-core-gates.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-signal-core-gates-chromakey-imagegen.png',
    width: 512,
    height: 192,
    minRuntimeBytes: 35_000
  }
];

const IMAGEGEN_REBOOT_ATLASES = [
  {
    path: 'src/client/assets/generated/reboot-unit-atlas.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260516-unit-atlas-expanded-imagegen.png',
    width: 2048,
    height: 256,
    minRuntimeBytes: 120_000
  },
  {
    path: 'src/client/assets/generated/reboot-enemy-atlas-v3.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260519-enemy-atlas-v3-chromakey-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 120_000
  },
  {
    path: 'src/client/assets/generated/reboot-ui-icons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-ui-icons-imagegen.png',
    width: 1536,
    height: 256,
    minRuntimeBytes: 90_000
  },
  {
    path: 'src/client/assets/generated/reboot-reward-icons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-reward-icons-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-badges.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-result-badges-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-board-accents.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-board-accents-imagegen.png',
    width: 1280,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-screen-chrome.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-screen-chrome-imagegen.png',
    width: 1280,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-vfx.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-combat-vfx-imagegen.png',
    width: 1280,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-nav-icons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-nav-icons-imagegen.png',
    width: 1280,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-reward-burst.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-reward-burst-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-shop-cosmetics.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-shop-cosmetics-imagegen.png',
    width: 480,
    height: 96,
    minRuntimeBytes: 30_000
  }
];

const WORLD_SPRITE_ASSETS = [
  { path: 'src/client/assets/generated/noise-world-sprites.png', columns: 4, rows: 2 },
  { path: 'src/client/assets/generated/relay-world-sprites.png', columns: 4, rows: 5 }
];

function parsePng(bytes) {
  let offset = 8;
  const chunks = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += length + 12;
  }
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  assert.equal(bitDepth, 8);
  assert.equal(colorType, 6);
  assert.equal(interlace, 0);

  const compressed = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
  const raw = inflateSync(compressed);
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset];
    inputOffset += 1;
    const row = raw.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const outRow = pixels.subarray(y * stride, (y + 1) * stride);
    const prevRow = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? outRow[x - 4] : 0;
      const up = prevRow ? prevRow[x] : 0;
      const upLeft = prevRow && x >= 4 ? prevRow[x - 4] : 0;
      if (filter === 0) outRow[x] = row[x];
      else if (filter === 1) outRow[x] = (row[x] + left) & 255;
      else if (filter === 2) outRow[x] = (row[x] + up) & 255;
      else if (filter === 3) outRow[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        outRow[x] = (row[x] + predictor) & 255;
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }
    }
  }
  return { width, height, pixels };
}

function alphaAt(image, x, y) {
  return image.pixels[(y * image.width + x) * 4 + 3];
}

function alphaCoverage(image, rect, threshold = 220) {
  let covered = 0;
  let total = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      total += 1;
      if (image.pixels[offset + 3] > threshold) covered += 1;
    }
  }
  return covered / total;
}

function alphaBounds(image, rect, threshold = 32) {
  const bounds = { minX: rect.width, maxX: -1, minY: rect.height, maxY: -1, count: 0 };
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (alphaAt(image, x, y) <= threshold) continue;
      bounds.minX = Math.min(bounds.minX, x - rect.x);
      bounds.maxX = Math.max(bounds.maxX, x - rect.x);
      bounds.minY = Math.min(bounds.minY, y - rect.y);
      bounds.maxY = Math.max(bounds.maxY, y - rect.y);
      bounds.count += 1;
    }
  }
  return bounds;
}

function colorRatio(image, rect, predicate) {
  let matched = 0;
  let total = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const alpha = image.pixels[offset + 3];
      if (alpha <= 220) continue;
      total += 1;
      if (predicate(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2])) matched += 1;
    }
  }
  return matched / total;
}

function luminanceStats(image, rect, brightThreshold = 64) {
  let total = 0;
  let sum = 0;
  let bright = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (image.pixels[offset + 3] <= 220) continue;
      const luma = (image.pixels[offset] * 0.2126) + (image.pixels[offset + 1] * 0.7152) + (image.pixels[offset + 2] * 0.0722);
      total += 1;
      sum += luma;
      if (luma > brightThreshold) bright += 1;
    }
  }
  return { mean: sum / total, brightRatio: bright / total };
}

test('generated gameplay atlases are committed as valid png assets', async () => {
  for (const path of GENERATED_ASSETS) {
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', path);
    assert.equal(bytes.length > 100_000, true, path);
  }
});

test('splash footer shroud reads as dark floor instead of a centered empty slot', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-splash-footer-shroud.png'));
  const centerLower = luminanceStats(image, { x: 120, y: 92, width: 190, height: 86 });
  const centerSocket = luminanceStats(image, { x: 130, y: 126, width: 170, height: 58 }, 45);
  const sideLower = luminanceStats(image, { x: 20, y: 92, width: 90, height: 86 });
  const cyanSlotRatio = colorRatio(image, { x: 120, y: 92, width: 190, height: 86 }, (r, g, b) => r < 80 && g > 80 && b > 90);

  assert.equal(centerLower.mean <= sideLower.mean + 7, true, `center floor too bright: ${centerLower.mean} vs ${sideLower.mean}`);
  assert.equal(centerLower.brightRatio < 0.015, true, `center floor has too many bright slot pixels: ${centerLower.brightRatio}`);
  assert.equal(centerSocket.mean < 28, true, `center socket frame still reads bright: ${centerSocket.mean}`);
  assert.equal(centerSocket.brightRatio < 0.005, true, `center socket frame has too many luminous edge pixels: ${centerSocket.brightRatio}`);
  assert.equal(cyanSlotRatio < 0.00005, true, `center floor has cyan slot pixels: ${cyanSlotRatio}`);
});

test('meta footer shroud uses generated dark floor art for lower meta screens', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-meta-footer-shroud.png'));
  const centerLower = luminanceStats(image, { x: 120, y: 92, width: 190, height: 86 });
  const centerSocket = luminanceStats(image, { x: 130, y: 126, width: 170, height: 58 }, 45);
  const cyanSlotRatio = colorRatio(image, { x: 120, y: 92, width: 190, height: 86 }, (r, g, b) => r < 80 && g > 80 && b > 90);

  assert.equal(centerLower.mean < 24, true, `meta footer floor too bright: ${centerLower.mean}`);
  assert.equal(centerSocket.brightRatio < 0.005, true, `meta footer still has luminous slot edges: ${centerSocket.brightRatio}`);
  assert.equal(cyanSlotRatio < 0.00005, true, `meta footer has cyan slot pixels: ${cyanSlotRatio}`);
});

test('meta lower console fills the dock gap with generated machinery instead of flat void', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-meta-lower-console.png'));
  assert.equal(image.width, 430);
  assert.equal(image.height, 184);

  const centerMachinery = luminanceStats(image, { x: 94, y: 58, width: 242, height: 94 }, 42);
  const lowerRails = luminanceStats(image, { x: 36, y: 122, width: 358, height: 46 }, 45);
  const cyanDetailRatio = colorRatio(image, { x: 36, y: 62, width: 358, height: 98 }, (r, g, b) => r < 95 && g > 74 && b > 84);
  const flatVoidRatio = colorRatio(image, { x: 84, y: 44, width: 262, height: 116 }, (r, g, b) => Math.max(r, g, b) < 18);

  assert.equal(centerMachinery.mean > 34, true, `meta lower console center still reads as empty black floor: ${centerMachinery.mean}`);
  assert.equal(centerMachinery.mean < 72, true, `meta lower console center is too bright behind scroll fade: ${centerMachinery.mean}`);
  assert.equal(centerMachinery.brightRatio > 0.12, true, `meta lower console lacks readable central machinery: ${centerMachinery.brightRatio}`);
  assert.equal(lowerRails.brightRatio > 0.09, true, `meta lower console lacks readable generated rails: ${lowerRails.brightRatio}`);
  assert.equal(cyanDetailRatio > 0.01, true, `meta lower console lacks signal-lit generated detail: ${cyanDetailRatio}`);
  assert.equal(flatVoidRatio < 0.28, true, `meta lower console still has too much flat void: ${flatVoidRatio}`);
});

test('battle backdrop lower board reads as arena floor instead of an empty web socket panel', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-battle-backdrop.png'));
  const lowerBoard = luminanceStats(image, { x: 112, y: 455, width: 166, height: 80 }, 45);
  const centerSocket = luminanceStats(image, { x: 132, y: 480, width: 126, height: 42 }, 45);
  const cyanSlotRatio = colorRatio(image, { x: 112, y: 455, width: 166, height: 80 }, (r, g, b) => r < 90 && g > 75 && b > 85);
  const darkHoleRatio = colorRatio(image, { x: 112, y: 455, width: 166, height: 80 }, (r, g, b) => Math.max(r, g, b) < 35);

  assert.equal(lowerBoard.mean > 34, true, `battle lower board collapsed into a black panel: ${lowerBoard.mean}`);
  assert.equal(centerSocket.mean > 30, true, `battle center socket area still reads as an empty hole: ${centerSocket.mean}`);
  assert.equal(darkHoleRatio < 0.12, true, `battle lower board has too much empty black cavity: ${darkHoleRatio}`);
  assert.equal(cyanSlotRatio < 0.035, true, `battle lower board still has too many cyan lane/socket pixels: ${cyanSlotRatio}`);
});

test('combat action dock fills the command row with generated console art', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-action-dock.png'));
  const upperConsole = luminanceStats(image, { x: 36, y: 8, width: 358, height: 46 }, 48);
  const middleConsole = luminanceStats(image, { x: 30, y: 42, width: 370, height: 56 }, 48);
  const lowerConsole = luminanceStats(image, { x: 30, y: 82, width: 370, height: 40 }, 48);
  const leftEdge = luminanceStats(image, { x: 0, y: 0, width: 18, height: 128 }, 48);
  const rightEdge = luminanceStats(image, { x: 412, y: 0, width: 18, height: 128 }, 48);
  const upperConsoleCoverage = alphaCoverage(image, { x: 36, y: 8, width: 358, height: 46 }, 1);

  assert.equal(upperConsoleCoverage > 0.85, true, `action dock upper row is still transparent: ${upperConsoleCoverage}`);
  assert.equal(upperConsole.brightRatio > 0.18, true, `action dock upper row lacks generated chrome: ${upperConsole.brightRatio}`);
  assert.equal(upperConsole.brightRatio < 0.48, true, `action dock upper row is too visually busy: ${upperConsole.brightRatio}`);
  assert.equal(middleConsole.mean > 36, true, `action dock middle row collapses into a black web gap: ${middleConsole.mean}`);
  assert.equal(middleConsole.mean < 72, true, `action dock middle row is too bright behind controls: ${middleConsole.mean}`);
  assert.equal(lowerConsole.brightRatio > 0.12, true, `action dock lower controls lack readable command sockets: ${lowerConsole.brightRatio}`);
  assert.equal(lowerConsole.brightRatio < 0.36, true, `action dock lower controls are too busy behind buttons: ${lowerConsole.brightRatio}`);
  assert.equal(leftEdge.mean < 28, true, `action dock left edge looks clipped: ${leftEdge.mean}`);
  assert.equal(rightEdge.mean < 28, true, `action dock right edge looks clipped: ${rightEdge.mean}`);
});

test('combat action dock generated asset keeps a visible top divider without css border', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-action-dock.png'));
  const dockTopEdgeBand = luminanceStats(image, { x: 40, y: 0, width: 350, height: 18 }, 52);
  const dockBodyBand = luminanceStats(image, { x: 40, y: 24, width: 350, height: 18 }, 52);
  const edgeCoverage = alphaCoverage(image, { x: 40, y: 0, width: 350, height: 18 }, 16);

  assert.equal(edgeCoverage > 0.98, true, `action dock top divider is not opaque enough: ${edgeCoverage}`);
  assert.equal(dockTopEdgeBand.brightRatio > 0.32, true, `action dock top divider lacks generated edge highlights: ${dockTopEdgeBand.brightRatio}`);
  assert.equal(dockBodyBand.brightRatio < dockTopEdgeBand.brightRatio - 0.08, true, `action dock top divider does not separate from body: ${JSON.stringify({ dockTopEdgeBand, dockBodyBand })}`);
});

test('combat first command dock cover hides empty lower sockets during one-button onboarding', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-first-command-dock.png'));
  assert.equal(image.width, 390);
  assert.equal(image.height, 150);

  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const commandHalo = luminanceStats(image, { x: 122, y: 24, width: 146, height: 72 }, 48);
  const lowerShroud = luminanceStats(image, { x: 34, y: 106, width: 322, height: 34 }, 36);
  const lowerSocketCyan = colorRatio(image, { x: 34, y: 104, width: 322, height: 38 }, (r, g, b) => r < 95 && g > 82 && b > 90);
  const centerCoverage = alphaCoverage(image, { x: 58, y: 20, width: 274, height: 106 }, 42);

  assert.equal(corners.every((alpha) => alpha < 12), true, `first command dock has opaque corners: ${corners.join(',')}`);
  assert.equal(centerCoverage > 0.34, true, `first command dock has no readable central command platform: ${centerCoverage}`);
  assert.equal(commandHalo.brightRatio > 0.12, true, `first command dock lacks a premium summon focus: ${commandHalo.brightRatio}`);
  assert.equal(lowerShroud.mean < 44, true, `first command dock lower shroud is too bright and busy: ${lowerShroud.mean}`);
  assert.equal(lowerSocketCyan < 0.09, true, `first command dock still reads as empty cyan sockets: ${lowerSocketCyan}`);
});

test('splash floor cap is a transparent matte bitmap, not another glowing button', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-splash-floor-cap.png'));
  const center = luminanceStats(image, { x: 78, y: 38, width: 104, height: 34 }, 42);
  const frameRatio = colorRatio(image, { x: 42, y: 20, width: 176, height: 58 }, (r, g, b) => r < 70 && g > 80 && b > 90);

  for (const point of [[0, 0], [259, 0], [0, 95], [259, 95]]) {
    assert.equal(alphaAt(image, point[0], point[1]) < 24, true, `corner ${point.join(',')} must stay transparent`);
  }
  assert.equal(alphaAt(image, 130, 58) > 220, true, 'center cap must be opaque enough to cover the slot');
  assert.equal(center.mean < 18, true, `center cap too bright: ${center.mean}`);
  assert.equal(center.brightRatio < 0.002, true, `center cap has button-like bright pixels: ${center.brightRatio}`);
  assert.equal(frameRatio < 0.0001, true, `center cap has cyan frame pixels: ${frameRatio}`);
});

test('splash bottom deck adds generated floor detail instead of a flat web footer', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-splash-bottom-deck.png'));
  const centerFloor = luminanceStats(image, { x: 120, y: 86, width: 190, height: 118 }, 42);
  const lowerMachinery = luminanceStats(image, { x: 24, y: 162, width: 382, height: 92 }, 45);
  const cyanDetailRatio = colorRatio(image, { x: 24, y: 126, width: 382, height: 120 }, (r, g, b) => r < 95 && g > 75 && b > 85);
  const flatBlackRatio = colorRatio(image, { x: 88, y: 72, width: 254, height: 150 }, (r, g, b) => Math.max(r, g, b) < 16);

  assert.equal(centerFloor.mean > 24, true, `splash lower deck center is still too empty: ${centerFloor.mean}`);
  assert.equal(centerFloor.mean < 64, true, `splash lower deck center is too bright behind CTA: ${centerFloor.mean}`);
  assert.equal(lowerMachinery.brightRatio > 0.035, true, `splash lower deck lacks readable generated machinery: ${lowerMachinery.brightRatio}`);
  assert.equal(cyanDetailRatio > 0.004, true, `splash lower deck lacks signal-lit detail: ${cyanDetailRatio}`);
  assert.equal(flatBlackRatio < 0.5, true, `splash lower deck still reads as flat black footer: ${flatBlackRatio}`);
});

test('screen lighting mattes are generated art, not flat css gradient replacements', async () => {
  const meta = parsePng(await readFile('src/client/assets/generated/reboot-meta-screen-lighting.png'));
  const result = parsePng(await readFile('src/client/assets/generated/reboot-result-screen-lighting.png'));

  assert.equal(meta.width, 430);
  assert.equal(meta.height, 932);
  assert.equal(result.width, 430);
  assert.equal(result.height, 932);

  const metaCenter = luminanceStats(meta, { x: 90, y: 170, width: 250, height: 530 }, 54);
  const metaTop = luminanceStats(meta, { x: 40, y: 0, width: 350, height: 120 }, 54);
  const resultCenter = luminanceStats(result, { x: 90, y: 170, width: 250, height: 530 }, 64);
  const resultEdge = luminanceStats(result, { x: 0, y: 160, width: 50, height: 600 }, 64);

  assert.equal(metaCenter.mean > metaTop.mean + 28, true, `meta lighting lacks generated center falloff: ${JSON.stringify({ metaCenter, metaTop })}`);
  assert.equal(metaCenter.brightRatio > 0.28, true, `meta lighting is too flat or dark: ${JSON.stringify(metaCenter)}`);
  assert.equal(resultCenter.mean > resultEdge.mean + 52, true, `result lighting lacks warm reward falloff: ${JSON.stringify({ resultCenter, resultEdge })}`);
  assert.equal(resultCenter.brightRatio > 0.72, true, `result lighting lacks readable reward glow: ${JSON.stringify(resultCenter)}`);
});

test('app shell backdrop is generated mobile scene art, not a flat css gradient', async () => {
  const shell = parsePng(await readFile('src/client/assets/generated/reboot-app-shell-backdrop.png'));

  assert.equal(shell.width, 430);
  assert.equal(shell.height, 932);

  const center = luminanceStats(shell, { x: 90, y: 160, width: 250, height: 560 }, 48);
  const topEdge = luminanceStats(shell, { x: 0, y: 0, width: 430, height: 90 }, 48);
  const lowerDeck = luminanceStats(shell, { x: 40, y: 705, width: 350, height: 180 }, 48);

  assert.equal(center.mean > topEdge.mean + 18, true, `app shell center lacks generated light falloff: ${JSON.stringify({ center, topEdge })}`);
  assert.equal(center.brightRatio > 0.2, true, `app shell center is too flat or dark: ${JSON.stringify(center)}`);
  assert.equal(lowerDeck.mean > 22, true, `app shell lower deck is too empty: ${JSON.stringify(lowerDeck)}`);
});

test('shop banner v2 reads as a premium cosmetic display instead of dark silhouettes', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-shop-banner-v2.png'));
  const pedestal = luminanceStats(image, { x: 20, y: 40, width: 154, height: 82 }, 72);
  const capsuleShelf = luminanceStats(image, { x: 188, y: 22, width: 214, height: 82 }, 78);
  const darkSilhouetteRatio = colorRatio(
    image,
    { x: 18, y: 20, width: 178, height: 104 },
    (r, g, b) => Math.max(r, g, b) < 30
  );

  assert.equal(pedestal.brightRatio > 0.33, true, `shop banner pedestal is still too dim: ${JSON.stringify(pedestal)}`);
  assert.equal(capsuleShelf.brightRatio > 0.36, true, `shop banner capsules are not readable: ${JSON.stringify(capsuleShelf)}`);
  assert.equal(darkSilhouetteRatio < 0.16, true, `shop banner has too much silhouette-like darkness: ${darkSilhouetteRatio}`);
});

test('generated UI frames use alpha instead of baked black rectangles', async () => {
  for (const asset of TRANSPARENT_UI_FRAME_ASSETS) {
    const image = parsePng(await readFile(asset.path));
    const maxCornerAlpha = asset.maxCornerAlpha ?? 10;
    for (const [x, y] of [[0, 0], [image.width - 1, 0], [0, image.height - 1], [image.width - 1, image.height - 1]]) {
      assert.equal(alphaAt(image, x, y) < maxCornerAlpha, true, `${asset.path} corner ${x},${y} must be transparent`);
    }
    const softCoverage = alphaCoverage(image, { x: 0, y: 0, width: image.width, height: image.height }, 24);
    assert.equal(softCoverage > asset.minSoftCoverage, true, `${asset.path} lost too much generated frame art: ${softCoverage}`);
    assert.equal(softCoverage < asset.maxSoftCoverage, true, `${asset.path} still reads as a baked rectangular card: ${softCoverage}`);
  }
});

test('online partner event banner has a dark generated text plate in every state', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-online-partner-link.png'));
  const cellWidth = 390;
  for (let cell = 0; cell < 3; cell += 1) {
    const textPlateRect = { x: cell * cellWidth + 116, y: 34, width: 158, height: 69 };
    const plateCoverage = alphaCoverage(image, textPlateRect, 220);
    const plateLuma = luminanceStats(image, textPlateRect, 64);
    assert.equal(plateCoverage > 0.98, true, `partner event banner cell ${cell} lacks an opaque text plate: ${plateCoverage}`);
    assert.equal(plateLuma.mean < 38, true, `partner event banner cell ${cell} plate is too bright for overlay copy: ${plateLuma.mean}`);
    assert.equal(plateLuma.brightRatio < 0.14, true, `partner event banner cell ${cell} plate is too noisy behind copy: ${plateLuma.brightRatio}`);
  }
});

test('generated gameplay atlases align to their slicing grids', async () => {
  for (const asset of GRID_ASSETS) {
    const bytes = await readFile(asset.path);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    assert.equal(width % asset.columns, 0, asset.path);
    assert.equal(height % asset.rows, 0, asset.path);
  }
});

test('world sprite atlases use png alpha instead of opaque card backgrounds', async () => {
  for (const asset of WORLD_SPRITE_ASSETS) {
    const bytes = await readFile(asset.path);
    assert.equal(bytes[25], 6, `${asset.path} must be RGBA`);
    const image = parsePng(bytes);
    const cellW = image.width / asset.columns;
    const cellH = image.height / asset.rows;
    assert.equal(cellW, cellH, `${asset.path} cells must be square for in-world rendering`);

    for (let row = 0; row < asset.rows; row += 1) {
      for (let col = 0; col < asset.columns; col += 1) {
        const x0 = col * cellW;
        const y0 = row * cellH;
        let borderTransparent = 0;
        let borderTotal = 0;
        let outerBandTransparent = 0;
        let outerBandTotal = 0;
        let opaqueInterior = 0;
        let interiorTotal = 0;
        const outerBand = Math.max(20, Math.floor(cellW * 0.06));
        for (let y = 0; y < cellH; y += 1) {
          for (let x = 0; x < cellW; x += 1) {
            const alpha = alphaAt(image, x0 + x, y0 + y);
            const border = x < 8 || y < 8 || x >= cellW - 8 || y >= cellH - 8;
            const outer = x < outerBand || y < outerBand || x >= cellW - outerBand || y >= cellH - outerBand;
            if (border) {
              borderTotal += 1;
              if (alpha < 10) borderTransparent += 1;
            }
            if (outer) {
              outerBandTotal += 1;
              if (alpha < 10) outerBandTransparent += 1;
            } else {
              interiorTotal += 1;
              if (alpha > 64) opaqueInterior += 1;
            }
          }
        }
        assert.ok(borderTransparent / borderTotal > 0.92, `${asset.path} cell ${col},${row} keeps too much card border`);
        assert.ok(outerBandTransparent / outerBandTotal > 0.86, `${asset.path} cell ${col},${row} keeps too much outer card plate`);
        assert.ok(opaqueInterior / interiorTotal > 0.015, `${asset.path} cell ${col},${row} has too little visible sprite`);
        assert.ok(opaqueInterior / interiorTotal < 0.82, `${asset.path} cell ${col},${row} looks like a mostly opaque card tile`);
      }
    }
  }
});

test('reboot board accent atlas cells have transparent outer backgrounds', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-board-accents.png'));
  const cell = 256;
  for (let col = 0; col < 2; col += 1) {
    const x0 = col * cell;
    for (const [dx, dy] of [[0, 0], [255, 0], [0, 255], [255, 255]]) {
      assert.equal(alphaAt(image, x0 + dx, dy) < 10, true, `board accent cell ${col} corner ${dx},${dy} must be transparent`);
    }
  }
});

test('noise roster exposes atlas indices for generated enemy sprites', () => {
  for (const [id, spec] of Object.entries(NOISE_TYPES)) {
    assert.equal(Number.isInteger(spec.atlasIndex), true, id);
    assert.equal(spec.atlasIndex >= 0, true, id);
  }
});

test('battle renderer never falls back to legacy card-backed enemy atlas', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  assert.equal(source.includes('noise-enemy-atlas'), false);
  assert.equal(source.includes('noiseEnemyAtlas'), false);
});

test('reboot runtime atlases exist with exact transparent manifest dimensions', async () => {
  for (const asset of REBOOT_GRID_ASSETS) {
    const bytes = await readFile(asset.path);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(bytes[25], 6, `${asset.path} must be RGBA`);
    assert.equal(bytes.readUInt32BE(16), asset.width, asset.path);
    assert.equal(bytes.readUInt32BE(20), asset.height, asset.path);
    assert.equal(asset.width % asset.columns, 0, asset.path);
    assert.equal(asset.height % asset.rows, 0, asset.path);
    assert.equal(bytes.length > 1000, true, asset.path);
  }
});

test('reboot battle uses a committed imagegen backdrop at canvas size', async () => {
  for (const asset of IMAGEGEN_REBOOT_BACKDROPS) {
    const bytes = await readFile(asset.path);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(bytes.readUInt32BE(16), asset.width, asset.path);
    assert.equal(bytes.readUInt32BE(20), asset.height, asset.path);
    assert.equal(bytes.length > 100_000, true, asset.path);
  }
});

test('reboot runtime visual atlases are promoted from imagegen sources instead of procedural placeholders', async () => {
  for (const asset of IMAGEGEN_REBOOT_ATLASES) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);
  }
});

test('reboot enemy atlas v3 uses readable transparent track creatures', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-enemy-atlas-v3.png'));
  const source = await readFile('docs/design/generation/source/reboot/style-lock/20260519-enemy-atlas-v3-chromakey-imagegen.png');
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.width, 1024);
  assert.equal(image.height, 256);

  for (let cell = 0; cell < 4; cell += 1) {
    const rect = { x: cell * 256, y: 0, width: 256, height: 256 };
    const corners = [
      alphaAt(image, rect.x + 1, 1),
      alphaAt(image, rect.x + 254, 1),
      alphaAt(image, rect.x + 1, 254),
      alphaAt(image, rect.x + 254, 254)
    ];
    const bounds = alphaBounds(image, rect, 24);
    const longest = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const greenFringeRatio = colorRatio(image, rect, (r, g, b) => g > 180 && r < 80 && b < 120);

    assert.equal(corners.every((alpha) => alpha < 10), true, `enemy v3 cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(longest >= 130 && longest <= 224, true, `enemy v3 cell ${cell} has weak silhouette bounds: ${JSON.stringify(bounds)}`);
    assert.equal(Math.abs(centerX - 128) <= 18, true, `enemy v3 cell ${cell} is not centered: ${JSON.stringify(bounds)}`);
    assert.equal(greenFringeRatio < 0.002, true, `enemy v3 cell ${cell} keeps chroma-key green fringe: ${greenFringeRatio}`);
  }
});

test('reboot runtime overlay art is promoted from imagegen sources', async () => {
  for (const asset of IMAGEGEN_REBOOT_OVERLAYS) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    if (asset.requiresAlpha !== false) assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);
  }
});

test('reboot sound toggle is a transparent generated audio glyph', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-sound-toggle.png'));
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const rect = { x: 0, y: 0, width: image.width, height: image.height };
  const bounds = alphaBounds(image, rect, 24);
  const greenFringeRatio = colorRatio(image, rect, (r, g, b) => g > 190 && r < 80 && b < 80);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  assert.equal(corners.every((alpha) => alpha < 10), true, `sound toggle has opaque corners: ${corners.join(',')}`);
  assert.equal(width >= 180 && height >= 180, true, `sound toggle silhouette is too weak: ${JSON.stringify(bounds)}`);
  assert.equal(Math.abs((bounds.minX + bounds.maxX) / 2 - 128) <= 8, true, `sound toggle is off-center: ${JSON.stringify(bounds)}`);
  assert.equal(greenFringeRatio < 0.002, true, `sound toggle keeps chroma-key green fringe: ${greenFringeRatio}`);
});

test('splash title wordmark is a transparent generated logo asset', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-title-wordmark-v1.png'));
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 24);
  const magentaFringeRatio = colorRatio(image, { x: 0, y: 0, width: image.width, height: image.height }, (r, g, b) => r > 200 && g < 70 && b > 180);

  assert.equal(corners.every((alpha) => alpha < 10), true, `title wordmark has opaque corners: ${corners.join(',')}`);
  assert.equal(bounds.maxX - bounds.minX >= 1700, true, `title wordmark is too narrow: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxY - bounds.minY >= 640, true, `title wordmark is too short: ${JSON.stringify(bounds)}`);
  assert.equal(magentaFringeRatio < 0.001, true, `title wordmark keeps chroma-key magenta fringe: ${magentaFringeRatio}`);
});

test('reboot hero squad v2 is a transparent collectible character overlay', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-hero-squad-v2.png'));
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 24);
  const greenFringeRatio = colorRatio(image, { x: 0, y: 0, width: image.width, height: image.height }, (r, g, b) => g > 190 && r < 80 && b < 80);

  assert.equal(corners.every((alpha) => alpha < 10), true, `hero squad v2 has opaque corners: ${corners.join(',')}`);
  assert.equal(bounds.maxX - bounds.minX >= 520, true, `hero squad v2 is too narrow: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxY - bounds.minY >= 320, true, `hero squad v2 is too short: ${JSON.stringify(bounds)}`);
  assert.equal(greenFringeRatio < 0.001, true, `hero squad v2 keeps chroma-key green fringe: ${greenFringeRatio}`);
});

test('reboot lobby UI scene art is promoted from imagegen sources', async () => {
  for (const asset of IMAGEGEN_REBOOT_UI_SCENES) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    if (asset.requiresAlpha !== false) assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);
  }
});

test('splash title plate has transparent corners instead of an opaque web banner', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-splash-title-plate.png'));
  const corners = [
    alphaAt(image, 1, 1),
    alphaAt(image, image.width - 2, 1),
    alphaAt(image, 1, image.height - 2),
    alphaAt(image, image.width - 2, image.height - 2)
  ];
  assert.equal(corners.every((alpha) => alpha < 10), true, 'splash title plate must not render as a black rectangle');
  assert.equal(alphaAt(image, Math.floor(image.width / 2), Math.floor(image.height / 2)) > 220, true);
});

test('bottom navigation selector pads use transparent imagegen cells instead of black rectangles', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-nav-button-glow.png'));
  const cellWidth = 128;
  assert.equal(image.width, cellWidth * 4);
  assert.equal(image.height, 128);

  for (let cell = 0; cell < 4; cell += 1) {
    const x0 = cell * cellWidth;
    const corners = [
      alphaAt(image, x0 + 1, 1),
      alphaAt(image, x0 + cellWidth - 2, 1),
      alphaAt(image, x0 + 1, image.height - 2),
      alphaAt(image, x0 + cellWidth - 2, image.height - 2)
    ];
    assert.equal(corners.every((alpha) => alpha < 10), true, `nav selector cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(alphaAt(image, x0 + Math.floor(cellWidth / 2), Math.floor(image.height / 2)) > 120, true, `nav selector cell ${cell} has no readable center`);
  }
});

test('reboot launch button atlas keeps the primary CTA visibly gold on phone scale', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-launch-buttons.png'));
  const primaryGold = colorRatio(
    image,
    { x: 40, y: 14, width: 350, height: 84 },
    (r, g, b) => r > 130 && g > 80 && b < 70
  );
  const primaryBrightGold = colorRatio(
    image,
    { x: 40, y: 14, width: 350, height: 84 },
    (r, g, b) => r > 165 && g > 110 && b < 90
  );
  const secondaryTeal = colorRatio(
    image,
    { x: 470, y: 14, width: 350, height: 84 },
    (r, g, b) => r < 80 && g > 90 && b > 95
  );

  assert.equal(primaryGold > 0.22, true, `primary button is not gold enough: ${primaryGold}`);
  assert.equal(primaryBrightGold > 0.12, true, `primary button is too dim at phone scale: ${primaryBrightGold}`);
  assert.equal(secondaryTeal > 0.06, true, `secondary button lost its teal read: ${secondaryTeal}`);
});

test('lobby launch console is a transparent generated cradle for both launch actions', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-lobby-launch-console.png'));
  assert.equal(image.width, 390);
  assert.equal(image.height, 150);

  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 32);
  const centerCoverage = alphaCoverage(image, { x: 18, y: 18, width: 354, height: 114 }, 48);

  assert.equal(corners.every((alpha) => alpha < 12), true, `launch console has opaque corners: ${corners.join(',')}`);
  assert.equal(bounds.count > 14_000, true, `launch console has no readable generated cradle: ${JSON.stringify(bounds)}`);
  assert.equal(centerCoverage > 0.2, true, 'launch console center is too empty to group the buttons');
  assert.equal(centerCoverage < 0.94, true, 'launch console became a fully opaque web panel');
  assert.equal(bounds.minX >= 4, true, `launch console touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= image.width - 5, true, `launch console touches right edge: ${JSON.stringify(bounds)}`);
});

test('lobby launch bay reads as one operation console with an integrated online socket', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-lobby-launch-bay.png'));
  assert.equal(image.width, 860);
  assert.equal(image.height, 320);

  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 32);
  const goldRailCoverage = alphaCoverage(image, { x: 210, y: 112, width: 430, height: 94 }, 40);
  const onlineSocketCoverage = alphaCoverage(image, { x: 642, y: 52, width: 150, height: 180 }, 40);

  assert.equal(corners.every((alpha) => alpha < 10), true, `launch bay has opaque corners: ${corners.join(',')}`);
  assert.equal(bounds.count > 145_000, true, `launch bay has no readable command object: ${JSON.stringify(bounds)}`);
  assert.equal(goldRailCoverage > 0.9, true, `launch bay lacks a dominant primary launch rail: ${goldRailCoverage}`);
  assert.equal(onlineSocketCoverage > 0.75, true, `launch bay lacks an integrated online socket: ${onlineSocketCoverage}`);
  assert.equal(bounds.minY >= 32, true, `launch bay touches top edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxY <= image.height - 32, true, `launch bay touches bottom edge: ${JSON.stringify(bounds)}`);
});

test('reboot app icons are promoted from a dedicated imagegen source', async () => {
  for (const asset of IMAGEGEN_REBOOT_APP_ICONS) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);
  }
});

test('reboot meta reward feedback is promoted from imagegen and readable per cell', async () => {
  for (const asset of IMAGEGEN_REBOOT_META_FEEDBACK) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

    const image = parsePng(runtime);
    const cellWidth = 256;
    for (let cell = 0; cell < 4; cell += 1) {
      const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
      assert.equal(bounds.count > 4_000, true, `meta claim burst cell ${cell} has no readable subject`);
      assert.equal(bounds.minX >= 8, true, `meta claim burst cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.maxX <= cellWidth - 9, true, `meta claim burst cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.minY >= 8, true, `meta claim burst cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.maxY <= image.height - 9, true, `meta claim burst cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
    }
  }
});

test('reward reveal payoff stage is promoted from imagegen with transparent composition', async () => {
  const asset = IMAGEGEN_REBOOT_REWARD_REVEAL_PAYOFF_STAGE;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const centerGlow = luminanceStats(image, { x: 122, y: 44, width: 186, height: 132 }, 62);
  const centerCoverage = alphaCoverage(image, { x: 96, y: 28, width: 238, height: 166 }, 24);
  const edgeCoverage = alphaCoverage(image, { x: 0, y: 0, width: image.width, height: image.height }, 24);

  assert.equal(corners.every((alpha) => alpha < 10), true, `reward payoff stage has opaque corners: ${corners.join(',')}`);
  assert.equal(centerCoverage > 0.28, true, `reward payoff stage lacks a readable central burst: ${centerCoverage}`);
  assert.equal(centerGlow.brightRatio > 0.18, true, `reward payoff stage is too dull for a reward peak: ${JSON.stringify(centerGlow)}`);
  assert.equal(edgeCoverage < 0.72, true, `reward payoff stage still reads as a full rectangular web card: ${edgeCoverage}`);
});

test('reboot objective status stamps are promoted from imagegen sources', async () => {
  const asset = IMAGEGEN_REBOOT_OBJECTIVE_STAMPS;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);
});

test('mission and season status plaques are promoted from imagegen source art', async () => {
  const asset = IMAGEGEN_REBOOT_META_STATUS_PLAQUES;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = asset.width / 2;
  for (let cell = 0; cell < 2; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: asset.height }, 24);
    assert.equal(bounds.count > 18_000, true, `status plaque cell ${cell} has no readable frame`);
    assert.equal(bounds.minX >= 10, true, `status plaque cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 11, true, `status plaque cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `status plaque cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= asset.height - 9, true, `status plaque cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('loading gate progress meter is promoted from imagegen source art', async () => {
  const asset = IMAGEGEN_REBOOT_LOADING_GATE_METER;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = asset.width / 2;
  const trackBounds = alphaBounds(image, { x: 0, y: 0, width: cellWidth, height: asset.height }, 18);
  const fillBounds = alphaBounds(image, { x: cellWidth, y: 0, width: cellWidth, height: asset.height }, 18);
  assert.equal(trackBounds.count > 12_000, true, `loading meter track is too sparse: ${JSON.stringify(trackBounds)}`);
  assert.equal(fillBounds.count > 10_000, true, `loading meter fill is too sparse: ${JSON.stringify(fillBounds)}`);
  assert.equal(alphaAt(image, 1, 1) < 10, true, 'loading meter track has an opaque top-left corner');
  assert.equal(alphaAt(image, cellWidth - 2, 1) < 10, true, 'loading meter track has an opaque top-right corner');
  assert.equal(alphaAt(image, cellWidth + 1, 1) < 10, true, 'loading meter fill has an opaque top-left corner');
  assert.equal(alphaAt(image, image.width - 2, 1) < 10, true, 'loading meter fill has an opaque top-right corner');
});

test('lobby operation progress rail is promoted from imagegen source art', async () => {
  const asset = IMAGEGEN_REBOOT_LOBBY_OPERATION_PROGRESS_RAIL;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const bounds = alphaBounds(image, { x: 0, y: 0, width: asset.width, height: asset.height }, 18);
  assert.equal(bounds.count > 7_500, true, `operation progress rail is too sparse: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.minX >= 6, true, `operation progress rail touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= asset.width - 7, true, `operation progress rail touches right edge: ${JSON.stringify(bounds)}`);
  assert.equal(alphaAt(image, 1, 1) < 10, true, 'operation progress rail has an opaque top-left corner');
  assert.equal(alphaAt(image, image.width - 2, 1) < 10, true, 'operation progress rail has an opaque top-right corner');
  assert.equal(alphaAt(image, 1, image.height - 2) < 10, true, 'operation progress rail has an opaque bottom-left corner');
  assert.equal(alphaAt(image, image.width - 2, image.height - 2) < 10, true, 'operation progress rail has an opaque bottom-right corner');
});

test('bottom navigation active label plate is promoted from imagegen source art', async () => {
  const asset = IMAGEGEN_REBOOT_NAV_LABEL_PLATE;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const bounds = alphaBounds(image, { x: 0, y: 0, width: asset.width, height: asset.height }, 18);
  assert.equal(bounds.count > 9_000, true, `nav label plate is too sparse: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.minX >= 8, true, `nav label plate touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= asset.width - 9, true, `nav label plate touches right edge: ${JSON.stringify(bounds)}`);
  assert.equal(alphaAt(image, 1, 1) < 10, true, 'nav label plate has an opaque top-left corner');
  assert.equal(alphaAt(image, image.width - 2, 1) < 10, true, 'nav label plate has an opaque top-right corner');
  assert.equal(alphaAt(image, 1, image.height - 2) < 10, true, 'nav label plate has an opaque bottom-left corner');
  assert.equal(alphaAt(image, image.width - 2, image.height - 2) < 10, true, 'nav label plate has an opaque bottom-right corner');
});

test('meta screen title wordmarks are generated Korean transparent atlas art', async () => {
  const runtime = await readFile('src/client/assets/generated/reboot-meta-title-wordmarks-v1.png');
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(runtime[25], 6, 'meta title wordmark atlas must be RGBA');
  assert.equal(runtime.readUInt32BE(16), 1200);
  assert.equal(runtime.readUInt32BE(20), 170);
  assert.equal(runtime.length > 120_000, true, 'meta title wordmark atlas is unexpectedly small');

  const image = parsePng(runtime);
  const cellWidth = image.width / 4;
  for (let cell = 0; cell < 4; cell += 1) {
    const x0 = cell * cellWidth;
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 18);
    assert.equal(bounds.count > 13_000, true, `meta title wordmark cell ${cell} is too sparse: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minX >= 8, true, `meta title wordmark cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 9, true, `meta title wordmark cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 2, true, `meta title wordmark cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 3, true, `meta title wordmark cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
    assert.equal(alphaAt(image, x0 + 1, 1) < 10, true, `meta title wordmark cell ${cell} has opaque top-left corner`);
    assert.equal(alphaAt(image, x0 + cellWidth - 2, 1) < 10, true, `meta title wordmark cell ${cell} has opaque top-right corner`);
    assert.equal(alphaAt(image, x0 + 1, image.height - 2) < 10, true, `meta title wordmark cell ${cell} has opaque bottom-left corner`);
    assert.equal(alphaAt(image, x0 + cellWidth - 2, image.height - 2) < 10, true, `meta title wordmark cell ${cell} has opaque bottom-right corner`);
  }
});

test('meta caption plate is promoted from imagegen source art', async () => {
  const asset = IMAGEGEN_REBOOT_META_CAPTION_PLATE;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const bounds = alphaBounds(image, { x: 0, y: 0, width: asset.width, height: asset.height }, 18);
  assert.equal(bounds.count > 7_000, true, `meta caption plate is too sparse: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.minX >= 8, true, `meta caption plate touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= asset.width - 9, true, `meta caption plate touches right edge: ${JSON.stringify(bounds)}`);
  assert.equal(alphaAt(image, 1, 1) < 10, true, 'meta caption plate has an opaque top-left corner');
  assert.equal(alphaAt(image, image.width - 2, 1) < 10, true, 'meta caption plate has an opaque top-right corner');
  assert.equal(alphaAt(image, 1, image.height - 2) < 10, true, 'meta caption plate has an opaque bottom-left corner');
  assert.equal(alphaAt(image, image.width - 2, image.height - 2) < 10, true, 'meta caption plate has an opaque bottom-right corner');
});

test('meta showcase copy plates are generated nameplates, not flat text mats', async () => {
  const asset = IMAGEGEN_REBOOT_META_SHOWCASE_COPY_PLATES;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = asset.width / 2;
  for (let cell = 0; cell < 2; cell += 1) {
    const x0 = cell * cellWidth;
    const corners = [
      alphaAt(image, x0 + 2, 2),
      alphaAt(image, x0 + cellWidth - 3, 2),
      alphaAt(image, x0 + 2, image.height - 3),
      alphaAt(image, x0 + cellWidth - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 28);
    const centerCoverage = alphaCoverage(image, { x: x0 + 48, y: 34, width: cellWidth - 96, height: 92 }, 40);
    assert.equal(corners.every((alpha) => alpha < 14), true, `showcase copy plate cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 28_000, true, `showcase copy plate cell ${cell} has no readable generated frame: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minX >= 10, true, `showcase copy plate cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 11, true, `showcase copy plate cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(centerCoverage > 0.3, true, `showcase copy plate cell ${cell} has too little center backing: ${centerCoverage}`);
    assert.equal(centerCoverage < 0.995, true, `showcase copy plate cell ${cell} became a flat opaque web card: ${centerCoverage}`);
  }
});

test('meta item status overlays are transparent generated shelf objects', async () => {
  const asset = IMAGEGEN_REBOOT_META_ITEM_STATUS_OVERLAYS;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = image.width / 4;
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  assert.equal(corners.every((alpha) => alpha < 10), true, `meta item status atlas has opaque corners: ${corners.join(',')}`);

  for (let cell = 0; cell < 4; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 28_000, true, `meta item status cell ${cell} has no readable object`);
    assert.equal(bounds.maxY <= image.height - 112, true, `meta item status cell ${cell} drops into action text lane: ${JSON.stringify(bounds)}`);
  }
});

test('reboot transparent combat effects are promoted from imagegen sources', async () => {
  for (const asset of IMAGEGEN_REBOOT_TRANSPARENT_EFFECTS) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

    const image = parsePng(runtime);
    const corners = [
      alphaAt(image, 2, 2),
      alphaAt(image, image.width - 3, 2),
      alphaAt(image, 2, image.height - 3),
      alphaAt(image, image.width - 3, image.height - 3)
    ];
    assert.equal(corners.every((alpha) => alpha < 10), true, `${asset.path} keeps chroma-key corners`);
    let visiblePixels = 0;
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        if (alphaAt(image, x, y) > 48) visiblePixels += 1;
      }
    }
    assert.equal(visiblePixels > 2_000, true, `${asset.path} has no readable VFX subject`);
  }
});

test('boss aura sprite cells keep transparent padding so effects do not clip at slice edges', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-boss-aura-rings.png'));
  const cellWidth = 256;
  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 2_000, true, `boss aura cell ${cell} has no visible subject`);
    assert.equal(bounds.minX >= 8, true, `boss aura cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 9, true, `boss aura cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
  }
});

test('critical action ring cells keep each button cue readable and padded', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-critical-action-rings.png'));
  const cellWidth = 256;
  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 2_400, true, `critical action ring cell ${cell} has no visible subject`);
    assert.equal(bounds.minX >= 10, true, `critical action ring cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 11, true, `critical action ring cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `critical action ring cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `critical action ring cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('locked combat command socket cells stay readable and padded', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-locked-sockets.png'));
  const cellWidth = 256;
  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 6_000, true, `locked command socket cell ${cell} has no visible subject`);
    assert.equal(bounds.minX >= 12, true, `locked command socket cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 13, true, `locked command socket cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 12, true, `locked command socket cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 13, true, `locked command socket cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('combat cooldown shutter cells look like generated console overlays, not web disabled buttons', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-cooldown-shutters.png'));
  const cellWidth = 390;
  assert.equal(image.width, cellWidth * 3);
  assert.equal(image.height, 112);

  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    const centerCoverage = alphaCoverage(image, { x: cell * cellWidth + 70, y: 22, width: 250, height: 68 }, 40);
    assert.equal(bounds.count > 8_000, true, `cooldown shutter cell ${cell} is too sparse for a readable command state`);
    assert.equal(centerCoverage > 0.22, true, `cooldown shutter cell ${cell} has no readable center shutter`);
    assert.equal(bounds.minY >= 4, true, `cooldown shutter cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 5, true, `cooldown shutter cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('combat first command spotlight stays transparent and readable behind the first action button', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-first-command-spotlight.png'));
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 28);

  assert.equal(corners.every((alpha) => alpha < 10), true, 'first command spotlight keeps transparent corners');
  assert.equal(bounds.count > 2_000, true, `first command spotlight has no readable subject: ${bounds.count}`);
  assert.equal(bounds.minX >= 8, true, `first command spotlight touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= image.width - 9, true, `first command spotlight touches right edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.minY >= 8, true, `first command spotlight touches top edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxY <= image.height - 9, true, `first command spotlight touches bottom edge: ${JSON.stringify(bounds)}`);
});

test('combat first summon console is a transparent one-command pod instead of a three-button web row', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-first-summon-console.png'));
  const corners = [
    alphaAt(image, 3, 3),
    alphaAt(image, image.width - 4, 3),
    alphaAt(image, 3, image.height - 4),
    alphaAt(image, image.width - 4, image.height - 4)
  ];
  const centerPod = alphaCoverage(image, { x: 170, y: 24, width: 440, height: 132 }, 36);
  const centerBright = luminanceStats(image, { x: 220, y: 38, width: 340, height: 104 }, 50);
  const leftCoupler = luminanceStats(image, { x: 54, y: 48, width: 112, height: 84 }, 50);
  const rightCoupler = luminanceStats(image, { x: 614, y: 48, width: 112, height: 84 }, 50);

  assert.equal(corners.every((alpha) => alpha < 10), true, `first summon console has opaque corners: ${corners.join(',')}`);
  assert.equal(centerPod > 0.34, true, `first summon console has no readable central summon pod: ${centerPod}`);
  assert.equal(centerBright.brightRatio > 0.1, true, `first summon console central pod lacks game chrome: ${centerBright.brightRatio}`);
  assert.equal(leftCoupler.brightRatio < centerBright.brightRatio * 0.82, true, `left locked coupler is competing with the summon pod: ${leftCoupler.brightRatio} vs ${centerBright.brightRatio}`);
  assert.equal(rightCoupler.brightRatio < centerBright.brightRatio * 0.82, true, `right locked coupler is competing with the summon pod: ${rightCoupler.brightRatio} vs ${centerBright.brightRatio}`);
});

test('player board tray stays transparent and readable under summoned units', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-player-board-tray.png'));
  const corners = [
    alphaAt(image, 3, 3),
    alphaAt(image, image.width - 4, 3),
    alphaAt(image, 3, image.height - 4),
    alphaAt(image, image.width - 4, image.height - 4)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 28);

  assert.equal(corners.every((alpha) => alpha < 10), true, 'player board tray keeps transparent corners');
  assert.equal(bounds.count > 18_000, true, `player board tray has no readable board subject: ${bounds.count}`);
  assert.equal(bounds.minX >= 16, true, `player board tray touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= image.width - 17, true, `player board tray touches right edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.minY >= 12, true, `player board tray touches top edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxY <= image.height - 13, true, `player board tray touches bottom edge: ${JSON.stringify(bounds)}`);
});

test('player board bridge fills the lower combat gap with transparent generated machinery', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-player-board-bridge.png'));
  assert.equal(image.width, 780);
  assert.equal(image.height, 220);

  const corners = [
    alphaAt(image, 3, 3),
    alphaAt(image, image.width - 4, 3),
    alphaAt(image, 3, image.height - 4),
    alphaAt(image, image.width - 4, image.height - 4)
  ];
  const centerConsole = luminanceStats(image, { x: 170, y: 44, width: 440, height: 118 }, 48);
  const lowerRails = luminanceStats(image, { x: 84, y: 142, width: 612, height: 54 }, 48);
  const centerCoverage = alphaCoverage(image, { x: 96, y: 34, width: 588, height: 146 }, 32);
  const cyanDetailRatio = colorRatio(image, { x: 96, y: 34, width: 588, height: 146 }, (r, g, b) => r < 95 && g > 74 && b > 84);

  assert.equal(corners.every((alpha) => alpha < 12), true, `player board bridge has opaque corners: ${corners.join(',')}`);
  assert.equal(centerCoverage > 0.34, true, `player board bridge has no readable machinery silhouette: ${centerCoverage}`);
  assert.equal(centerConsole.mean > 30, true, `player board bridge center still reads as empty black floor: ${centerConsole.mean}`);
  assert.equal(centerConsole.mean < 76, true, `player board bridge is too bright behind the player board: ${centerConsole.mean}`);
  assert.equal(lowerRails.brightRatio > 0.08, true, `player board bridge lacks lower rails: ${lowerRails.brightRatio}`);
  assert.equal(cyanDetailRatio > 0.008, true, `player board bridge lacks signal-lit detail: ${cyanDetailRatio}`);
});

test('meta progress bar cells keep track and fill rows readable', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-meta-progress-bars.png'));
  const cellWidth = 256;
  const rowHeight = 64;
  for (let row = 0; row < 2; row += 1) {
    for (let cell = 0; cell < 3; cell += 1) {
      const bounds = alphaBounds(image, { x: cell * cellWidth, y: row * rowHeight, width: cellWidth, height: rowHeight }, 32);
      assert.equal(bounds.count > 1_100, true, `meta progress row ${row} cell ${cell} has no readable subject`);
      assert.equal(bounds.minX >= 8, true, `meta progress row ${row} cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.maxX <= cellWidth - 9, true, `meta progress row ${row} cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.minY >= 4, true, `meta progress row ${row} cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
      assert.equal(bounds.maxY <= rowHeight - 5, true, `meta progress row ${row} cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
    }
  }
});

test('meta card state badge cells stay readable without card backgrounds', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-meta-card-state-badges.png'));
  const cellWidth = 256;
  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 2_000, true, `meta card state badge cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 12, true, `meta card state badge cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 13, true, `meta card state badge cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 10, true, `meta card state badge cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 11, true, `meta card state badge cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('objective status stamp cells stay transparent and readable as mobile reward row actions', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-meta-objective-status-stamps.png'));
  const cellWidth = 256;
  assert.equal(image.width, cellWidth * 3);
  assert.equal(image.height, 256);

  for (let cell = 0; cell < 3; cell += 1) {
    const x0 = cell * cellWidth;
    const corners = [
      alphaAt(image, x0 + 2, 2),
      alphaAt(image, x0 + cellWidth - 3, 2),
      alphaAt(image, x0 + 2, image.height - 3),
      alphaAt(image, x0 + cellWidth - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 32);
    const centerCoverage = alphaCoverage(image, { x: x0 + 54, y: 62, width: 148, height: 132 }, 48);

    assert.equal(corners.every((alpha) => alpha < 10), true, `objective stamp cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 2_400, true, `objective stamp cell ${cell} has no readable subject`);
    assert.equal(centerCoverage > 0.18, true, `objective stamp cell ${cell} has no readable center badge`);
    assert.equal(bounds.minX >= 8, true, `objective stamp cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 9, true, `objective stamp cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `objective stamp cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `objective stamp cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('result outcome aura cells stay transparent and readable without covering result copy', async () => {
  const asset = IMAGEGEN_REBOOT_RESULT_AURAS;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = 390;
  for (let cell = 0; cell < 2; cell += 1) {
    const x0 = cell * cellWidth;
    const corners = [
      alphaAt(image, x0 + 2, 2),
      alphaAt(image, x0 + cellWidth - 3, 2),
      alphaAt(image, x0 + 2, image.height - 3),
      alphaAt(image, x0 + cellWidth - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 32);
    const centerCoverage = alphaCoverage(image, { x: x0 + 80, y: 50, width: 230, height: 140 }, 48);

    assert.equal(corners.every((alpha) => alpha < 12), true, `result aura cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 8_000, true, `result aura cell ${cell} has no readable subject`);
    assert.equal(centerCoverage > 0.16, true, `result aura cell ${cell} lacks a readable payoff center`);
    assert.equal(centerCoverage < 0.72, true, `result aura cell ${cell} is too opaque behind copy`);
    assert.equal(bounds.minX >= 6, true, `result aura cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 7, true, `result aura cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
  }
});

test('result verdict ribbon cells make result copy read as one generated game panel', async () => {
  const asset = IMAGEGEN_REBOOT_RESULT_VERDICT_RIBBONS;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = 390;
  for (let cell = 0; cell < 2; cell += 1) {
    const x0 = cell * cellWidth;
    const corners = [
      alphaAt(image, x0 + 2, 2),
      alphaAt(image, x0 + cellWidth - 3, 2),
      alphaAt(image, x0 + 2, image.height - 3),
      alphaAt(image, x0 + cellWidth - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 32);
    const centerCoverage = alphaCoverage(image, { x: x0 + 34, y: 30, width: 322, height: 104 }, 48);

    assert.equal(corners.every((alpha) => alpha < 12), true, `verdict ribbon cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 12_000, true, `verdict ribbon cell ${cell} has no readable panel art`);
    assert.equal(centerCoverage > 0.28, true, `verdict ribbon cell ${cell} lacks a solid copy plate center`);
    assert.equal(centerCoverage < 0.86, true, `verdict ribbon cell ${cell} is too opaque for readable copy`);
    assert.equal(bounds.minX >= 6, true, `verdict ribbon cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 7, true, `verdict ribbon cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 4, true, `verdict ribbon cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 5, true, `verdict ribbon cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('result title wordmarks are transparent generated Korean payoff assets', async () => {
  for (const asset of IMAGEGEN_REBOOT_RESULT_TITLE_WORDMARKS) {
    const source = await readFile(asset.source);
    const runtime = await readFile(asset.path);
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
    assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
    assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
    assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
    assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
    assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

    const image = parsePng(runtime);
    const corners = [
      alphaAt(image, 2, 2),
      alphaAt(image, image.width - 3, 2),
      alphaAt(image, 2, image.height - 3),
      alphaAt(image, image.width - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 32);
    const centerCoverage = alphaCoverage(
      image,
      {
        x: Math.round(image.width * 0.08),
        y: Math.round(image.height * 0.22),
        width: Math.round(image.width * 0.84),
        height: Math.round(image.height * 0.56)
      },
      48
    );
    const magentaFringeRatio = colorRatio(image, { x: 0, y: 0, width: image.width, height: image.height }, (r, g, b) => (
      r > 220 && b > 185 && g < 95
    ));

    assert.equal(corners.every((alpha) => alpha < 10), true, `${asset.path} keeps opaque chroma-key corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 75_000, true, `${asset.path} has too little readable generated title art: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minX >= 8, true, `${asset.path} clips title art on the left: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= image.width - 9, true, `${asset.path} clips title art on the right: ${JSON.stringify(bounds)}`);
    assert.equal(centerCoverage > 0.28, true, `${asset.path} lacks a dense Korean title center: ${centerCoverage}`);
    assert.equal(centerCoverage < 0.94, true, `${asset.path} is an opaque slab instead of transparent wordmark art: ${centerCoverage}`);
    assert.equal(magentaFringeRatio < 0.002, true, `${asset.path} still has visible chroma-key fringe: ${magentaFringeRatio}`);
  }
});

test('meta objective rail cells turn mission and season rows into generated board nodes', async () => {
  const asset = IMAGEGEN_REBOOT_META_OBJECTIVE_RAILS;
  const source = await readFile(asset.source);
  const runtime = await readFile(asset.path);
  assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.source);
  assert.equal(runtime.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', asset.path);
  assert.equal(runtime[25], 6, `${asset.path} must be RGBA`);
  assert.equal(runtime.readUInt32BE(16), asset.width, asset.path);
  assert.equal(runtime.readUInt32BE(20), asset.height, asset.path);
  assert.equal(runtime.length > asset.minRuntimeBytes, true, asset.path);

  const image = parsePng(runtime);
  const cellWidth = 390;
  for (let cell = 0; cell < 2; cell += 1) {
    const x0 = cell * cellWidth;
    const corners = [
      alphaAt(image, x0 + 2, 2),
      alphaAt(image, x0 + cellWidth - 3, 2),
      alphaAt(image, x0 + 2, image.height - 3),
      alphaAt(image, x0 + cellWidth - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 32);
    const centerCoverage = alphaCoverage(image, { x: x0 + 28, y: 20, width: 334, height: 72 }, 48);

    assert.equal(corners.every((alpha) => alpha < 12), true, `objective rail cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 8_000, true, `objective rail cell ${cell} has no readable generated rail`);
    assert.equal(centerCoverage > 0.12, true, `objective rail cell ${cell} lacks a readable central track`);
    assert.equal(centerCoverage < 0.99, true, `objective rail cell ${cell} is a fully opaque slab behind row copy`);
    assert.equal(bounds.minX >= 6, true, `objective rail cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 7, true, `objective rail cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 4, true, `objective rail cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 5, true, `objective rail cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('reward reveal panel stays transparent at the edges with a readable center socket', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-reward-reveal-panel.png'));
  const corners = [
    alphaAt(image, 0, 0),
    alphaAt(image, image.width - 1, 0),
    alphaAt(image, 0, image.height - 1),
    alphaAt(image, image.width - 1, image.height - 1)
  ];
  const center = alphaCoverage(image, { x: 150, y: 70, width: 130, height: 118 }, 180);
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 32);

  assert.equal(corners.every((alpha) => alpha < 10), true, 'reward reveal panel must not render as an opaque web rectangle');
  assert.equal(center > 0.48, true, `reward reveal center is too empty: ${center}`);
  assert.equal(bounds.count > 18_000, true, `reward reveal panel has too little generated art: ${bounds.count}`);
  assert.equal(bounds.minX >= 8, true, `reward reveal panel clips left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= image.width - 9, true, `reward reveal panel clips right edge: ${JSON.stringify(bounds)}`);
});

test('result medal cells stay readable and transparent for phone result strips', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-result-medals.png'));
  const cellWidth = 256;
  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 2_000, true, `result medal cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 12, true, `result medal cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 13, true, `result medal cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 10, true, `result medal cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 11, true, `result medal cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('result reward capsule cells stay transparent and read as collectible loot objects', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-result-reward-capsules.png'));
  for (let cell = 0; cell < 3; cell += 1) {
    const x0 = Math.round((cell * image.width) / 3);
    const x1 = Math.round(((cell + 1) * image.width) / 3);
    const cellWidth = x1 - x0;
    const corners = [
      alphaAt(image, x0 + 2, 2),
      alphaAt(image, x1 - 3, 2),
      alphaAt(image, x0 + 2, image.height - 3),
      alphaAt(image, x1 - 3, image.height - 3)
    ];
    const bounds = alphaBounds(image, { x: x0, y: 0, width: cellWidth, height: image.height }, 32);
    const centerCoverage = alphaCoverage(
      image,
      {
        x: x0 + Math.round(cellWidth * 0.26),
        y: Math.round(image.height * 0.24),
        width: Math.round(cellWidth * 0.48),
        height: Math.round(image.height * 0.52)
      },
      48
    );

    assert.equal(corners.every((alpha) => alpha < 10), true, `reward capsule cell ${cell} has opaque corners: ${corners.join(',')}`);
    assert.equal(bounds.count > 120_000, true, `reward capsule cell ${cell} has no readable generated object`);
    assert.equal(centerCoverage > 0.7, true, `reward capsule cell ${cell} lacks a dense loot-object center`);
    assert.equal(bounds.minX >= 36, true, `reward capsule cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 37, true, `reward capsule cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 40, true, `reward capsule cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 41, true, `reward capsule cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('result outcome stage cells stay transparent and readable behind the result medal', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-result-hero-stage.png'));
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const cellWidth = 390;

  assert.equal(corners.every((alpha) => alpha < 10), true, 'result outcome stage keeps transparent atlas corners');
  for (let cell = 0; cell < 2; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 10_000, true, `result outcome stage cell ${cell} has no readable diorama`);
    assert.equal(bounds.minX >= 48, true, `result outcome stage cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 49, true, `result outcome stage cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `result outcome stage cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `result outcome stage cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('cosmetic equip aura cells stay transparent and readable behind shop icons', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-cosmetic-equip-aura.png'));
  const cellWidth = 128;
  for (let cell = 0; cell < 5; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 1_400, true, `cosmetic equip aura cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 5, true, `cosmetic equip aura cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 6, true, `cosmetic equip aura cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 6, true, `cosmetic equip aura cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 7, true, `cosmetic equip aura cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('battle cosmetic sigil cells stay transparent and readable under the player board', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-battle-cosmetic-sigils.png'));
  const cellWidth = 192;
  for (let cell = 0; cell < 5; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 28);
    assert.equal(bounds.count > 1_700, true, `battle cosmetic sigil cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 8, true, `battle cosmetic sigil cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 9, true, `battle cosmetic sigil cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `battle cosmetic sigil cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `battle cosmetic sigil cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('lobby next action beacon cells stay transparent and readable inside the recommendation strip', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-lobby-next-beacons.png'));
  const cellWidth = 128;
  for (let cell = 0; cell < 4; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 28);
    assert.equal(bounds.count > 1_500, true, `lobby next beacon cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 8, true, `lobby next beacon cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 9, true, `lobby next beacon cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `lobby next beacon cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `lobby next beacon cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('combat coach cue cells keep each teaching prompt visible and padded', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-coach-cues.png'));
  const cellWidth = 256;
  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 3_500, true, `combat coach cue cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 8, true, `combat coach cue cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 9, true, `combat coach cue cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 4, true, `combat coach cue cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 5, true, `combat coach cue cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('combat first tap cue atlas keeps four transparent readable tutorial prompts', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-first-tap-cue.png'));
  const cellWidth = 256;
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];

  assert.equal(image.width, 1024);
  assert.equal(image.height, 256);
  assert.equal(corners.every((alpha) => alpha < 10), true, `tap cue atlas has opaque corners: ${corners.join(',')}`);

  for (let cell = 0; cell < 4; cell += 1) {
    const rect = { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height };
    const bounds = alphaBounds(image, rect, 28);
    const coverage = alphaCoverage(image, rect, 28);
    const greenScreenRatio = colorRatio(image, rect, (r, g, b) => g > 180 && r < 80 && b < 80);

    assert.equal(bounds.count > 12_000, true, `tap cue cell ${cell} has no readable generated subject`);
    assert.equal(coverage > 0.18, true, `tap cue cell ${cell} is too sparse: ${coverage}`);
    assert.equal(coverage < 0.42, true, `tap cue cell ${cell} is too dense for an overlay: ${coverage}`);
    assert.equal(bounds.minX >= 12, true, `tap cue cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 13, true, `tap cue cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 12, true, `tap cue cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 13, true, `tap cue cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
    assert.equal(greenScreenRatio < 0.0001, true, `tap cue cell ${cell} keeps chroma-key green: ${greenScreenRatio}`);
  }
});

test('first summon landing beacon is a transparent generated battlefield object', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-first-summon-landing-beacon.png'));
  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 32);
  const centerCoverage = alphaCoverage(image, { x: 143, y: 143, width: 226, height: 226 }, 48);

  assert.equal(corners.every((alpha) => alpha < 10), true, `landing beacon has opaque corners: ${corners.join(',')}`);
  assert.equal(bounds.count > 90_000, true, `landing beacon has no readable generated subject: ${bounds.count}`);
  assert.equal(centerCoverage > 0.9, true, `landing beacon center is too sparse: ${centerCoverage}`);
  assert.equal(bounds.minX >= 24, true, `landing beacon touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= image.width - 25, true, `landing beacon touches right edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.minY >= 32, true, `landing beacon touches top edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxY <= image.height - 33, true, `landing beacon touches bottom edge: ${JSON.stringify(bounds)}`);
});

test('unit activation ring is a transparent generated battlefield pedestal, not a button', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-unit-activation-ring.png'));
  assert.equal(image.width, 512);
  assert.equal(image.height, 512);

  const corners = [
    alphaAt(image, 2, 2),
    alphaAt(image, image.width - 3, 2),
    alphaAt(image, 2, image.height - 3),
    alphaAt(image, image.width - 3, image.height - 3)
  ];
  const bounds = alphaBounds(image, { x: 0, y: 0, width: image.width, height: image.height }, 32);
  const ringCoverage = alphaCoverage(image, { x: 54, y: 122, width: 404, height: 248 }, 48);
  const centerHole = alphaCoverage(image, { x: 194, y: 206, width: 124, height: 92 }, 48);

  assert.equal(corners.every((alpha) => alpha < 10), true, `unit activation ring has opaque corners: ${corners.join(',')}`);
  assert.equal(bounds.count > 75_000, true, `unit activation ring has no readable generated subject: ${bounds.count}`);
  assert.equal(ringCoverage > 0.52, true, `unit activation ring does not read as a powered pedestal: ${ringCoverage}`);
  assert.equal(centerHole < 0.28, true, `unit activation ring center is too filled and will hide the unit: ${centerHole}`);
  assert.equal(bounds.minX >= 20, true, `unit activation ring touches left edge: ${JSON.stringify(bounds)}`);
  assert.equal(bounds.maxX <= image.width - 21, true, `unit activation ring touches right edge: ${JSON.stringify(bounds)}`);
});

test('combat action stamp cells stay compact so success feedback does not cover the battlefield', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-action-stamps.png'));
  const cellWidth = 256;
  assert.equal(image.width, cellWidth * 3);
  assert.equal(image.height, 128);

  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 28);
    assert.equal(bounds.count > 3_000, true, `action stamp cell ${cell} has no readable stamp`);
    assert.equal(bounds.minX >= 10, true, `action stamp cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 11, true, `action stamp cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 8, true, `action stamp cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `action stamp cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('combat reveal VFX atlas keeps each random-action reveal readable and padded', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-reveal-vfx.png'));
  const cellWidth = 480;
  assert.equal(image.width, cellWidth * 4);
  assert.equal(image.height, 512);

  for (let cell = 0; cell < 4; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 32);
    assert.equal(bounds.count > 20_000, true, `combat reveal VFX cell ${cell} has no readable subject`);
    assert.equal(bounds.minX >= 20, true, `combat reveal VFX cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 21, true, `combat reveal VFX cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 24, true, `combat reveal VFX cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 23, true, `combat reveal VFX cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('summon ignition VFX cells keep board-to-track feedback readable', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-summon-ignition-vfx.png'));
  const cellWidth = 256;
  assert.equal(image.width, cellWidth * 3);
  assert.equal(image.height, 256);

  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 24);
    assert.equal(bounds.count > 1_800, true, `summon ignition cell ${cell} has no visible subject`);
    assert.equal(bounds.minX >= 4, true, `summon ignition cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 5, true, `summon ignition cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 4, true, `summon ignition cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 5, true, `summon ignition cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('enemy track trail cells keep enemies grounded on the imagegen map', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-enemy-track-trails.png'));
  const cellWidth = 256;
  assert.equal(image.width, cellWidth * 4);
  assert.equal(image.height, 128);

  for (let cell = 0; cell < 4; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 24);
    assert.equal(bounds.count > 1_500, true, `enemy track trail cell ${cell} has no readable ground contact art`);
    assert.equal(bounds.minX >= 20, true, `enemy track trail cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 21, true, `enemy track trail cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 10, true, `enemy track trail cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 9, true, `enemy track trail cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});

test('enemy impact burst cells keep hits readable without becoming screen-wide beams', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-enemy-impact-bursts.png'));
  const cellWidth = 256;
  assert.equal(image.width, cellWidth * 3);
  assert.equal(image.height, 160);

  for (let cell = 0; cell < 3; cell += 1) {
    const bounds = alphaBounds(image, { x: cell * cellWidth, y: 0, width: cellWidth, height: image.height }, 28);
    assert.equal(bounds.count > 2_000, true, `enemy impact burst cell ${cell} has no readable hit contact art`);
    assert.equal(bounds.minX >= 16, true, `enemy impact burst cell ${cell} touches left edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxX <= cellWidth - 17, true, `enemy impact burst cell ${cell} touches right edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.minY >= 10, true, `enemy impact burst cell ${cell} touches top edge: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.maxY <= image.height - 11, true, `enemy impact burst cell ${cell} touches bottom edge: ${JSON.stringify(bounds)}`);
  }
});
