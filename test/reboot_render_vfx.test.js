import test from 'node:test';
import assert from 'node:assert/strict';

import { drawRebootBattle } from '../src/client/reboot_render.js';

function image(width = 256, height = 128) {
  return { complete: true, naturalWidth: width, naturalHeight: height };
}

function actionFlashDraws(commands, sourceX) {
  return commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === sourceX
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
      && [84, 112, 132].includes(command.args[7])
  ));
}

function combatRevealIndex(commands, sourceX) {
  return commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1920
      && command.args[0].naturalHeight === 512
      && command.args[1] === sourceX
  ));
}

function combatRevealDraw(commands, sourceX) {
  return commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1920
      && command.args[0].naturalHeight === 512
      && command.args[1] === sourceX
  ));
}

function alphaBeforeCommand(commands, command) {
  const commandIndex = commands.indexOf(command);
  return commands.slice(0, commandIndex).findLast((item) => item.type === 'globalAlpha')?.value ?? 1;
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
    bezierCurveTo: (...args) => commands.push({ type: 'bezierCurveTo', args }),
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
    get font() { return '10px system-ui'; },
    set textAlign(value) { commands.push({ type: 'textAlign', value }); },
    get textAlign() { return 'left'; }
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

function closingRestoreIndexForTranslate(commands, translateIndex) {
  let depth = 0;
  let translateDepth = 0;
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    if (command.type === 'save') depth += 1;
    if (index === translateIndex) translateDepth = depth;
    if (index > translateIndex && command.type === 'restore') {
      depth -= 1;
      if (depth < translateDepth) return index;
      continue;
    }
    if (command.type === 'restore') depth -= 1;
  }
  return -1;
}

function insideAnyBoundedShake(commands, commandIndex) {
  return commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => (
      command.type === 'translate'
        && Math.abs(command.x) > 0
        && Math.abs(command.x) <= 8
        && Math.abs(command.y) <= 8
    ))
    .some(({ index }) => {
      const restoreIndex = closingRestoreIndexForTranslate(commands, index);
      return index < commandIndex && commandIndex < restoreIndex;
    });
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

test('hit effects float readable damage numbers above the impact', () => {
  const ctx = mockContext();
  drawRebootBattle(ctx, {
    now: 18.24,
    boards: {
      p1: { danger: 0, units: [] },
      p2: { danger: 0, units: [] }
    },
    enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard', progress: 0.42 }],
    events: [],
    effects: [
      {
        type: 'hit',
        playerId: 'p1',
        slot: 0,
        targetProgress: 0.42,
        targetLane: 0.25,
        targetType: 'noise_shard',
        damage: 8,
        critical: false,
        ttl: 0.52
      }
    ]
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    enemies: image(1024, 256),
    board: image(1280, 256),
    hitBolts: image(768, 128)
  });

  const damageText = ctx.commands.find((command) => command.type === 'fillText' && command.args[0] === '8');
  assert.ok(damageText, 'expected a floating damage number');
  assert.equal(damageText.args[2] < 310, true, 'damage number should float above the impact point');
});

test('critical hit effects use punchier numbers and a short combat shake', () => {
  const ctx = mockContext();
  drawRebootBattle(ctx, {
    now: 96.4,
    boards: {
      p1: { danger: 0, units: [] },
      p2: { danger: 0, units: [] }
    },
    enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss', progress: 0.7, hp: 48, maxHp: 220 }],
    events: [],
    effects: [
      {
        type: 'hit',
        playerId: 'p1',
        slot: 0,
        targetProgress: 0.7,
        targetLane: 0.25,
        targetType: 'mini_boss',
        damage: 36,
        critical: true,
        ttl: 0.58
      }
    ]
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    enemies: image(1024, 256),
    board: image(1280, 256),
    boardLabelPlates: image(768, 128),
    hitBolts: image(768, 128)
  });

  assert.ok(
    ctx.commands.find((command) => command.type === 'fillText' && command.args[0] === '36!'),
    'expected a critical damage number'
  );
  const shakeTranslate = ctx.commands.find((command) => (
    command.type === 'translate'
      && Math.abs(command.x) > 0
      && Math.abs(command.x) <= 8
      && Math.abs(command.y) <= 8
  ));
  assert.ok(shakeTranslate, 'expected a bounded combat shake on critical hits');
});

test('critical shake ends before readable combat labels render', () => {
  const ctx = mockContext();
  drawRebootBattle(ctx, {
    now: 96.4,
    boards: {
      p1: { danger: 0, units: [] },
      p2: { danger: 0, units: [] }
    },
    enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss', progress: 0.7, hp: 48, maxHp: 220 }],
    events: [],
    effects: [
      {
        type: 'hit',
        playerId: 'p1',
        slot: 0,
        targetProgress: 0.7,
        targetLane: 0.25,
        targetType: 'mini_boss',
        damage: 36,
        critical: true,
        ttl: 0.58
      }
    ]
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    enemies: image(1024, 256),
    board: image(1280, 256),
    boardLabelPlates: image(768, 128),
    hitBolts: image(768, 128)
  });

  const shakeIndex = ctx.commands.findIndex((command) => (
    command.type === 'translate'
      && Math.abs(command.x) > 0
      && Math.abs(command.x) <= 8
      && Math.abs(command.y) <= 8
  ));
  const shakeRestoreIndex = closingRestoreIndexForTranslate(ctx.commands, shakeIndex);
  const damageIndex = ctx.commands.findIndex((command) => command.type === 'fillText' && command.args[0] === '36!');

  assert.notEqual(shakeIndex, -1, 'expected a bounded shake transform');
  assert.notEqual(shakeRestoreIndex, -1, 'expected shake transform to be restored');
  assert.equal(shakeRestoreIndex < damageIndex, true, 'damage numbers should stay readable outside the shake transform');
});

test('critical hit impact sprites stay attached to the shaken battlefield layer', () => {
  const ctx = mockContext();
  const hitBolts = image(768, 128);
  drawRebootBattle(ctx, {
    now: 96.4,
    boards: {
      p1: { danger: 0, units: [] },
      p2: { danger: 0, units: [] }
    },
    enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss', progress: 0.7, hp: 48, maxHp: 220 }],
    events: [],
    effects: [
      {
        type: 'hit',
        playerId: 'p1',
        slot: 0,
        targetProgress: 0.7,
        targetLane: 0.25,
        targetType: 'mini_boss',
        damage: 36,
        critical: true,
        ttl: 0.58
      }
    ]
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    enemies: image(1024, 256),
    board: image(1280, 256),
    hitBolts
  });

  const boltIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === hitBolts);
  const damageIndex = ctx.commands.findIndex((command) => command.type === 'fillText' && command.args[0] === '36!');

  assert.notEqual(boltIndex, -1, 'expected generated hit bolt sprite');
  assert.equal(insideAnyBoundedShake(ctx.commands, boltIndex), true, 'impact sprite should move with the shaken enemy layer');
  assert.equal(insideAnyBoundedShake(ctx.commands, damageIndex), false, 'damage number should remain in the readable overlay layer');
});

