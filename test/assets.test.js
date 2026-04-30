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
  { path: 'src/client/assets/generated/reboot-board-accents.png', width: 1280, height: 256, columns: 5, rows: 1 }
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
