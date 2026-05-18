import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.argv[2] ?? 'http://localhost:4173/?mute=1';
const profileStorageKey = 'projectauto.reboot.profile.v1';
const shopReadyProfile = {
  version: 1,
  gems: 120,
  xp: 0,
  claimedMissions: [],
  claimedPassTiers: [],
  unlocks: [],
  equippedCosmetic: '',
  processedRuns: [],
  unitLevels: {}
};
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

function parseScreenshotPng(bytes) {
  let offset = 8;
  const chunks = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += length + 12;
  }
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
  assert.ok(ihdr, 'screenshot PNG is missing IHDR');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  assert.equal(bitDepth, 8, `unsupported screenshot bit depth ${bitDepth}`);
  assert.equal(colorType === 2 || colorType === 6, true, `unsupported screenshot color type ${colorType}`);
  assert.equal(interlace, 0, 'interlaced screenshots are unsupported');

  const compressed = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
  const raw = inflateSync(compressed);
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const decoded = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset];
    inputOffset += 1;
    const row = raw.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const outRow = decoded.subarray(y * stride, (y + 1) * stride);
    const prevRow = y === 0 ? null : decoded.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? outRow[x - bytesPerPixel] : 0;
      const up = prevRow ? prevRow[x] : 0;
      const upLeft = prevRow && x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;
      if (filter === 0) outRow[x] = row[x];
      else if (filter === 1) outRow[x] = (row[x] + left) & 255;
      else if (filter === 2) outRow[x] = (row[x] + up) & 255;
      else if (filter === 3) outRow[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        outRow[x] = (row[x] + predictor) & 255;
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }
    }
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let source = 0, target = 0; source < decoded.length; source += bytesPerPixel, target += 4) {
    pixels[target] = decoded[source];
    pixels[target + 1] = decoded[source + 1];
    pixels[target + 2] = decoded[source + 2];
    pixels[target + 3] = colorType === 6 ? decoded[source + 3] : 255;
  }
  return { width, height, pixels };
}

function screenshotBandStats(image, rect, brightThreshold = 52) {
  let total = 0;
  let sum = 0;
  let bright = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (image.pixels[offset + 3] <= 16) continue;
      const luma = (image.pixels[offset] * 0.2126) + (image.pixels[offset + 1] * 0.7152) + (image.pixels[offset + 2] * 0.0722);
      total += 1;
      sum += luma;
      if (luma > brightThreshold) bright += 1;
    }
  }
  return { mean: sum / total, brightRatio: bright / total };
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