test('anchored combat reveal VFX and ambient sparks stay on the shaken battlefield layer', () => {
  const ctx = mockContext();
  const combatRevealVfx = image(1920, 512);
  const vfx = image(1280, 256);
  drawRebootBattle(ctx, {
    now: 96.4,
    boards: {
      p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
      p2: { danger: 0, units: [] }
    },
    enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss', progress: 0.7, hp: 48, maxHp: 220 }],
    events: [{ type: 'summon', at: 96.2, playerId: 'p1', unitId: 'spark_pin' }],
    effects: [
      {
        type: 'death_burst',
        targetProgress: 0.7,
        targetLane: 0.25,
        targetType: 'mini_boss',
        ttl: 1.0
      }
    ]
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    enemies: image(1024, 256),
    board: image(1280, 256),
    combatRevealVfx,
    vfx
  });

  const revealIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === combatRevealVfx);
  const ambientSparkIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === vfx
      && command.args[1] === 768
  ));

  assert.notEqual(revealIndex, -1, 'expected generated combat reveal VFX');
  assert.notEqual(ambientSparkIndex, -1, 'expected generated enemy spark VFX');
  assert.equal(insideAnyBoundedShake(ctx.commands, revealIndex), true, 'summon reveal should move with its board socket');
  assert.equal(insideAnyBoundedShake(ctx.commands, ambientSparkIndex), true, 'ambient enemy spark should move with the shaken enemy');
});

test('rescue beam remains above first rescue reward sigil after shake layering', () => {
  const ctx = mockContext();
  const board = image(1280, 256);
  const cosmeticSigils = image(1280, 256);
  drawRebootBattle(ctx, {
    now: 88.35,
    boards: {
      p1: { danger: 0, units: [{ spriteKey: 'rescue_coil' }] },
      p2: { danger: 36, units: [{ spriteKey: 'spark_pin' }] }
    },
    enemies: [],
    events: [{ type: 'rescue', at: 88.1, playerId: 'p1', highlight: true }],
    effects: []
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    units: image(1280, 256),
    board,
    cosmeticSigils,
    playerBoardTray: image(780, 320)
  });

  const lastSigilIndex = ctx.commands.findLastIndex((command) => command.type === 'drawImage' && command.args[0] === cosmeticSigils);
  const lastBeamIndex = ctx.commands.findLastIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === board
      && command.args[1] === 768
  ));

  assert.notEqual(lastSigilIndex, -1, 'expected first rescue reward sigil');
  assert.notEqual(lastBeamIndex, -1, 'expected generated rescue beam segments');
  assert.equal(lastBeamIndex > lastSigilIndex, true, 'rescue beam should stay above overlapping rescue sigil art');
});

test('reduced motion keeps hit damage labels anchored instead of rising every frame', () => {
  function damageY(ttl) {
    const ctx = mockContext();
    drawRebootBattle(ctx, {
      now: 18.24,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard', progress: 0.42 }],
      events: [],
      effects: [
        {
          type: 'hit',
          playerId: 'p1',
          slot: 0,
          targetProgress: 0.42,
          targetLane: 0.25,
          targetType: 'noise_shard',
          damage: 8,
          critical: false,
          ttl
        }
      ]
    }, { width: 390, height: 620 }, {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      board: image(1280, 256),
      hitBolts: image(768, 128)
    }, { reducedMotion: true });

    return ctx.commands.find((command) => command.type === 'fillText' && command.args[0] === '8')?.args[2];
  }

  assert.equal(damageY(0.58), damageY(0.18));
});

test('floating damage numbers use centered text for large values', () => {
  const ctx = mockContext();
  drawRebootBattle(ctx, {
    now: 96.4,
    boards: {
      p1: { danger: 0, units: [] },
      p2: { danger: 0, units: [] }
    },
    enemies: [{ enemyId: 'mini_boss', spriteKey: 'mini_boss', progress: 0.7, hp: 48, maxHp: 220 }],
    events: [],
    effects: [
      {
        type: 'hit',
        playerId: 'p1',
        slot: 0,
        targetProgress: 0.7,
        targetLane: 0.25,
        targetType: 'mini_boss',
        damage: 144,
        critical: true,
        ttl: 0.58
      }
    ]
  }, { width: 390, height: 620 }, {
    backdrop: image(390, 620),
    enemies: image(1024, 256),
    board: image(1280, 256),
    hitBolts: image(768, 128)
  });

  const labelIndex = ctx.commands.findIndex((command) => command.type === 'fillText' && command.args[0] === '144!');
  const alignment = ctx.commands.slice(0, labelIndex).findLast((command) => command.type === 'textAlign')?.value;

  assert.notEqual(labelIndex, -1, 'expected a large critical damage label');
  assert.equal(alignment, 'center');
});

test('recent rescue draws a strong generated link between partner and player boards', () => {
  const ctx = mockContext();
  const board = image(1280, 256);
  drawRebootBattle(
    ctx,
    {
      now: 78.18,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }, { spriteKey: 'rescue_coil' }] },
        p2: { danger: 35, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.02 }
      ],
      events: [{ type: 'rescue', at: 78.04, playerId: 'p1', highlight: true }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board,
      vfx: image(1280, 256),
      playerBoardTray: image(780, 320)
    }
  );

  const rescueLinks = ctx.commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => (
      command.type === 'drawImage'
        && command.args[0] === board
        && command.args[1] === 768
    ));
  const strongLink = rescueLinks.find(({ command }) => command.args[7] >= 120);
  const strongAlpha = strongLink
    ? ctx.commands.slice(0, strongLink.index).findLast((command) => command.type === 'globalAlpha')?.value ?? 0
    : 0;

  assert.equal(rescueLinks.length >= 3, true, 'rescue should read as a multi-segment board-to-board link');
  assert.ok(strongLink, 'expected at least one large generated rescue link segment');
  assert.equal(strongAlpha >= 0.68, true, `recent rescue link should feel like a save moment: ${strongAlpha}`);
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
  const spawnGateCenterX = spawnGateDraw.args[5] + spawnGateDraw.args[7] / 2;
  const spawnGateCenterY = spawnGateDraw.args[6] + spawnGateDraw.args[8] / 2;

  assert.notEqual(spawnGateIndex, -1, 'expected generated enemy spawn gate to anchor the intrusion point');
  assert.notEqual(enemyIndex, -1, 'expected enemy sprites to render');
  assert.equal(spawnGateDraw.args[5] >= 24, true, 'spawn gate should sit inside the visible track entrance');
  assert.equal(spawnGateCenterX >= 160 && spawnGateCenterX <= 230, true, `spawn gate should sit on the generated S-road entrance: ${spawnGateCenterX}`);
  assert.equal(spawnGateCenterY >= 130 && spawnGateCenterY <= 215, true, `spawn gate should sit on the generated S-road entrance: ${spawnGateCenterY}`);
  assert.equal(spawnGateIndex < enemyIndex, true, 'spawn gate should sit behind enemies on the track');
});

test('early enemy sprites sit on the generated S-road instead of side decoration', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 4,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.08 }
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
      enemyTrackTrails: image(1024, 128)
    }
  );

  const enemyDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === enemies);
  assert.ok(enemyDraw, 'expected enemy atlas draw');
  const enemyCenterX = enemyDraw.args[5] + enemyDraw.args[7] / 2;
  const enemyCenterY = enemyDraw.args[6] + enemyDraw.args[8] / 2;

  assert.equal(enemyCenterX >= 160 && enemyCenterX <= 240, true, `early enemy should stay on the generated track entrance: ${enemyCenterX}`);
  assert.equal(enemyCenterY >= 150 && enemyCenterY <= 230, true, `early enemy should stay on the generated track entrance: ${enemyCenterY}`);
});

