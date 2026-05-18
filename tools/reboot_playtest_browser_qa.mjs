import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.argv[2] ?? 'http://localhost:4173';
const playtestPath = '/?mute=1&playtest=1&qaFast=1';

const localChromiumPaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
];

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH
    ?? localChromiumPaths.find((candidate) => existsSync(candidate));
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true
    });
    await context.addInitScript(() => {
      localStorage.clear();
      if (new URLSearchParams(location.search).get('qaFast') !== '1') return;
      let frameNow = 0;
      window.requestAnimationFrame = (callback) => {
        frameNow += 80;
        return window.setTimeout(() => callback(frameNow), 1);
      };
      window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    });

    const page = await context.newPage();
    await page.goto(`${baseUrl}${playtestPath}`, { waitUntil: 'load' });
    await page.locator('#loadingGate').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '시작' }).click();
    await page.getByRole('button', { name: '첫 구원 작전 시작' }).click();
    await page.locator('#summonButton').waitFor({ state: 'visible' });

    const deadline = Date.now() + 12000;
    while (Date.now() < deadline && !(await page.locator('#resultTitle').isVisible())) {
      if (await page.locator('#rescueButton').isEnabled()) {
        await page.locator('#rescueButton').click();
      } else if (await page.locator('#mergeButton').isEnabled()) {
        await page.locator('#mergeButton').click();
      } else if (await page.locator('#summonButton').isEnabled()) {
        await page.locator('#summonButton').click();
      }
      await page.waitForTimeout(20);
    }

    assert.equal(await page.locator('#resultTitle').isVisible(), true, 'playtest run should reach result');
    const summary = await page.evaluate(() => window.__rebootPlaytestSummary?.());
    assert.equal(summary.enabled, true);
    assert.equal(summary.earlyEngagement.passed, true);
    assert.equal(summary.earlyEngagement.firstActionWithin8s, true);
    assert.equal(summary.earlyEngagement.partnerJoinedWithin30s, true);
    assert.equal(summary.earlyEngagement.threatSeenWithin30s, true);
    assert.equal(summary.earlyEngagement.rewardFeedbackWithin30s, true);
    assert.equal(summary.completedCoreLoopWithin120s, true);
    assert.equal(summary.actionCounts.summon > 0, true);
    assert.equal(summary.actionCounts.merge > 0, true);
    assert.equal(summary.actionCounts.rescue > 0, true);
    assert.equal(summary.result.status, 'won');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('projectauto.reboot.playtest.v1')));
    assert.deepEqual(stored, summary);
    await context.close();
  } finally {
    await browser.close();
  }

  console.log(`ok playtest summary ${baseUrl}`);
}

await main();