async function assertShopFeatureOffer(page, label) {
  const geometry = await page.locator('#shopList .shop-feature-showcase').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const pedestalNode = node.querySelector('.shop-feature-pedestal');
    const control = node.querySelector('.featured-shop-action, .featured-shop-passive');
    const pedestal = pedestalNode?.getBoundingClientRect();
    const icon = node.querySelector('.sprite-token.shop-cosmetic')?.getBoundingClientRect();
    const command = node.querySelector('.shop-feature-command')?.getBoundingClientRect();
    const action = control?.getBoundingClientRect();
    const style = getComputedStyle(node);
    const pedestalStyle = pedestalNode ? getComputedStyle(pedestalNode) : null;
    return {
      state: node.getAttribute('data-featured-state'),
      backgroundImage: style.backgroundImage,
      pedestalBackground: pedestalStyle?.backgroundImage ?? '',
      showcaseTop: Math.round(rect.top),
      showcaseRight: Math.round(rect.right),
      showcaseBottom: Math.round(rect.bottom),
      showcaseHeight: Math.round(rect.height),
      pedestalRight: Math.round(pedestal?.right ?? 0),
      pedestalWidth: Math.round(pedestal?.width ?? 0),
      iconWidth: Math.round(icon?.width ?? 0),
      iconHeight: Math.round(icon?.height ?? 0),
      iconTop: Math.round(icon?.top ?? 0),
      iconBottom: Math.round(icon?.bottom ?? 0),
      commandLeft: Math.round(command?.left ?? 0),
      commandTop: Math.round(command?.top ?? 0),
      actionWidth: Math.round(action?.width ?? 0),
      actionHeight: Math.round(action?.height ?? 0),
      actionLeft: Math.round(action?.left ?? 0),
      actionRight: Math.round(action?.right ?? 0),
      actionBottom: Math.round(action?.bottom ?? 0),
      priceRight: Math.round(node.querySelector('.shop-feature-price')?.getBoundingClientRect().right ?? 0),
      controlClass: control?.className ?? '',
      controlPointerEvents: control ? getComputedStyle(control).pointerEvents : '',
      viewportWidth: window.innerWidth
    };
  });
  assert.match(geometry.backgroundImage, /reboot-shop-banner/, `${label} feature lacks shop banner: ${JSON.stringify(geometry)}`);
  assert.match(geometry.pedestalBackground, /reboot-meta-showcase-stage/, `${label} feature lacks generated pedestal: ${JSON.stringify(geometry)}`);
  assert.match(geometry.state, /^(ready|locked|owned|equipped)$/, `${label} unknown feature state: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.showcaseHeight >= 196, true, `${label} feature too short: ${JSON.stringify(geometry)}`);
  const minPedestalWidth = label.includes('compact') ? 96 : 118;
  assert.equal(geometry.pedestalWidth >= minPedestalWidth, true, `${label} pedestal too narrow: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.iconWidth >= 58 && geometry.iconHeight >= 58, true, `${label} featured cosmetic too small: ${JSON.stringify(geometry)}`);
  assert.equal(
    geometry.iconTop >= geometry.showcaseTop && geometry.iconBottom <= geometry.showcaseBottom,
    true,
    `${label} featured cosmetic escapes stage: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.actionWidth >= 58 && geometry.actionHeight >= 30 && geometry.actionBottom <= geometry.showcaseBottom,
    true,
    `${label} feature action is not a usable command: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.actionRight <= geometry.showcaseRight && geometry.actionRight <= geometry.viewportWidth,
    true,
    `${label} feature action clips past the right edge: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.priceRight <= geometry.actionLeft - 2,
    true,
    `${label} feature price overlaps the command button: ${JSON.stringify(geometry)}`
  );
  assert.equal(
    geometry.commandTop >= geometry.showcaseBottom - 72 || geometry.commandLeft >= geometry.pedestalRight - 4,
    true,
    `${label} feature command overlaps cosmetic pedestal: ${JSON.stringify(geometry)}`
  );
  if (label.includes('ready')) {
    assert.equal(geometry.state, 'ready', `${label} feature should be purchase-ready: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.controlClass.includes('featured-shop-action'), true, `${label} feature action was not rendered: ${JSON.stringify(geometry)}`);
  }
  if (geometry.controlClass.includes('featured-shop-action')) {
    assert.equal(geometry.controlPointerEvents, 'auto', `${label} feature button cannot receive taps: ${JSON.stringify(geometry)}`);
    await page.locator('#shopList .featured-shop-action').first().evaluate((node) => {
      node.focus({ focusVisible: true });
    });
    const focusArt = await page.locator('#shopList .featured-shop-action').first().evaluate((node) => {
      const before = getComputedStyle(node, '::before');
      return {
        backgroundImage: before.backgroundImage,
        mixBlendMode: before.mixBlendMode,
        opacity: before.opacity
      };
    });
    assert.match(focusArt.backgroundImage, /reboot-meta-action-buttons/, `${label} focused feature button lacks generated focus art: ${JSON.stringify(focusArt)}`);
    assert.equal(focusArt.mixBlendMode, 'screen', `${label} focused feature button lacks screen focus blend: ${JSON.stringify(focusArt)}`);
  }
}

