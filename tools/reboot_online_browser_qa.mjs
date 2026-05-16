import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const localChromiumPaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
];

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`server did not start: ${output}`)), 6000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString('utf8');
      if (output.includes('신호릴레이 실행 중')) {
        clearTimeout(timer);
        resolve(output);
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString('utf8');
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited before ready: ${code}\n${output}`));
    });
  });
}

async function enterOnline(page, baseUrl) {
  await page.goto(`${baseUrl}/?mute=1`, { waitUntil: 'load' });
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '온라인 협동' }).click();
  await page.locator('body[data-app-screen="battle"]').waitFor({ state: 'attached' });
}

async function assertOnlineReady(page, label) {
  await page.waitForFunction(() => {
    const summon = document.querySelector('#summonButton');
    const merge = document.querySelector('#mergeButton');
    const rescue = document.querySelector('#rescueButton');
    return document.querySelector('#netStatus')?.textContent === '온라인 협동'
      && summon
      && merge
      && rescue
      && !summon.disabled
      && merge.disabled
      && rescue.disabled;
  });
  assert.equal(await page.locator('#netStatus').textContent(), '온라인 협동', `${label} online label`);
  assert.equal(await page.locator('#summonButton').isEnabled(), true, `${label} summon enabled`);
  assert.equal(await page.locator('#mergeButton').isEnabled(), false, `${label} merge starts locked`);
  assert.equal(await page.locator('#rescueButton').isEnabled(), false, `${label} rescue starts locked`);
}

async function assertMatchBanner(page, title, state) {
  await page.waitForFunction(
    ({ title: expectedTitle, state: expectedState }) => {
      const banner = document.querySelector('#matchmakingBanner');
      const opacity = banner ? Number.parseFloat(getComputedStyle(banner).opacity) : 0;
      return banner && !banner.hidden
        && banner.dataset.matchState === expectedState
        && document.querySelector('#matchmakingBannerTitle')?.textContent === expectedTitle
        && opacity > 0.9;
    },
    { title, state }
  );
  assert.equal(await page.locator('#matchmakingBannerTitle').textContent(), title);
  assert.equal(await page.locator('#matchmakingBanner').getAttribute('data-match-state'), state);
  assert.match(
    await page.locator('#matchmakingBanner').evaluate((node) => getComputedStyle(node).backgroundImage),
    /reboot-online-partner-link/,
    'matchmaking banner uses generated partner-link console art'
  );
}

async function assertOnlineWaiting(page) {
  await page.waitForFunction(() => document.querySelector('#netStatus')?.textContent === '온라인 대기'
    && document.querySelector('#matchmakingBanner')?.hidden === true);
  assert.equal(await page.locator('#netStatus').textContent(), '온라인 대기', 'single client waits for partner');
  assert.equal(await page.locator('#timeMeter').textContent(), '파트너 대기', 'waiting prompt replaces action prompt');
  const dockState = await page.evaluate(() => {
    const primaryActions = document.querySelector('.primary-actions');
    return {
      onlineWaiting: document.body.dataset.onlineWaiting,
      statusDisplay: getComputedStyle(document.querySelector('.status-line')).display,
      summonDisplay: getComputedStyle(document.querySelector('#summonButton')).display,
      dockLabel: getComputedStyle(primaryActions, '::after').content,
      dockImage: getComputedStyle(primaryActions, '::before').backgroundImage,
      waitingBannerHidden: document.querySelector('#matchmakingBanner')?.hidden ?? false
    };
  });
  assert.equal(dockState.onlineWaiting, 'true', 'online waiting body state');
  assert.equal(dockState.statusDisplay, 'none', 'waiting command dock hides combat prompt row');
  assert.equal(dockState.summonDisplay, 'none', 'waiting command dock removes combat buttons from layout');
  assert.equal(dockState.dockLabel, '"파트너 매칭 중"', 'waiting command dock label');
  assert.match(dockState.dockImage, /reboot-online-matchmaking-panels/, 'waiting command dock uses generated matchmaking art');
  assert.equal(
    dockState.waitingBannerHidden,
    true,
    'waiting battlefield banner stays hidden while the command dock owns matchmaking'
  );
  assert.equal(await page.locator('#summonButton').isEnabled(), false, 'summon disabled before partner joins');
  assert.equal(await page.locator('#mergeButton').isEnabled(), false, 'merge disabled before partner joins');
  assert.equal(await page.locator('#rescueButton').isEnabled(), false, 'rescue disabled before partner joins');
}

async function main() {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer(server);
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
      const first = await context.newPage();
      const second = await context.newPage();

      await enterOnline(first, baseUrl);
      await assertOnlineWaiting(first);
      await enterOnline(second, baseUrl);
      await assertOnlineReady(first, 'p1');
      await assertOnlineReady(second, 'p2');
      await assertMatchBanner(first, '협동 시작', 'ready');
      await assertMatchBanner(second, '협동 시작', 'ready');

      await first.locator('#summonButton').click();
      await first.waitForFunction(() => document.querySelector('#summonMeter')?.textContent === '소환 0');
      assert.equal(await first.locator('#summonButton').isEnabled(), false, 'p1 summon spent');
      assert.equal(await second.locator('#summonMeter').textContent(), '소환 10');

      await second.locator('#summonButton').click();
      await second.waitForFunction(() => document.querySelector('#summonMeter')?.textContent === '소환 0');
      assert.equal(await second.locator('#summonButton').isEnabled(), false, 'p2 summon spent');
      assert.equal(await first.locator('#netStatus').textContent(), '온라인 협동');

      await first.close();
      await assertMatchBanner(second, '파트너 이탈', 'reset');
      await second.waitForTimeout(800);
      await assertMatchBanner(second, '파트너 이탈', 'reset');
      await assertOnlineWaiting(second);
      assert.equal(await second.locator('#summonMeter').textContent(), '소환 10', 'remaining player gets fresh run after disconnect');

      const third = await context.newPage();
      await enterOnline(third, baseUrl);
      await assertOnlineReady(second, 'remaining');
      await assertOnlineReady(third, 'replacement');

      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }

  console.log(`ok online two-client ${baseUrl}`);
}

await main();
