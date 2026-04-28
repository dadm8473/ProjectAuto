import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCanvasViewport } from '../src/client/render_layout.js';

test('combat canvas fills tall mobile stage instead of leaving a dead gap', () => {
  const viewport = computeCanvasViewport({ stageWidth: 390, stageHeight: 625 });

  assert.equal(viewport.viewWidth, 390);
  assert.equal(viewport.displayWidth, 390);
  assert.equal(viewport.displayHeight, 625);
  assert.equal(viewport.viewHeight, 625);
});

test('combat canvas keeps a usable minimum height on short viewports', () => {
  const viewport = computeCanvasViewport({ stageWidth: 390, stageHeight: 420 });

  assert.equal(viewport.viewHeight, 500);
  assert.equal(viewport.displayWidth, 327);
  assert.equal(viewport.displayHeight, 420);
});

test('combat canvas fills large phone stages without reintroducing letterbox', () => {
  const viewport = computeCanvasViewport({ stageWidth: 390, stageHeight: 713 });

  assert.equal(viewport.viewHeight, 713);
  assert.equal(viewport.displayWidth, 390);
  assert.equal(viewport.displayHeight, 713);
});