async function assertFeaturedShopPurchaseFlow(page, label) {
  const before = await page.locator('#shopList .featured-shop-action').first().evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    return {
      buyId: node.getAttribute('data-shop-buy'),
      text: node.textContent?.trim(),
      hitTag: hit?.tagName ?? '',
      hitClass: hit?.className ?? '',
      hitBuyId: hit?.closest?.('[data-shop-buy]')?.getAttribute('data-shop-buy') ?? '',
      hitIsFeaturedButton: hit === node || node.contains(hit),
      centerX: Math.round(centerX),
      centerY: Math.round(centerY)
    };
  });
  assert.equal(before.buyId, 'mythic-aura', `${label} featured CTA missing purchase id: ${JSON.stringify(before)}`);
  assert.equal(before.text, '해금', `${label} featured CTA should be ready to unlock: ${JSON.stringify(before)}`);
  assert.equal(before.hitBuyId, 'mythic-aura', `${label} featured CTA center is blocked by another layer: ${JSON.stringify(before)}`);
  assert.equal(before.hitIsFeaturedButton, true, `${label} featured CTA center hit a different purchase layer: ${JSON.stringify(before)}`);

  await page.locator('#shopList .featured-shop-action').first().click();
  await page.waitForFunction((key) => {
    const profile = JSON.parse(localStorage.getItem(key) ?? '{}');
    return profile.gems === 30
      && profile.unlocks?.includes('mythic-aura')
      && profile.equippedCosmetic === 'mythic-aura';
  }, profileStorageKey);
  await page.locator('#shopList .shop-feature-showcase[data-featured-state="equipped"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#shopList .featured-shop-action').count(), 0, `${label} featured unlock button should disappear after equip`);
  assert.equal(await page.locator('#shopList .featured-shop-passive').first().textContent(), '장착중');
  await page.evaluate((key) => localStorage.removeItem(key), profileStorageKey);
}

async function assertGeneratedCardSurface(page, selector, label, framePattern) {
  const surfaces = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const before = getComputedStyle(node, '::before');
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      beforeBackgroundImage: before.backgroundImage,
      beforeBackgroundSize: before.backgroundSize,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }));
  assert.equal(surfaces.length > 0, true, `${label} has no card surfaces`);
  for (const surface of surfaces) {
    assert.equal(surface.backgroundColor, 'rgba(0, 0, 0, 0)', `${label} still has css card fill: ${JSON.stringify(surface)}`);
    assert.equal(surface.backgroundImage, 'none', `${label} still has element-level css card image: ${JSON.stringify(surface)}`);
    assert.equal(surface.boxShadow, 'none', `${label} still has css card shadow: ${JSON.stringify(surface)}`);
    assert.match(surface.beforeBackgroundImage, framePattern, `${label} lacks generated card frame: ${JSON.stringify(surface)}`);
    assert.equal(surface.beforeBackgroundSize.endsWith('100%'), true, `${label} generated frame not fitted: ${JSON.stringify(surface)}`);
    assert.equal(surface.width > 0 && surface.height > 0, true, `${label} card surface collapsed: ${JSON.stringify(surface)}`);
  }
}

async function assertBannerOverlayClear(page, selector, label) {
  const overlay = await page.locator(selector).first().evaluate((node) => {
    const after = getComputedStyle(node, '::after');
    return {
      backgroundColor: after.backgroundColor,
      backgroundImage: after.backgroundImage,
      backdropFilter: after.backdropFilter,
      webkitBackdropFilter: after.webkitBackdropFilter ?? 'none'
    };
  });
  assert.equal(overlay.backgroundColor, 'rgba(0, 0, 0, 0)', `${label} banner still has css dimmer: ${JSON.stringify(overlay)}`);
  assert.equal(overlay.backgroundImage, 'none', `${label} banner overlay still has css image/gradient: ${JSON.stringify(overlay)}`);
  assert.equal(overlay.backdropFilter, 'none', `${label} banner overlay still uses backdrop filter: ${JSON.stringify(overlay)}`);
  assert.equal(overlay.webkitBackdropFilter, 'none', `${label} banner overlay still uses webkit backdrop filter: ${JSON.stringify(overlay)}`);
}

