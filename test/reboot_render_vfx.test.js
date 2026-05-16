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

test('enemy spawn gate draws as a generated battlefield object before enemy sprites', () => {
  const ctx = mockContext();
  const enemySpawnGates = image(768, 192);
  const enemies = image(1024, 256);
  drawRebootBattle(
    ctx,
    {
      now: 12,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard' },
        { enemyId: 'quick_noise', spriteKey: 'quick_noise' }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      board: image(1280, 256),
      enemySpawnGates
    }
  );

  const spawnGateIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemySpawnGates);
  const enemyIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const spawnGateDraw = ctx.commands[spawnGateIndex];

  assert.notEqual(spawnGateIndex, -1, 'expected generated enemy spawn gate to anchor the intrusion point');
  assert.notEqual(enemyIndex, -1, 'expected enemy sprites to render');
  assert.equal(spawnGateDraw.args[5] >= 24, true, 'spawn gate should sit inside the visible track entrance');
  assert.equal(spawnGateIndex < enemyIndex, true, 'spawn gate should sit behind enemies on the track');
});

test('opening combat previews an incoming threat before the first serialized enemy arrives', () => {
  const ctx = mockContext();
  const enemySpawnGates = image(768, 192);
  const enemyTrackTrails = image(1024, 128);
  const enemies = image(1024, 256);
  const openingThreatPreview = image(512, 256);
  drawRebootBattle(
    ctx,
    {
      now: 0.82,
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
      units: image(1280, 256),
      enemies,
      board: image(1280, 256),
      enemySpawnGates,
      enemyTrackTrails,
      openingThreatPreview
    }
  );

  const spawnGateIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemySpawnGates);
  const enemyIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const trailIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemyTrackTrails);
  const previewIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === openingThreatPreview);
  const previewDraw = ctx.commands[previewIndex];

  assert.notEqual(previewIndex, -1, 'expected dedicated imagegen opening threat preview before enemies serialize');
  assert.equal(spawnGateIndex, -1, 'dedicated preview should replace composited spawn-gate placeholder art');
  assert.equal(enemyIndex, -1, 'dedicated preview should avoid drawing a loose enemy atlas icon before enemies serialize');
  assert.equal(trailIndex, -1, 'dedicated preview should carry its own grounded track trail');
  assert.equal(previewDraw.args[5] >= 24, true, 'preview should sit inside the visible track entrance');
  assert.equal(previewDraw.args[7] <= 118, true, 'preview should stay compact enough for the mobile playfield');
});

test('opening threat preview remains after first summon until enemies serialize', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  const openingThreatPreview = image(512, 256);
  drawRebootBattle(
    ctx,
    {
      now: 0.74,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [{ type: 'summon', at: 0.62, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      board: image(1280, 256),
      openingThreatPreview
    }
  );

  const previewDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === openingThreatPreview
  ));
  const looseEnemyDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === enemies
  ));

  assert.equal(previewDraws.length >= 1, true, 'first summon should not leave an empty map before enemies serialize');
  assert.deepEqual(looseEnemyDraws, [], 'opening preview should still avoid loose enemy atlas icons');
});

test('signal core gate anchors the protected end of the track before enemies arrive', () => {
  const ctx = mockContext();
  const signalCoreGates = image(512, 192);
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 19,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard' }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      board: image(1280, 256),
      signalCoreGates
    }
  );

  const coreIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === signalCoreGates);
  const enemyIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const coreDraw = ctx.commands[coreIndex];

  assert.notEqual(coreIndex, -1, 'expected generated signal core gate at the protected track end');
  assert.notEqual(enemyIndex, -1, 'expected enemy sprites to render');
  assert.equal(coreDraw.args[5] >= 260, true, 'signal core gate should sit near the right-side track endpoint');
  assert.equal(coreIndex < enemyIndex, true, 'signal core gate should sit behind enemies so the threat reads clearly');
});

test('signal core gate switches to critical art when an enemy reaches the endpoint', () => {
  const ctx = mockContext();
  const signalCoreGates = image(512, 192);

  drawRebootBattle(
    ctx,
    {
      now: 38,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.9 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      signalCoreGates
    }
  );

  const coreDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === signalCoreGates);
  assert.ok(coreDraw, 'expected signal core gate draw');
  assert.equal(coreDraw.args[1], 256, 'endpoint pressure should use the critical signal core cell');
});