test('fallback track keeps gates and enemies on the fallback road while backdrop loads', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  const enemySpawnGates = image(768, 192);
  const signalCoreGates = image(512, 192);

  drawRebootBattle(
    ctx,
    {
      now: 4,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.08 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      units: image(1280, 256),
      enemies,
      board: image(1280, 256),
      enemySpawnGates,
      signalCoreGates
    }
  );

  const spawnGateDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === enemySpawnGates);
  const enemyDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const coreDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === signalCoreGates);
  assert.ok(spawnGateDraw, 'expected fallback spawn gate draw');
  assert.ok(enemyDraw, 'expected fallback enemy draw');
  assert.ok(coreDraw, 'expected fallback signal core draw');

  const spawnGateCenterX = spawnGateDraw.args[5] + spawnGateDraw.args[7] / 2;
  const enemyCenterX = enemyDraw.args[5] + enemyDraw.args[7] / 2;
  const coreCenterY = coreDraw.args[6] + coreDraw.args[8] / 2;

  assert.equal(spawnGateCenterX <= 130, true, `fallback spawn gate should stay on the fallback road entrance: ${spawnGateCenterX}`);
  assert.equal(enemyCenterX <= 140, true, `fallback early enemy should stay on the fallback road: ${enemyCenterX}`);
  assert.equal(coreCenterY <= 330, true, `fallback signal core should stay on the fallback road end: ${coreCenterY}`);
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

test('opening combat shows the generated threat during the operation intro', () => {
  const ctx = mockContext();
  const openingThreatPreview = image(512, 256);
  const startCutin = image(390, 112);

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
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      openingThreatPreview,
      startCutin
    }
  );

  const previewDraw = ctx.commands.find((command) => (
    command.type === 'drawImage' && command.args[0] === openingThreatPreview
  ));
  const startCutinDraw = ctx.commands.find((command) => (
    command.type === 'drawImage' && command.args[0] === startCutin
  ));
  const previewIndex = ctx.commands.findIndex((command) => command === previewDraw);
  const startCutinIndex = ctx.commands.findIndex((command) => command === startCutinDraw);

  assert.ok(previewDraw, 'first combat frame should not show an empty track before enemies serialize');
  assert.ok(startCutinDraw, 'operation intro should still read over the early threat object');
  assert.equal(previewIndex < startCutinIndex, true, 'start cutin should layer above the early threat preview');
  assert.equal(previewDraw.args[7] >= 116, true, 'intro threat should be large enough to register behind the start cue');
});

test('opening threat preview stays continuous when the operation intro clears', () => {
  const openingThreatPreview = image(512, 256);
  const samples = [0.55, 0.56, 0.57].map((now) => {
    const ctx = mockContext();
    drawRebootBattle(
      ctx,
      {
        now,
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
        board: image(1280, 256),
        openingThreatPreview,
        startCutin: image(390, 112)
      }
    );
    const previewIndex = ctx.commands.findIndex((command) => (
      command.type === 'drawImage' && command.args[0] === openingThreatPreview
    ));
    const alpha = previewIndex >= 0
      ? ctx.commands.slice(0, previewIndex).findLast((command) => command.type === 'globalAlpha')?.value
      : 0;
    return { now, previewIndex, alpha: alpha ?? 0 };
  });

  for (const sample of samples) {
    assert.notEqual(sample.previewIndex, -1, `preview disappeared at ${sample.now}`);
    assert.equal(sample.alpha >= 0.38, true, `preview alpha popped too low at ${sample.now}: ${sample.alpha}`);
  }
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
      resources: { p1: { summon: 0, rescue: 0 }, p2: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: false, merge: false, rescue: false }, p2: { summon: true, merge: false, rescue: false } },
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

test('opening combat paints generated route beacons along the enemy path before first summon', () => {
  const ctx = mockContext();
  const enemyTrackTrails = image(1024, 128);

  drawRebootBattle(
    ctx,
    {
      now: 1.8,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard', progress: 0.14, lane: 0.25 }],
      events: [],
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      enemies: image(1024, 256),
      enemyTrackTrails,
      firstSummonBeacon: image(512, 512),
      playerBoardTray: image(780, 320)
    }
  );

  const routeBeacons = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === enemyTrackTrails
      && command.args[1] === 256
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 128
      && command.args[7] >= 62
      && command.args[7] <= 88
      && command.args[8] >= 22
      && command.args[8] <= 36
  ));

  assert.equal(routeBeacons.length >= 3, true, 'expected generated route beacons to show the incoming path before the first summon');
});

test('active early combat keeps generated pressure marks on the lane before enemy sprites', () => {
  const ctx = mockContext();
  const enemyTrackTrails = image(1024, 128);
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 6.2,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [{ spriteKey: 'burst_pin' }] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.22 },
        { enemyId: 'quick_noise', spriteKey: 'quick_noise', boardId: 'p2', progress: 0.38 }
      ],
      events: [{ type: 'summon', at: 0.62, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      board: image(1280, 256),
      enemyTrackTrails,
      playerBoardTray: image(780, 320)
    }
  );

  const firstEnemyIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage' && command.args[0] === enemies
  ));
  const preEnemyPressureMarks = ctx.commands.slice(0, firstEnemyIndex).filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === enemyTrackTrails
      && command.args[7] >= 64
      && command.args[8] >= 26
  ));

  assert.notEqual(firstEnemyIndex, -1, 'expected enemy sprites to render');
  assert.equal(
    preEnemyPressureMarks.length >= 3,
    true,
    'active combat should paint multiple generated pressure marks before enemies so the board does not read empty'
  );
});

test('early combat lulls keep a generated incoming-wave object on the track', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  const openingThreatPreview = image(512, 256);
  drawRebootBattle(
    ctx,
    {
      now: 8.2,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      resources: { p1: { summon: 0, rescue: 0 }, p2: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: false, merge: false, rescue: false }, p2: { summon: true, merge: false, rescue: false } },
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
  const previewDraw = previewDraws.at(0);
  const looseEnemyDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === enemies
  ));

  assert.equal(previewDraws.length >= 1, true, 'empty early combat should still advertise the next incoming wave');
  assert.equal(previewDraw.args[7] >= 136, true, 'lull preview should be large enough to read on a phone battlefield');
  assert.equal(previewDraw.args[8] >= 68, true, 'lull preview should keep the generated threat object visibly grounded');
  assert.deepEqual(looseEnemyDraws, [], 'lull preview should use the generated warning object instead of a floating enemy sprite');
});

test('post-summon cooldown lulls keep generated route pressure across the lane', () => {
  const ctx = mockContext();
  const openingThreatPreview = image(512, 256);
  const enemyTrackTrails = image(1024, 128);

  drawRebootBattle(
    ctx,
    {
      now: 14.1,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      resources: { p1: { summon: 0, rescue: 0 }, p2: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: false, merge: false, rescue: false }, p2: { summon: true, merge: false, rescue: false } },
      enemies: [],
      events: [{ type: 'summon', at: 0.62, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      openingThreatPreview,
      enemyTrackTrails,
      playerBoardTray: image(780, 320)
    }
  );

  const previewDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === openingThreatPreview
  ));
  const routePressureMarks = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === enemyTrackTrails
      && command.args[1] >= 256
      && command.args[3] === 256
      && command.args[7] >= 100
      && command.args[8] >= 40
  ));

  assert.equal(previewDraws.length >= 2, true, 'cooldown lull should show repeated generated threat echoes along the lane');
  assert.equal(routePressureMarks.length >= 3, true, 'cooldown lull should fill the S-lane with generated pressure marks');
});