async function assertResultGeneratedCopySurfaces(page) {
  const copySurfaces = await page.locator('#resultTitle, #resultReason, #resultNextGoal').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: node.textContent?.trim(),
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      boxShadow: style.boxShadow,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  }));
  assert.equal(copySurfaces.length, 3, `result copy surface count changed: ${JSON.stringify(copySurfaces)}`);
  for (const surface of copySurfaces) {
    assert.match(surface.backgroundImage, /reboot-result-copy-plates/, `result copy lacks generated plate: ${JSON.stringify(surface)}`);
    assert.equal(surface.backgroundSize, '200% 100%', `result copy plate sizing changed: ${JSON.stringify(surface)}`);
    assert.equal(surface.boxShadow, 'none', `result copy still has css shadow surface: ${JSON.stringify(surface)}`);
    assert.equal(surface.width > 0 && surface.height >= 30, true, `result copy collapsed: ${JSON.stringify(surface)}`);
    assert.equal(surface.left >= 0 && surface.right <= surface.viewportWidth, true, `result copy leaves viewport: ${JSON.stringify(surface)}`);
    assert.equal(surface.top >= 0 && surface.bottom <= surface.viewportHeight, true, `result copy leaves vertical viewport: ${JSON.stringify(surface)}`);
  }

  const highlightSurfaces = await page.locator('.result-highlights span').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: node.textContent?.trim(),
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      boxShadow: style.boxShadow,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }));
  assert.equal(highlightSurfaces.length >= 1, true, `result highlight density changed: ${JSON.stringify(highlightSurfaces)}`);
  for (const surface of highlightSurfaces) {
    assert.match(surface.backgroundImage, /reboot-result-detail-strips/, `result highlight lacks generated strip: ${JSON.stringify(surface)}`);
    assert.equal(surface.backgroundSize, '200% 100%', `result highlight strip sizing changed: ${JSON.stringify(surface)}`);
    assert.equal(surface.boxShadow, 'none', `result highlight still has css shadow surface: ${JSON.stringify(surface)}`);
    assert.equal(surface.width > 0 && surface.height >= 44, true, `result highlight collapsed: ${JSON.stringify(surface)}`);
  }

  const rewardSurface = await page.locator('.result-reward').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const before = getComputedStyle(node, '::before');
    const after = getComputedStyle(node, '::after');
    return {
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      beforeBackgroundImage: before.backgroundImage,
      afterBackgroundImage: after.backgroundImage,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });
  assert.equal(rewardSurface.backgroundImage, 'none', `result reward should not reuse detail strip: ${JSON.stringify(rewardSurface)}`);
  assert.equal(rewardSurface.boxShadow, 'none', `result reward still has css shadow surface: ${JSON.stringify(rewardSurface)}`);
  assert.match(rewardSurface.beforeBackgroundImage, /reboot-result-reward-capsules/, `result reward lacks left generated capsule: ${JSON.stringify(rewardSurface)}`);
  assert.match(rewardSurface.afterBackgroundImage, /reboot-result-reward-capsules/, `result reward lacks right generated capsule: ${JSON.stringify(rewardSurface)}`);
  assert.equal(rewardSurface.width > 0 && rewardSurface.height >= 68, true, `result reward collapsed: ${JSON.stringify(rewardSurface)}`);
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

async function assertActionDockGeneratedConsoleSurface(page) {
  const surface = await page.locator('.action-panel').evaluate(async (node) => {
    async function analyzeGeneratedDockImage(backgroundImage) {
      const url = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!url) return { url: null, loaded: false, width: 0, height: 0 };
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const loaded = new Promise((resolve) => {
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
      });
      image.src = url;
      if (!await loaded) return { url, loaded: false, width: 0, height: 0 };
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);

      function bandStats(rect, brightThreshold) {
        const pixels = context.getImageData(rect.x, rect.y, rect.width, rect.height).data;
        let total = 0;
        let bright = 0;
        let alpha = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index + 3] > 16) alpha += 1;
          if (pixels[index + 3] <= 220) continue;
          const luma = (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722);
          total += 1;
          if (luma > brightThreshold) bright += 1;
        }
        return {
          alphaRatio: alpha / (rect.width * rect.height),
          brightRatio: bright / total
        };
      }

      const dockTopEdgeBand = bandStats({ x: 40, y: 0, width: 350, height: 18 }, 52);
      const dockBodyBand = bandStats({ x: 40, y: 24, width: 350, height: 18 }, 52);
      return { url, loaded: true, width: image.naturalWidth, height: image.naturalHeight, dockTopEdgeBand, dockBodyBand };
    }

    const before = getComputedStyle(node, '::before');
    return {
      beforeBackgroundImage: before.backgroundImage,
      beforeBackgroundSize: before.backgroundSize,
      beforeBackgroundPosition: before.backgroundPosition,
      beforeBorderTopWidth: before.borderTopWidth,
      beforeBorderTopStyle: before.borderTopStyle,
      image: await analyzeGeneratedDockImage(before.backgroundImage)
    };
  });
  assert.match(surface.beforeBackgroundImage, /reboot-combat-action-dock/, `action dock lacks generated console art: ${JSON.stringify(surface)}`);
  assert.equal(surface.beforeBackgroundSize, '100% 100%', `action dock generated art no longer fills dock: ${JSON.stringify(surface)}`);
  assert.match(surface.beforeBackgroundPosition, /50% 100%|center bottom/, `action dock generated art position changed: ${JSON.stringify(surface)}`);
  assert.equal(surface.beforeBorderTopWidth, '0px', `action dock still uses css top border: ${JSON.stringify(surface)}`);
  assert.equal(surface.beforeBorderTopStyle, 'none', `action dock still has css border style: ${JSON.stringify(surface)}`);
  assert.equal(surface.image.loaded, true, `action dock generated image failed to load: ${JSON.stringify(surface)}`);
  assert.equal(surface.image.width === 430 && surface.image.height === 128, true, `action dock generated image dimensions changed: ${JSON.stringify(surface)}`);
  assert.equal(surface.image.dockTopEdgeBand.alphaRatio > 0.98, true, `action dock generated top divider is too transparent: ${JSON.stringify(surface)}`);
  assert.equal(surface.image.dockTopEdgeBand.brightRatio > 0.32, true, `action dock generated top divider lacks edge highlights: ${JSON.stringify(surface)}`);
  assert.equal(
    surface.image.dockBodyBand.brightRatio < surface.image.dockTopEdgeBand.brightRatio - 0.08,
    true,
    `action dock generated top divider does not separate from body: ${JSON.stringify(surface)}`
  );
}