test('signal core gate reinforces endpoint pressure over enemies with a critical flare', () => {
  const ctx = mockContext();
  const signalCoreGates = image(512, 192);
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 44,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.9 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      signalCoreGates
    }
  );

  const enemyIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const criticalCoreDraws = ctx.commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => command.type === 'drawImage' && command.args[0] === signalCoreGates && command.args[1] === 256);

  assert.notEqual(enemyIndex, -1, 'expected enemy sprites to render');
  assert.equal(criticalCoreDraws.length >= 2, true, 'endpoint pressure should get a foreground critical flare');
  assert.equal(
    criticalCoreDraws.some(({ index }) => index > enemyIndex),
    true,
    'critical signal flare should stay visible over endpoint enemies'
  );
});

test('wave starts use a generated directive banner instead of bare event text', () => {
  const ctx = mockContext();
  const directiveBanner = image(768, 160);

  drawRebootBattle(
    ctx,
    {
      now: 18.28,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.08 }
      ],
      events: [{ type: 'wave', at: 18, waveAt: 18 }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      ui: image(1536, 256),
      directiveBanner
    }
  );

  const bannerIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === directiveBanner);
  const textIndex = ctx.commands.findIndex((command) => command.type === 'fillText' && command.args[0] === '적 접근');
  const bannerDraw = ctx.commands[bannerIndex];

  assert.notEqual(bannerIndex, -1, 'expected a generated wave directive banner to render');
  assert.notEqual(textIndex, -1, 'expected compact wave directive copy to render on the banner');
  assert.equal(textIndex > bannerIndex, true, 'wave directive copy should sit on the generated banner');
  assert.equal(bannerDraw.args[7] >= 280, true, 'directive banner should read as a battlefield UI plate');
  assert.equal(bannerDraw.args[8] <= 72, true, 'directive banner should stay compact on portrait combat');
});

test('enemy sprites follow serialized track progress instead of a timer-only path', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 1,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.82 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      board: image(1280, 256)
    }
  );

  const enemyDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === enemies);
  assert.ok(enemyDraw, 'expected enemy atlas draw');
  assert.equal(enemyDraw.args[5] + enemyDraw.args[7] / 2 > 260, true, 'enemy with high progress should render near the protected track end');
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

test('player board anchors summoned units with a generated activation ring', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 12,
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
      playerBoardTray: image(780, 320),
      unitActivationRing: image(512, 512)
    }
  );

  const ringIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 512
      && command.args[0].naturalHeight === 512
      && command.args[3] >= 78
      && command.args[4] >= 54
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

  assert.notEqual(ringIndex, -1, 'expected a generated unit activation ring under the summoned unit');
  assert.notEqual(unitIndex, -1, 'expected summoned unit to draw');
  assert.equal(ringIndex < unitIndex, true, 'activation ring should sit beneath the unit sprite');
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

test('pre-summon board cue links the first command to the player socket', () => {
  const ctx = mockContext();
  const firstCommandSpotlight = image(256, 128);

  drawRebootBattle(
    ctx,
    {
      now: 0.28,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      firstCommandSpotlight,
      playerBoardTray: image(780, 320)
    }
  );

  const cueDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0] === firstCommandSpotlight
      && command.args[5] >= 0
      && command.args[5] <= 20
      && command.args[6] >= 450
      && command.args[6] <= 470
      && command.args[7] >= 124
      && command.args[7] <= 146
  ));

  assert.ok(cueDraw, 'expected generated pre-summon cue to glow over the first player socket');
});

test('pre-summon board cue stays hidden while waiting for an online partner', () => {
  const ctx = mockContext();
  const firstCommandSpotlight = image(256, 128);

  drawRebootBattle(
    ctx,
    {
      now: 0.28,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      firstCommandSpotlight,
      playerBoardTray: image(780, 320)
    },
    { onlineWaiting: true }
  );

  const cueDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === firstCommandSpotlight
  ));

  assert.equal(cueDraws.length, 0, 'online waiting must not show a playable first-summon socket cue');
});

test('first summon landing beacon keeps the target socket alive through the coach window', () => {
  const ctx = mockContext();
  const firstSummonBeacon = image(256, 256);

  drawRebootBattle(
    ctx,
    {
      now: 10,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      board: image(1280, 256),
      firstSummonBeacon,
      playerBoardTray: image(780, 320)
    }
  );

  const beaconDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0] === firstSummonBeacon
      && command.args[5] >= 8
      && command.args[5] <= 28
      && command.args[6] >= 432
      && command.args[6] <= 452
      && command.args[7] >= 86
      && command.args[8] >= 86
  ));

  assert.ok(beaconDraw, 'expected a persistent generated landing beacon on the first summon socket');
});