test('summon-ready lulls do not keep cooldown-only route pressure on the lane', () => {
  const ctx = mockContext();
  const openingThreatPreview = image(512, 256);
  const enemyTrackTrails = image(1024, 128);

  drawRebootBattle(
    ctx,
    {
      now: 14.1,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      resources: { p1: { summon: 10, rescue: 0 }, p2: { summon: 10, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false }, p2: { summon: true, merge: false, rescue: false } },
      enemies: [],
      events: [{ type: 'summon', at: 0.62, playerId: 'p1' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      openingThreatPreview,
      enemyTrackTrails,
      playerBoardTray: image(780, 320)
    }
  );

  const previewDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === openingThreatPreview
  ));
  const routePressureMarks = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === enemyTrackTrails
      && command.args[1] >= 256
      && command.args[3] === 256
      && command.args[7] >= 100
      && command.args[8] >= 40
  ));

  assert.equal(previewDraws.length <= 1, true, 'ready summon should keep only the next-wave preview, not cooldown echoes');
  assert.deepEqual(routePressureMarks, [], 'ready summon should not leave cooldown-only route pressure marks');
});

test('second player view uses local summon cooldown for route pressure', () => {
  const ctx = mockContext();
  const openingThreatPreview = image(512, 256);
  const enemyTrackTrails = image(1024, 128);

  drawRebootBattle(
    ctx,
    {
      now: 14.1,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [{ spriteKey: 'toktok_amp' }] }
      },
      resources: { p1: { summon: 10, rescue: 0 }, p2: { summon: 0, rescue: 0 } },
      actionState: { p1: { summon: true, merge: false, rescue: false }, p2: { summon: false, merge: false, rescue: false } },
      enemies: [],
      events: [{ type: 'summon', at: 0.62, playerId: 'p2' }],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      openingThreatPreview,
      enemyTrackTrails,
      playerBoardTray: image(780, 320)
    },
    { localBoardId: 'p2' }
  );

  const routePressureMarks = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === enemyTrackTrails
      && command.args[1] >= 256
      && command.args[3] === 256
      && command.args[7] >= 100
      && command.args[8] >= 40
  ));

  assert.equal(routePressureMarks.length >= 3, true, 'second player cooldown should also keep the route visually pressured');
});

test('post-opening wave lulls preview the next spawn instead of leaving an empty track', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  const openingThreatPreview = image(512, 256);
  drawRebootBattle(
    ctx,
    {
      now: 17.72,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }, { spriteKey: 'toktok_amp' }] },
        p2: { danger: 0, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [],
      events: [
        { type: 'summon', at: 0.62, playerId: 'p1' },
        { type: 'summon', at: 10, playerId: 'p2' }
      ],
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
  const previewDraw = previewDraws.at(0);
  const previewAlpha = previewDraw
    ? ctx.commands.slice(0, ctx.commands.indexOf(previewDraw)).findLast((command) => command.type === 'globalAlpha')?.value ?? 0
    : 0;
  const looseEnemyDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === enemies
  ));

  assert.equal(previewDraws.length >= 1, true, 'next wave should be visible before the post-opening spawn arrives');
  assert.equal(previewAlpha >= 0.44, true, `next-wave preview should be readable in an empty lull: ${previewAlpha}`);
  assert.deepEqual(looseEnemyDraws, [], 'next-wave preview should not fall back to floating enemy atlas sprites');
});

test('early lull preview blends into next-wave preview before it fades out', () => {
  const openingThreatPreview = image(512, 256);
  const samples = [16.95, 17.2, 17.45, 17.7].map((now) => {
    const ctx = mockContext();
    drawRebootBattle(
      ctx,
      {
        now,
        boards: {
          p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }, { spriteKey: 'toktok_amp' }] },
          p2: { danger: 0, units: [{ spriteKey: 'spark_pin' }] }
        },
        enemies: [],
        events: [
          { type: 'summon', at: 0.62, playerId: 'p1' },
          { type: 'summon', at: 10, playerId: 'p2' }
        ],
        effects: []
      },
      { width: 390, height: 620 },
      {
        backdrop: image(390, 620),
        units: image(1280, 256),
        board: image(1280, 256),
        openingThreatPreview
      }
    );
    const previewDraw = ctx.commands.find((command) => (
      command.type === 'drawImage' && command.args[0] === openingThreatPreview
    ));
    const alpha = previewDraw
      ? ctx.commands.slice(0, ctx.commands.indexOf(previewDraw)).findLast((command) => command.type === 'globalAlpha')?.value ?? 0
      : 0;
    return { now, alpha };
  });

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    assert.equal(
      current.alpha >= 0.34,
      true,
      `next-wave handoff should keep the warning object readable: ${JSON.stringify(samples)}`
    );
    assert.equal(
      current.alpha >= previous.alpha - 0.16,
      true,
      `next-wave handoff should not visibly pop down: ${JSON.stringify(samples)}`
    );
  }
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
  const coreCenterX = coreDraw.args[5] + coreDraw.args[7] / 2;
  const coreCenterY = coreDraw.args[6] + coreDraw.args[8] / 2;
  const coreBottom = coreDraw.args[6] + coreDraw.args[8];

  assert.notEqual(coreIndex, -1, 'expected generated signal core gate at the protected track end');
  assert.notEqual(enemyIndex, -1, 'expected enemy sprites to render');
  assert.equal(coreCenterX >= 260, true, 'signal core gate should sit near the right-side track endpoint');
  assert.equal(coreCenterY >= 340 && coreCenterY <= 370, true, `signal core gate should anchor the visible lower generated track end: ${coreCenterY}`);
  assert.equal(coreBottom <= 392, true, `signal core gate should not be buried under the player board tray: ${coreBottom}`);
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
  assert.equal(
    criticalCoreDraws.every(({ command }) => command.args[6] + command.args[8] <= 392),
    true,
    'critical endpoint core and flare should stay above the player board tray'
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

test('wave directive suppresses partner assist ping so central battlefield banners do not overlap', () => {
  const ctx = mockContext();
  const directiveBanner = image(900, 186);
  const partnerAssistPings = image(864, 90);

  drawRebootBattle(
    ctx,
    {
      now: 32.18,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 35, units: [{ spriteKey: 'toktok_amp' }] }
      },
      enemies: [
        { enemyId: 'noise_shard', spriteKey: 'noise_shard', boardId: 'p1', progress: 0.16 }
      ],
      events: [
        { type: 'wave', at: 32.0, waveAt: 32 },
        { type: 'partner_auto', at: 32.04, action: 'summon', playerId: 'p2' }
      ],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      ui: image(1536, 256),
      directiveBanner,
      partnerAssistPings
    }
  );

  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '적 접근'), true);
  assert.equal(
    ctx.commands.some((command) => command.type === 'drawImage' && command.args[0] === partnerAssistPings),
    false,
    'partner assist generated banner should wait while the wave directive owns the center lane'
  );
  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '동료 지원'), false);
});