async function assertActionDockRenderedBoundaryScreenshot(page) {
  const panel = await page.locator('.action-panel').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });
  const clip = {
    x: panel.x,
    y: panel.y,
    width: panel.width,
    height: Math.min(panel.height, 64)
  };
  const qaDockSurfaceStyle = await page.addStyleTag({
    content: 'body[data-qa-action-dock-surface="true"] .action-panel::after { display: none !important; }'
  });
  await page.locator('body').evaluate((node) => {
    node.dataset.qaActionDockSurface = 'true';
  });
  const previousVisibility = await page.locator('.action-panel > *').evaluateAll((elements) => (
    elements.map((element) => {
      const visibility = element.style.visibility;
      element.style.visibility = 'hidden';
      return visibility;
    })
  ));

  try {
    const image = parseScreenshotPng(await page.screenshot({ clip, scale: 'css' }));
    const sampleX = Math.min(40, Math.max(10, Math.floor(image.width * 0.1)));
    const sampleWidth = image.width - (sampleX * 2);
    const renderedTopEdgeBand = screenshotBandStats(image, { x: sampleX, y: 0, width: sampleWidth, height: 18 }, 52);
    const renderedBodyBand = screenshotBandStats(image, { x: sampleX, y: 24, width: sampleWidth, height: 18 }, 52);

    assert.equal(image.width >= 300 && image.height >= 56, true, `rendered action dock screenshot is too small: ${JSON.stringify({ panel, image })}`);
    assert.equal(renderedTopEdgeBand.mean > 40, true, `rendered action dock top edge is too flat or hidden: ${JSON.stringify({ panel, renderedTopEdgeBand, renderedBodyBand })}`);
    assert.equal(
      renderedTopEdgeBand.mean > renderedBodyBand.mean + 8,
      true,
      `rendered action dock boundary does not separate from body: ${JSON.stringify({ panel, renderedTopEdgeBand, renderedBodyBand })}`
    );
  } finally {
    await page.locator('.action-panel > *').evaluateAll((elements, visibilities) => {
      elements.forEach((element, index) => {
        element.style.visibility = visibilities[index] ?? '';
      });
    }, previousVisibility);
    await page.locator('body').evaluate((node) => {
      delete node.dataset.qaActionDockSurface;
    });
    await qaDockSurfaceStyle.evaluate((node) => node.remove());
  }
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

