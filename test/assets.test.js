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
  { path: 'src/client/assets/generated/reboot-unit-atlas.png', width: 1280, height: 256, columns: 5, rows: 1 },
  { path: 'src/client/assets/generated/reboot-enemy-atlas.png', width: 1024, height: 256, columns: 4, rows: 1 },
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
    path: 'src/client/assets/generated/reboot-hero-squad.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-hero-squad-imagegen.png',
    width: 640,
    height: 512,
    minRuntimeBytes: 80_000
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
    path: 'src/client/assets/generated/reboot-training-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-training-banner-imagegen.png',
    width: 430,
    height: 160,
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-shop-banner.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-shop-banner-imagegen.png',
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
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-combat-action-buttons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-action-buttons-imagegen.png',
    width: 1170,
    height: 112,
    minRuntimeBytes: 90_000
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
    minRuntimeBytes: 70_000
  },
  {
    path: 'src/client/assets/generated/reboot-result-copy-plates.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-copy-plates-imagegen.png',
    width: 780,
    height: 112,
    minRuntimeBytes: 80_000
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
    source: 'docs/design/generation/source/reboot/style-lock/20260514-nav-button-glow-imagegen.png',
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
    path: 'src/client/assets/generated/reboot-meta-action-buttons.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-action-buttons-imagegen.png',
    width: 720,
    height: 96,
    minRuntimeBytes: 70_000
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
    path: 'src/client/assets/generated/reboot-meta-list-shutter.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-meta-list-shutter-imagegen.png',
    width: 430,
    height: 184,
    minRuntimeBytes: 80_000
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
    path: 'src/client/assets/generated/reboot-combat-coach-cues.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-combat-coach-cues-chromakey-imagegen.png',
    width: 768,
    height: 144,
    minRuntimeBytes: 20_000
  },
  {
    path: 'src/client/assets/generated/reboot-partner-assist-pings.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-partner-assist-pings-chromakey-imagegen.png',
    width: 640,
    height: 100,
    minRuntimeBytes: 18_000
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
  }
];

const IMAGEGEN_REBOOT_ATLASES = [
  {
    path: 'src/client/assets/generated/reboot-unit-atlas.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-unit-atlas-imagegen.png',
    width: 1280,
    height: 256,
    minRuntimeBytes: 80_000
  },
  {
    path: 'src/client/assets/generated/reboot-enemy-atlas.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260513-enemy-atlas-imagegen.png',
    width: 1024,
    height: 256,
    minRuntimeBytes: 70_000
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

function alphaMean(image, rect) {
  let total = 0;
  let sum = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      total += 1;
      sum += image.pixels[offset + 3];
    }
  }
  return sum / total;
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

test('combat action dock shows status rail chrome instead of an empty socket row', async () => {
  const image = parsePng(await readFile('src/client/assets/generated/reboot-combat-action-dock.png'));
  const emptySocketDarkRatio = colorRatio(
    image,
    { x: 50, y: 58, width: 330, height: 62 },
    (r, g, b) => Math.max(r, g, b) < 35
  );
  const exposedPanelAlpha = alphaCoverage(image, { x: 60, y: 0, width: 310, height: 112 }, 1);
  const exposedPanelMean = alphaMean(image, { x: 60, y: 0, width: 310, height: 112 });

  assert.equal(emptySocketDarkRatio < 0.38, true, `action dock still exposes dark empty sockets: ${emptySocketDarkRatio}`);
  assert.equal(exposedPanelAlpha < 0.08, true, `action dock still exposes empty upper panels: ${exposedPanelAlpha}`);
  assert.equal(exposedPanelMean < 10, true, `action dock upper panel is still visibly opaque: ${exposedPanelMean}`);
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

test('reboot runtime overlay art is promoted from imagegen sources', async () => {
  for (const asset of IMAGEGEN_REBOOT_OVERLAYS) {
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

test('reboot lobby UI scene art is promoted from imagegen sources', async () => {
  for (const asset of IMAGEGEN_REBOOT_UI_SCENES) {
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
