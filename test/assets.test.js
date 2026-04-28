import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { NOISE_TYPES } from '../src/shared/content.js';

const GENERATED_ASSETS = [
  'src/client/assets/generated/signal-relay-playfield-frame.png',
  'src/client/assets/generated/noise-enemy-atlas.png',
  'src/client/assets/generated/boss-disruption-atlas.png',
  'src/client/assets/generated/ui-icon-atlas.png'
];

const GRID_ASSETS = [
  { path: 'src/client/assets/generated/noise-enemy-atlas.png', columns: 4, rows: 2 },
  { path: 'src/client/assets/generated/boss-disruption-atlas.png', columns: 3, rows: 1 },
  { path: 'src/client/assets/generated/ui-icon-atlas.png', columns: 4, rows: 3 }
];

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

test('noise roster exposes atlas indices for generated enemy sprites', () => {
  for (const [id, spec] of Object.entries(NOISE_TYPES)) {
    assert.equal(Number.isInteger(spec.atlasIndex), true, id);
    assert.equal(spec.atlasIndex >= 0, true, id);
  }
});