async function assertRewardToastGeneratedSurface(page) {
  const surface = await page.evaluate(async () => {
    async function analyzeGeneratedImage(backgroundImage, columns, cell) {
      const url = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!url) return { url: null, loaded: false, width: 0, height: 0, visiblePixels: 0 };
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const loaded = new Promise((resolve) => {
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
      });
      image.src = url;
      if (!await loaded) return { url, loaded: false, width: 0, height: 0, visiblePixels: 0 };
      const canvas = document.createElement('canvas');
      const sourceX = Math.floor((image.naturalWidth / columns) * cell);
      const sourceWidth = Math.floor(image.naturalWidth / columns);
      const sourceHeight = image.naturalHeight;
      const width = Math.min(sourceWidth, 256);
      const height = Math.min(sourceHeight, 256);
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, sourceX, 0, sourceWidth, sourceHeight, 0, 0, width, height);
      const data = context.getImageData(0, 0, width, height).data;
      let visiblePixels = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] > 16) visiblePixels += 1;
      }
      return { url, loaded: true, width: image.naturalWidth, height: image.naturalHeight, sourceX, sourceWidth, visiblePixels };
    }

    const node = document.querySelector('.toast');
    if (!node) return { missing: true };
    const wasHidden = node.hidden;
    const previousText = node.textContent;
    const previousKind = node.dataset.toastKind;
    node.hidden = false;
    node.textContent = '검수 보상';
    node.dataset.toastKind = 'reward';
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const before = getComputedStyle(node, '::before');
    const after = getComputedStyle(node, '::after');
    const snapshot = {
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      backgroundPositionX: style.backgroundPositionX,
      backgroundPositionY: style.backgroundPositionY,
      boxShadow: style.boxShadow,
      textShadow: style.textShadow,
      borderRadii: [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius
      ],
      beforeBackgroundImage: before.backgroundImage,
      beforeFilter: before.filter,
      afterBackgroundImage: after.backgroundImage,
      images: {
        callout: await analyzeGeneratedImage(style.backgroundImage, 2, 1),
        icon: await analyzeGeneratedImage(before.backgroundImage, 4, 0),
        burst: await analyzeGeneratedImage(after.backgroundImage, 4, 0)
      },
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
    if (previousKind) node.dataset.toastKind = previousKind;
    else delete node.dataset.toastKind;
    node.hidden = wasHidden;
    node.textContent = previousText;
    return snapshot;
  });
  assert.equal(surface.missing, undefined, `reward toast unavailable: ${JSON.stringify(surface)}`);
  assert.match(surface.backgroundImage, /reboot-toast-callouts/, `reward toast lacks generated callout art: ${JSON.stringify(surface)}`);
  assert.equal(surface.backgroundSize, '200% 100%', `reward toast callout sizing changed: ${JSON.stringify(surface)}`);
  assert.equal(surface.backgroundPositionX, '100%', `reward toast does not use reward callout cell: ${JSON.stringify(surface)}`);
  assert.equal(surface.backgroundPositionY, '0px', `reward toast vertical callout cell changed: ${JSON.stringify(surface)}`);
  assert.equal(surface.boxShadow, 'none', `reward toast still has css shadow: ${JSON.stringify(surface)}`);
  assert.equal(surface.textShadow, 'none', `reward toast still has css text shadow: ${JSON.stringify(surface)}`);
  for (const radius of surface.borderRadii) {
    assert.equal(radius, '0px', `reward toast still has css radius: ${JSON.stringify(surface)}`);
  }
  assert.match(surface.beforeBackgroundImage, /reboot-reward-icons/, `reward toast lacks generated reward icon: ${JSON.stringify(surface)}`);
  assert.equal(surface.beforeFilter, 'none', `reward toast icon still has css filter shadow: ${JSON.stringify(surface)}`);
  assert.match(surface.afterBackgroundImage, /reboot-reward-burst/, `reward toast lacks generated reward burst: ${JSON.stringify(surface)}`);
  for (const [name, image] of Object.entries(surface.images)) {
    assert.equal(image.loaded, true, `reward toast ${name} image failed to load: ${JSON.stringify(surface)}`);
    assert.equal(image.width > 0 && image.height > 0, true, `reward toast ${name} image is empty: ${JSON.stringify(surface)}`);
    assert.equal(image.visiblePixels > 16, true, `reward toast ${name} image is visually blank: ${JSON.stringify(surface)}`);
  }
  assert.equal(surface.width >= 188 && surface.height >= 46, true, `reward toast collapsed: ${JSON.stringify(surface)}`);
}

