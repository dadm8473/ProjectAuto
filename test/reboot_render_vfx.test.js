import test from 'node:test';
import assert from 'node:assert/strict';

import { drawRebootBattle } from '../src/client/reboot_render.js';

function image(width = 256, height = 128) {
  return { complete: true, naturalWidth: width, naturalHeight: height };
}

function mockContext() {
  const commands = [];
  const ctx = {
    commands,
    _lineStart: null,
    save: () => commands.push({ type: 'save' }),
    restore: () => commands.push({ type: 'restore' }),
    translate: (x, y) => commands.push({ type: 'translate', x, y }),
    rotate: (angle) => commands.push({ type: 'rotate', angle }),
    clearRect: (...args) => commands.push({ type: 'clearRect', args }),
    drawImage: (...args) => commands.push({ type: 'drawImage', args }),
    beginPath: () => commands.push({ type: 'beginPath' }),
    moveTo(x, y) {
      ctx._lineStart = { x, y };
      commands.push({ type: 'moveTo', x, y });
    },
    lineTo(x, y) {
      commands.push({ type: 'lineTo', x, y, from: ctx._lineStart });
    },
    stroke: () => commands.push({ type: 'stroke' }),
    fill: () => commands.push({ type: 'fill' }),
    roundRect: (...args) => commands.push({ type: 'roundRect', args }),
    ellipse: (...args) => commands.push({ type: 'ellipse', args }),
    fillRect: (...args) => commands.push({ type: 'fillRect', args }),
    fillText: (...args) => commands.push({ type: 'fillText', args }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    set globalAlpha(value) { commands.push({ type: 'globalAlpha', value }); },
    get globalAlpha() { return 1; },
    set fillStyle(value) { commands.push({ type: 'fillStyle', value }); },
    get fillStyle() { return '#000'; },
    set strokeStyle(value) { commands.push({ type: 'strokeStyle', value }); },
    get strokeStyle() { return '#000'; },
    set lineWidth(value) { commands.push({ type: 'lineWidth', value }); },
    get lineWidth() { return 1; },
    set shadowColor(value) { commands.push({ type: 'shadowColor', value }); },
    get shadowColor() { return '#000'; },
    set shadowBlur(value) { commands.push({ type: 'shadowBlur', value }); },
    get shadowBlur() { return 0; },
    set font(value) { commands.push({ type: 'font', value }); },
    get font() { return '10px system-ui'; }
  };
  return ctx;
}

function stateWithEffects() {
  return {
    now: 104,
    boards: {
      p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
      p2: { danger: 29, units: [{ spriteKey: 'spark_pin' }] }
    },
    enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss' }],
    events: [{ type: 'rescue', at: 70, playerId: 'p1' }],
    effects: [
      { type: 'hit', playerId: 'p1', slot: 0, targetProgress: 0.62, targetLane: 0, targetType: 'mini_boss', ttl: 0.5 }
    ]
  };
}

test('combat VFX uses compact hit bolts and rescue pulses instead of screen-crossing strokes', () => {
  const ctx = mockContext();
  drawRebootBattle(ctx, stateWithEffects(), { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    units: image(1280, 256),
    enemies: image(1024, 256),
    board: image(1280, 256),
    hitBolts: image(768, 128),
    bossAuras: image(768, 192)
  });

  const hitBoltDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 768
      && command.args[0].naturalHeight === 128
      && command.args[7] <= 108
  ));
  assert.equal(hitBoltDraws.length >= 1, true, 'expected a compact hit bolt draw');

  const longLines = ctx.commands.filter((command) => {
    if (command.type !== 'lineTo' || !command.from) return false;
    return Math.hypot(command.x - command.from.x, command.y - command.from.y) > 120;
  });
  assert.deepEqual(longLines, []);

  const rescuePulseDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[1] === 768
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
      && command.args[7] <= 104
  ));
  assert.equal(rescuePulseDraws.length >= 2, true, 'expected short rescue pulse sprites');

  assert.equal(
    ctx.commands.filter((command) => command.type === 'save').length,
    ctx.commands.filter((command) => command.type === 'restore').length
  );
});

test('player board uses a generated landing tray beneath summoned units', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 10.4,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [{ type: 'summon', at: 10.1, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      playerBoardTray: image(780, 320)
    }
  );

  const trayIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 780
      && command.args[0].naturalHeight === 320
      && command.args[1] === 18
      && command.args[2] === 378
      && command.args[3] === 354
      && command.args[4] === 148
  ));
  const unitIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[7] >= 68
      && command.args[7] <= 78
      && command.args[8] >= 68
      && command.args[8] <= 78
      && command.args[6] < 456
  ));
  const summonVfxIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 0
      && command.args[2] === 0
      && command.args[7] === 84
  ));

  assert.notEqual(trayIndex, -1, 'expected generated player board tray to draw');
  assert.notEqual(unitIndex, -1, 'expected summoned unit to draw');
  assert.notEqual(summonVfxIndex, -1, 'expected summon landing VFX to draw');
  assert.equal(trayIndex < unitIndex, true, 'tray should sit beneath summoned units');
  assert.equal(unitIndex < summonVfxIndex, true, 'summon flash should sit above the new unit');
});

test('first player action clears the operation start cutin so combat feedback stays visible', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 1.2,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 1.05, playerId: 'p1' }],
      effects: [{ type: 'hit', playerId: 'p1', slot: 0, targetProgress: 0.4, targetLane: 0.25, targetType: 'noise_shard', ttl: 0.58 }]
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      hitBolts: image(768, 128),
      startCutin: image(390, 112),
      momentCallouts: image(1170, 144),
      playerBoardTray: image(780, 320)
    }
  );

  const startCutinDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 390
      && command.args[0].naturalHeight === 112
  ));
  const hitBoltDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 768
      && command.args[0].naturalHeight === 128
  ));
  const summonVfxDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 0
      && command.args[7] === 84
  ));

  assert.deepEqual(startCutinDraws, []);
  assert.equal(hitBoltDraws.length >= 1, true, 'expected hit bolt to remain visible after first action');
  assert.equal(summonVfxDraws.length >= 1, true, 'expected summon VFX to remain visible after first action');
});

test('equipped cosmetics render as a visual-only player board signature', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 35,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      cosmeticSigils: image(960, 128)
    },
    { equippedCosmetic: 'merge-effect', reducedMotion: true }
  );

  const sigilDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 960
      && command.args[0].naturalHeight === 128
      && command.args[1] === 384
      && command.args[2] === 0
      && command.args[3] === 192
      && command.args[4] === 128
      && command.args[7] <= 330
      && command.args[8] <= 92
  ));

  assert.equal(sigilDraws.length, 1, 'equipped cosmetic should draw one non-gameplay board sigil');
  assert.equal(
    ctx.commands.filter((command) => command.type === 'save').length,
    ctx.commands.filter((command) => command.type === 'restore').length
  );
});
