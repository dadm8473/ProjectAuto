import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.argv[2] ?? 'http://localhost:4173/?mute=1';
const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];
const compactLobbyViewports = [
  { width: 320, height: 568 }
];

const localChromiumPaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
];

function withParam(url, key, value) {
  const next = new URL(url);
  next.searchParams.set(key, value);
  return next.toString();
}

async function assertNoErrors(errors, label) {
  assert.deepEqual(errors, [], `${label} console/page errors`);
}

async function assertMetaListReachesDock(page, selector, label) {
  const geometry = await page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const dock = document.querySelector('.bottom-dock')?.getBoundingClientRect();
    const cards = [...node.querySelectorAll('.screen-card')];
    const visibleCards = cards.filter((card) => {
      const cardRect = card.getBoundingClientRect();
      return cardRect.top < (dock?.top ?? 0) - 10 && cardRect.bottom > rect.top;
    }).length;
    return {
      listBottom: Math.round(rect.bottom),
      dockTop: Math.round(dock?.top ?? 0),
      listHeight: Math.round(rect.height),
      cardCount: cards.length,
      visibleCards
    };
  });
  assert.equal(
    geometry.listBottom >= geometry.dockTop - 18,
    true,
    `${label} list stops too high: ${JSON.stringify(geometry)}`
  );
  assert.equal(geometry.listHeight >= 560, true, `${label} list too short: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.visibleCards >= Math.min(3, geometry.cardCount),
    true,
    `${label} visible card density too low: ${JSON.stringify(geometry)}`
  );
}

async function assertActiveNavLabelPlate(page, expectedText, label) {
  const geometry = await page.locator('.bottom-dock button[data-nav-active="true"] > .nav-label').evaluate((node) => {
    const labelBox = node.getBoundingClientRect();
    const buttonBox = node.closest('button')?.getBoundingClientRect();
    const dockBox = document.querySelector('.bottom-dock')?.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: node.textContent?.trim(),
      display: style.display,
      opacity: Number.parseFloat(style.opacity),
      visibility: style.visibility,
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      borderRadius: style.borderTopLeftRadius,
      labelLeft: Math.round(labelBox.left),
      labelRight: Math.round(labelBox.right),
      labelTop: Math.round(labelBox.top),
      labelBottom: Math.round(labelBox.bottom),
      labelWidth: Math.round(labelBox.width),
      labelHeight: Math.round(labelBox.height),
      buttonLeft: Math.round(buttonBox?.left ?? 0),
      buttonRight: Math.round(buttonBox?.right ?? 0),
      buttonTop: Math.round(buttonBox?.top ?? 0),
      buttonBottom: Math.round(buttonBox?.bottom ?? 0),
      dockBottom: Math.round(dockBox?.bottom ?? 0)
    };
  });
  assert.equal(geometry.text, expectedText, `${label} active nav label text: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.display, 'block', `${label} active nav label hidden: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.visibility, 'visible', `${label} active nav label invisible: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.opacity >= 0.98, true, `${label} active nav label faded: ${JSON.stringify(geometry)}`);
  assert.match(geometry.backgroundImage, /reboot-nav-label-plate/, `${label} active nav label lacks generated plate`);
  assert.equal(geometry.backgroundSize, '100% 100%', `${label} active nav label plate is not stretched to plate`);
  assert.equal(geometry.borderRadius, '0px', `${label} active nav label still uses pill radius`);
  assert.equal(geometry.labelWidth >= 46, true, `${label} active nav label too narrow: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.labelHeight >= 22, true, `${label} active nav label too shallow: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.labelLeft >= geometry.buttonLeft + 2 && geometry.labelRight <= geometry.buttonRight - 2,
    true,
    `${label} active nav label escapes its button: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.labelTop >= geometry.buttonTop + 32 && geometry.labelBottom <= geometry.buttonBottom + 1,
    true,
    `${label} active nav label overlaps the icon lane: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.labelBottom <= geometry.dockBottom - 2,
    true,
    `${label} active nav label escapes the dock: ${JSON.stringify(geometry)}`
  );
}