async function assertReadyRescueUsesGeneratedStateArt(page) {
  const surfaces = await page.evaluate(() => {
    const button = document.querySelector('#rescueButton');
    if (!button) return { missing: true };
    const previousReady = button.dataset.ready;
    const previousUnlocked = button.dataset.unlocked;
    const previousCritical = button.dataset.critical;
    const previousDisabled = button.disabled;
    const snapshots = [];
    try {
      for (const critical of [false, true]) {
        button.disabled = false;
        button.dataset.ready = 'true';
        button.dataset.unlocked = 'true';
        button.dataset.critical = critical ? 'true' : 'false';
        const style = getComputedStyle(button);
        const after = getComputedStyle(button, '::after');
        snapshots.push({
          label: critical ? 'critical rescue' : 'ready rescue',
          expectedImage: critical ? /reboot-critical-action-rings/ : /reboot-action-ready-pulses/,
          minOpacity: critical ? 0.45 : 0.3,
          boxShadow: style.boxShadow,
          backgroundImage: style.backgroundImage,
          afterBackgroundImage: after.backgroundImage,
          afterBackgroundSize: after.backgroundSize,
          afterBackgroundPositionX: after.backgroundPositionX,
          afterBackgroundPositionY: after.backgroundPositionY,
          afterOpacity: after.opacity,
          afterMixBlendMode: after.mixBlendMode
        });
      }
      return { snapshots };
    } finally {
      if (previousReady === undefined) delete button.dataset.ready;
      else button.dataset.ready = previousReady;
      if (previousUnlocked === undefined) delete button.dataset.unlocked;
      else button.dataset.unlocked = previousUnlocked;
      if (previousCritical === undefined) delete button.dataset.critical;
      else button.dataset.critical = previousCritical;
      button.disabled = previousDisabled;
    }
  });
  assert.equal(surfaces.missing, undefined, `ready rescue unavailable: ${JSON.stringify(surfaces)}`);
  assert.equal(surfaces.snapshots?.length, 2, `ready rescue states missing: ${JSON.stringify(surfaces)}`);
  for (const surface of surfaces.snapshots) {
    assert.equal(surface.boxShadow, 'none', `${surface.label} still uses css halo: ${JSON.stringify(surface)}`);
    assert.match(surface.backgroundImage, /reboot-combat-action-buttons/, `${surface.label} lacks generated button body: ${JSON.stringify(surface)}`);
    assert.match(surface.afterBackgroundImage, surface.expectedImage, `${surface.label} lacks generated state art: ${JSON.stringify(surface)}`);
    assert.equal(surface.afterBackgroundSize, '300% 100%', `${surface.label} state art slicing changed: ${JSON.stringify(surface)}`);
    assert.equal(surface.afterBackgroundPositionX, '100%', `${surface.label} does not use rescue cell: ${JSON.stringify(surface)}`);
    assert.equal(surface.afterBackgroundPositionY, '0px', `${surface.label} y position changed: ${JSON.stringify(surface)}`);
    assert.equal(Number.parseFloat(surface.afterOpacity) >= surface.minOpacity, true, `${surface.label} art is too faint: ${JSON.stringify(surface)}`);
    assert.equal(surface.afterMixBlendMode, 'screen', `${surface.label} blend changed: ${JSON.stringify(surface)}`);
  }
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
  await assertBannerOverlayClear(page, '#collectionScreen .meta-showcase', 'collection showcase');
  await assertMetaListReachesDock(page, '#collectionList', 'collection');
  assert.equal(await page.locator('#collectionList .unit-card .sprite-token.unit-sprite').count(), 8);
  assert.equal(await page.locator('#collectionList .meta-showcase .sprite-token.unit-sprite').count(), 1);
  await assertGeneratedCardSurface(page, '#collectionList .meta-shelf-grid .unit-card', 'collection shelf card', /reboot-meta-item-status-overlays/);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '상점' }).click();
  await assertActiveNavLabelPlate(page, '상점', 'shop');
  await page.locator('.shop-cosmetic').first().waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#shopScreen .meta-showcase-copy > span:first-child', 'shop', 1);
  await assertMetaShowcaseChips(page, '#shopScreen .meta-showcase-chip', 'shop', 2);
  await assertBannerOverlayClear(page, '#shopScreen .meta-showcase', 'shop showcase');
  await assertShopFeatureOffer(page, 'shop');
  await assertMetaListReachesDock(page, '#shopList', 'shop');
  assert.equal(await page.locator('#shopList .shop-card .sprite-token.shop-cosmetic').count(), 5);
  assert.equal(await page.locator('#shopList .meta-showcase .sprite-token.shop-cosmetic').count(), 1);
  await assertGeneratedCardSurface(page, '#shopList .meta-shelf-grid .shop-card', 'shop shelf card', /reboot-meta-item-status-overlays/);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '미션' }).click();
  await assertActiveNavLabelPlate(page, '미션', 'missions');
  await page.locator('#missionsList .mission-stamp-board').waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#missionsScreen .mission-board-copy span, #missionsScreen .mission-board-copy p', 'missions', 2);
  await assertBannerOverlayClear(page, '#missionsScreen .mission-stamp-board', 'mission banner');
  await assertMetaListReachesDock(page, '#missionsList', 'missions');
  assert.equal(await page.locator('#missionsList .mission-stamp-slot').count(), 3);
  assert.equal(await page.locator('#missionsList .mission-card').count(), 3);
  await assertGeneratedCardSurface(page, '#missionsList .mission-card', 'mission row card', /reboot-meta-objective-rails/);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();
  await page.getByRole('button', { name: '시즌' }).click();
  await assertActiveNavLabelPlate(page, '시즌', 'season');
  await page.locator('#seasonList .season-track-board').waitFor({ state: 'visible' });
  await assertMetaCaptionPlates(page, '#seasonScreen .season-board-copy span, #seasonScreen .season-board-copy p', 'season', 2);
  await assertBannerOverlayClear(page, '#seasonScreen .season-track-board', 'season banner');
  await assertMetaListReachesDock(page, '#seasonList', 'season');
  assert.equal(await page.locator('#seasonList .season-track-node').count(), 4);
  assert.equal(await page.locator('#seasonList .season-card').count(), 4);
  await assertGeneratedCardSurface(page, '#seasonList .season-card', 'season row card', /reboot-meta-objective-rails/);
  await page.getByRole('button', { name: '로비로 돌아가기' }).click();

  await page.getByRole('button', { name: '첫 구원 작전 시작' }).click();
  await page.locator('#summonButton').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.action-panel button').count(), 3);
  assert.equal(await page.locator('#shopButton, #passButton, #adButton, #paidReviveButton').count(), 0);
  assert.equal(await page.locator('#bossMeter').isVisible(), false);
  assert.notEqual(await page.locator('.action-panel').evaluate((node) => getComputedStyle(node).display), 'none');
  await assertCombatDockSafeArea(page);
  await assertActionDockGeneratedConsoleSurface(page);
  await assertActionDockRenderedBoundaryScreenshot(page);
  await assertCombatToastClearsDock(page);
  await assertRewardToastGeneratedSurface(page);
  await assertReadyRescueUsesGeneratedStateArt(page);
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
  await page.evaluate(({ key, profile }) => {
    localStorage.setItem(key, JSON.stringify(profile));
  }, { key: profileStorageKey, profile: shopReadyProfile });
  await page.reload({ waitUntil: 'load' });
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
  await assertShopFeatureOffer(page, 'compact ready shop');
  await assertFeaturedShopPurchaseFlow(page, 'compact ready shop');
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
  await assertResultGeneratedCopySurfaces(page);
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

