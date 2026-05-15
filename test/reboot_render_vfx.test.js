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

test('random combat actions draw generated reveal VFX before the small legacy flash', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 12.32,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }, { spriteKey: 'burst_pin' }] },
        p2: { danger: 42, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [],
      events: [
        { type: 'summon', at: 12.02, playerId: 'p1', highlight: true },
        { type: 'merge', at: 12.08, playerId: 'p1', highlight: true },
        { type: 'rescue', at: 12.12, playerId: 'p1', highlight: true }
      ],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1282, 256),
      board: image(1281, 256),
      vfx: image(1280, 256),
      combatRevealVfx: image(1920, 512),
      playerBoardTray: image(780, 320)
    }
  );

  const revealDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1920
      && command.args[0].naturalHeight === 512
  ));
  const sourceXs = revealDraws.map((command) => command.args[1]);
  assert.equal(sourceXs.includes(0), true, 'expected summon reveal cell');
  assert.equal(sourceXs.includes(480), true, 'expected merge reveal cell');
  assert.equal(sourceXs.includes(960), true, 'expected rare reveal flash cell');
  assert.equal(sourceXs.includes(1440), true, 'expected rescue reveal cell');

  const firstRevealIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1920
      && command.args[0].naturalHeight === 512
  ));
  const firstLegacyVfxIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && [0, 256, 512].includes(command.args[1])
  ));
  assert.notEqual(firstRevealIndex, -1, 'expected generated reveal VFX to draw');
  assert.notEqual(firstLegacyVfxIndex, -1, 'expected legacy compact flash to still draw');
  assert.equal(firstRevealIndex < firstLegacyVfxIndex, true, 'big reveal should establish the moment before the compact flash');
});

test('boss death burst gets a generated battlefield finale behind the kill burst', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 116.4,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }] },
        p2: { danger: 18, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [],
      events: [],
      effects: [
        {
          type: 'death_burst',
          targetType: 'mini_boss',
          targetProgress: 0.62,
          targetLane: 0,
          rewardCharge: 10,
          rewardLink: 4,
          ttl: 1.05
        }
      ]
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      killBurst: image(256, 256),
      fieldFinaleBursts: image(780, 260),
      rewardPickups: image(768, 128),
      rewards: image(1024, 256)
    }
  );

  const finaleIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 780
      && command.args[0].naturalHeight === 260
      && command.args[1] === 0
      && command.args[2] === 0
      && command.args[3] === 260
      && command.args[4] === 260
      && command.args[7] >= 150
      && command.args[8] >= 150
  ));
  const killBurstIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 256
      && command.args[0].naturalHeight === 256
      && command.args[7] === 120
      && command.args[8] === 120
  ));

  assert.notEqual(finaleIndex, -1, 'expected generated boss battlefield finale to draw');
  assert.notEqual(killBurstIndex, -1, 'expected boss kill burst to still draw');
  assert.equal(finaleIndex < killBurstIndex, true, 'battlefield finale should frame the boss kill burst from behind');
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

test('player board marks two grade-one reboot units as merge ready', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 20,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin', grade: 1 }, { spriteKey: 'toktok_amp', grade: 1 }] },
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
      playerBoardTray: image(780, 320)
    }
  );

  const mergeReadyFrames = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 512
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
  ));

  assert.equal(mergeReadyFrames.length >= 2, true, 'two grade-one reboot units should get generated merge-ready frames');
});

test('player board does not mark grade-two reboot units as normal merge ready', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 20,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin', grade: 2 }, { spriteKey: 'burst_pin', grade: 2 }] },
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
      playerBoardTray: image(780, 320)
    }
  );

  const mergeReadyFrames = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 512
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
  ));

  assert.equal(mergeReadyFrames.length, 0, 'grade-two units should not get normal merge-ready frames');
});

