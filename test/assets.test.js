import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { NOISE_TYPES } from '../src/shared/content.js';

const GENERATED_ASSETS = [
  'src/client/assets/generated/noise-enemy-atlas.png',
  'src/client/assets/generated/boss-disruption-atlas.png',
  'src/client/assets/generated/ui-icon-atlas.png'
];

test('generated gameplay atlases are committed as valid png assets', async () => {
  for (const path of GENERATED_ASSETS) {
    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', path);
    assert.equal(bytes.length > 100_000, true, path);
  }
});

test('noise roster exposes atlas indices for generated enemy sprites', () => {
  for (const [id, spec] of Object.entries(NOISE_TYPES)) {
    assert.equal(Number.isInteger(spec.atlasIndex), true, id);
    assert.equal(spec.atlasIndex >= 0, true, id);
  }
});
