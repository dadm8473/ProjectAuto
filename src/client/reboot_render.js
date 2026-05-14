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
    src: '/src/client/assets/generated/reboot-battle-backdrop.png?v=reboot-action-ready1',
    width: 390,
    height: 620,
    source: 'imagegen'
  }
};

export const REBOOT_CUTIN_MANIFEST = {
  operationStart: {
    src: '/src/client/assets/generated/reboot-combat-start-cutin.png?v=combat-start',
    width: 390,
    height: 112,
    source: 'imagegen'
  },
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
  },
  hitBolts: {
    src: '/src/client/assets/generated/reboot-hit-bolts.png?v=reboot-hit-bolts1',
    width: 768,
    height: 128,
    source: 'imagegen'
  },
  momentCallouts: {
    src: '/src/client/assets/generated/reboot-combat-moment-callouts.png?v=combat-moment-callouts',
    width: 1170,
    height: 144,
    source: 'imagegen'
  },
  partnerAssistPings: {
    src: '/src/client/assets/generated/reboot-partner-assist-pings.png?v=partner-assist2',
    width: 640,
    height: 100,
    source: 'imagegen'
  },
  crisisOverlays: {
    src: '/src/client/assets/generated/reboot-combat-crisis-overlays.png?v=combat-crisis-overlays',
    width: 780,
    height: 160,
    source: 'imagegen'
  },
  rewardPickups: {
    src: '/src/client/assets/generated/reboot-reward-pickup-bursts.png?v=reward-pickups',
    width: 768,
    height: 128,
    source: 'imagegen'
  },
  bossAuras: {
    src: '/src/client/assets/generated/reboot-boss-aura-rings.png?v=boss-aura-rings',
    width: 768,
    height: 192,
    source: 'imagegen'
  },
  cosmeticSigils: {
    src: '/src/client/assets/generated/reboot-battle-cosmetic-sigils.png?v=battle-cosmetic',
    width: 960,
    height: 128,
    source: 'imagegen'
  },
  playerBoardTray: {
    src: '/src/client/assets/generated/reboot-player-board-tray.png?v=player-tray',
    width: 780,
    height: 320,
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

const MOMENT_CALLOUTS = {
  summon: { index: 0, icon: 'summon_charge', title: '소환 성공', body: '새 유닛 전장 투입' },
  merge: { index: 1, icon: 'merge_action', title: '합성 성공', body: '상위 전력으로 강화' },
  rescue: { index: 2, icon: 'rescue_action', title: '구원 발동', body: '파트너 위험 감소' }
};

const PARTNER_ASSIST_PINGS = {
  summon: { index: 0, icon: 'summon_charge', body: '자동 소환' },
  rescue: { index: 1, icon: 'rescue_action', body: '구원 지원' }
};

const COSMETIC_SIGIL_INDEX = {
  'mythic-aura': 0,
  'founder-board': 1,
  'merge-effect': 2,
  'rescue-effect': 3,
  'profile-frame': 4,
  'golden-supply-flash': 2,
  'origin-loop-banner': 1
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
  const startCutin = new Image();
  startCutin.src = REBOOT_CUTIN_MANIFEST.operationStart.src;
  const bossCutin = new Image();
  bossCutin.src = REBOOT_CUTIN_MANIFEST.bossWarning.src;
  const rescueCutin = new Image();
  rescueCutin.src = REBOOT_CUTIN_MANIFEST.partnerDanger.src;
  const killBurst = new Image();
  killBurst.src = REBOOT_EFFECT_MANIFEST.killBurst.src;
  const hitBeam = new Image();
  hitBeam.src = REBOOT_EFFECT_MANIFEST.hitBeam.src;
  const hitBolts = new Image();
  hitBolts.src = REBOOT_EFFECT_MANIFEST.hitBolts.src;
  const momentCallouts = new Image();
  momentCallouts.src = REBOOT_EFFECT_MANIFEST.momentCallouts.src;
  const partnerAssistPings = new Image();
  partnerAssistPings.src = REBOOT_EFFECT_MANIFEST.partnerAssistPings.src;
  const crisisOverlays = new Image();
  crisisOverlays.src = REBOOT_EFFECT_MANIFEST.crisisOverlays.src;
  const rewardPickups = new Image();
  rewardPickups.src = REBOOT_EFFECT_MANIFEST.rewardPickups.src;
  const bossAuras = new Image();
  bossAuras.src = REBOOT_EFFECT_MANIFEST.bossAuras.src;
  const cosmeticSigils = new Image();
  cosmeticSigils.src = REBOOT_EFFECT_MANIFEST.cosmeticSigils.src;
  const playerBoardTray = new Image();
  playerBoardTray.src = REBOOT_EFFECT_MANIFEST.playerBoardTray.src;
  return { ...atlases, backdrop, startCutin, bossCutin, rescueCutin, killBurst, hitBeam, hitBolts, momentCallouts, partnerAssistPings, crisisOverlays, rewardPickups, bossAuras, cosmeticSigils, playerBoardTray };
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

function drawMomentCalloutPanel(ctx, image, index, x, y, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, x, y, w, h);
  ctx.restore();
  return true;
}

function drawPartnerAssistSprite(ctx, image, index, x, y, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, x, y, w, h);
  ctx.restore();
  return true;
}

