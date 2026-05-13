export const REBOOT_ATLAS_MANIFEST = {
  units: {
    src: '/src/client/assets/generated/reboot-unit-atlas.png',
    columns: 5,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['spark_pin', 'toktok_amp', 'slow_coil', 'burst_pin', 'rescue_coil']
  },
  enemies: {
    src: '/src/client/assets/generated/reboot-enemy-atlas.png',
    columns: 4,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['noise_shard', 'quick_noise', 'heavy_noise', 'mini_boss']
  },
  ui: {
    src: '/src/client/assets/generated/reboot-ui-icons.png',
    columns: 6,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['summon_charge', 'merge_action', 'rescue_action', 'partner_danger', 'boss_warning', 'reward_shard']
  },
  rewards: {
    src: '/src/client/assets/generated/reboot-reward-icons.png',
    columns: 4,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['soft_currency', 'cosmetic_shard', 'season_progress', 'unlock_capsule']
  },
  board: {
    src: '/src/client/assets/generated/reboot-board-accents.png',
    columns: 5,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['player_socket', 'partner_socket', 'merge_ready_frame', 'rescue_beam_segment', 'danger_pulse_frame']
  },
  vfx: {
    src: '/src/client/assets/generated/reboot-combat-vfx.png',
    columns: 5,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['summon_flash', 'merge_burst', 'rescue_flare', 'enemy_hit_spark', 'boss_warning_flare']
  }
};

export const REBOOT_BACKDROP_MANIFEST = {
  battle: {
    src: '/src/client/assets/generated/reboot-battle-backdrop.png',
    width: 390,
    height: 620,
    source: 'imagegen'
  }
};

export const REBOOT_CUTIN_MANIFEST = {
  bossWarning: {
    src: '/src/client/assets/generated/reboot-boss-cutin.png',
    width: 390,
    height: 128,
    source: 'imagegen'
  },
  partnerDanger: {
    src: '/src/client/assets/generated/reboot-rescue-cutin.png',
    width: 390,
    height: 112,
    source: 'imagegen'
  }
};

export const REBOOT_EFFECT_MANIFEST = {
  killBurst: {
    src: '/src/client/assets/generated/reboot-kill-burst.png',
    width: 256,
    height: 256,
    source: 'imagegen'
  },
  hitBeam: {
    src: '/src/client/assets/generated/reboot-hit-beam.png',
    width: 320,
    height: 64,
    source: 'imagegen'
  }
};

const UNIT_COLORS = {
  spark_pin: '#58d7ff',
  toktok_amp: '#f4c95d',
  slow_coil: '#8ee6d2',
  burst_pin: '#ffd166',
  rescue_coil: '#dff9ff'
};

export function createRebootAssetImages() {
  if (typeof Image === 'undefined') return {};
  const atlases = Object.fromEntries(
    Object.entries(REBOOT_ATLAS_MANIFEST).map(([key, manifest]) => {
      const image = new Image();
      image.src = manifest.src;
      return [key, image];
    })
  );
  const backdrop = new Image();
  backdrop.src = REBOOT_BACKDROP_MANIFEST.battle.src;
  const bossCutin = new Image();
  bossCutin.src = REBOOT_CUTIN_MANIFEST.bossWarning.src;
  const rescueCutin = new Image();
  rescueCutin.src = REBOOT_CUTIN_MANIFEST.partnerDanger.src;
  const killBurst = new Image();
  killBurst.src = REBOOT_EFFECT_MANIFEST.killBurst.src;
  const hitBeam = new Image();
  hitBeam.src = REBOOT_EFFECT_MANIFEST.hitBeam.src;
  return { ...atlases, backdrop, bossCutin, rescueCutin, killBurst, hitBeam };
}

function cellFromManifest(group, spriteKey) {
  const manifest = REBOOT_ATLAS_MANIFEST[group];
  const index = manifest.order.indexOf(spriteKey);
  return { index, manifest };
}

function drawAtlasSprite(ctx, assets, group, spriteKey, cx, cy, size, alpha = 1) {
  const { index, manifest } = cellFromManifest(group, spriteKey);
  const image = assets?.[group];
  if (index < 0 || !image?.complete || image.naturalWidth <= 0) return false;
  const col = index % manifest.columns;
  const row = Math.floor(index / manifest.columns);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(
    image,
    col * manifest.cell.width,
    row * manifest.cell.height,
    manifest.cell.width,
    manifest.cell.height,
    cx - size / 2,
    cy - size / 2,
    size,
    size
  );
  ctx.restore();
  return true;
}