test('first summon landing beacon clears after the first player action', () => {
  const ctx = mockContext();
  const firstSummonBeacon = image(256, 256);

  drawRebootBattle(
    ctx,
    {
      now: 10,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 2, playerId: 'p1' }],
      effects: [],
      actionState: { p1: { summon: false, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      board: image(1280, 256),
      firstSummonBeacon,
      playerBoardTray: image(780, 320)
    }
  );

  const beaconDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === firstSummonBeacon
  ));

  assert.equal(beaconDraws.length, 0, 'landing beacon must clear once the player has summoned');
});

test('bot partner standby sigil marks the empty partner board before bot acts', () => {
  const ctx = mockContext();
  const partnerStandbySigils = image(512, 160);

  drawRebootBattle(
    ctx,
    {
      mode: 'bot',
      now: 4,
      players: [
        { id: 'p1', bot: false },
        { id: 'p2', bot: true }
      ],
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      playerBoardTray: image(780, 320),
      partnerStandbySigils
    }
  );

  const standbyDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === partnerStandbySigils);

  assert.ok(standbyDraw, 'expected generated bot partner standby sigil on the partner board');
  assert.equal(standbyDraw.args[1], 0, 'bot standby should use the first atlas cell');
  assert.equal(standbyDraw.args[5] >= 110 && standbyDraw.args[5] <= 140, true, 'standby sigil should sit inside the partner board');
});

test('first summon landing beacon stays hidden while waiting for an online partner', () => {
  const ctx = mockContext();
  const firstSummonBeacon = image(256, 256);

  drawRebootBattle(
    ctx,
    {
      now: 10,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      board: image(1280, 256),
      firstSummonBeacon,
      playerBoardTray: image(780, 320)
    },
    { onlineWaiting: true }
  );

  const beaconDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === firstSummonBeacon
  ));

  assert.equal(beaconDraws.length, 0, 'online waiting must not show a playable first-summon landing beacon');
});

test('first summon cue owns attention after the brief operation intro', () => {
  const ctx = mockContext();
  const firstCommandSpotlight = image(256, 128);

  drawRebootBattle(
    ctx,
    {
      now: 0.62,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      board: image(1280, 256),
      startCutin: image(390, 112),
      firstCommandSpotlight,
      playerBoardTray: image(780, 320)
    }
  );

  const startCutinDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 390
      && command.args[0].naturalHeight === 112
  ));
  const cueDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === firstCommandSpotlight
  ));

  assert.deepEqual(startCutinDraws, []);
  assert.equal(cueDraws.length >= 1, true, 'expected first summon socket cue to remain after the intro clears');
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

test('second online player gets first summon premium VFX on their own lower board', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 0.84,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 0.64, playerId: 'p2' }],
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
    },
    { localBoardId: 'p2' }
  );

  const spotlightDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 256
      && command.args[0].naturalHeight === 128
      && command.args[6] >= 390
  ));
  const ignitionDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 768
      && command.args[0].naturalHeight === 256
      && [0, 256, 512].includes(command.args[1])
      && command.args[6] >= 300
  ));

  assert.ok(spotlightDraw, 'expected p2 first-summon spotlight on the lower own board');
  assert.equal(ignitionDraws.length >= 3, true, 'expected p2 first-summon ignition cells near the lower own board');
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

