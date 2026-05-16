import { REBOOT_RULES } from '../shared/reboot_content.js';

const OPERATION_START_CUTIN_END = 0.56;
const OPERATION_START_CUTIN_FADE = 0.18;
const OPENING_THREAT_PREVIEW_END = 3.6;
const EARLY_LULL_THREAT_PREVIEW_END = 17.4;
const FIRST_SUMMON_BEACON_END = 16;
const WAVE_DIRECTIVE_DURATION = 2.1;
const WAVE_DIRECTIVE_FADE_SECONDS = 0.48;
const ACTION_SURGE_DURATION = 2.0;
const ACTION_SURGE_HOLD_SECONDS = 0.85;
const MERGE_REWARD_SIGIL_DURATION = 1.9;
const MERGE_REWARD_SIGIL_HOLD_SECONDS = 0.85;

export const REBOOT_ATLAS_MANIFEST = {
  units: {
    src: '/src/client/assets/generated/reboot-unit-atlas.png',
    columns: 8,
    rows: 1,
    cell: { width: 256, height: 256 },
    order: ['spark_pin', 'toktok_amp', 'slow_coil', 'burst_pin', 'rescue_coil', 'mirror_port', 'bloom_amp', 'nova_mast']
  },
  enemies: {
    src: '/src/client/assets/generated/reboot-enemy-atlas.png?v=enemy-atlas-v2',
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
  },
  dualCrisis: {
    src: '/src/client/assets/generated/reboot-dual-crisis-cutin.png?v=dual-crisis1',
    width: 390,
    height: 128,
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
  actionStamps: {
    src: '/src/client/assets/generated/reboot-combat-action-stamps.png?v=action-stamps1',
    width: 768,
    height: 128,
    source: 'imagegen'
  },
  directiveBanner: {
    src: '/src/client/assets/generated/reboot-combat-directive-banner.png?v=directive-banner1',
    width: 768,
    height: 160,
    source: 'imagegen'
  },
  partnerAssistPings: {
    src: '/src/client/assets/generated/reboot-partner-assist-pings.png?v=partner-assist2',
    width: 640,
    height: 100,
    source: 'imagegen'
  },
  partnerStandbySigils: {
    src: '/src/client/assets/generated/reboot-partner-standby-sigils.png?v=partner-standby1',
    width: 512,
    height: 160,
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
  fieldFinaleBursts: {
    src: '/src/client/assets/generated/reboot-result-finale-bursts.png?v=boss-finale1',
    width: 780,
    height: 260,
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
  },
  unitActivationRing: {
    src: '/src/client/assets/generated/reboot-unit-activation-ring.png?v=unit-activation-ring1',
    width: 512,
    height: 512,
    source: 'imagegen'
  },
  actionSurges: {
    src: '/src/client/assets/generated/reboot-combat-action-surges.png?v=action-surges1',
    width: 780,
    height: 620,
    source: 'imagegen'
  },
  boardLabelPlates: {
    src: '/src/client/assets/generated/reboot-combat-status-plates.png?v=board-labels-alpha1',
    width: 780,
    height: 80,
    source: 'imagegen'
  },
  firstCommandSpotlight: {
    src: '/src/client/assets/generated/reboot-combat-first-command-spotlight.png?v=summon-reward1',
    width: 256,
    height: 128,
    source: 'imagegen'
  },
  firstSummonBeacon: {
    src: '/src/client/assets/generated/reboot-first-summon-landing-beacon.png?v=first-summon-beacon1',
    width: 512,
    height: 512,
    source: 'imagegen'
  },
  combatRevealVfx: {
    src: '/src/client/assets/generated/reboot-combat-reveal-vfx.png?v=reveal-vfx1',
    width: 1920,
    height: 512,
    source: 'imagegen'
  },
  summonIgnition: {
    src: '/src/client/assets/generated/reboot-summon-ignition-vfx.png?v=summon-ignition1',
    width: 768,
    height: 256,
    source: 'imagegen'
  },
  enemyTrackTrails: {
    src: '/src/client/assets/generated/reboot-enemy-track-trails.png?v=enemy-track-trails1',
    width: 1024,
    height: 128,
    source: 'imagegen'
  },
  enemyImpactBursts: {
    src: '/src/client/assets/generated/reboot-enemy-impact-bursts.png?v=enemy-impact-bursts1',
    width: 768,
    height: 160,
    source: 'imagegen'
  },
  enemySpawnGates: {
    src: '/src/client/assets/generated/reboot-enemy-spawn-gates.png?v=enemy-spawn-gates1',
    width: 768,
    height: 192,
    source: 'imagegen'
  },
  openingThreatPreview: {
    src: '/src/client/assets/generated/reboot-opening-threat-preview.png?v=opening-threat-preview1',
    width: 512,
    height: 256,
    source: 'imagegen'
  },
  signalCoreGates: {
    src: '/src/client/assets/generated/reboot-signal-core-gates.png?v=signal-core-gates1',
    width: 512,
    height: 192,
    source: 'imagegen'
  }
};

const UNIT_COLORS = {
  spark_pin: '#58d7ff',
  toktok_amp: '#f4c95d',
  slow_coil: '#8ee6d2',
  burst_pin: '#ffd166',
  rescue_coil: '#dff9ff',
  mirror_port: '#90f3ff',
  bloom_amp: '#ffdc73',
  nova_mast: '#ff8f5a'
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

const MOMENT_CALLOUT_DURATION = 1.85;
const MOMENT_CALLOUT_FADE_SECONDS = 0.5;
const PARTNER_ASSIST_PING_DURATION = 2.4;

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
  const dualCrisisCutin = new Image();
  dualCrisisCutin.src = REBOOT_CUTIN_MANIFEST.dualCrisis.src;
  const killBurst = new Image();
  killBurst.src = REBOOT_EFFECT_MANIFEST.killBurst.src;
  const hitBeam = new Image();
  hitBeam.src = REBOOT_EFFECT_MANIFEST.hitBeam.src;
  const hitBolts = new Image();
  hitBolts.src = REBOOT_EFFECT_MANIFEST.hitBolts.src;
  const actionStamps = new Image();
  actionStamps.src = REBOOT_EFFECT_MANIFEST.actionStamps.src;
  const directiveBanner = new Image();
  directiveBanner.src = REBOOT_EFFECT_MANIFEST.directiveBanner.src;
  const partnerAssistPings = new Image();
  partnerAssistPings.src = REBOOT_EFFECT_MANIFEST.partnerAssistPings.src;
  const partnerStandbySigils = new Image();
  partnerStandbySigils.src = REBOOT_EFFECT_MANIFEST.partnerStandbySigils.src;
  const crisisOverlays = new Image();
  crisisOverlays.src = REBOOT_EFFECT_MANIFEST.crisisOverlays.src;
  const rewardPickups = new Image();
  rewardPickups.src = REBOOT_EFFECT_MANIFEST.rewardPickups.src;
  const bossAuras = new Image();
  bossAuras.src = REBOOT_EFFECT_MANIFEST.bossAuras.src;
  const fieldFinaleBursts = new Image();
  fieldFinaleBursts.src = REBOOT_EFFECT_MANIFEST.fieldFinaleBursts.src;
  const cosmeticSigils = new Image();
  cosmeticSigils.src = REBOOT_EFFECT_MANIFEST.cosmeticSigils.src;
  const playerBoardTray = new Image();
  playerBoardTray.src = REBOOT_EFFECT_MANIFEST.playerBoardTray.src;
  const unitActivationRing = new Image();
  unitActivationRing.src = REBOOT_EFFECT_MANIFEST.unitActivationRing.src;
  const actionSurges = new Image();
  actionSurges.src = REBOOT_EFFECT_MANIFEST.actionSurges.src;
  const boardLabelPlates = new Image();
  boardLabelPlates.src = REBOOT_EFFECT_MANIFEST.boardLabelPlates.src;
  const firstCommandSpotlight = new Image();
  firstCommandSpotlight.src = REBOOT_EFFECT_MANIFEST.firstCommandSpotlight.src;
  const firstSummonBeacon = new Image();
  firstSummonBeacon.src = REBOOT_EFFECT_MANIFEST.firstSummonBeacon.src;
  const combatRevealVfx = new Image();
  combatRevealVfx.src = REBOOT_EFFECT_MANIFEST.combatRevealVfx.src;
  const summonIgnition = new Image();
  summonIgnition.src = REBOOT_EFFECT_MANIFEST.summonIgnition.src;
  const enemyTrackTrails = new Image();
  enemyTrackTrails.src = REBOOT_EFFECT_MANIFEST.enemyTrackTrails.src;
  const enemyImpactBursts = new Image();
  enemyImpactBursts.src = REBOOT_EFFECT_MANIFEST.enemyImpactBursts.src;
  const enemySpawnGates = new Image();
  enemySpawnGates.src = REBOOT_EFFECT_MANIFEST.enemySpawnGates.src;
  const openingThreatPreview = new Image();
  openingThreatPreview.src = REBOOT_EFFECT_MANIFEST.openingThreatPreview.src;
  const signalCoreGates = new Image();
  signalCoreGates.src = REBOOT_EFFECT_MANIFEST.signalCoreGates.src;
  return { ...atlases, backdrop, startCutin, bossCutin, rescueCutin, dualCrisisCutin, killBurst, hitBeam, hitBolts, actionStamps, directiveBanner, partnerAssistPings, partnerStandbySigils, crisisOverlays, rewardPickups, bossAuras, fieldFinaleBursts, cosmeticSigils, playerBoardTray, unitActivationRing, actionSurges, boardLabelPlates, firstCommandSpotlight, firstSummonBeacon, combatRevealVfx, summonIgnition, enemyTrackTrails, enemyImpactBursts, enemySpawnGates, openingThreatPreview, signalCoreGates };
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

function drawActionStampPanel(ctx, image, index, x, y, w, h, alpha = 1) {
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

function drawPartnerStandbySprite(ctx, image, index, x, y, w, h, alpha = 1) {
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

function drawCombatRevealVfxSprite(ctx, image, index, cx, cy, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 4;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

function drawCombatActionSurgeSprite(ctx, image, index, layout, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, 0, 0, layout.width, layout.height);
  ctx.restore();
  return true;
}

function drawSummonIgnitionSprite(ctx, image, index, cx, cy, w, h, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

function drawFinaleBurstSprite(ctx, image, index, cx, cy, w, h, alpha = 1) {
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

function drawEnemyTrackTrail(ctx, assets, enemy, x, y, now = 0) {
  const image = assets?.enemyTrackTrails;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const trailIndexByEnemy = {
    noise_shard: 0,
    quick_noise: 1,
    heavy_noise: 2,
    mini_boss: 3
  };
  const key = enemy.spriteKey ?? enemy.enemyId;
  const index = trailIndexByEnemy[key] ?? 0;
  const cellWidth = image.naturalWidth / 4;
  const boss = key === 'mini_boss';
  const heavy = key === 'heavy_noise';
  const fast = key === 'quick_noise';
  const w = boss ? 100 : heavy ? 82 : fast ? 76 : 60;
  const h = boss ? 46 : heavy ? 38 : fast ? 30 : 26;
  const alpha = Math.min(0.92, (boss ? 0.76 : 0.58) + Math.max(0, Math.sin(now * (fast ? 8.5 : 5.5))) * 0.08);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, x - w / 2, y + (boss ? 10 : 8), w, h);
  ctx.restore();
  return true;
}

function drawEnemySpawnGate(ctx, image, enemies = [], now = 0) {
  if (!enemies.length || !image?.complete || image.naturalWidth <= 0) return false;
  const hasBoss = enemies.some((enemy) => enemy.enemyId === 'mini_boss' || enemy.spriteKey === 'mini_boss');
  const hasHeavy = enemies.some((enemy) => enemy.enemyId === 'heavy_noise' || enemy.spriteKey === 'heavy_noise');
  const index = hasBoss ? 2 : hasHeavy || enemies.length >= 4 ? 1 : 0;
  const cellWidth = image.naturalWidth / 3;
  const width = hasBoss ? 118 : index === 1 ? 108 : 92;
  const height = hasBoss ? 88 : index === 1 ? 76 : 66;
  const alpha = Math.min(0.88, 0.66 + Math.max(0, Math.sin(now * 5.3)) * 0.12);
  const gateX = 76;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, gateX - width / 2, 286 - height / 2, width, height);
  ctx.restore();
  return true;
}

function hasFirstPlayerAction(state = {}) {
  return (state.events ?? []).some((event) => (
    ['summon', 'merge', 'rescue'].includes(event.type) && state.now >= event.at
  ));
}

function openingThreatPreviewAlpha(state = {}, options = {}) {
  const now = Number(state.now) || 0;
  if (options.onlineWaiting || options.matchmakingBannerVisible) return 0;
  if ((state.enemies?.length ?? 0) > 0) return 0;
  if (now >= OPERATION_START_CUTIN_END && now <= OPENING_THREAT_PREVIEW_END) {
    const intro = Math.min(1, Math.max(0, now - OPERATION_START_CUTIN_END) / 0.22);
    const exit = Math.min(1, Math.max(0, OPENING_THREAT_PREVIEW_END - now) / 0.7);
    return Math.min(0.78, intro * exit * 0.78);
  }
  if (hasFirstPlayerAction(state) && now > OPENING_THREAT_PREVIEW_END && now <= EARLY_LULL_THREAT_PREVIEW_END) {
    const exit = Math.min(1, Math.max(0, EARLY_LULL_THREAT_PREVIEW_END - now) / 1.4);
    const pulse = 0.62 + Math.max(0, Math.sin(now * 3.4)) * 0.08;
    return pulse * exit;
  }
  return 0;
}

function drawOpeningThreatPreview(ctx, state, assets = {}, options = {}) {
  const alpha = openingThreatPreviewAlpha(state, options);
  if (alpha <= 0) return false;

  const previewEnemy = { enemyId: 'noise_shard', spriteKey: 'noise_shard', progress: 0.08, lane: 0.25 };
  const point = trackPointFromProgress(0.075 + Math.max(0, Math.sin(state.now * 2.3)) * 0.012, 0.25);
  const preview = assets?.openingThreatPreview;
  if (preview?.complete && preview.naturalWidth > 0) {
    const width = state.now > OPENING_THREAT_PREVIEW_END ? 148 : 116;
    const height = state.now > OPENING_THREAT_PREVIEW_END ? 72 : 58;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(preview, 0, 0, preview.naturalWidth, preview.naturalHeight, point.x - width * 0.38, point.y - height * 0.82, width, height);
    ctx.restore();
    return true;
  }

  ctx.save();
  ctx.globalAlpha *= alpha;
  drawEnemySpawnGate(ctx, assets.enemySpawnGates, [previewEnemy], state.now);
  drawEnemyTrackTrail(ctx, assets, previewEnemy, point.x, point.y, state.now);
  drawAtlasSprite(ctx, assets, 'enemies', previewEnemy.spriteKey, point.x, point.y, 46, 0.86);
  ctx.restore();
  return true;
}

function isSignalCoreCritical(state = {}) {
  const danger = Math.max(...Object.values(state.boards ?? {}).map((board) => board?.danger ?? 0), 0);
  const bossThreat = (state.enemies ?? []).some((enemy) => enemy.enemyId === 'mini_boss' || enemy.spriteKey === 'mini_boss');
  const endpointThreat = (state.enemies ?? []).some((enemy) => Number.isFinite(Number(enemy.progress)) && Number(enemy.progress) >= 0.86);
  return danger >= 80 || bossThreat || endpointThreat || (state.now >= 92 && state.now < 102);
}

function drawSignalCoreGate(ctx, image, state = {}) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const critical = isSignalCoreCritical(state);
  const index = critical ? 1 : 0;
  const cellWidth = image.naturalWidth / 2;
  const pulse = Math.max(0, Math.sin((Number(state.now) || 0) * (critical ? 7.2 : 3.2))) * 0.08;
  const width = critical ? 146 : 116;
  const height = critical ? 106 : 84;
  const alpha = Math.min(0.94, (critical ? 0.84 : 0.62) + pulse);
  const coreX = critical ? 312 : 320;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, coreX - width / 2, 286 - height / 2, width, height);
  ctx.restore();
  return true;
}

function drawSignalCoreCriticalFlare(ctx, image, state = {}) {
  if (!image?.complete || image.naturalWidth <= 0 || !isSignalCoreCritical(state)) return false;
  const cellWidth = image.naturalWidth / 2;
  const pulse = Math.max(0, Math.sin((Number(state.now) || 0) * 8.6)) * 0.1;
  const width = 176;
  const height = 128;
  const coreX = 312;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha *= Math.min(0.58, 0.38 + pulse);
  ctx.shadowColor = 'rgba(255, 101, 54, 0.72)';
  ctx.shadowBlur = 24;
  ctx.drawImage(image, cellWidth, 0, cellWidth, image.naturalHeight, coreX - width / 2, 286 - height / 2, width, height);
  ctx.restore();
  return true;
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

function drawUnitActivationRing(ctx, assets, cx, cy, unitSize, alpha = 1) {
  const image = assets?.unitActivationRing;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const w = unitSize * 1.34;
  const h = unitSize * 0.82;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, cx - w / 2, cy + unitSize * 0.16 - h / 2, w, h);
  ctx.restore();
  return true;
}

function drawBoardLabelPlate(ctx, assets, variant, x, y, w, h, alpha = 0.76) {
  const image = assets?.boardLabelPlates;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 2;
  const index = variant === 'danger' ? 1 : 0;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, x, y, w, h);
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

function drawEnemyImpactBurst(ctx, image, cx, cy, targetType, alpha = 1) {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const boss = targetType === 'boss' || targetType === 'mini_boss';
  const heavy = targetType === 'heavy_noise';
  const index = boss ? 2 : heavy ? 1 : 0;
  const cellWidth = image.naturalWidth / 3;
  const size = boss ? 72 : heavy ? 58 : 46;
  const y = cy - (boss ? 2 : 1);
  ctx.save();
  ctx.globalAlpha *= Math.min(0.96, alpha * (boss ? 1.1 : 1));
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, cx - size / 2, y - size / 2, size, size);
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
  const compactBoardActive = compact && ((board.units?.length ?? 0) > 0 || board.danger >= 50);
  const showBoardText = !imageBackdrop || compactBoardActive;
  const showDangerText = !imageBackdrop || board.danger >= 50;
  if (showBoardText) {
    if (imageBackdrop) drawBoardLabelPlate(ctx, assets, 'board', x + 4, y + 2, compact ? 118 : 106, 28, 0.68);
    ctx.fillStyle = '#f5f0dc';
    ctx.font = '700 12px system-ui';
    ctx.fillText(title, x + 12, y + 18);
  }
  if (showDangerText) {
    if (imageBackdrop) drawBoardLabelPlate(ctx, assets, 'danger', x + w - 90, y + 2, 86, 28, board.danger >= 80 ? 0.9 : 0.72);
    ctx.fillStyle = board.danger >= 80 ? '#ff6f59' : '#a8b4a7';
    ctx.fillText(`위험 ${Math.round(board.danger)}`, x + w - 66, y + 18);
  }
  if (board.danger >= 80) {
    drawAtlasSprite(ctx, assets, 'board', 'danger_pulse_frame', x + w - 36, y + 42, compact ? 48 : 56, 0.58);
  }

  const count = compact ? 4 : 5;
  const gap = 8;
  const size = (w - 24 - gap * (count - 1)) / count;
  const gradeCounts = board.units.reduce((counts, unit) => {
    if (!unit) return counts;
    counts.set(unit.grade, (counts.get(unit.grade) ?? 0) + 1);
    return counts;
  }, new Map());
  const mergeReadyGrades = new Set(
    [...gradeCounts.entries()]
      .filter(([grade, unitCount]) => Number(grade) < 2 && unitCount >= REBOOT_RULES.merge.requiredSameGrade)
      .map(([grade]) => grade)
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
    if (imageBackdrop && !compact) {
      drawUnitActivationRing(ctx, assets, unitX, unitY, unitSize, 0.72);
    }
    if (mergeReadyGrades.has(unit.grade)) {
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

function drawPartnerStandbySigil(ctx, state, assets = {}, partnerId = 'p2', options = {}) {
  if (options.onlineWaiting || options.matchmakingBannerVisible) return false;
  const partnerBoard = state.boards?.[partnerId];
  if (!partnerBoard || (partnerBoard.units?.length ?? 0) > 0) return false;

  const players = state.players ?? [];
  const partnerPlayer = players.find((player) => normalizeBoardId(player.id) === normalizeBoardId(partnerId));
  const isBotPartner = state.mode === 'bot' || partnerPlayer?.bot === true;
  if (!isBotPartner) return false;

  const pulse = Math.max(0, Math.sin((Number(state.now) || 0) * 3.8)) * 0.12;
  const alpha = Math.min(0.86, 0.62 + pulse);
  return drawPartnerStandbySprite(ctx, assets.partnerStandbySigils, 0, 112, 64, 166, 66, alpha);
}

function drawCosmeticSigilSprite(ctx, image, index, x, y, w, h, alpha = 1) {
  if (!Number.isInteger(index) || !image?.complete || image.naturalWidth <= 0) return false;
  const cellWidth = image.naturalWidth / 5;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, index * cellWidth, 0, cellWidth, image.naturalHeight, x, y, w, h);
  ctx.restore();
  return true;
}

function normalizeBoardId(boardId) {
  return boardId === 'p2' ? 'p2' : 'p1';
}

function partnerBoardId(localBoardId = 'p1') {
  return normalizeBoardId(localBoardId) === 'p1' ? 'p2' : 'p1';
}

function partnerDangerActive(state, localBoardId = 'p1') {
  const partnerId = partnerBoardId(localBoardId);
  return (state.boards?.[partnerId]?.danger ?? 0) >= 80;
}

function rescuePriorityCrisis(state, localBoardId = 'p1') {
  const bossWarning = state.now >= 92 && state.now < 102;
  const selfId = normalizeBoardId(localBoardId);
  const partnerDanger = partnerDangerActive(state, selfId);
  const rescueReady = state.actionState?.[selfId]?.rescue === true || (state.resources?.[selfId]?.rescue ?? 0) >= 100;
  return bossWarning && partnerDanger && rescueReady;
}

function drawBattleCosmeticSignature(ctx, assets, equippedCosmetic, now = 0, reducedMotion = false) {
  const index = COSMETIC_SIGIL_INDEX[equippedCosmetic];
  const image = assets?.cosmeticSigils;
  const pulse = reducedMotion ? 0 : Math.max(0, Math.sin(now * 2.6)) * 0.08;
  const alpha = 0.38 + pulse;
  return drawCosmeticSigilSprite(ctx, image, index, 35, 476, 320, 86, alpha);
}

function drawCombatCrisisOverlays(ctx, state, assets = {}, localBoardId = 'p1') {
  const bossWarning = state.now >= 92 && state.now < 102;
  const partnerDanger = partnerDangerActive(state, localBoardId);
  if (bossWarning) {
    if (rescuePriorityCrisis(state, localBoardId)) {
      const alpha = 0.5 + Math.max(0, Math.sin(state.now * 7)) * 0.12;
      return drawCrisisOverlayPanel(ctx, assets.crisisOverlays, 1, 0, 126, 390, 160, alpha);
    }
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

function drawDualCrisisCutin(ctx, state, assets = {}, localBoardId = 'p1') {
  if (!rescuePriorityCrisis(state, localBoardId)) return false;
  const image = assets?.dualCrisisCutin;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const alpha = 0.8 + Math.max(0, Math.sin(state.now * 8)) * 0.08;
  ctx.save();
  drawImageCover(ctx, image, 0, 196, 390, 128, alpha);
  drawAtlasSprite(ctx, assets, 'ui', 'rescue_action', 50, 257, 40, 0.95);
  drawAtlasSprite(ctx, assets, 'ui', 'boss_warning', 292, 257, 34, 0.72);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(2, 6, 7, 0.72)';
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = '#58d7ff';
  ctx.shadowBlur = 16;
  ctx.font = '900 20px system-ui';
  ctx.strokeText?.('구원 우선', 84, 246);
  ctx.fillText('구원 우선', 84, 246);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(245, 240, 220, 0.84)';
  ctx.font = '800 11px system-ui';
  ctx.strokeText?.('파트너 위험 · 보스 접근', 84, 265);
  ctx.fillText('파트너 위험 · 보스 접근', 84, 265);
  ctx.restore();
  return true;
}

function drawPartnerDangerCutin(ctx, state, assets = {}, localBoardId = 'p1') {
  const partnerDanger = partnerDangerActive(state, localBoardId);
  if (!partnerDanger) return false;
  if (state.now >= 92 && state.now < 102) return false;
  const rescueAssist = recentEvents(state, 'partner_auto', PARTNER_ASSIST_PING_DURATION).some((event) => event.action === 'rescue');
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
  if (state.now >= OPERATION_START_CUTIN_END) return false;
  if (hasFirstPlayerAction(state)) return false;
  const image = assets?.startCutin;
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const introIn = Math.min(1, state.now / OPERATION_START_CUTIN_FADE);
  const introOut = Math.min(1, Math.max(0, OPERATION_START_CUTIN_END - state.now) / OPERATION_START_CUTIN_FADE);
  const alpha = Math.min(introIn, introOut) * 0.68;
  ctx.save();
  drawImageCover(ctx, image, 0, 180, 390, 86, alpha);
  drawAtlasSprite(ctx, assets, 'ui', 'summon_charge', 74, 226, 34, alpha);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = '#58d7ff';
  ctx.shadowBlur = 15;
  ctx.font = '900 18px system-ui';
  ctx.fillText('작전 시작', 116, 221);
  ctx.restore();
  return true;
}

function drawTrack(ctx, state, assets = {}, imageBackdrop = false, options = {}) {
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
  drawEnemySpawnGate(ctx, assets.enemySpawnGates, enemies, state.now);
  drawOpeningThreatPreview(ctx, state, assets, options);
  drawSignalCoreGate(ctx, assets.signalCoreGates, state);
  enemies.forEach((enemy, index) => {
    const { x, y } = enemyScreenPoint(state, index, enemy);
    const size = enemy.enemyId === 'mini_boss' ? 66 : 44;
    if (enemy.enemyId === 'mini_boss') {
      drawBossAura(ctx, assets, x, y, state.now);
    }
    drawEnemyTrackTrail(ctx, assets, enemy, x, y, state.now);
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
  drawSignalCoreCriticalFlare(ctx, assets.signalCoreGates, state);

  ctx.restore();
}

function laneForEnemy(enemy = {}) {
  if (Number.isFinite(Number(enemy.lane))) return Number(enemy.lane);
  return enemy.boardId === 'p2' ? -0.45 : 0.25;
}

function enemyScreenPoint(state, index, enemy = null) {
  if (Number.isFinite(Number(enemy?.progress))) return trackPointFromProgress(Number(enemy.progress), laneForEnemy(enemy));
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

function sustainedEventAlpha(state, event, durationSeconds, holdSeconds) {
  const elapsed = Math.max(0, state.now - event.at);
  const entrance = Math.min(1, elapsed / 0.14);
  const fadeSeconds = Math.max(0.01, durationSeconds - holdSeconds);
  const exit = elapsed <= holdSeconds
    ? 1
    : Math.max(0, 1 - (elapsed - holdSeconds) / fadeSeconds);
  return entrance * exit;
}

function momentCalloutAlpha(state, event) {
  const elapsed = Math.max(0, state.now - event.at);
  const entrance = Math.min(1, elapsed / 0.12);
  const fadeStart = Math.max(0, MOMENT_CALLOUT_DURATION - MOMENT_CALLOUT_FADE_SECONDS);
  const exit = elapsed <= fadeStart
    ? 1
    : Math.max(0, 1 - (elapsed - fadeStart) / MOMENT_CALLOUT_FADE_SECONDS);
  return Math.min(0.98, entrance * exit * 0.98);
}

function waveDirectiveAlpha(state, event) {
  const elapsed = Math.max(0, state.now - event.at);
  const entrance = Math.min(1, elapsed / 0.16);
  const fadeStart = Math.max(0, WAVE_DIRECTIVE_DURATION - WAVE_DIRECTIVE_FADE_SECONDS);
  const exit = elapsed <= fadeStart
    ? 1
    : Math.max(0, 1 - (elapsed - fadeStart) / WAVE_DIRECTIVE_FADE_SECONDS);
  return Math.min(0.9, entrance * exit * 0.9);
}

function recentWaveDirective(state) {
  return (state.events ?? [])
    .filter((event) => (
      event.type === 'wave'
      && Number(event.waveAt) > 0
      && state.now >= event.at
      && state.now - event.at <= WAVE_DIRECTIVE_DURATION
    ))
    .sort((a, b) => a.at - b.at)
    .at(-1);
}

function drawWaveDirectiveBanner(ctx, state, assets = {}) {
  const event = recentWaveDirective(state);
  const image = assets.directiveBanner;
  if (!event || !image?.complete || image.naturalWidth <= 0) return false;

  const boss = Number(event.waveAt) >= REBOOT_RULES.boss.spawnAt
    || (state.enemies ?? []).some((enemy) => enemy.enemyId === 'mini_boss' || enemy.spriteKey === 'mini_boss');
  const alpha = waveDirectiveAlpha(state, event);
  const x = 46;
  const y = 188 - (1 - alpha) * 5;
  const w = 298;
  const h = 62;

  ctx.save();
  drawImageCover(ctx, image, x, y, w, h, alpha);
  drawAtlasSprite(ctx, assets, 'enemies', boss ? 'mini_boss' : 'noise_shard', x + 50, y + 31, boss ? 43 : 36, alpha);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = boss ? '#ff6f59' : '#58d7ff';
  ctx.shadowBlur = 13;
  ctx.font = '900 17px system-ui';
  ctx.fillText(boss ? '보스 접근' : '적 접근', x + 92, y + 38);
  ctx.restore();
  return true;
}

function boardSlotPoint(playerId, slotIndex = 0, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  const compact = normalizeBoardId(playerId) !== selfId;
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

function boardVfxPoint(state, event, localBoardId = 'p1') {
  const board = state.boards[event.playerId] ?? state.boards.p1;
  return boardSlotPoint(event.playerId, Math.max(0, board.units.length - 1), localBoardId);
}

function drawRescueBeam(ctx, state, assets = {}) {
  const rescued = state.events.some((event) => event.type === 'rescue');
  if (!rescued) return;
  const recentRescue = recentEvents(state, 'rescue', 1.45).at(-1);
  ctx.save();
  if (recentRescue) {
    const alpha = Math.min(0.78, eventAlpha(state, recentRescue, 1.45) * 1.12);
    drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 116, 222, 116, alpha * 0.9);
    drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 195, 322, 136, alpha);
    drawAtlasSprite(ctx, assets, 'board', 'rescue_beam_segment', 274, 418, 122, alpha * 0.82);
    ctx.restore();
    return;
  }
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
    if (boss) drawFinaleBurstSprite(ctx, assets.fieldFinaleBursts, 0, point.x, point.y - 8, 176, 176, alpha * 0.9);
    drawImageCover(ctx, assets.killBurst, point.x - size / 2, point.y - size / 2, size, size, alpha);
    const rewardSprite = boss ? 'unlock_capsule' : 'soft_currency';
    drawAtlasSprite(ctx, assets, 'rewards', rewardSprite, point.x + size * 0.34, point.y - size * 0.26, boss ? 34 : 24, alpha);
    drawRewardPickups(ctx, assets, effect, point, boss, alpha);
  }
}

function drawHitBeams(ctx, state, assets = {}, localBoardId = 'p1') {
  const hits = (state.effects ?? [])
    .filter((effect) => effect.type === 'hit')
    .slice(-6);
  for (const effect of hits) {
    const from = boardSlotPoint(effect.playerId, effect.slot, localBoardId);
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
    drawEnemyImpactBurst(ctx, assets.enemyImpactBursts, to.x, to.y, effect.targetType, alpha);
    drawAtlasSprite(ctx, assets, 'vfx', 'enemy_hit_spark', to.x, to.y, effect.targetType === 'boss' ? 58 : 42, alpha);
  }
}

function drawCombatVfx(ctx, state, assets = {}, localBoardId = 'p1') {
  for (const event of recentEvents(state, 'summon')) {
    const point = boardVfxPoint(state, event, localBoardId);
    const alpha = eventAlpha(state, event);
    drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 0, point.x, point.y + 2, 126, 112, alpha * 0.92);
    if (event.highlight) drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 2, point.x, point.y - 2, 128, 128, alpha * 0.78);
    drawAtlasSprite(ctx, assets, 'vfx', 'summon_flash', point.x, point.y, 84, alpha);
  }
  for (const event of recentEvents(state, 'merge')) {
    const point = boardVfxPoint(state, event, localBoardId);
    const alpha = eventAlpha(state, event);
    drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 1, point.x, point.y, 146, 132, alpha * 0.88);
    if (event.highlight) drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 2, point.x, point.y - 2, 132, 132, alpha * 0.74);
    drawAtlasSprite(ctx, assets, 'vfx', 'merge_burst', point.x, point.y, 112, alpha);
  }
  for (const event of recentEvents(state, 'rescue')) {
    const alpha = eventAlpha(state, event);
    drawCombatRevealVfxSprite(ctx, assets.combatRevealVfx, 3, 195, 328, 156, 118, alpha * 0.9);
    drawAtlasSprite(ctx, assets, 'vfx', 'rescue_flare', 195, 328, 132, alpha);
  }
  drawHitBeams(ctx, state, assets, localBoardId);
  drawDeathBursts(ctx, state, assets);
  if (state.enemies.length > 0) {
    const point = enemyScreenPoint(state, 0, state.enemies[0]);
    const alpha = 0.34 + Math.max(0, Math.sin(state.now * 12)) * 0.22;
    drawAtlasSprite(ctx, assets, 'vfx', 'enemy_hit_spark', point.x + 7, point.y - 7, 46, alpha);
  }
  if (state.now >= 92 && state.now < 102) {
    drawAtlasSprite(ctx, assets, 'vfx', 'boss_warning_flare', 195, 286, 146, 0.54);
  }
}

function firstPlayerSummonRewardEvent(state, localBoardId = 'p1') {
  return firstPlayerRecentEvent(state, 'summon', 1.35, localBoardId);
}

function firstPlayerRecentEvent(state, type, windowSeconds, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  const playerEvents = state.events
    .filter((event) => event.type === type && (event.playerId ?? 'p1') === selfId && state.now >= event.at)
    .sort((a, b) => a.at - b.at);
  const event = playerEvents[0];
  if (!event || state.now - event.at > windowSeconds) return null;
  return event;
}

function firstPlayerActionTaken(state, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  return state.events.some((event) => (
    ['summon', 'merge', 'rescue'].includes(event.type)
      && (event.playerId ?? 'p1') === selfId
      && state.now >= event.at
  ));
}

function drawPreSummonSocketCue(ctx, state, assets = {}, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  const board = state.boards?.[selfId];
  const image = assets?.firstCommandSpotlight;
  if (!board || !image?.complete || image.naturalWidth <= 0) return false;
  if ((board.units?.length ?? 0) > 0) return false;
  if (state.actionState?.[selfId]?.summon !== true) return false;
  if (firstPlayerActionTaken(state, selfId)) return false;
  if (state.now > 4.5) return false;

  const point = boardSlotPoint(selfId, 0, selfId);
  const pulse = Math.max(0, Math.sin(state.now * 5.8)) * 0.08;
  const w = 136;
  const h = 68;
  const x = Math.max(4, Math.min(390 - w - 4, point.x - w / 2));
  const y = point.y - h / 2 + 8;
  return drawImageCover(ctx, image, x, y, w, h, 0.42 + pulse);
}

function drawFirstSummonLandingBeacon(ctx, state, assets = {}, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  const board = state.boards?.[selfId];
  const image = assets?.firstSummonBeacon;
  if (!board || !image?.complete || image.naturalWidth <= 0) return false;
  if ((board.units?.length ?? 0) > 0) return false;
  if (state.actionState?.[selfId]?.summon !== true) return false;
  if (firstPlayerActionTaken(state, selfId)) return false;
  if (state.now > FIRST_SUMMON_BEACON_END) return false;

  const point = boardSlotPoint(selfId, 0, selfId);
  const pulse = 1 + Math.max(0, Math.sin(state.now * 4.2)) * 0.08;
  const size = 94 * pulse;
  return drawImageCover(ctx, image, point.x - size / 2, point.y - size / 2, size, size, 0.74);
}

function drawFirstSummonRewardSpotlight(ctx, state, assets = {}, localBoardId = 'p1') {
  const event = firstPlayerSummonRewardEvent(state, localBoardId);
  const image = assets?.firstCommandSpotlight;
  if (!event || !image?.complete || image.naturalWidth <= 0) return false;
  const point = boardVfxPoint(state, event, localBoardId);
  const elapsed = Math.max(0, state.now - event.at);
  const alpha = Math.min(0.94, eventAlpha(state, event, 1.35) * 1.2);
  const swell = 1 + Math.max(0, Math.sin(elapsed * Math.PI * 3.2)) * 0.08;
  const w = 196 * swell;
  const h = 98 * swell;
  return drawImageCover(ctx, image, point.x - w / 2, point.y + 18 - h / 2, w, h, alpha);
}

function drawFirstSummonIgnition(ctx, state, assets = {}, localBoardId = 'p1') {
  const event = firstPlayerSummonRewardEvent(state, localBoardId);
  const image = assets?.summonIgnition;
  if (!event || !image?.complete || image.naturalWidth <= 0) return false;
  const point = boardVfxPoint(state, event, localBoardId);
  const elapsed = Math.max(0, state.now - event.at);
  const alpha = Math.min(0.9, eventAlpha(state, event, 1.15) * 1.18);
  const swell = 1 + Math.max(0, Math.sin(elapsed * Math.PI * 3.4)) * 0.08;

  drawSummonIgnitionSprite(ctx, image, 0, point.x, point.y + 10, 150 * swell, 112 * swell, alpha * 0.88);
  drawSummonIgnitionSprite(ctx, image, 1, point.x + 72, point.y - 66, 184, 104, alpha * 0.74);
  drawSummonIgnitionSprite(ctx, image, 2, point.x + 40, point.y - 28, 96, 96, alpha * 0.82);
  return true;
}

function drawFirstMergeRewardSigil(ctx, state, assets = {}, reducedMotion = false, localBoardId = 'p1') {
  const event = firstPlayerRecentEvent(state, 'merge', MERGE_REWARD_SIGIL_DURATION, localBoardId);
  const image = assets?.cosmeticSigils;
  const index = COSMETIC_SIGIL_INDEX['merge-effect'];
  if (!event || !image?.complete || image.naturalWidth <= 0) return false;
  const elapsed = Math.max(0, state.now - event.at);
  const alpha = Math.min(0.88, sustainedEventAlpha(
    state,
    event,
    MERGE_REWARD_SIGIL_DURATION,
    MERGE_REWARD_SIGIL_HOLD_SECONDS
  ) * 1.1);
  const swell = reducedMotion ? 1 : 1 + Math.max(0, Math.sin(elapsed * Math.PI * 3.6)) * 0.06;
  const w = 318 * swell;
  const h = 92 * swell;
  return drawCosmeticSigilSprite(ctx, image, index, 36 - (w - 318) / 2, 422 - (h - 92) / 2, w, h, alpha);
}

function drawFirstRescueRewardSigil(ctx, state, assets = {}, reducedMotion = false, localBoardId = 'p1') {
  const event = firstPlayerRecentEvent(state, 'rescue', 1.45, localBoardId);
  const image = assets?.cosmeticSigils;
  const index = COSMETIC_SIGIL_INDEX['rescue-effect'];
  if (!event || !image?.complete || image.naturalWidth <= 0) return false;
  const elapsed = Math.max(0, state.now - event.at);
  const alpha = Math.min(0.86, eventAlpha(state, event, 1.45) * 1.08);
  const swell = reducedMotion ? 1 : 1 + Math.max(0, Math.sin(elapsed * Math.PI * 3.2)) * 0.05;
  const w = 310 * swell;
  const h = 104 * swell;
  return drawCosmeticSigilSprite(ctx, image, index, 40 - (w - 310) / 2, 274 - (h - 104) / 2, w, h, alpha);
}

function drawCombatActionSurges(ctx, state, assets = {}, layout = { width: 390, height: 620 }, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  const moment = [
    ...recentEvents(state, 'merge', ACTION_SURGE_DURATION).map((event) => ({ event, index: 0 })),
    ...recentEvents(state, 'rescue', ACTION_SURGE_DURATION).map((event) => ({ event, index: 1 }))
  ]
    .filter(({ event }) => normalizeBoardId(event.playerId ?? selfId) === selfId)
    .sort((a, b) => a.event.at - b.event.at)
    .at(-1);
  if (!moment) return false;
  const { event, index } = moment;
  const alpha = Math.min(
    index === 1 ? 0.78 : 0.76,
    sustainedEventAlpha(state, event, ACTION_SURGE_DURATION, ACTION_SURGE_HOLD_SECONDS) * (index === 1 ? 1.08 : 1)
  );
  return drawCombatActionSurgeSprite(ctx, assets.actionSurges, index, layout, alpha);
}

function hasRecentLocalPlayerActionSurge(state, localBoardId = 'p1') {
  const selfId = normalizeBoardId(localBoardId);
  return ['merge', 'rescue'].some((type) => (
    recentEvents(state, type, ACTION_SURGE_DURATION).some((event) => normalizeBoardId(event.playerId ?? selfId) === selfId)
  ));
}

function drawCombatMomentCallout(ctx, state, assets = {}) {
  const moments = [
    ...recentEvents(state, 'summon', MOMENT_CALLOUT_DURATION),
    ...recentEvents(state, 'merge', MOMENT_CALLOUT_DURATION),
    ...recentEvents(state, 'rescue', MOMENT_CALLOUT_DURATION)
  ].sort((a, b) => a.at - b.at);
  const event = moments.at(-1);
  const meta = MOMENT_CALLOUTS[event?.type];
  if (!event || !meta) return;

  const alpha = momentCalloutAlpha(state, event);
  const rise = (1 - alpha) * 6;
  const x = 68;
  const w = 252;
  const h = 74;
  const y = 326 - rise;

  if (!assets.actionStamps?.complete || assets.actionStamps.naturalWidth <= 0) return;
  ctx.save();
  drawActionStampPanel(ctx, assets.actionStamps, meta.index, x, y, w, h, alpha);
  drawAtlasSprite(ctx, assets, 'ui', meta.icon, x + 44, y + 38, 32, alpha);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff7dc';
  ctx.shadowColor = meta.index === 1 ? '#f4c95d' : '#58d7ff';
  ctx.shadowBlur = 13;
  ctx.font = '900 16px system-ui';
  ctx.fillText(meta.title, x + 82, y + 43);
  ctx.restore();
}

function drawPartnerAssistPing(ctx, state, assets = {}, localBoardId = 'p1') {
  if (hasRecentLocalPlayerActionSurge(state, localBoardId)) return;
  const event = recentEvents(state, 'partner_auto', PARTNER_ASSIST_PING_DURATION).at(-1);
  if (!event) return;
  const meta = PARTNER_ASSIST_PINGS[event?.action] ?? PARTNER_ASSIST_PINGS.summon;
  const alpha = Math.min(0.95, eventAlpha(state, event, PARTNER_ASSIST_PING_DURATION) * 1.16);
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

  const localBoardId = normalizeBoardId(options.localBoardId);
  const partnerId = partnerBoardId(localBoardId);
  drawBoard(ctx, state.boards[partnerId], 28, 48, 334, 112, '파트너 보드', true, assets, imageBackdrop);
  drawPartnerStandbySigil(ctx, state, assets, partnerId, options);
  drawTrack(ctx, state, assets, imageBackdrop, options);
  drawWaveDirectiveBanner(ctx, state, assets);
  drawCombatActionSurges(ctx, state, assets, layout, localBoardId);
  if (!options.onlineWaiting && !options.matchmakingBannerVisible) drawCombatStartCutin(ctx, state, assets);
  drawCombatCrisisOverlays(ctx, state, assets, localBoardId);
  const drewDualCrisis = drawDualCrisisCutin(ctx, state, assets, localBoardId);
  if (!drewDualCrisis) {
    drawBossWarningCutin(ctx, state, assets);
    drawPartnerDangerCutin(ctx, state, assets, localBoardId);
  }
  drawBattleCosmeticSignature(ctx, assets, options.equippedCosmetic, state.now, options.reducedMotion);
  drawBoard(ctx, state.boards[localBoardId], 24, 392, 342, 138, '내 보드', false, assets, imageBackdrop);
  if (!options.onlineWaiting) drawPreSummonSocketCue(ctx, state, assets, localBoardId);
  if (!options.onlineWaiting) drawFirstSummonLandingBeacon(ctx, state, assets, localBoardId);
  drawFirstSummonIgnition(ctx, state, assets, localBoardId);
  drawFirstSummonRewardSpotlight(ctx, state, assets, localBoardId);
  drawFirstMergeRewardSigil(ctx, state, assets, options.reducedMotion, localBoardId);
  drawFirstRescueRewardSigil(ctx, state, assets, options.reducedMotion, localBoardId);
  drawRescueBeam(ctx, state, assets);
  drawCombatVfx(ctx, state, assets, localBoardId);
  drawPartnerAssistPing(ctx, state, assets, localBoardId);
  drawCombatMomentCallout(ctx, state, assets);
}