test('partner assist ping stays above the early threat lane so combat does not read empty', () => {
  const ctx = mockContext();
  const partnerAssistPings = image(640, 100);

  drawRebootBattle(
    ctx,
    {
      now: 10.4,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [],
      events: [
        { type: 'summon', at: 5.2, playerId: 'p1', unitId: 'spark_pin' },
        { type: 'partner_auto', at: 10, action: 'summon', playerId: 'p2', unitId: 'spark_pin' }
      ],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies: image(1024, 256),
      openingThreatPreview: image(512, 256),
      partnerAssistPings
    }
  );

  const assistDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === partnerAssistPings);
  assert.ok(assistDraw, 'expected the generated partner assist ping to render');
  assert.equal(
    assistDraw.args[6] + assistDraw.args[8] <= 132,
    true,
    `partner assist ping covers the early threat lane: ${JSON.stringify(assistDraw.args)}`
  );
  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '동료 지원'), true);
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
  const enemyCenterY = enemyDraw.args[6] + enemyDraw.args[8] / 2;
  const enemyBottom = enemyDraw.args[6] + enemyDraw.args[8];
  assert.equal(enemyDraw.args[5] + enemyDraw.args[7] / 2 > 260, true, 'enemy with high progress should render near the protected track end');
  assert.equal(enemyCenterY >= 350, true, `enemy with high progress should render on the lower generated track end: ${enemyCenterY}`);
  assert.equal(enemyBottom <= 392, true, `enemy with high progress should remain above the player board tray: ${enemyBottom}`);
});

test('mini boss endpoint sprites remain above the player board tray', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 102,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'mini_boss', spriteKey: 'mini_boss', boardId: 'p1', progress: 0.82 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      bossAuras: image(768, 192),
      board: image(1280, 256)
    }
  );

  const bossDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === enemies);
  assert.ok(bossDraw, 'expected mini boss atlas draw');
  const bossBottom = bossDraw.args[6] + bossDraw.args[8];
  assert.equal(bossBottom <= 392, true, `mini boss endpoint should remain above the player board tray: ${bossBottom}`);
});

test('mini boss lower-curve sprites remain above the player board tray', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);

  drawRebootBattle(
    ctx,
    {
      now: 96,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'mini_boss', spriteKey: 'mini_boss', boardId: 'p1', progress: 0.7 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      bossAuras: image(768, 192),
      board: image(1280, 256)
    }
  );

  const bossDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === enemies);
  assert.ok(bossDraw, 'expected lower-curve mini boss atlas draw');
  const bossBottom = bossDraw.args[6] + bossDraw.args[8];
  assert.equal(bossBottom <= 392, true, `lower-curve mini boss should remain above the player board tray: ${bossBottom}`);
});

test('mini boss shows a generated health plate on the battlefield', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  const boardLabelPlates = image(780, 80);
  const ui = image(1536, 256);

  drawRebootBattle(
    ctx,
    {
      now: 104,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'mini_boss', spriteKey: 'mini_boss', boardId: 'p1', progress: 0.72, hp: 120, maxHp: 500 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      ui,
      boardLabelPlates,
      board: image(1280, 256)
    }
  );

  const healthTextIndex = ctx.commands.findIndex((command) => command.type === 'fillText' && command.args[0] === '24%');
  const plateIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === boardLabelPlates
      && command.args[7] >= 140
      && command.args[8] >= 30
  ));
  const bossIconIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === ui
      && command.args[1] === 1024
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
  ));
  const healthFill = ctx.commands.find((command) => (
    command.type === 'fillRect'
      && command.args[2] > 8
      && command.args[2] < 42
      && command.args[3] <= 6
  ));

  assert.notEqual(healthTextIndex, -1, 'expected compact boss health percent text');
  assert.notEqual(plateIndex, -1, 'expected generated plate behind boss health');
  assert.notEqual(bossIconIndex, -1, 'expected generated boss icon on the health plate');
  assert.equal(plateIndex < healthTextIndex, true, 'boss health text should sit above the generated plate');
  assert.ok(healthFill, 'expected compact boss health fill bar');
});

test('low health mini boss gains a generated execute flare on the track', () => {
  const ctx = mockContext();
  const enemies = image(1024, 256);
  const vfx = image(1280, 256);

  drawRebootBattle(
    ctx,
    {
      now: 112,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [
        { enemyId: 'mini_boss', spriteKey: 'mini_boss', boardId: 'p1', progress: 0.78, hp: 30, maxHp: 100 }
      ],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      enemies,
      vfx,
      boardLabelPlates: image(780, 80),
      ui: image(1536, 256),
      board: image(1280, 256)
    }
  );

  const bossIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === enemies);
  const flareIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === vfx
      && command.args[1] === 1024
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
  ));

  assert.notEqual(bossIndex, -1, 'expected low health mini boss sprite');
  assert.notEqual(flareIndex, -1, 'expected generated boss execute flare');
  assert.equal(flareIndex < bossIndex, true, 'execute flare should sit behind the boss sprite');
});

test('random combat actions use generated reveal VFX without legacy action flashes', () => {
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

  const firstRevealIndex = combatRevealIndex(ctx.commands, 0);
  const legacyActionFlashes = [0, 256, 512].flatMap((sourceX) => actionFlashDraws(ctx.commands, sourceX));
  assert.notEqual(firstRevealIndex, -1, 'expected generated reveal VFX to draw');
  assert.deepEqual(legacyActionFlashes, [], 'generated reveal VFX should replace the old compact action flashes');
});

test('random combat reveal VFX holds alpha long enough for result payoff', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 12.68,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }, { spriteKey: 'burst_pin' }] },
        p2: { danger: 18, units: [{ spriteKey: 'spark_pin' }] }
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

  for (const [sourceX, label] of [[0, 'summon'], [480, 'merge'], [1440, 'rescue']]) {
    const draw = combatRevealDraw(ctx.commands, sourceX);
    assert.ok(draw, `expected ${label} generated reveal VFX`);
    assert.equal(
      alphaBeforeCommand(ctx.commands, draw) >= 0.55,
      true,
      `${label} reveal should remain readable after the immediate result frame`
    );
  }
});

test('combat action feedback falls back to generated action stamps while reveal VFX loads', () => {
  const ctx = mockContext();
  const actionStamps = image(768, 128);
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
      actionStamps,
      playerBoardTray: image(780, 320)
    }
  );

  const stampDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0] === actionStamps
      && command.args[1] === 512
      && command.args[7] >= 240
      && command.args[8] >= 70
  ));
  const compactFallbacks = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === actionStamps
      && [0, 256, 512].includes(command.args[1])
      && command.args[7] <= 96
      && command.args[8] <= 54
  ));
  const compactSources = compactFallbacks.map((command) => command.args[1]);

  assert.ok(stampDraw, 'expected generated action stamp fallback for the latest rescue action');
  assert.equal(compactSources.includes(0), true, 'missing compact generated summon fallback stamp');
  assert.equal(compactSources.includes(256), true, 'missing compact generated merge fallback stamp');
  assert.equal(compactSources.includes(512), true, 'missing compact generated rescue fallback stamp');
  assert.deepEqual([0, 256, 512].flatMap((sourceX) => actionFlashDraws(ctx.commands, sourceX)), []);
});