test('merge and rescue moments get the latest full-canvas generated action surge before compact flashes', () => {
  const mergeCtx = mockContext();
  const actionSurges = image(780, 620);
  drawRebootBattle(
    mergeCtx,
    {
      now: 78.26,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }] },
        p2: { danger: 44, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [{ enemyId: 'heavy_noise', spriteKey: 'heavy_noise' }],
      events: [{ type: 'merge', at: 78.0, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      playerBoardTray: image(780, 320),
      actionSurges
    }
  );
  const mergeCtxSurgeIndex = mergeCtx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === actionSurges
      && command.args[1] === 0
      && command.args[2] === 0
      && command.args[3] === 390
      && command.args[4] === 620
      && command.args[5] === 0
      && command.args[6] === 0
      && command.args[7] === 390
      && command.args[8] === 620
  ));
  const mergeCtxBurstIndex = mergeCtx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 256
      && command.args[7] === 112
  ));

  assert.notEqual(mergeCtxSurgeIndex, -1, 'expected generated merge action surge to cover the battlefield');
  assert.equal(mergeCtxSurgeIndex < mergeCtxBurstIndex, true, 'merge surge should sell the action before the compact flash');

  const rescueCtx = mockContext();
  drawRebootBattle(
    rescueCtx,
    {
      now: 78.26,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }, { spriteKey: 'rescue_coil' }] },
        p2: { danger: 44, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [{ enemyId: 'heavy_noise', spriteKey: 'heavy_noise' }],
      events: [
        { type: 'merge', at: 78.0, playerId: 'p1' },
        { type: 'rescue', at: 78.04, playerId: 'p1' }
      ],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      vfx: image(1280, 256),
      playerBoardTray: image(780, 320),
      actionSurges
    }
  );

  const mergeSurgeIndex = rescueCtx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === actionSurges
      && command.args[1] === 0
      && command.args[2] === 0
      && command.args[3] === 390
      && command.args[4] === 620
      && command.args[5] === 0
      && command.args[6] === 0
      && command.args[7] === 390
      && command.args[8] === 620
  ));
  const rescueSurgeIndex = rescueCtx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === actionSurges
      && command.args[1] === 390
      && command.args[2] === 0
      && command.args[3] === 390
      && command.args[4] === 620
      && command.args[5] === 0
      && command.args[6] === 0
      && command.args[7] === 390
      && command.args[8] === 620
  ));
  const rescueFlareIndex = rescueCtx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 512
      && command.args[7] === 132
  ));

  assert.equal(mergeSurgeIndex, -1, 'overlapping actions should not stack full-canvas merge and rescue surges');
  assert.notEqual(rescueSurgeIndex, -1, 'expected generated rescue action surge to cover the battlefield');
  assert.equal(rescueSurgeIndex < rescueFlareIndex, true, 'rescue surge should sell the co-op save before the compact flare');
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
      actionStamps: image(768, 128),
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

test('compact combat action stamp stays readable long enough after the first summon', () => {
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
      actionStamps: image(768, 128),
      playerBoardTray: image(780, 320)
    }
  );

  const stampDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 768
      && command.args[0].naturalHeight === 128
  ));
  assert.ok(stampDraw, 'expected compact summon action stamp to remain visible after the action flash');
  assert.equal(stampDraw.args[6] >= 320, true, `action stamp should sit below the center track: ${stampDraw.args[6]}`);
  assert.equal(stampDraw.args[8] <= 78, true, `action stamp should stay compact: ${stampDraw.args[8]}`);
  const stampIndex = ctx.commands.indexOf(stampDraw);
  const stampAlpha = ctx.commands
    .slice(0, stampIndex)
    .findLast((command) => command.type === 'globalAlpha')?.value ?? 0;
  assert.equal(stampAlpha >= 0.82, true, `action stamp should remain legible while the unit lands: ${stampAlpha}`);
});

test('rescue action stamp stays below boss warning copy during crisis timing', () => {
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
      events: [{ type: 'rescue', at: 92.6, playerId: 'p1' }],
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
	      actionSurges: image(780, 620),
	      actionStamps: image(768, 128),
      playerBoardTray: image(780, 320),
      bossAuras: image(768, 192),
      crisisOverlays: image(780, 320)
    }
  );

	  const bossTitleIndex = ctx.commands.findIndex((command) => (
	    command.type === 'fillText' && command.args[0] === '보스 접근'
	  ));
	  const actionSurgeIndex = ctx.commands.findIndex((command) => (
	    command.type === 'drawImage'
	      && command.args[0].naturalWidth === 780
	      && command.args[0].naturalHeight === 620
	  ));
	  const rescueStampDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 768
      && command.args[0].naturalHeight === 128
      && command.args[1] === 512
  ));
	  assert.notEqual(bossTitleIndex, -1, 'expected boss warning title to render during crisis timing');
	  assert.notEqual(actionSurgeIndex, -1, 'expected rescue action surge to render during crisis timing');
	  assert.equal(actionSurgeIndex < bossTitleIndex, true, 'full-canvas action surge should stay below boss warning copy');
	  assert.ok(rescueStampDraw, 'expected compact rescue action stamp to render during crisis timing');
  const stampIndex = ctx.commands.indexOf(rescueStampDraw);
  assert.equal(stampIndex > bossTitleIndex, true, 'action stamp should be layered after the boss warning art');
  assert.equal(rescueStampDraw.args[6] >= 320, true, `rescue stamp should stay below boss warning copy: ${rescueStampDraw.args[6]}`);
  assert.equal(rescueStampDraw.args[8] <= 78, true, `rescue stamp should stay compact: ${rescueStampDraw.args[8]}`);
  const stampAlpha = ctx.commands
    .slice(0, stampIndex)
    .findLast((command) => command.type === 'globalAlpha')?.value ?? 0;
  assert.equal(stampAlpha >= 0.82, true, `rescue stamp should remain legible during boss warning: ${stampAlpha}`);
});

