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
  await page.locator('#summonButton').waitFor({ state: 'visible' });
}

async function assertOnlineReady(page, label) {
  await page.waitForFunction(() => document.querySelector('#netStatus')?.textContent === '온라인 협동');
  assert.equal(await page.locator('#netStatus').textContent(), '온라인 협동', `${label} online label`);
  assert.equal(await page.locator('#summonButton').isEnabled(), true, `${label} summon enabled`);
  assert.equal(await page.locator('#mergeButton').isEnabled(), false, `${label} merge starts locked`);
  assert.equal(await page.locator('#rescueButton').isEnabled(), false, `${label} rescue starts locked`);
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
      await enterOnline(second, baseUrl);
      await assertOnlineReady(first, 'p1');
      await assertOnlineReady(second, 'p2');

      await first.locator('#summonButton').click();
      await first.waitForFunction(() => document.querySelector('#summonMeter')?.textContent === '소환 0');
      assert.equal(await first.locator('#summonButton').isEnabled(), false, 'p1 summon spent');
      assert.equal(await second.locator('#summonMeter').textContent(), '소환 10');

      await second.locator('#summonButton').click();
      await second.waitForFunction(() => document.querySelector('#summonMeter')?.textContent === '소환 0');
      assert.equal(await second.locator('#summonButton').isEnabled(), false, 'p2 summon spent');
      assert.equal(await first.locator('#netStatus').textContent(), '온라인 협동');

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