test('combat action feedback falls back to generated UI icons while stamp art loads', () => {
  const ctx = mockContext();
  const ui = image(1536, 256);
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
      ui,
      playerBoardTray: image(780, 320)
    }
  );

  const iconSources = ctx.commands
    .filter((command) => (
      command.type === 'drawImage'
        && command.args[0] === ui
        && [0, 256, 512].includes(command.args[1])
        && command.args[7] === 42
    ))
    .map((command) => command.args[1]);

  assert.equal(iconSources.includes(0), true, 'missing generated summon icon fallback');
  assert.equal(iconSources.includes(256), true, 'missing generated merge icon fallback');
  assert.equal(iconSources.includes(512), true, 'missing generated rescue icon fallback');
  assert.deepEqual([0, 256, 512].flatMap((sourceX) => actionFlashDraws(ctx.commands, sourceX)), []);
});

test('combat action feedback keeps an emergency pulse if fallback atlases are unavailable', () => {
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
      playerBoardTray: image(780, 320)
    }
  );

  const emergencyPulses = ctx.commands.filter((command) => (
    command.type === 'ellipse'
      && command.args[2] === 20
      && command.args[3] === 9
  ));

  assert.equal(emergencyPulses.length >= 3, true, 'missing emergency action feedback pulses');
  assert.deepEqual([0, 256, 512].flatMap((sourceX) => actionFlashDraws(ctx.commands, sourceX)), []);
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

test('death reward pickup stays offset from the enemy death core', () => {
  const ctx = mockContext();
  const killBurst = image(256, 256);
  const rewardPickups = image(768, 128);

  drawRebootBattle(
    ctx,
    {
      now: 28.4,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 12, units: [] }
      },
      enemies: [],
      events: [],
      effects: [
        {
          type: 'death_burst',
          targetType: 'noise_shard',
          targetProgress: 0.32,
          targetLane: 0,
          rewardCharge: 10,
          rewardLink: 0,
          ttl: 0.74
        }
      ]
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units: image(1280, 256),
      board: image(1280, 256),
      killBurst,
      rewardPickups,
      rewards: image(1024, 256)
    }
  );

  const killDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === killBurst);
  const pickupDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === rewardPickups);
  const killCenterX = killDraw.args[5] + killDraw.args[7] / 2;
  const killCenterY = killDraw.args[6] + killDraw.args[8] / 2;
  const pickupCenterX = pickupDraw.args[5] + pickupDraw.args[7] / 2;
  const pickupBottom = pickupDraw.args[6] + pickupDraw.args[8];

  assert.ok(killDraw, 'expected the enemy death burst to draw');
  assert.ok(pickupDraw, 'expected the generated reward pickup burst to draw');
  assert.equal(pickupCenterX >= killCenterX + 34, true, 'reward pickup should read as loot popping out, not cover the death core');
  assert.equal(pickupBottom <= killCenterY - 16, true, 'reward pickup should stay above the defeated enemy silhouette');
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
      combatRevealVfx: image(1920, 512),
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
      && command.args[7] >= 78
      && command.args[7] <= 84
      && command.args[8] >= 78
      && command.args[8] <= 84
      && command.args[6] < 456
  ));
  const summonRevealIndex = combatRevealIndex(ctx.commands, 0);

  assert.notEqual(trayIndex, -1, 'expected generated player board tray to draw');
  assert.notEqual(unitIndex, -1, 'expected summoned unit to draw');
  assert.notEqual(summonRevealIndex, -1, 'expected generated summon reveal VFX to draw');
  assert.equal(trayIndex < unitIndex, true, 'tray should sit beneath summoned units');
  assert.equal(unitIndex < summonRevealIndex, true, 'summon reveal should sit above the new unit');
  assert.deepEqual(actionFlashDraws(ctx.commands, 0), [], 'summon should not use the old compact action flash');
});

test('player board lower bridge fills the command gap with generated arena machinery', () => {
  const ctx = mockContext();
  const playerBoardBridge = image(780, 220);
  const playerBoardTray = image(780, 320);
  drawRebootBattle(
    ctx,
    {
      now: 2,
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
      playerBoardBridge,
      playerBoardTray
    }
  );

  const bridgeIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === playerBoardBridge);
  const trayIndex = ctx.commands.findIndex((command) => command.type === 'drawImage' && command.args[0] === playerBoardTray);
  const bridgeDraw = ctx.commands[bridgeIndex];

  assert.notEqual(bridgeIndex, -1, 'expected generated lower bridge to fill the gap above the command dock');
  assert.notEqual(trayIndex, -1, 'expected generated player board tray to remain');
  assert.equal(bridgeIndex < trayIndex, true, 'lower bridge should sit behind the player board tray');
  assert.equal(bridgeDraw.args[5], 0, 'lower bridge should span from the canvas edge');
  assert.equal(bridgeDraw.args[6] >= 486, true, `lower bridge starts too high or low: ${bridgeDraw.args[6]}`);
  assert.equal(bridgeDraw.args[7], 390, 'lower bridge should cover the full portrait canvas width');
  assert.equal(bridgeDraw.args[8] >= 124, true, 'lower bridge should be tall enough to remove the black floor gap');
});

test('player board lower bridge stays inside short combat canvases', () => {
  const ctx = mockContext();
  const playerBoardBridge = image(780, 220);
  drawRebootBattle(
    ctx,
    {
      now: 2,
      boards: {
        p1: { danger: 0, units: [] },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: []
    },
    { width: 390, height: 500 },
    {
      backdrop: image(390, 620),
      board: image(1280, 256),
      playerBoardBridge
    }
  );

  const bridgeDraw = ctx.commands.find((command) => command.type === 'drawImage' && command.args[0] === playerBoardBridge);
  assert.ok(bridgeDraw, 'expected lower bridge on short canvas');
  assert.equal(bridgeDraw.args[6] >= 360, true, `lower bridge should remain in the lower canvas: ${bridgeDraw.args[6]}`);
  assert.equal(bridgeDraw.args[6] + bridgeDraw.args[8] <= 500, true, `lower bridge clips below the short canvas: ${bridgeDraw.args[6]} + ${bridgeDraw.args[8]}`);
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
      && command.args[7] >= 78
      && command.args[7] <= 84
      && command.args[8] >= 78
      && command.args[8] <= 84
      && command.args[6] < 456
  ));

  assert.notEqual(ringIndex, -1, 'expected a generated unit activation ring under the summoned unit');
  assert.notEqual(unitIndex, -1, 'expected summoned unit to draw');
  assert.equal(ringIndex < unitIndex, true, 'activation ring should sit beneath the unit sprite');
});

test('player board gives summoned units a layered generated pedestal', () => {
  const ctx = mockContext();
  const unitActivationRing = image(512, 512);
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
      unitActivationRing
    }
  );

  const pedestalDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === unitActivationRing
      && command.args[3] >= 90
      && command.args[4] >= 54
  ));
  const unitDraw = ctx.commands.find((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[7] >= 78
      && command.args[8] >= 78
  ));

  assert.equal(pedestalDraws.length >= 2, true, 'summoned unit should sit on a layered generated pedestal, not a faint single mark');
  assert.ok(unitDraw, 'summoned unit should be large enough to read as a placed board object');
});