async function verifyCompactResult(page) {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(withParam(baseUrl, 'qaFast', '1'), { waitUntil: 'load' });
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '첫 구원 작전 시작' }).click();
  await page.locator('#summonButton').waitFor({ state: 'visible' });

  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (await page.locator('#resultTitle').isVisible()) break;
    if (await page.locator('#rescueButton').isEnabled()) {
      await page.locator('#rescueButton').click();
    } else if (await page.locator('#mergeButton').isEnabled()) {
      await page.locator('#mergeButton').click();
    } else if (await page.locator('#summonButton').isEnabled()) {
      await page.locator('#summonButton').click();
    }
    await page.waitForTimeout(20);
  }

  assert.equal(await page.locator('#resultTitle').isVisible(), true, 'compact result should be reached');
  assert.equal(await page.locator('#resultTitle').textContent(), '승리');
  await assertResultGeneratedCopySurfaces(page);
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
      await context.addInitScript(() => {
        if (new URLSearchParams(location.search).get('qaFast') !== '1') return;
        let frameNow = 0;
        window.requestAnimationFrame = (callback) => {
          frameNow += 80;
          return window.setTimeout(() => callback(frameNow), 1);
        };
        window.cancelAnimationFrame = (id) => window.clearTimeout(id);
      });
      await verifyCompactResult(page);
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