test('first player summon gets a generated reward spotlight before the small flash', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 0.82,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [{ type: 'summon', at: 0.64, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      firstCommandSpotlight: image(256, 128),
      playerBoardTray: image(780, 320)
    }
  );

  const spotlightIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 256
      && command.args[0].naturalHeight === 128
      && command.args[7] >= 176
      && command.args[8] >= 88
      && command.args[6] >= 390
  ));
  const summonVfxIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 0
      && command.args[2] === 0
      && command.args[7] === 84
  ));

  assert.notEqual(spotlightIndex, -1, 'expected generated first-summon spotlight to draw on the player board');
  assert.notEqual(summonVfxIndex, -1, 'expected summon flash to draw above the reward spotlight');
  assert.equal(spotlightIndex < summonVfxIndex, true, 'reward spotlight should establish the summon moment before the flash');
});

test('first player summon sends generated ignition from board toward track before flash', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 0.84,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 0.64, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      summonIgnition: image(768, 256),
      firstCommandSpotlight: image(256, 128),
      playerBoardTray: image(780, 320)
    }
  );

  const ignitionDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 768
      && command.args[0].naturalHeight === 256
      && [0, 256, 512].includes(command.args[1])
  ));
  const summonVfxIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 0
      && command.args[7] === 84
  ));

  assert.equal(ignitionDraws.length >= 3, true, 'expected landing ring, lane wake, and spark ignition cells');
  assert.notEqual(summonVfxIndex, -1, 'expected summon flash to still draw');
  assert.equal(ctx.commands.indexOf(ignitionDraws[0]) < summonVfxIndex, true, 'ignition should make the board feel alive before the small flash');
});

test('first player merge gets a generated board sigil before the burst', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 51.28,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [{ type: 'merge', at: 51.08, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      cosmeticSigils: image(960, 128),
      playerBoardTray: image(780, 320)
    }
  );

  const mergeSigilIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 960
      && command.args[0].naturalHeight === 128
      && command.args[1] === 384
      && command.args[2] === 0
      && command.args[3] === 192
      && command.args[4] === 128
      && command.args[7] >= 300
      && command.args[8] >= 86
  ));
  const mergeBurstIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 256
      && command.args[2] === 0
      && command.args[7] === 112
  ));

  assert.notEqual(mergeSigilIndex, -1, 'expected generated merge sigil to draw across the player board');
  assert.notEqual(mergeBurstIndex, -1, 'expected merge burst to draw above the board sigil');
  assert.equal(mergeSigilIndex < mergeBurstIndex, true, 'merge sigil should ground the success moment before the burst');
});

test('first player rescue gets a generated link sigil before the flare', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 78.24,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'rescue_coil' }] },
        p2: { danger: 44, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [{ enemyId: 'heavy_noise', spriteKey: 'heavy_noise' }],
      events: [{ type: 'rescue', at: 78.04, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      cosmeticSigils: image(960, 128),
      playerBoardTray: image(780, 320)
    }
  );

  const rescueSigilIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 960
      && command.args[0].naturalHeight === 128
      && command.args[1] === 576
      && command.args[2] === 0
      && command.args[3] === 192
      && command.args[4] === 128
      && command.args[6] >= 260
      && command.args[7] >= 300
      && command.args[8] >= 94
  ));
  const rescueFlareIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 512
      && command.args[2] === 0
      && command.args[7] === 132
  ));

  assert.notEqual(rescueSigilIndex, -1, 'expected generated rescue sigil to draw between the boards');
  assert.notEqual(rescueFlareIndex, -1, 'expected rescue flare to draw above the link sigil');
  assert.equal(rescueSigilIndex < rescueFlareIndex, true, 'rescue sigil should ground the co-op save before the flare');
});

test('image backdrop board labels sit on generated combat plates', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 8.4,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 52, units: [] }
      },
      enemies: [],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      board: image(1280, 256),
      boardLabelPlates: image(780, 80)
    }
  );

  const plateIndices = ctx.commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => (
      command.type === 'drawImage'
        && command.args[0].naturalWidth === 780
        && command.args[0].naturalHeight === 80
    ))
    .map(({ index }) => index);
  const partnerTextIndex = ctx.commands.findIndex((command) => (
    command.type === 'fillText' && command.args[0] === '파트너 보드'
  ));
  const dangerTextIndex = ctx.commands.findIndex((command) => (
    command.type === 'fillText' && command.args[0] === '위험 52'
  ));

  assert.equal(plateIndices.length >= 2, true, 'expected generated plates behind partner and danger labels');
  assert.equal(plateIndices.some((index) => index < partnerTextIndex), true, 'partner label should sit above a generated plate');
  assert.equal(plateIndices.some((index) => index < dangerTextIndex), true, 'danger label should sit above a generated plate');
});