test('full player board keeps enlarged generated unit pedestals separated', () => {
  const ctx = mockContext();
  const units = image(1280, 256);
  const unitActivationRing = image(512, 512);
  drawRebootBattle(
    ctx,
    {
      now: 38,
      boards: {
        p1: {
          danger: 0,
          units: [
            { spriteKey: 'spark_pin' },
            { spriteKey: 'toktok_amp' },
            { spriteKey: 'slow_coil' },
            { spriteKey: 'burst_pin' },
            { spriteKey: 'rescue_coil' }
          ]
        },
        p2: { danger: 0, units: [] }
      },
      enemies: [],
      events: [],
      effects: []
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      units,
      board: image(1280, 256),
      playerBoardTray: image(780, 320),
      unitActivationRing
    }
  );

  const unitDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === units
      && command.args[7] >= 58
      && command.args[7] <= 62
      && command.args[8] >= 58
      && command.args[8] <= 62
  ));
  const widePedestalDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0] === unitActivationRing
      && command.args[3] >= 60
      && command.args[3] <= 62
      && command.args[4] >= 42
      && command.args[4] <= 44
  ));
  const drawRect = (command) => (
    command.args.length >= 9
      ? { x: command.args[5], width: command.args[7] }
      : { x: command.args[1], width: command.args[3] }
  );
  const noHorizontalOverlap = (commands) => {
    const rects = commands.map(drawRect).sort((a, b) => a.x - b.x);
    return rects.slice(1).every((rect, index) => (
      rects[index].x + rects[index].width <= rect.x
    ));
  };

  assert.equal(unitDraws.length, 5, 'full player board should still draw all five unit sprites');
  assert.equal(widePedestalDraws.length, 5, 'each full-board unit should keep one separated generated base pedestal');
  assert.equal(noHorizontalOverlap(unitDraws), true, 'full-board unit sprite draw bounds should not overlap adjacent slots');
  assert.equal(noHorizontalOverlap(widePedestalDraws), true, 'full-board pedestal draw bounds should not overlap adjacent slots');
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

test('first player summon gets a generated reward spotlight before the reveal VFX', () => {
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
      combatRevealVfx: image(1920, 512),
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
  const summonRevealIndex = combatRevealIndex(ctx.commands, 0);

  assert.notEqual(spotlightIndex, -1, 'expected generated first-summon spotlight to draw on the player board');
  assert.notEqual(summonRevealIndex, -1, 'expected summon reveal to draw above the reward spotlight');
  assert.equal(spotlightIndex < summonRevealIndex, true, 'reward spotlight should establish the summon moment before the reveal');
  assert.deepEqual(actionFlashDraws(ctx.commands, 0), [], 'first summon should not use the old compact action flash');
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
      && command.args[7] >= 108
      && command.args[8] >= 108
  ));

  assert.ok(beaconDraw, 'expected a prominent generated landing beacon on the first summon socket');
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
  assert.equal(
    ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '동료 준비'),
    true,
    'bot standby should label the partner presence without adding another HUD button'
  );
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

test('first player summon sends generated ignition from board toward track before reveal', () => {
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
      combatRevealVfx: image(1920, 512),
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
  const summonRevealIndex = combatRevealIndex(ctx.commands, 0);

  assert.equal(ignitionDraws.length >= 3, true, 'expected landing ring, lane wake, and spark ignition cells');
  assert.notEqual(summonRevealIndex, -1, 'expected summon reveal to draw');
  assert.equal(ctx.commands.indexOf(ignitionDraws[0]) < summonRevealIndex, true, 'ignition should make the board feel alive before the reveal');
  assert.deepEqual(actionFlashDraws(ctx.commands, 0), [], 'summon ignition should not hand off to the old compact action flash');
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

test('first player merge gets a generated board sigil before the reveal VFX', () => {
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
      combatRevealVfx: image(1920, 512),
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
  const mergeRevealIndex = combatRevealIndex(ctx.commands, 480);

  assert.notEqual(mergeSigilIndex, -1, 'expected generated merge sigil to draw across the player board');
  assert.notEqual(mergeRevealIndex, -1, 'expected generated merge reveal to draw above the board sigil');
  assert.equal(mergeSigilIndex < mergeRevealIndex, true, 'merge sigil should ground the success moment before the reveal');
  assert.deepEqual(actionFlashDraws(ctx.commands, 256), [], 'merge should not use the old compact action burst');
});

test('first player rescue gets a generated link sigil before the reveal VFX', () => {
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
      combatRevealVfx: image(1920, 512),
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
  const rescueRevealIndex = combatRevealIndex(ctx.commands, 1440);

  assert.notEqual(rescueSigilIndex, -1, 'expected generated rescue sigil to draw between the boards');
  assert.notEqual(rescueRevealIndex, -1, 'expected rescue reveal to draw above the link sigil');
  assert.equal(rescueSigilIndex < rescueRevealIndex, true, 'rescue sigil should ground the co-op save before the reveal');
  assert.deepEqual(actionFlashDraws(ctx.commands, 512), [], 'rescue should not use the old compact action flare');
});

test('merge and rescue moments use generated action surges before reveal VFX', () => {
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
      combatRevealVfx: image(1920, 512),
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
  const mergeCtxRevealIndex = combatRevealIndex(mergeCtx.commands, 480);

  assert.notEqual(mergeCtxSurgeIndex, -1, 'expected generated merge action surge to cover the battlefield');
  assert.equal(mergeCtxSurgeIndex < mergeCtxRevealIndex, true, 'merge surge should sell the action before the reveal');
  assert.deepEqual(actionFlashDraws(mergeCtx.commands, 256), [], 'merge surge should not hand off to the old compact burst');

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
      combatRevealVfx: image(1920, 512),
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
  const rescueRevealIndex = combatRevealIndex(rescueCtx.commands, 1440);

  assert.equal(mergeSurgeIndex, -1, 'overlapping actions should not stack full-canvas merge and rescue surges');
  assert.notEqual(rescueSurgeIndex, -1, 'expected generated rescue action surge to cover the battlefield');
  assert.equal(rescueSurgeIndex < rescueRevealIndex, true, 'rescue surge should sell the co-op save before the reveal');
  assert.deepEqual(actionFlashDraws(rescueCtx.commands, 512), [], 'rescue surge should not hand off to the old compact flare');
});

test('rescue action surge sits above generated board trays so the save impact is not buried', () => {
  const ctx = mockContext();
  const actionSurges = image(780, 620);
  const playerBoardTray = image(780, 320);
  const vfx = image(1280, 256);
  const combatRevealVfx = image(1920, 512);
  drawRebootBattle(
    ctx,
    {
      now: 78.24,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }, { spriteKey: 'rescue_coil' }] },
        p2: { danger: 35, units: [{ spriteKey: 'spark_pin' }] }
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
      playerBoardTray,
      actionSurges,
      vfx,
      combatRevealVfx
    }
  );

  const trayIndexes = ctx.commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => command.type === 'drawImage' && command.args[0] === playerBoardTray)
    .map(({ index }) => index);
  const rescueSurgeIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage' && command.args[0] === actionSurges && command.args[1] === 390
  ));
  const rescueRevealIndex = combatRevealIndex(ctx.commands, 1440);

  assert.equal(trayIndexes.length >= 1, true, 'expected the local generated board tray to render');
  assert.notEqual(rescueSurgeIndex, -1, 'expected rescue action surge to render');
  assert.notEqual(rescueRevealIndex, -1, 'expected rescue reveal to render');
  assert.equal(rescueSurgeIndex > Math.max(...trayIndexes), true, 'rescue surge should sit above board trays');
  assert.equal(rescueSurgeIndex < rescueRevealIndex, true, 'rescue reveal should land on top of the surge');
  assert.deepEqual(actionFlashDraws(ctx.commands, 512), [], 'rescue action surge should not rely on the old compact flare');
});

