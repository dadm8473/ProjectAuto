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

test('combat renderer gives enemies direction and relays tier feedback', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  for (const marker of [
    'function noiseHeading',
    'function drawNoiseSprite',
    'function drawNoiseGrounding',
    'function drawRelayTierHalo',
    'ctx.rotate(heading);',
    'drawNoiseSprite(noise, pos, spec, iconSize);',
    'drawRelayTierHalo(relay,',
    'relay.tier > 1'
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
  assert.equal(source.includes('GRADE_ORDER.indexOf'), false);
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

test('vertical mobile playfield is framed as one app surface', async () => {
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    '.shell::before',
    '.shell::after',
    '.action-panel::after',
    '@media (max-height: 720px)',
    'height: 100%;',
    'max-height: none;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
  for (const marker of [
    'function drawBoardConnectors',
    'function drawRunSpine',
    'drawBoardConnectors(state);',
    'drawRunSpine(state);'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
});

test('combat renderer adds projectile signatures and tactile impact layers', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  for (const marker of [
    'function screenShakeOffset',
    'function drawProjectileSignature',
    'function drawRewardFlyout',
    'ctx.translate(shake.x, shake.y);',
    'drawProjectileSignature(state, effect, from, to, spec, alpha);',
    'drawRewardFlyout(effect, to, alpha);'
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
});

test('service shell has launch loadout art and sectioned reward flow', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'class="launch-loadout"',
    'class="launch-chip"',
    'class="launch-map-preview"'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }
  for (const marker of [
    'function buildShopSection',
    'class="shop-section"',
    'class="track-row"',
    'class="mission-row"'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
  for (const marker of [
    '.launch-map-preview',
    '.launch-loadout',
    '.shop-section',
    '.track-row',
    'signal-relay-playfield-frame.png'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
});

test('client stores meta progression and shows earned run rewards', async () => {
  const js = await readFile('src/client/app.js', 'utf8');
  for (const marker of [
    'PROFILE_STORAGE_KEY',
    'function loadMetaProfile',
    'function saveMetaProfile',
    'function applyProfileToGame',
    'function syncProfileAfterPurchase',
    'applyRunToProfile(metaProfile, settledState)',
    'startingProfileGems',
    'online ? activeRunProfileGems',
    'onlineProfileSpentGems',
    'online ? metaProfile.gems',
    "action.type === 'buy' ? { profile: { gems: metaProfile.gems, unlocks: metaProfile.unlocks } }",
    "message.type === 'action_result'",
    'summary.totalGems',
    'data-claimed="true"',
    'data-claimed="false"'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
});

test('mobile combat controls collapse to three core actions', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  const primary = html.slice(html.indexOf('class="primary-actions"'), html.indexOf('class="secondary-actions"'));
  const secondary = html.slice(html.indexOf('class="secondary-actions"'), html.indexOf('</section>', html.indexOf('class="secondary-actions"')));

  for (const marker of ['id="supplyButton"', 'id="mergeButton"', 'id="pulseButton"']) {
    assert.equal(primary.includes(marker), true, marker);
  }
  for (const marker of ['id="swapButton"', 'id="focusButton"', 'id="overclockButton"', 'id="botButton"', 'id="onlineButton"']) {
    assert.equal(html.includes(marker), false, marker);
  }
  assert.equal((primary.match(/<button/g) ?? []).length, 3);
  assert.equal((secondary.match(/<button/g) ?? []).length, 1);
  assert.equal(secondary.includes('id="shopButton"'), true);
  assert.equal(js.includes('function prepareAction'), true);
  assert.equal(js.includes('state.actionState?.[localBoardId]?.merge.slots'), true);
  assert.equal(js.includes('selected.length === 3 ? selected : state.actionState?.[localBoardId]?.merge.slots'), false);
  assert.equal(js.includes('drawRewardFlyout(effect, center, alpha);'), true);
  assert.equal(css.includes('--action-panel-base: 144px;'), true);
});

test('mobile combat controls are thumb-safe without adding more visible commands', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'role="toolbar"',
    'aria-label="전투 행동"',
    'aria-label="전력으로 릴레이 설치"',
    'aria-label="같은 릴레이 3개 합성"',
    'aria-label="파트너 펄스"',
    'aria-label="보상과 미션"'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }
  for (const marker of [
    'overscroll-behavior: none;',
    'touch-action: manipulation;',
    'user-select: none;',
    '-webkit-user-select: none;',
    '.primary-actions button {\n  min-height: 44px;',
    '.secondary-actions button {\n  min-height: 44px;'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
  const shortViewportCss = css.slice(css.indexOf('@media (max-height: 720px)'));
  assert.equal(shortViewportCss.includes('min-height: 40px;'), false);
  assert.equal(shortViewportCss.includes('min-height: 31px;'), false);
  for (const marker of [
    "button.setAttribute('aria-disabled', String(!enabled));",
    "button.setAttribute('aria-label', accessibleLabel);",
    "setActionButton(actionButtons.supply, '보급', actions.supply.available, actions.supply.reason, '전력으로 릴레이 설치');",
    "'같은 릴레이 3개 합성'",
    'const pulseAccessibleLabel = actions.linkPulse.cooldownRemaining > 0',
    '파트너 펄스 ${Math.ceil(actions.linkPulse.cooldownRemaining)}초',
    'pulseAccessibleLabel'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
});

test('first play guidance highlights existing actions instead of adding tutorial buttons', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'id="coachCue"',
    'aria-live="polite"',
    'function syncCoachCue',
    'state.onboarding?.cues?.[localBoardId]',
    'button.dataset.coach = String(cue?.action === action);',
    'syncCoachCue(state);'
  ]) {
    assert.equal(`${html}\n${js}`.includes(marker), true, marker);
  }
  for (const marker of [
    '.coach-cue',
    '[data-coach="true"]',
    '@keyframes coachPulse'
  ]) {
    assert.equal(css.includes(marker), true, marker);
  }
  assert.equal(html.includes('id="tutorialButton"'), false);
  assert.equal(html.includes('class="tutorial-panel"'), false);
});

test('combat moments trigger sensory feedback without visible controls', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    'let audioContext = null;',
    'const sensoryMuted = new URLSearchParams(location.search).has(\'mute\');',
    'const feedbackSeenEvents = new Set();',
    'function unlockSensoryFeedback',
    'function playFeedbackTone',
    'function pulseHaptics',
    'function feedbackForEvent',
    'function seedFeedbackSeenEvents',
    'function attachFeedbackBaseline',
    'function syncSensoryFeedback',
    "event.type === 'supply'",
    "event.type === 'merge'",
    "event.type === 'link_pulse_save'",
    "event.type === 'boss_wave_started'",
    "event.type === 'loop_complete'",
    "event.type === 'run_finished'",
    'navigator.vibrate?.(pattern);',
    'if (sensoryMuted) return null;',
    'if (sensoryMuted) return;',
    'audioContext.resume().catch(() => {});',
    'if (state.id !== feedbackRunId) {',
    'seedFeedbackSeenEvents(state);',
    'return;',
    'attachFeedbackBaseline();',
    'const previousStateId = game?.id;',
    'if (game.id !== previousStateId) attachFeedbackBaseline(game);',
    'syncSensoryFeedback(state);',
    'unlockSensoryFeedback();'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
  assert.equal(html.includes('id="soundButton"'), false);
  assert.equal(html.includes('id="hapticButton"'), false);
});

test('combat surface previews merge readiness and Pulse clutch without extra controls', async () => {
  const js = await readFile('src/client/app.js', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');

  for (const marker of [
    'function autoMergeSlots',
    'function mergeCueSlots',
    'function drawMergeReadyCue',
    'function drawPulseCoolingWave',
    'function drawOverdriveBurst',
    'drawMergeReadyCue(state, playerId, rect);',
    'drawPulseCoolingWave(state, effect, alpha);',
    'drawOverdriveBurst(state, effect, alpha);',
    'state.actionState?.[playerId]?.merge.previewSlots',
    'actions.linkPulse.clutch',
    'actionButtons.pulse.dataset.clutch'
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }
  assert.equal(css.includes('#pulseButton[data-clutch="true"]'), true);
});

test('browser chrome has a committed icon to avoid favicon noise in smoke tests', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.equal(html.includes('rel="icon"'), true);
  assert.equal(html.includes('ui-icon-atlas.png'), true);
});

test('canvas presentation avoids duplicating the shell resource HUD', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  assert.equal(source.includes('drawCanvasHud(state);'), false);
});

test('result presentation is owned by the app shell overlay', async () => {
  const source = await readFile('src/client/app.js', 'utf8');
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/client/styles.css', 'utf8');
  assert.equal(source.includes("ctx.fillText(state.won ? 'SIGNAL LOCK' : 'SIGNAL LOST'"), false);
  assert.equal(source.includes('syncResultOverlay(state);'), true);
  assert.equal(source.includes('let resultView = null;'), true);
  assert.equal(source.includes('function buildResultView'), true);
  assert.equal(source.includes('function renderResultHighlights'), true);
  assert.equal(source.includes('function renderResultProgress'), true);
  assert.equal(source.includes('buildRunHighlights(settledState, summary)'), true);
  assert.equal(source.includes('resultHighlights.replaceChildren'), true);
  assert.equal(source.includes('resultProgress.replaceChildren'), true);
  assert.equal(source.includes('reason: state.result.text || state.resultReason'), false);
  assert.equal(source.includes('reason,'), true);
  assert.equal(source.includes('if (resultView) return;'), true);
  assert.equal(html.includes('id="resultHighlights"'), true);
  assert.equal(html.includes('id="resultProgress"'), true);
  assert.equal(css.includes('.result-highlights'), true);
  assert.equal(css.includes('.result-progress'), true);
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
  assert.equal(closeHandler.includes("showToast('온라인 연결 실패.');"), true);
  assert.equal(closeHandler.includes('if (socket !== activeSocket) return;'), true);
});

test('core app copy is Korean and removes unclear BM/resource abbreviations', async () => {
  const html = await readFile('index.html', 'utf8');
  const js = await readFile('src/client/app.js', 'utf8');

  for (const marker of [
    '<title>시그널 릴레이</title>',
    '<strong>시그널 릴레이</strong>',
    '봇 협동',
    '전력 110',
    '링크 50',
    '젬 30',
    '봇과 시작',
    '온라인 매칭',
    '보상 / 미션',
    'id="shopButton" aria-label="보상과 미션">보상</button>'
  ]) {
    assert.equal(html.includes(marker), true, marker);
  }

  for (const marker of [
    'chargeMeter.textContent = `전력 ${Math.floor(state.resources.charge)}`;',
    'linkMeter.textContent = `링크 ${Math.floor(state.resources.linkEnergy)}`;',
    'gemMeter.textContent = `젬 ${online ? metaProfile.gems : Math.floor(state.resources.gems)}`;',
    'waveMeter.textContent = `웨이브 ${Math.min(state.wave.index + 1, GAME_RULES.maxWave)}`;',
    'signalMeter.textContent = `신호 ${Math.ceil(state.signal.integrity)} / 오염 ${Math.floor(state.saturation.count)}`;',
    "bossMeter.textContent = state.boss.active ? `보스 ${Math.ceil(state.boss.timer)}초` : '보스 --';",
    "buildShopSection('해금'",
    "buildShopSection('미션'",
    "buildShopSection('시즌 트랙'"
  ]) {
    assert.equal(js.includes(marker), true, marker);
  }

  assert.equal(html.includes('BM'), false);
  assert.equal(html.includes('C 110'), false);
  assert.equal(html.includes('L 50'), false);
  assert.equal(html.includes('G 30'), false);
});

test('combat mode changes stay on the launch layer', async () => {
  const js = await readFile('src/client/app.js', 'utf8');
  const html = await readFile('index.html', 'utf8');
  assert.equal(html.includes('id="launchBotButton"'), true);
  assert.equal(html.includes('id="launchOnlineButton"'), true);
  assert.equal(html.includes('id="botButton"'), false);
  assert.equal(html.includes('id="onlineButton"'), false);
  assert.equal(js.includes('function syncModeButtons'), false);
  assert.equal(js.includes("document.querySelector('#botButton').addEventListener"), false);
});