function drawCrisisOverlayPanel(ctx, image, index, x, y, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, x, y, w, h);
  ctx.restore();
  return true;
}

function drawRewardPickupSprite(ctx, image, index, cx, cy, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

function drawBossAuraSprite(ctx, image, index, cx, cy, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

function drawBossAura(ctx, assets, x, y, now = 0) {
  const auraIndex = now >= 112 ? 2 : now >= 102 ? 1 : 0;
  const pulse = 0.78 + Math.max(0, Math.sin(now * 5.4)) * 0.16;
  return drawBossAuraSprite(ctx, assets.bossAuras, auraIndex, x, y + 18, 128, 64, pulse);
}

function drawPlayerBoardTray(ctx, assets, x, y, w, h) {
  const image = assets?.playerBoardTray;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  ctx.save();
  ctx.globalAlpha *= 0.94;
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();
  return true;
}

function drawHitBoltSprite(ctx, image, from, to, targetType, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 4) return false;
  const angle = Math.atan2(dy, dx);
  const boltIndex = targetType === 'boss' || targetType === 'mini_boss' ? 2 : length > 170 ? 1 : 0;
  const cellWidth = image.naturalWidth / 3;
  const boltLength = Math.min(Math.max(48, length * 0.34), 108);
  const height = boltIndex === 2 ? 42 : 32;
  const centerX = to.x - Math.cos(angle) * boltLength * 0.42;
  const centerY = to.y - Math.sin(angle) * boltLength * 0.42;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, boltIndex * cellWidth, 0, cellWidth, image.naturalHeight, -boltLength / 2, -height / 2, boltLength, height);
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
  if (imageBackdrop && !compact) drawPlayerBoardTray(ctx, assets, x - 6, y - 14, w + 12, h + 10);
  const showBoardText = !imageBackdrop || compact;
  const showDangerText = showBoardText || board.danger >= 50;
  if (showBoardText) {
    ctx.fillStyle = '#f5f0dc';
    ctx.font = '700 12px system-ui';
    ctx.fillText(title, x + 12, y + 18);
  }
  if (showDangerText) {
    ctx.fillStyle = board.danger >= 80 ? '#ff6f59' : '#a8b4a7';
    ctx.fillText(`위험 ${Math.round(board.danger)}`, x + w - 66, y + 18);
  }
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
    const shouldDrawSocket = !imageBackdrop;
    const socketScale = imageBackdrop ? 0.44 : 1.08;
    const socketAlpha = imageBackdrop ? 0.18 : 0.7;
    const drewSocket = shouldDrawSocket && drawAtlasSprite(ctx, assets, 'board', socketKey, sx + size / 2, sy + size / 2, size * socketScale, socketAlpha);
    if (!drewSocket && !imageBackdrop) {
      roundedRect(ctx, sx, sy, size, size, 7);
      ctx.fillStyle = 'rgba(245, 240, 220, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(88, 215, 255, 0.22)';
      ctx.stroke();
    }
    const unit = board.units[i];
    if (!unit) continue;
    const unitLift = imageBackdrop && !compact ? -16 : 0;
    const unitSize = size * (imageBackdrop && !compact ? 1.22 : 0.95);
    const unitX = sx + size / 2;
    const unitY = sy + size / 2 + unitLift;
    if (mergeReadyKeys.has(unit.spriteKey)) {
      drawAtlasSprite(ctx, assets, 'board', 'merge_ready_frame', unitX, unitY, size * 1.16, 0.72);
    }
    if (drawAtlasSprite(ctx, assets, 'units', unit.spriteKey, unitX, unitY, unitSize)) {
      continue;
    }
    ctx.save();
    ctx.translate(unitX, unitY);
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

function drawBattleCosmeticSignature(ctx, assets, equippedCosmetic, now = 0, reducedMotion = false) {
  const index = COSMETIC_SIGIL_INDEX[equippedCosmetic];
  const image = assets?.cosmeticSigils;
  if (!Number.isInteger(index) || !image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 5;
  const pulse = reducedMotion ? 0 : Math.max(0, Math.sin(now * 2.6)) * 0.08;
  const alpha = 0.38 + pulse;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, 35, 476, 320, 86);
  ctx.restore();
  return true;
}

function drawCombatCrisisOverlays(ctx, state, assets = {}) {
  const bossWarning = state.now >= 92 && state.now < 102;
  const partnerDanger = state.boards.p2.danger >= 80;
  if (bossWarning) {
    const alpha = 0.5 + Math.max(0, Math.sin(state.now * 8)) * 0.12;
    return drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 0, 0, 210, 390, 160, alpha);
  }
  if (partnerDanger) {
    const alpha = 0.48 + Math.max(0, Math.sin(state.now * 6)) * 0.1;
    return drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 1, 0, 126, 390, 160, alpha);
  }
  return false;
}