async function assertMetaCaptionPlates(page, selector, label, expectedCount = 1) {
  const allCaptions = await page.locator(selector).evaluateAll((nodes) => nodes
    .map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        text: node.textContent?.trim(),
        display: style.display,
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    }));
  assert.equal(allCaptions.length, expectedCount, `${label} meta caption selector count changed: ${JSON.stringify(allCaptions)}`);
  const captions = allCaptions.filter((caption) => caption.width > 0 && caption.height > 0);
  assert.equal(captions.length, expectedCount, `${label} visible meta caption count changed: ${JSON.stringify(allCaptions)}`);
  for (const caption of captions) {
    assert.match(caption.backgroundImage, /reboot-meta-caption-plate/, `${label} caption lacks generated plate: ${JSON.stringify(caption)}`);
    assert.equal(caption.backgroundSize, '100% 100%', `${label} caption plate not fitted: ${JSON.stringify(caption)}`);
    assert.equal(caption.display, 'grid', `${label} caption display changed: ${JSON.stringify(caption)}`);
    assert.equal(caption.width >= 74, true, `${label} caption too narrow: ${JSON.stringify(caption)}`);
    assert.equal(caption.height >= 24, true, `${label} caption too shallow: ${JSON.stringify(caption)}`);
    assert.equal(caption.left >= 0 && caption.right <= caption.viewportWidth, true, `${label} caption leaves viewport: ${JSON.stringify(caption)}`);
    assert.equal(caption.top >= 0 && caption.bottom <= caption.viewportHeight, true, `${label} caption leaves vertical viewport: ${JSON.stringify(caption)}`);
  }
}

async function assertMetaShowcaseChips(page, selector, label, expectedCount) {
  const chips = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: node.textContent?.trim(),
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      borderRadius: style.borderTopLeftRadius,
      boxShadow: style.boxShadow,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  }));
  assert.equal(chips.length, expectedCount, `${label} showcase chip count changed: ${JSON.stringify(chips)}`);
  for (const chip of chips) {
    assert.match(chip.backgroundImage, /reboot-meta-caption-plate/, `${label} chip lacks generated plate: ${JSON.stringify(chip)}`);
    assert.equal(chip.backgroundSize, '100% 100%', `${label} chip plate not fitted: ${JSON.stringify(chip)}`);
    assert.equal(chip.borderRadius, '0px', `${label} chip still uses css pill radius: ${JSON.stringify(chip)}`);
    assert.equal(chip.boxShadow, 'none', `${label} chip still uses css shadow surface: ${JSON.stringify(chip)}`);
    assert.equal(chip.width >= 74 && chip.height >= 26, true, `${label} chip too small: ${JSON.stringify(chip)}`);
    assert.equal(chip.left >= 0 && chip.right <= chip.viewportWidth, true, `${label} chip leaves viewport: ${JSON.stringify(chip)}`);
    assert.equal(chip.top >= 0 && chip.bottom <= chip.viewportHeight, true, `${label} chip leaves vertical viewport: ${JSON.stringify(chip)}`);
  }
}

async function assertOperationCopyClearsProgressRail(page) {
  const geometry = await page.evaluate(() => {
    const copyNodes = [...document.querySelectorAll('#lobbyScreen .operation-copy span, #lobbyScreen .operation-copy p')];
    const progress = document.querySelector('#lobbyScreen .operation-progress');
    if (!copyNodes.length || !progress) {
      return { missing: true };
    }
    const copyRects = copyNodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        text: node.textContent?.trim(),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom)
      };
    });
    const progressRect = progress.getBoundingClientRect();
    const copyRight = Math.max(...copyRects.map((rect) => rect.right));
    return {
      viewportWidth: window.innerWidth,
      copyRects,
      copyRight,
      progressLeft: Math.round(progressRect.left),
      progressRight: Math.round(progressRect.right),
      gap: Math.round(progressRect.left - copyRight)
    };
  });
  assert.equal(geometry.missing, undefined, `operation copy/progress geometry unavailable: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.gap >= 8,
    true,
    `operation copy overlaps progress rail on portrait lobby: ${JSON.stringify(geometry)}`
  );
}

async function assertSplashCtaClearsBottomDeck(page) {
  const geometry = await page.locator('#splashStartButton').evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const shell = document.querySelector('.shell');
    const deckHeight = parseFloat(getComputedStyle(shell, '::after').height) || 0;
    return {
      viewportHeight: window.innerHeight,
      buttonBottom: Math.round(rect.bottom),
      deckTop: Math.round(window.innerHeight - deckHeight),
      deckHeight: Math.round(deckHeight)
    };
  });
  assert.equal(
    geometry.buttonBottom <= geometry.deckTop + 6,
    true,
    `splash CTA is visually buried by bottom deck: ${JSON.stringify(geometry)}`
  );
}

async function assertCombatDockSafeArea(page) {
  const geometry = await page.locator('.action-panel').evaluate((node) => {
    const panel = node.getBoundingClientRect();
    const actions = document.querySelector('.primary-actions')?.getBoundingClientRect();
    return {
      viewportHeight: window.innerHeight,
      panelTop: Math.round(panel.top),
      panelBottom: Math.round(panel.bottom),
      panelHeight: Math.round(panel.height),
      actionsBottom: Math.round(actions?.bottom ?? 0)
    };
  });
  assert.equal(geometry.panelHeight >= 130, true, `combat dock too shallow: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.actionsBottom <= geometry.viewportHeight - 24,
    true,
    `combat buttons sit too close to bottom: ${JSON.stringify(geometry)}`
  );
}