function roundedRect(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawBattleBackdrop(ctx, layout, assets = {}) {
  const image = assets?.backdrop;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  ctx.drawImage(image, 0, 0, layout.width, layout.height);
  return true;
}

function drawImageCover(ctx, image, x, y, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else if (sourceRatio < targetRatio) {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
  return true;
}

function drawBeamSprite(ctx, image, from, to, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 4) return false;
  const height = Math.max(16, Math.min(32, length * 0.13));
  ctx.save();
  ctx.translate(from.x, from.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, 0, -height / 2, length, height);
  ctx.restore();
  return true;
}

function drawBoard(ctx, board, x, y, w, h, title, compact = false, assets = {}, imageBackdrop = false) {
  if (!imageBackdrop) {
    roundedRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = compact ? 'rgba(21, 30, 30, 0.82)' : 'rgba(18, 27, 26, 0.9)';
    ctx.fill();
    ctx.strokeStyle = board.danger >= 80 ? '#ff6f59' : 'rgba(245, 240, 220, 0.18)';
    ctx.lineWidth = board.danger >= 80 ? 3 : 1;
    ctx.stroke();
  } else if (board.danger >= 80) {
    roundedRect(ctx, x, y, w, h, 8);
    ctx.strokeStyle = '#ff6f59';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '700 12px system-ui';
  ctx.fillText(title, x + 12, y + 18);
  ctx.fillStyle = board.danger >= 80 ? '#ff6f59' : '#a8b4a7';
  ctx.fillText(`위험 ${Math.round(board.danger)}`, x + w - 66, y + 18);
  if (board.danger >= 80) {
    drawAtlasSprite(ctx, assets, 'board', 'danger_pulse_frame', x + w - 36, y + 42, compact ? 48 : 56, 0.58);
  }

  const count = compact ? 4 : 5;
  const gap = 8;
  const size = (w - 24 - gap * (count - 1)) / count;
  const typeCounts = board.units.reduce((counts, unit) => {
    if (!unit) return counts;
    counts.set(unit.spriteKey, (counts.get(unit.spriteKey) ?? 0) + 1);
    return counts;
  }, new Map());
  const mergeReadyKeys = new Set(
    [...typeCounts.entries()].filter(([, unitCount]) => unitCount >= 3).map(([spriteKey]) => spriteKey)
  );
  for (let i = 0; i < count; i += 1) {
    const sx = x + 12 + i * (size + gap);
    const sy = y + h - size - 12;
    const socketKey = compact ? 'partner_socket' : 'player_socket';
    if (!imageBackdrop && !drawAtlasSprite(ctx, assets, 'board', socketKey, sx + size / 2, sy + size / 2, size * 1.08, 0.7)) {
      roundedRect(ctx, sx, sy, size, size, 7);
      ctx.fillStyle = 'rgba(245, 240, 220, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(88, 215, 255, 0.22)';
      ctx.stroke();
    }
    const unit = board.units[i];
    if (!unit) continue;
    if (mergeReadyKeys.has(unit.spriteKey)) {
      drawAtlasSprite(ctx, assets, 'board', 'merge_ready_frame', sx + size / 2, sy + size / 2, size * 1.16, 0.72);
    }
    if (drawAtlasSprite(ctx, assets, 'units', unit.spriteKey, sx + size / 2, sy + size / 2, size * 0.95)) {
      continue;
    }
    ctx.save();
    ctx.translate(sx + size / 2, sy + size / 2);
    ctx.fillStyle = UNIT_COLORS[unit.spriteKey] ?? '#58d7ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.28, size * 0.22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b1111';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function drawBossWarningCutin(ctx, state, assets = {}) {
  if (state.now < 92 || state.now >= 102) return false;
  const image = assets?.bossCutin;
  ctx.save();
  const alpha = 0.78 + Math.sin(state.now * 10) * 0.06;
  if (!drawImageCover(ctx, image, 0, 205, 390, 128, alpha)) {
    ctx.fillStyle = 'rgba(255, 111, 89, 0.18)';
    roundedRect(ctx, 42, 220, 306, 106, 8);
    ctx.fill();
  }
  const alarmAlpha = 0.84 + Math.max(0, Math.sin(state.now * 8)) * 0.16;
  drawAtlasSprite(ctx, assets, 'ui', 'boss_warning', 66, 270, 42, alarmAlpha);
  ctx.fillStyle = '#ffdfd8';
  ctx.shadowColor = '#ff6f59';
  ctx.shadowBlur = 16;
  ctx.font = '900 20px system-ui';
  ctx.fillText('보스 접근', 92, 268);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.82)';
  ctx.font = '800 11px system-ui';
  ctx.fillText('마지막 소환·합성 타이밍', 92, 286);
  ctx.restore();
  return true;
}

function drawPartnerDangerCutin(ctx, state, assets = {}) {
  const partnerDanger = state.boards.p2.danger >= 80;
  if (!partnerDanger) return false;
  const image = assets?.rescueCutin;
  ctx.save();
  const alpha = 0.74 + Math.max(0, Math.sin(state.now * 7)) * 0.08;
  if (!drawImageCover(ctx, image, 0, 160, 390, 112, alpha)) {
    ctx.fillStyle = 'rgba(255, 111, 89, 0.16)';
    roundedRect(ctx, 38, 170, 314, 92, 8);
    ctx.fill();
  }
  drawAtlasSprite(ctx, assets, 'ui', 'partner_danger', 62, 218, 42, 0.95);
  ctx.fillStyle = '#ffdfd8';
  ctx.shadowColor = '#ff6f59';
  ctx.shadowBlur = 14;
  ctx.font = '900 19px system-ui';
  ctx.fillText('파트너 위험', 90, 216);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.82)';
  ctx.font = '800 11px system-ui';
  ctx.fillText('구원 타이밍 준비', 90, 234);
  ctx.restore();
  return true;
}

function drawTrack(ctx, state, assets = {}, imageBackdrop = false) {
  ctx.save();
  ctx.translate(0, 0);
  if (!imageBackdrop) {
    roundedRect(ctx, 42, 202, 306, 170, 8);
    ctx.fillStyle = 'rgba(7, 13, 14, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(88, 215, 255, 0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(70, 285);
    ctx.bezierCurveTo(150, 218, 245, 355, 320, 282);
    ctx.strokeStyle = '#58d7ff';
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const enemies = state.enemies.slice(0, 8);
  enemies.forEach((enemy, index) => {
    const { x, y } = enemyScreenPoint(state, index);
    const size = enemy.enemyId === 'mini_boss' ? 54 : 36;
    if (drawAtlasSprite(ctx, assets, 'enemies', enemy.spriteKey ?? enemy.enemyId, x, y, size)) {
      return;
    }
    ctx.fillStyle = enemy.enemyId === 'mini_boss' ? '#ff6f59' : '#d94f45';
    ctx.shadowColor = '#ff6f59';
    ctx.shadowBlur = enemy.enemyId === 'mini_boss' ? 18 : 8;
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 9, enemy.enemyId === 'mini_boss' ? 30 : 20, enemy.enemyId === 'mini_boss' ? 24 : 18, 6);
    ctx.fill();
  });

  const warning = state.now >= 92 && state.now < 102;
  if (warning) {
    drawBossWarningCutin(ctx, state, assets);
  }
  ctx.restore();
}

function enemyScreenPoint(state, index) {
  const p = ((state.now * 0.045 + index * 0.12) % 1);
  return {
    x: 70 + p * 250,
    y: 285 + Math.sin(p * Math.PI * 2) * 34
  };
}

function trackPointFromProgress(progress = 0, lane = 0) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const laneOffset = Math.max(-1, Math.min(1, Number(lane) || 0)) * 10;
  return {
    x: 70 + p * 250,
    y: 285 + Math.sin(p * Math.PI * 2) * 34 + laneOffset
  };
}

function recentEvents(state, type, windowSeconds = 0.9) {
  return state.events
    .filter((event) => event.type === type && state.now >= event.at && state.now - event.at <= windowSeconds)
    .slice(-2);
}

function eventAlpha(state, event, windowSeconds = 0.9) {
  return Math.max(0, 1 - (state.now - event.at) / windowSeconds);
}

function boardSlotPoint(playerId, slotIndex = 0) {
  const compact = playerId === 'p2';
  const x = compact ? 28 : 24;
  const y = compact ? 48 : 438;
  const w = compact ? 334 : 342;
  const h = compact ? 112 : 138;
  const count = compact ? 4 : 5;
  const gap = 8;
  const size = (w - 24 - gap * (count - 1)) / count;
  const index = Math.max(0, Math.min(count - 1, slotIndex));
  return {
    x: x + 12 + index * (size + gap) + size / 2,
    y: y + h - size - 12 + size / 2
  };
}

function boardVfxPoint(state, event) {
  const board = state.boards[event.playerId] ?? state.boards.p1;
  return boardSlotPoint(event.playerId, Math.max(0, board.units.length - 1));
}

function drawRescueBeam(ctx, state, assets = {}) {
  const rescued = state.events.some((event) => event.type === 'rescue');
  if (!rescued) return;
  ctx.save();
  drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 195, 328, 114, 0.42);
  ctx.strokeStyle = '#dff9ff';
  ctx.shadowColor = '#58d7ff';
  ctx.shadowBlur = 22;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(78, 148);
  ctx.bezierCurveTo(135, 230, 250, 395, 312, 500);
  ctx.stroke();
  ctx.restore();
}