function drawBossWarningCutin(ctx, state, assets = {}) {
  if (state.now < 92 || state.now >= 102) return false;
  const image = assets?.bossCutin;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const alpha = 0.78 + Math.sin(state.now * 10) * 0.06;
  ctx.save();
  drawImageCover(ctx, image, 0, 205, 390, 128, alpha);
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
  if (state.now >= 92 && state.now < 102) return false;
  const rescueAssist = recentEvents(state, 'partner_auto', 1.35).some((event) => event.action === 'rescue');
  if (rescueAssist) return false;
  const image = assets?.rescueCutin;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const alpha = 0.74 + Math.max(0, Math.sin(state.now * 7)) * 0.08;
  ctx.save();
  drawImageCover(ctx, image, 0, 160, 390, 112, alpha);
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

function drawCombatStartCutin(ctx, state, assets = {}) {
  if (state.now >= 1.2) return false;
  const firstActionTaken = state.events.some((event) => (
    ['summon', 'merge', 'rescue'].includes(event.type) && state.now >= event.at
  ));
  if (firstActionTaken) return false;
  const image = assets?.startCutin;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const introIn = Math.min(1, state.now / 0.34);
  const introOut = Math.min(1, Math.max(0, 1.2 - state.now) / 0.34);
  const alpha = Math.min(introIn, introOut) * 0.84;
  ctx.save();
  drawImageCover(ctx, image, 0, 180, 390, 86, alpha);
  drawAtlasSprite(ctx, assets, 'ui', 'summon_charge', 74, 226, 34, alpha);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = '#58d7ff';
  ctx.shadowBlur = 15;
  ctx.font = '900 18px system-ui';
  ctx.fillText('작전 시작', 116, 221);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.82)';
  ctx.font = '800 11px system-ui';
  ctx.fillText('소환 준비', 118, 238);
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
    if (enemy.enemyId === 'mini_boss') {
      drawBossAura(ctx, assets, x, y, state.now);
    }
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
  const y = compact ? 48 : 392;
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
  drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 118, 220, 90, 0.3);
  drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 272, 420, 104, 0.24);
  ctx.restore();
}

function drawRewardPickups(ctx, assets, effect, point, boss, alpha) {
  if (!(effect.rewardCharge > 0 || effect.rewardLink > 0)) return false;
  const pickupIndex = boss ? 2 : effect.rewardLink > 1 ? 1 : 0;
  const pickupAlpha = Math.min(0.98, alpha * 1.36);
  const rise = (1 - alpha) * (boss ? 34 : 22);
  const w = boss ? 140 : 106;
  const h = boss ? 74 : 56;
  const cx = point.x + (boss ? 30 : 16);
  const cy = point.y - (boss ? 54 : 40) - rise;
  return drawRewardPickupSprite(ctx, assets.rewardPickups, pickupIndex, cx, cy, w, h, pickupAlpha);
}

