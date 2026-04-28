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

test('result presentation is owned by the app shell overlay', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  assert.equal(source.includes("ctx.fillText(state.won ? 'SIGNAL LOCK' : 'SIGNAL LOST'"), false);
  assert.equal(source.includes('syncResultOverlay(state);'), true);
  assert.equal(source.includes('let resultView = null;'), true);
  assert.equal(source.includes('function buildResultView'), true);
  assert.equal(source.includes('reason: state.result.text || state.resultReason'), false);
  assert.equal(source.includes('reason,'), true);
  assert.equal(source.includes('if (resultView) return;'), true);
});

test('mobile shell keeps dynamic viewport height for browser chrome changes', async () => {
  const css = await readFile('src/client/styles.css', 'utf8');
  assert.equal(css.includes('height: 100dvh;'), true);
});

test('app shell has a commercial launch layer before combat starts', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'id="launchOverlay"',
    'id="launchBotButton"',
    'id="launchOnlineButton"',
    'class="launch-contract"',
    'id="resultOverlay"',
    'id="resultReason"',
    'id="resultReward"',
    'id="resultRetryButton"',
    'id="resultLobbyButton"'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }
  for (const marker of [
    'let runStarted = false;',
    'function closeSocket',
    'function hideLaunchOverlay',
    'function startBotRun',
    'function syncResultOverlay',
    'function setLaunchConnecting',
    'function syncModeButtons',
    'if (socket !== activeSocket) return;',
    'if (runStarted && !online) tickGame(game, dt);'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
  for (const marker of [
    '.launch-overlay',
    '.launch-panel',
    '.launch-actions',
    '.launch-contract',
    '.result-overlay',
    '.result-panel',
    '.result-reason',
    '.result-reward',
    'inset: 0;',
    'z-index: 20;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('online launch waits for an open socket before starting the run', async () => {
  const js = await readFile('src/client/app.js', 'utf8');
  const connectStart = js.indexOf('function connectOnline()');
  const connectEnd = js.indexOf("canvas.addEventListener('pointerdown'");
  assert.notEqual(connectStart, -1);
  assert.notEqual(connectEnd, -1);
  const connectBody = js.slice(connectStart, connectEnd);
  const newSocketStart = connectBody.indexOf('const activeSocket = new WebSocket');
  assert.notEqual(newSocketStart, -1);
  const beforeOpen = connectBody.slice(newSocketStart, connectBody.indexOf("activeSocket.addEventListener('open'"));
  const openHandler = connectBody.slice(connectBody.indexOf("activeSocket.addEventListener('open'"), connectBody.indexOf("activeSocket.addEventListener('message'"));
  const closeHandler = connectBody.slice(connectBody.indexOf("activeSocket.addEventListener('close'"));

  assert.equal(beforeOpen.includes('hideLaunchOverlay();'), false);
  assert.equal(openHandler.includes('hideLaunchOverlay();'), true);
  assert.equal(connectBody.includes('setLaunchConnecting(true);'), true);
  assert.equal(closeHandler.includes('if (!runStarted) {'), true);
  assert.equal(closeHandler.includes("showToast('Online unavailable.');"), true);
  assert.equal(closeHandler.includes('if (socket !== activeSocket) return;'), true);
});

test('combat mode buttons cannot wipe an active run', async () => {
  const js = await readFile('src/client/app.js', 'utf8');
  assert.equal(js.includes('const modeLocked = runStarted;'), true);
  assert.equal(js.includes('botButton.disabled = modeLocked;'), true);
  assert.equal(js.includes('onlineButton.disabled = modeLocked || socket?.readyState === WebSocket.CONNECTING;'), true);
  assert.equal(js.includes('if (runStarted) return;'), true);
  assert.equal(js.includes("document.querySelector('#botButton').addEventListener"), false);
});
