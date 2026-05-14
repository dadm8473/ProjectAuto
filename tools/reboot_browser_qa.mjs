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

async function verifyShell(page, viewport) {
  await page.goto(baseUrl, { waitUntil: 'load' });
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

  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '봇과 시작' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.action-panel').evaluate((node) => getComputedStyle(node).display), 'none');
  await page.getByRole('button', { name: '유닛' }).click();
  await page.locator('.unit-sprite').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('#collectionList .unit-card .sprite-token.unit-sprite').count(), 5);
  assert.equal(await page.locator('#collectionList .meta-showcase .sprite-token.unit-sprite').count(), 1);
  await page.getByRole('button', { name: '홈' }).click();
  await page.getByRole('button', { name: '상점' }).click();
  await page.locator('.shop-cosmetic').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('#shopList .shop-card .sprite-token.shop-cosmetic').count(), 5);
  assert.equal(await page.locator('#shopList .meta-showcase .sprite-token.shop-cosmetic').count(), 1);
  await page.getByRole('button', { name: '홈' }).click();
  await page.getByRole('button', { name: '미션' }).click();
  await page.locator('#missionsList .mission-stamp-board').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#missionsList .mission-stamp-slot').count(), 3);
  assert.equal(await page.locator('#missionsList .mission-card').count(), 3);
  await page.getByRole('button', { name: '홈' }).click();
  await page.getByRole('button', { name: '시즌' }).click();
  await page.locator('#seasonList .season-track-board').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#seasonList .season-track-node').count(), 4);
  assert.equal(await page.locator('#seasonList .season-card').count(), 4);
  await page.getByRole('button', { name: '홈' }).click();

  await page.getByRole('button', { name: '봇과 시작' }).click();
  await page.locator('#summonButton').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.action-panel button').count(), 3);
  assert.equal(await page.locator('#shopButton, #passButton, #adButton, #paidReviveButton').count(), 0);
  assert.notEqual(await page.locator('.action-panel').evaluate((node) => getComputedStyle(node).display), 'none');
}

async function verifyFastPlaythrough(page) {
  await page.goto(withParam(baseUrl, 'qaFast', '1'), { waitUntil: 'load' });
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '봇과 시작' }).click();
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
  assert.equal(await page.locator('#resultLobbyButton span').textContent(), '수령하기');
  assert.equal(await page.locator('#resultLobbyButton').getAttribute('data-result-open'), 'claim-missions');
  assert.match(
    await page.locator('.result-panel').evaluate((node) => getComputedStyle(node, '::after').backgroundImage),
    /reboot-result-badges/
  );
  assert.equal(events.filter((entry) => entry.startsWith('rescue@')).length, 1, events.join(', '));
  assert.equal(await page.locator('#resultRetryButton').isVisible(), true);
  await page.locator('#resultLobbyButton').click();
  await page.locator('#missionsList .mission-card').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('#rewardReveal').isVisible(), true);
  assert.match(await page.locator('#rewardReveal').textContent(), /미션 보상/);
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