test('image backdrop suppresses idle partner board labels', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 8.4,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      board: image(1280, 256),
      boardLabelPlates: image(780, 80)
    }
  );

  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '파트너 보드'), false);
  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '위험 0'), false);
});

test('first player action clears the operation start cutin so combat feedback stays visible', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 0.72,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 0.58, playerId: 'p1' }],
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

test('combat moment callout stays readable long enough after the first summon', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 11.45,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 10.1, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      momentCallouts: image(1170, 144),
      playerBoardTray: image(780, 320)
    }
  );

  const calloutDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1170
      && command.args[0].naturalHeight === 144
  ));
  assert.ok(calloutDraw, 'expected summon moment callout to remain visible after the action flash');
  assert.equal(calloutDraw.args[6] <= 306, true, `moment callout should sit above the lower track haze: ${calloutDraw.args[6]}`);
  const calloutIndex = ctx.commands.indexOf(calloutDraw);
  const calloutAlpha = ctx.commands
    .slice(0, calloutIndex)
    .findLast((command) => command.type === 'globalAlpha')?.value ?? 0;
  assert.equal(calloutAlpha >= 0.82, true, `moment callout should remain legible while the unit lands: ${calloutAlpha}`);
});

test('rescue moment callout stays below boss warning copy during crisis timing', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 93.45,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'mirror_port' }] },
        p2: { danger: 70, units: [{ spriteKey: 'bloom_amp' }] }
      },
      enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss' }],
      events: [{ type: 'rescue', at: 92.1, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      bossCutin: image(390, 128),
      momentCallouts: image(1170, 144),
      playerBoardTray: image(780, 320),
      bossAuras: image(768, 192),
      crisisOverlays: image(780, 320)
    }
  );

  const bossTitleIndex = ctx.commands.findIndex((command) => (
    command.type === 'fillText' && command.args[0] === '보스 접근'
  ));
  const rescueCalloutDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1170
      && command.args[0].naturalHeight === 144
      && command.args[1] === 780
  ));
  assert.notEqual(bossTitleIndex, -1, 'expected boss warning title to render during crisis timing');
  assert.ok(rescueCalloutDraw, 'expected rescue moment callout to render during crisis timing');
  const calloutIndex = ctx.commands.indexOf(rescueCalloutDraw);
  assert.equal(calloutIndex > bossTitleIndex, true, 'moment callout should be layered after the boss warning art');
  assert.equal(rescueCalloutDraw.args[6] >= 300, true, `rescue callout should stay below boss warning copy: ${rescueCalloutDraw.args[6]}`);
  assert.equal(rescueCalloutDraw.args[6] <= 306, true, `rescue callout should stay above lower track haze: ${rescueCalloutDraw.args[6]}`);
  const calloutAlpha = ctx.commands
    .slice(0, calloutIndex)
    .findLast((command) => command.type === 'globalAlpha')?.value ?? 0;
  assert.equal(calloutAlpha >= 0.82, true, `rescue callout should remain legible during boss warning: ${calloutAlpha}`);
});

test('operation start cutin clears before the first second even without player action', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 0.95,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      board: image(1280, 256),
      startCutin: image(390, 112)
    }
  );

  const startCutinDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 390
      && command.args[0].naturalHeight === 112
  ));
  const enemyDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1024
      && command.args[0].naturalHeight === 256
  ));

  assert.deepEqual(startCutinDraws, []);
  assert.equal(enemyDraws.length >= 1, true, 'expected early enemies to remain readable after the intro beat');
});

test('online waiting hides the operation start cutin so matchmaking stays quiet', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 0.35,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      board: image(1280, 256),
      startCutin: image(390, 112)
    },
    { onlineWaiting: true }
  );

  const startCutinDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 390
      && command.args[0].naturalHeight === 112
  ));

  assert.deepEqual(startCutinDraws, []);
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