async function assertCombatToastClearsDock(page) {
  const geometry = await page.evaluate(() => {
    const toast = document.querySelector('.toast');
    const panel = document.querySelector('.action-panel');
    if (!toast || !panel) {
      return { missing: true };
    }
    const wasHidden = toast.hidden;
    const previousText = toast.textContent;
    toast.hidden = false;
    toast.textContent = '검수 메시지';
    const toastBox = toast.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    toast.hidden = wasHidden;
    toast.textContent = previousText;
    return {
      toastBottom: Math.round(toastBox.bottom),
      panelTop: Math.round(panelBox.top),
      gap: Math.round(panelBox.top - toastBox.bottom)
    };
  });
  assert.equal(geometry.missing, undefined, `combat toast geometry unavailable: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.toastBottom <= geometry.panelTop - 8,
    true,
    `combat toast overlaps action dock: ${JSON.stringify(geometry)}`
  );
}

async function assertInjectedSafeAreaKeepsCombatTouchable(page) {
  const geometry = await page.evaluate(async () => {
    const root = document.documentElement;
    const previousSafeAreaBottom = root.style.getPropertyValue('--app-safe-area-bottom');
    root.style.setProperty('--app-safe-area-bottom', '34px');
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const panel = document.querySelector('.action-panel')?.getBoundingClientRect();
      const actions = document.querySelector('.primary-actions')?.getBoundingClientRect();
      const toast = document.querySelector('.toast');
      if (!panel || !actions || !toast) {
        return { missing: true };
      }
      const wasHidden = toast.hidden;
      const previousText = toast.textContent;
      toast.hidden = false;
      toast.textContent = '검수 메시지';
      const toastBox = toast.getBoundingClientRect();
      toast.hidden = wasHidden;
      toast.textContent = previousText;
      return {
        viewportHeight: window.innerHeight,
        panelHeight: Math.round(panel.height),
        actionsBottom: Math.round(actions.bottom),
        toastBottom: Math.round(toastBox.bottom),
        panelTop: Math.round(panel.top)
      };
    } finally {
      if (previousSafeAreaBottom) {
        root.style.setProperty('--app-safe-area-bottom', previousSafeAreaBottom);
      } else {
        root.style.removeProperty('--app-safe-area-bottom');
      }
    }
  });
  assert.equal(geometry.missing, undefined, `safe-area combat geometry unavailable: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.panelHeight >= 164, true, `combat dock ignores injected safe area: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.actionsBottom <= geometry.viewportHeight - 58,
    true,
    `combat buttons do not clear injected home indicator: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.toastBottom <= geometry.panelTop - 8,
    true,
    `combat toast overlaps safe-area dock: ${JSON.stringify(geometry)}`
  );
}

async function assertFirstSummonTapFeedback(page) {
  await page.getByRole('button', { name: '소환' }).click();
  await page.waitForFunction(() => document.querySelector('#summonMeter .meter-value')?.textContent === '0');
  assert.equal(await page.locator('#summonMeter .meter-value').textContent(), '0');
  assert.equal(await page.locator('.status-line').isVisible(), false);
  assert.match(await page.locator('#summonButton span').textContent(), /충전\s+\d+초/);
}