test('playable partner danger overrides boss cutin with a generated dual crisis banner', () => {
  const ctx = mockContext();
  const dualCrisisCutin = image(390, 128);
  const bossCutin = image(390, 128);
  const rescueCutin = image(390, 112);

  drawRebootBattle(
    ctx,
    {
      now: 93.2,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }] },
        p2: { danger: 86, units: [{ spriteKey: 'spark_pin' }] }
      },
      resources: { p1: { rescue: 100 } },
      actionState: { p1: { rescue: true } },
      enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss' }],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      bossCutin,
      rescueCutin,
      dualCrisisCutin,
      bossAuras: image(768, 192),
      crisisOverlays: image(780, 320)
    }
  );

  assert.equal(ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === dualCrisisCutin), true);
  assert.equal(ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === bossCutin), false);
  assert.equal(ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === rescueCutin), false);
  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '구원 우선'), true);
});

test('second online player sees their playable partner danger as the dual crisis banner', () => {
  const ctx = mockContext();
  const dualCrisisCutin = image(390, 128);
  const bossCutin = image(390, 128);
  const rescueCutin = image(390, 112);

  drawRebootBattle(
    ctx,
    {
      now: 94.1,
      boards: {
        p1: { danger: 88, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [{ spriteKey: 'burst_pin' }] }
      },
      resources: { p2: { rescue: 100 } },
      actionState: { p2: { rescue: true } },
      enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss' }],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      board: image(1280, 256),
      bossCutin,
      rescueCutin,
      dualCrisisCutin,
      bossAuras: image(768, 192),
      crisisOverlays: image(780, 320)
    },
    { localBoardId: 'p2' }
  );

  assert.equal(ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === dualCrisisCutin), true);
  assert.equal(ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === bossCutin), false);
  assert.equal(ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === rescueCutin), false);
  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '구원 우선'), true);
});

test('second online player sees their own board and summon VFX in the lower combat area', () => {
  const ctx = mockContext();

  drawRebootBattle(
    ctx,
    {
      now: 20,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [{ spriteKey: 'burst_pin' }] }
      },
      enemies: [],
      events: [{ type: 'summon', at: 19.72, playerId: 'p2', highlight: true }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      board: image(1280, 256),
      combatRevealVfx: image(1920, 512)
    },
    { localBoardId: 'p2' }
  );

  const burstColorIndex = ctx.commands.findIndex((command) => command.type === 'fillStyle' && command.value === '#ffd166');
  const sparkColorIndex = ctx.commands.findIndex((command) => command.type === 'fillStyle' && command.value === '#58d7ff');
  const burstPoint = ctx.commands.slice(0, burstColorIndex).findLast((command) => command.type === 'translate');
  const sparkPoint = ctx.commands.slice(0, sparkColorIndex).findLast((command) => command.type === 'translate');
  assert.equal(burstPoint.y > 430, true, `p2 local unit should sit on the lower own board: ${JSON.stringify(burstPoint)}`);
  assert.equal(sparkPoint.y < 170, true, `p1 partner unit should sit on the upper partner board: ${JSON.stringify(sparkPoint)}`);

  const summonReveal = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1920
      && command.args[0].naturalHeight === 512
      && command.args[1] === 0
  ));
  assert.ok(summonReveal, 'expected the p2 summon reveal to draw');
  assert.equal(summonReveal.args[6] > 420, true, `p2 local summon VFX should appear near the lower board: ${summonReveal.args[6]}`);
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

test('online waiting hides opening combat cutins and threat previews so matchmaking stays quiet', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  drawRebootBattle(
    ctx,
    {
      now: 0.82,
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
      startCutin: image(390, 112),
      enemies,
      enemySpawnGates: image(768, 192),
      enemyTrackTrails: image(1024, 128),
      openingThreatPreview: image(512, 256)
    },
    { onlineWaiting: true }
  );

  const startCutinDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 390
      && command.args[0].naturalHeight === 112
  ));
  const enemyDraws = ctx.commands.filter((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const threatPreviewDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 512
      && command.args[0].naturalHeight === 256
  ));

  assert.deepEqual(startCutinDraws, []);
  assert.deepEqual(enemyDraws, []);
  assert.deepEqual(threatPreviewDraws, []);
});

test('matchmaking event banner hides the operation start cutin so ready copy stays readable', () => {
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
    { matchmakingBannerVisible: true }
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