function drawDeathBursts(ctx, state, assets = {}) {
  const bursts = (state.effects ?? [])
    .filter((effect) => effect.type === 'death_burst')
    .slice(-5);
  for (const effect of bursts) {
    const point = trackPointFromProgress(effect.targetProgress, effect.targetLane);
    const boss = effect.targetType === 'boss';
    const size = boss ? 120 : 78;
    const ttlMax = boss ? 1.25 : 0.78;
    const alpha = Math.max(0.18, Math.min(0.92, (effect.ttl ?? ttlMax) / ttlMax));
    drawImageCover(ctx, assets.killBurst, point.x - size / 2, point.y - size / 2, size, size, alpha);
    const rewardSprite = boss ? 'unlock_capsule' : 'soft_currency';
    drawAtlasSprite(ctx, assets, 'rewards', rewardSprite, point.x + size * 0.34, point.y - size * 0.26, boss ? 34 : 24, alpha);
  }
}

function drawHitBeams(ctx, state, assets = {}) {
  const hits = (state.effects ?? [])
    .filter((effect) => effect.type === 'hit')
    .slice(-6);
  for (const effect of hits) {
    const from = boardSlotPoint(effect.playerId, effect.slot);
    const to = trackPointFromProgress(effect.targetProgress, effect.targetLane);
    const alpha = Math.max(0.16, Math.min(0.86, (effect.ttl ?? 0.62) / 0.62));
    if (!drawBeamSprite(ctx, assets.hitBeam, from, to, alpha)) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = '#58d7ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#58d7ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    }
    drawAtlasSprite(ctx, assets, 'vfx', 'enemy_hit_spark', to.x, to.y, effect.targetType === 'boss' ? 58 : 42, alpha);
  }
}