async function verifyShell(page, viewport) {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.locator('#loadingGate').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '시작' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.action-panel').evaluate((node) => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('audio, video').count(), 0);
  const shell = await page.locator('.shell').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  assert.equal(shell.width <= Math.min(viewport.width, 430), true, `shell width ${shell.width}`);
  assert.equal(shell.scrollWidth <= shell.clientWidth, true, 'horizontal overflow');
  await assertSplashCtaClearsBottomDeck(page);

  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '첫 구원 작전 시작' }).waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#lobbyScreen .operation-copy span, #lobbyScreen .operation-copy p', 'lobby operation copy', 2);
  await assertOperationCopyClearsProgressRail(page);
  await assertMetaCaptionPlates(page, '#lobbyScreen .lobby-next-state', 'lobby next state', 1);
  assert.equal(await page.locator('.action-panel').evaluate((node) => getComputedStyle(node).display), 'none');
  await page.getByRole('button', { name: '유닛' }).click();
  await assertActiveNavLabelPlate(page, '유닛', 'collection');
  await page.locator('.unit-sprite').first().waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#collectionScreen .meta-showcase-copy > span:first-child', 'collection', 1);
  await assertMetaShowcaseChips(page, '#collectionScreen .meta-showcase-chip', 'collection', 2);
  await assertMetaListReachesDock(page, '#collectionList', 'collection');
  assert.equal(await page.locator('#collectionList .unit-card .sprite-token.unit-sprite').count(), 8);
  assert.equal(await page.locator('#collectionList .meta-showcase .sprite-token.unit-sprite').count(), 1);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '상점' }).click();
  await assertActiveNavLabelPlate(page, '상점', 'shop');
  await page.locator('.shop-cosmetic').first().waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#shopScreen .meta-showcase-copy > span:first-child', 'shop', 1);
  await assertMetaShowcaseChips(page, '#shopScreen .meta-showcase-chip', 'shop', 2);
  await assertMetaListReachesDock(page, '#shopList', 'shop');
  assert.equal(await page.locator('#shopList .shop-card .sprite-token.shop-cosmetic').count(), 5);
  assert.equal(await page.locator('#shopList .meta-showcase .sprite-token.shop-cosmetic').count(), 1);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '미션' }).click();
  await assertActiveNavLabelPlate(page, '미션', 'missions');
  await page.locator('#missionsList .mission-stamp-board').waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#missionsScreen .mission-board-copy span, #missionsScreen .mission-board-copy p', 'missions', 2);
  await assertMetaListReachesDock(page, '#missionsList', 'missions');
  assert.equal(await page.locator('#missionsList .mission-stamp-slot').count(), 3);
  assert.equal(await page.locator('#missionsList .mission-card').count(), 3);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '시즌' }).click();
  await assertActiveNavLabelPlate(page, '시즌', 'season');
  await page.locator('#seasonList .season-track-board').waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#seasonScreen .season-board-copy span, #seasonScreen .season-board-copy p', 'season', 2);
  await assertMetaListReachesDock(page, '#seasonList', 'season');
  assert.equal(await page.locator('#seasonList .season-track-node').count(), 4);
  assert.equal(await page.locator('#seasonList .season-card').count(), 4);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();

  await page.getByRole('button', { name: '첫 구원 작전 시작' }).click();
  await page.locator('#summonButton').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.action-panel button').count(), 3);
  assert.equal(await page.locator('#shopButton, #passButton, #adButton, #paidReviveButton').count(), 0);
  assert.equal(await page.locator('#bossMeter').isVisible(), false);
  assert.notEqual(await page.locator('.action-panel').evaluate((node) => getComputedStyle(node).display), 'none');
  await assertCombatDockSafeArea(page);
  await assertCombatToastClearsDock(page);
  await assertInjectedSafeAreaKeepsCombatTouchable(page);
  await assertFirstSummonTapFeedback(page);
}

async function verifyCompactLobby(page) {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.locator('#loadingGate').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '시작' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('audio, video').count(), 0);
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '첫 구원 작전 시작' }).waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#lobbyScreen .operation-copy span, #lobbyScreen .operation-copy p', 'compact lobby operation copy', 2);
  await assertOperationCopyClearsProgressRail(page);
}