test('merge reward surge lingers long enough to read after the tap feedback', () => {
  const ctx = mockContext();
  const actionSurges = image(780, 620);
  const cosmeticSigils = image(960, 128);
  drawRebootBattle(
    ctx,
    {
      now: 79.46,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'burst_pin' }] },
        p2: { danger: 25, units: [{ spriteKey: 'spark_pin' }] }
      },
      enemies: [{ enemyId: 'heavy_noise', spriteKey: 'heavy_noise' }],
      events: [{ type: 'merge', at: 78.0, playerId: 'p1', highlight: true }],
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
      actionSurges,
      cosmeticSigils
    }
  );

  const surgeIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === actionSurges
      && command.args[1] === 0
      && command.args[5] === 0
      && command.args[7] === 390
      && command.args[8] === 620
  ));
  const sigilIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0] === cosmeticSigils
      && command.args[1] === 384
      && command.args[7] >= 300
      && command.args[8] >= 86
  ));
  const surgeAlpha = ctx.commands
    .slice(0, surgeIndex)
    .reverse()
    .find((command) => command.type === 'globalAlpha')?.value ?? 0;
  const sigilAlpha = ctx.commands
    .slice(0, sigilIndex)
    .reverse()
    .find((command) => command.type === 'globalAlpha')?.value ?? 0;

  assert.notEqual(surgeIndex, -1, 'expected generated merge surge to remain visible after the first feedback beat');
  assert.notEqual(sigilIndex, -1, 'expected generated merge sigil to remain under the evolved unit');
  assert.equal(surgeAlpha >= 0.32, true, `late merge surge should stay readable: ${surgeAlpha}`);
  assert.equal(sigilAlpha >= 0.34, true, `late merge sigil should stay readable: ${sigilAlpha}`);
});

test('image backdrop hides board names and keeps danger labels on generated combat plates', () => {
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
      ui: image(1536, 256),
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
  const dangerTextIndex = ctx.commands.findIndex((command) => (
    command.type === 'fillText' && command.args[0] === '위험 52'
  ));
  const warningPulseIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1280
      && command.args[0].naturalHeight === 256
      && command.args[1] === 1024
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
  ));
  const warningIconIndex = ctx.commands.findIndex((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 1536
      && command.args[0].naturalHeight === 256
      && command.args[1] === 768
      && command.args[2] === 0
      && command.args[3] === 256
      && command.args[4] === 256
  ));

  assert.equal(ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '파트너 보드'), false);
  assert.equal(plateIndices.length >= 1, true, 'expected generated plate behind danger label');
  assert.equal(plateIndices.some((index) => index < dangerTextIndex), true, 'danger label should sit above a generated plate');
  assert.notEqual(warningPulseIndex, -1, 'warning partner danger should use generated danger pulse before crisis threshold');
  assert.equal(warningPulseIndex < dangerTextIndex, true, 'warning pulse should sit under the danger label text');
  assert.notEqual(warningIconIndex, -1, 'warning partner danger should include the generated partner danger icon');
  assert.equal(warningIconIndex < dangerTextIndex, true, 'warning icon should sit under the danger label text');
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
      combatRevealVfx: image(1920, 512),
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
  const summonRevealIndex = combatRevealIndex(ctx.commands, 0);

  assert.deepEqual(startCutinDraws, []);
  assert.equal(hitBoltDraws.length >= 1, true, 'expected hit bolt to remain visible after first action');
  assert.notEqual(summonRevealIndex, -1, 'expected summon reveal to remain visible after first action');
  assert.deepEqual(actionFlashDraws(ctx.commands, 0), [], 'first action should no longer render the old compact summon flash');
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
  assert.ok(stampDraw, 'expected compact summon action stamp to remain visible after the action feedback');
  assert.equal(stampDraw.args[6] >= 320, true, `action stamp should sit below the center track: ${stampDraw.args[6]}`);
  assert.equal(stampDraw.args[8] <= 78, true, `action stamp should stay compact: ${stampDraw.args[8]}`);
  const stampIndex = ctx.commands.indexOf(stampDraw);
  const stampAlpha = ctx.commands
    .slice(0, stampIndex)
    .findLast((command) => command.type === 'globalAlpha')?.value ?? 0;
  assert.equal(stampAlpha >= 0.82, true, `action stamp should remain legible while the unit lands: ${stampAlpha}`);
});

test('summon action stamp names the revealed unit and role', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 11.0,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'spark_pin' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'noise_shard', spriteKey: 'noise_shard' }],
      events: [{ type: 'summon', at: 10.1, playerId: 'p1', unitId: 'spark_pin' }],
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

  assert.equal(
    ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '스파크 핀 · 공격/피해'),
    true,
    'summon reward stamp should reveal the unit identity and combat value without opening a separate web panel'
  );
  const detailIndex = ctx.commands.findIndex((command) => command.type === 'fillText' && command.args[0] === '스파크 핀 · 공격/피해');
  const detailFont = ctx.commands.slice(0, detailIndex).findLast((command) => command.type === 'font')?.value ?? '';
  assert.match(detailFont, /12px/, 'unit identity should stay readable on a phone-scale action stamp');
});

test('summon action stamp explains control units as slow value, not only role taxonomy', () => {
  const ctx = mockContext();
  drawRebootBattle(
    ctx,
    {
      now: 11.0,
      boards: {
        p1: { danger: 0, units: [{ spriteKey: 'slow_coil' }] },
        p2: { danger: 0, units: [] }
      },
      enemies: [{ enemyId: 'quick_noise', spriteKey: 'quick_noise' }],
      events: [{ type: 'summon', at: 10.1, playerId: 'p1', unitId: 'slow_coil' }],
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

  assert.equal(
    ctx.commands.some((command) => command.type === 'fillText' && command.args[0] === '느림 코일 · 제어/감속'),
    true,
    'control summon feedback should tell the player why the unit matters'
  );
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
      && command.args[7] >= 240
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

test('matchmaking event banner hides playable first-summon guidance so ready copy stays readable', () => {
  const ctx = mockContext();
  const firstCommandSpotlight = image(256, 128);
  const firstSummonBeacon = image(512, 512);
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
      effects: [],
      actionState: { p1: { summon: true, merge: false, rescue: false } }
    },
    { width: 390, height: 620 },
    {
      backdrop: image(390, 620),
      board: image(1280, 256),
      firstCommandSpotlight,
      firstSummonBeacon,
      openingThreatPreview: image(512, 256),
      startCutin: image(390, 112)
    },
    { matchmakingBannerVisible: true }
  );

  const startCutinDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 390
      && command.args[0].naturalHeight === 112
  ));
  const threatPreviewDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage'
      && command.args[0].naturalWidth === 512
      && command.args[0].naturalHeight === 256
  ));
  const firstCommandDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === firstCommandSpotlight
  ));
  const firstBeaconDraws = ctx.commands.filter((command) => (
    command.type === 'drawImage' && command.args[0] === firstSummonBeacon
  ));

  assert.deepEqual(startCutinDraws, []);
  assert.deepEqual(threatPreviewDraws, []);
  assert.deepEqual(firstCommandDraws, []);
  assert.deepEqual(firstBeaconDraws, []);
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