function drawCombatVfx(ctx, state, assets = {}) {
  for (const event of recentEvents(state, 'summon')) {
    const point = boardVfxPoint(state, event);
    drawAtlasSprite(ctx, assets, 'vfx', 'summon_flash', point.x, point.y, 84, eventAlpha(state, event));
  }
  for (const event of recentEvents(state, 'merge')) {
    const point = boardVfxPoint(state, event);
    drawAtlasSprite(ctx, assets, 'vfx', 'merge_burst', point.x, point.y, 112, eventAlpha(state, event));
  }
  for (const event of recentEvents(state, 'rescue')) {
    drawAtlasSprite(ctx, assets, 'vfx', 'rescue_flare', 195, 328, 132, eventAlpha(state, event));
  }
  drawHitBeams(ctx, state, assets);
  drawDeathBursts(ctx, state, assets);
  if (state.enemies.length > 0) {
    const point = enemyScreenPoint(state, 0);
    const alpha = 0.34 + Math.max(0, Math.sin(state.now * 12)) * 0.22;
    drawAtlasSprite(ctx, assets, 'vfx', 'enemy_hit_spark', point.x + 7, point.y - 7, 46, alpha);
  }
  if (state.now >= 92 && state.now < 102) {
    drawAtlasSprite(ctx, assets, 'vfx', 'boss_warning_flare', 195, 286, 146, 0.54);
  }
}

export function drawRebootBattle(ctx, state, layout = { width: 390, height: 620 }, assets = {}) {
  ctx.clearRect(0, 0, layout.width, layout.height);
  const imageBackdrop = drawBattleBackdrop(ctx, layout, assets);
  if (!imageBackdrop) {
    const bg = ctx.createLinearGradient(0, 0, 0, layout.height);
    bg.addColorStop(0, '#111817');
    bg.addColorStop(1, '#060a0b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, layout.width, layout.height);

    ctx.fillStyle = 'rgba(245, 240, 220, 0.05)';
    for (let y = 40; y < layout.height; y += 46) ctx.fillRect(24, y, layout.width - 48, 1);
  }

  drawBoard(ctx, state.boards.p2, 28, 48, 334, 112, '파트너 보드', true, assets, imageBackdrop);
  drawTrack(ctx, state, assets, imageBackdrop);
  drawPartnerDangerCutin(ctx, state, assets);
  drawBoard(ctx, state.boards.p1, 24, 438, 342, 138, '내 보드', false, assets, imageBackdrop);
  drawRescueBeam(ctx, state, assets);
  drawCombatVfx(ctx, state, assets);
}