async function verifyCompactMeta(page) {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.locator('#loadingGate').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '시작' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('audio, video').count(), 0);
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '첫 구원 작전 시작' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '유닛' }).click();
  await page.locator('.unit-sprite').first().waitFor({ state: 'visible' });
  await assertMetaShowcaseChips(page, '#collectionScreen .meta-showcase-chip', 'compact collection', 2);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '상점' }).click();
  await page.locator('.shop-cosmetic').first().waitFor({ state: 'visible' });
  await assertMetaShowcaseChips(page, '#shopScreen .meta-showcase-chip', 'compact shop', 2);
}

async function verifyFastPlaythrough(page) {
  await page.goto(withParam(baseUrl, 'qaFast', '1'), { waitUntil: 'load' });
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '첫 구원 작전 시작' }).click();
  await page.locator('#summonButton').waitFor({ state: 'visible' });

  const events = [];
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (await page.locator('#resultTitle').isVisible()) break;
    const timeText = await page.locator('#timeMeter').textContent();
    const seconds = Number.parseInt(timeText ?? '0', 10) || 0;
    if (await page.locator('#rescueButton').isEnabled()) {
      await page.locator('#rescueButton').click();
      events.push(`rescue@${seconds}`);
    } else if (await page.locator('#mergeButton').isEnabled()) {
      await page.locator('#mergeButton').click();
      events.push(`merge@${seconds}`);
    } else if (await page.locator('#summonButton').isEnabled()) {
      await page.locator('#summonButton').click();
      events.push(`summon@${seconds}`);
    }
    await page.waitForTimeout(20);
  }

  assert.equal(await page.locator('#resultTitle').isVisible(), true, `missing result: ${events.join(', ')}`);
  assert.equal(await page.locator('#resultTitle').textContent(), '승리');
  assert.equal(await page.locator('#resultOverlay').getAttribute('data-result-status'), 'won');
  assert.equal(await page.locator('#resultLobbyButton span').textContent(), '보상 수령');
  assert.equal(await page.locator('#resultLobbyButton').getAttribute('aria-label'), '받을 미션 보상 수령');
  assert.equal(await page.locator('#resultLobbyButton').getAttribute('data-result-open'), 'claim-missions');
  assert.match(
    await page.locator('.result-panel').evaluate((node) => getComputedStyle(node, '::after').backgroundImage),
    /reboot-result-badges/
  );
  assert.equal(events.filter((entry) => entry.startsWith('rescue@')).length, 1, events.join(', '));
  assert.equal(await page.locator('#resultRetryButton').isVisible(), true);
  await page.locator('#resultLobbyButton').click();
  await page.locator('#seasonList .season-card').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('body').getAttribute('data-app-screen'), 'season');
  assert.equal(await page.locator('#rewardReveal').isVisible(), true);
  assert.match(await page.locator('#rewardReveal').textContent(), /미션 보상/);
  assert.match(await page.locator('#seasonList').textContent(), /수령/);
  assert.match(await page.locator('#missionsList .mission-card').first().textContent(), /받음/);
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH
    ?? localChromiumPaths.find((candidate) => existsSync(candidate));
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  try {
    for (const viewport of compactLobbyViewports) {
      const errors = [];
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true
      });
      context.on('page', (page) => {
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));
      });
      const page = await context.newPage();
      await verifyCompactLobby(page);
      await verifyCompactMeta(page);
      await assertNoErrors(errors, `compact lobby ${viewport.width}x${viewport.height}`);
      await context.close();
      console.log(`ok compact-lobby ${viewport.width}x${viewport.height}`);
    }
    for (const viewport of viewports) {
      const errors = [];
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true
      });
      context.on('page', (page) => {
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));
      });
      const page = await context.newPage();
      await verifyShell(page, viewport);
      if (viewport.width === 390) {
        await context.addInitScript(() => {
          if (new URLSearchParams(location.search).get('qaFast') !== '1') return;
          let frameNow = 0;
          window.requestAnimationFrame = (callback) => {
            frameNow += 80;
            return window.setTimeout(() => callback(frameNow), 1);
          };
          window.cancelAnimationFrame = (id) => window.clearTimeout(id);
        });
        await verifyFastPlaythrough(page);
      }
      await assertNoErrors(errors, `${viewport.width}x${viewport.height}`);
      await context.close();
      console.log(`ok ${viewport.width}x${viewport.height}`);
    }
  } finally {
    await browser.close();
  }
}

await main();
