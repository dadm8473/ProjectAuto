import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('battle renderer includes commercial battlefield depth layers', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  for (const marker of [
    'function drawStageChrome',
    'function drawTrackLaneMarkers',
    'function drawNoiseWake',
    'function drawThreatTelemetry',
    'drawStageChrome(state);',
    'drawTrackLaneMarkers(state);',
    'drawThreatTelemetry(state);'
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
});

test('mobile shell uses integrated app chrome and tactile controls', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  for (const marker of [
    '.stage-wrap::before',
    '.stage-wrap::after',
    '.action-panel::before',
    '.primary-actions button::after',
    'backdrop-filter:',
    'isolation: isolate'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('canvas presentation avoids duplicating the shell resource HUD', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  assert.equal(source.includes('drawCanvasHud(state);'), false);
});

test('mobile shell keeps dynamic viewport height for browser chrome changes', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  assert.equal(css.includes('height: 100dvh;'), true);
});