function drawDeathBursts(ctx, state, assets = {}) {
  const bursts = (state.effects ?? [])
    .filter((effect) => effect.type === 'death_burst')
    .slice(-5);
  for (const effect of bursts) {
    const point = trackPointFromProgress(effect.targetProgress, effect.targetLane);
    const boss = effect.targetType === 'boss' || effect.targetType === 'mini_boss';
    const size = boss ? 120 : 78;
    const ttlMax = boss ? 1.25 : 0.78;
    const alpha = Math.max(0.18, Math.min(0.92, (effect.ttl ?? ttlMax) / ttlMax));
    drawImageCover(ctx, assets.killBurst, point.x - size / 2, point.y - size / 2, size, size, alpha);
    const rewardSprite = boss ? 'unlock_capsule' : 'soft_currency';
    drawAtlasSprite(ctx, assets, 'rewards', rewardSprite, point.x + size * 0.34, point.y - size * 0.26, boss ? 34 : 24, alpha);
    drawRewardPickups(ctx, assets, effect, point, boss, alpha);
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
    if (!drawHitBoltSprite(ctx, assets.hitBolts, from, to, effect.targetType, alpha)) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);
      const boltLength = Math.min(Math.max(42, Math.hypot(dx, dy) * 0.28), 92);
      const startX = to.x - Math.cos(angle) * boltLength;
      const startY = to.y - Math.sin(angle) * boltLength;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = '#58d7ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#58d7ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
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

function drawCombatMomentCallout(ctx, state, assets = {}) {
  const moments = [
    ...recentEvents(state, 'summon', 1.15),
    ...recentEvents(state, 'merge', 1.15),
    ...recentEvents(state, 'rescue', 1.15)
  ].sort((a, b) => a.at - b.at);
  const event = moments.at(-1);
  const meta = MOMENT_CALLOUTS[event?.type];
  if (!event || !meta) return;

  const alpha = Math.min(0.96, eventAlpha(state, event, 1.15) * 1.18);
  const rise = (1 - alpha) * 8;
  const x = 30;
  const w = 330;
  const h = 122;
  const y = 328 - rise;

  if (!assets.momentCallouts?.complete || assets.momentCallouts.naturalWidth <= 0) return;
  ctx.save();
  drawMomentCalloutPanel(ctx, assets.momentCallouts, meta.index, x, y, w, h, alpha);
  drawAtlasSprite(ctx, assets, 'ui', meta.icon, x + 50, y + 62, 42, alpha);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = meta.index === 1 ? '#f4c95d' : '#58d7ff';
  ctx.shadowBlur = 12;
  ctx.font = '900 18px system-ui';
  ctx.fillText(meta.title, x + 92, y + 58);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.82)';
  ctx.font = '800 11px system-ui';
  ctx.fillText(meta.body, x + 92, y + 76);
  ctx.restore();
}

function drawPartnerAssistPing(ctx, state, assets = {}) {
  const event = recentEvents(state, 'partner_auto', 1.35).at(-1);
  if (!event) return;
  const meta = PARTNER_ASSIST_PINGS[event?.action] ?? PARTNER_ASSIST_PINGS.summon;
  const alpha = Math.min(0.95, eventAlpha(state, event, 1.35) * 1.16);
  const rise = (1 - alpha) * 7;
  const x = 52;
  const y = 138 - rise;
  const w = 288;
  const h = 90;
  const drewAssistPing = drawPartnerAssistSprite(ctx, assets.partnerAssistPings, meta.index, x, y, w, h, alpha);
  if (!drewAssistPing) return;
  drawAtlasSprite(ctx, assets, 'ui', meta.icon, x + 52, y + 38, 32, alpha);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = '#58d7ff';
  ctx.shadowBlur = 13;
  ctx.font = '900 16px system-ui';
  ctx.fillText('파트너 지원', x + 92, y + 36);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.82)';
  ctx.font = '800 10px system-ui';
  ctx.fillText(meta.body, x + 92, y + 52);
  ctx.restore();
}

export function drawRebootBattle(ctx, state, layout = { width: 390, height: 620 }, assets = {}, options = {}) {
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
  drawCombatStartCutin(ctx, state, assets);
  drawCombatCrisisOverlays(ctx, state, assets);
  drawBossWarningCutin(ctx, state, assets);
  drawPartnerDangerCutin(ctx, state, assets);
  drawBattleCosmeticSignature(ctx, assets, options.equippedCosmetic, state.now, options.reducedMotion);
  drawBoard(ctx, state.boards.p1, 24, 392, 342, 138, '내 보드', false, assets, imageBackdrop);
  drawRescueBeam(ctx, state, assets);
  drawCombatVfx(ctx, state, assets);
  drawPartnerAssistPing(ctx, state, assets);
  drawCombatMomentCallout(ctx, state, assets);
}
