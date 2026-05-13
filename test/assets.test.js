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
    path: 'src/client/assets/generated/reboot-result-panel-frame.png',
    source: 'docs/design/generation/source/reboot/style-lock/20260514-result-panel-frame-imagegen.png',
    width: 390,
    height: 560,
    minRuntimeBytes: 90_000
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

test('generated gameplay atlases are committed as valid png assets', async () => {
  for (const path of GENERATED_ASSETS) {
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', path);
    assert.equal(bytes.length > 100_000, true, path);
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
