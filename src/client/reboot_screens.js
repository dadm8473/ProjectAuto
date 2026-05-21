import { createGame } from '../shared/game.js?v=retry-context1';
import { SHOP } from '../shared/content.js';
import { REBOOT_UNITS } from '../shared/reboot_content.js';

const REASON_LABELS = {
  partner_rescued: '파트너 구원 성공',
  boss_final_hit: '보스 막타 성공',
  boss_slowed: '보스 둔화 성공',
  greed: '합성 욕심 실패',
  rescue_missed: '구원 타이밍 실패',
  boss_leaked: '보스 돌파',
  boss_unfinished: '보스 처치 실패',
  signal_overrun: '신호 과부하',
  merge_gap: '합성 지연',
  bad_luck: '약한 조합 방치'
};

const GOAL_LABELS = {
  time_next_rescue: '위험 80 직전 구원',
  repeat_boss_timing: '보스 경고 후 선택',
  protect_control_unit: '느림 코일 생존',
  rescue_before_merge_greed: '위험 높으면 구원',
  save_rescue_for_partner_danger: '구원 게이지 보존',
  answer_boss_warning: '보스 경고 때 합성',
  focus_boss_damage: '보스 화력 집중',
  protect_signal_core: '초반 라인 방어',
  merge_before_boss: '보스 전 합성',
  turn_bad_rolls_into_utility: '약한 유닛 활용'
};

const RESCUE_RESULT_GOALS = new Set([
  'time_next_rescue',
  'rescue_before_merge_greed',
  'save_rescue_for_partner_danger'
]);

const BOSS_RESULT_GOALS = new Set([
  'repeat_boss_timing',
  'answer_boss_warning',
  'focus_boss_damage',
  'merge_before_boss'
]);

function resultGoalTone(goal) {
  if (RESCUE_RESULT_GOALS.has(goal)) return 'rescue';
  if (BOSS_RESULT_GOALS.has(goal)) return 'boss';
  return 'tactics';
}

const HIGHLIGHT_LABELS = {
  bad_roll_recovered: { label: '약한 운 회복', medal: 'tactics' },
  partner_rescued: { label: '결정적 구원', medal: 'rescue' },
  boss_final_hit: { label: '보스 막타 성공', medal: 'boss' },
  boss_slowed: { label: '보스 둔화 성공', medal: 'boss' },
  rescue_missed: { label: '구원 타이밍 실패', medal: 'rescue' },
  boss_leaked: { label: '보스 돌파', medal: 'boss' },
  boss_unfinished: { label: '보스 처치 실패', medal: 'boss' },
  signal_overrun: { label: '신호 과부하', medal: 'tactics' },
  merge_gap: { label: '합성 지연', medal: 'tactics' },
  greed: { label: '합성 욕심 실패', medal: 'tactics' },
  bad_luck: { label: '약한 조합 방치', medal: 'tactics' }
};

export const REBOOT_RETRY_SEED_SEQUENCE = [
  'tutorial_success',
  'lucky_clutch',
  'bad_recoverable',
  'boss_clutch'
];

const ROLE_LABELS = {
  attack: '공격',
  support: '지원',
  control: '제어',
  rescue: '구원'
};

function resultMedalForReason(reason) {
  if (['partner_rescued', 'rescue_missed', 'save_rescue_for_partner_danger'].includes(reason)) return 'rescue';
  if (['boss_final_hit', 'boss_slowed', 'boss_leaked', 'boss_unfinished'].includes(reason)) return 'boss';
  return 'tactics';
}

function resultHighlightForKey(key, won) {
  const highlight = HIGHLIGHT_LABELS[key];
  return {
    label: highlight?.label ?? REASON_LABELS[key] ?? '전투 완료',
    kind: won ? 'success' : 'danger',
    medal: highlight?.medal ?? resultMedalForReason(key)
  };
}

function resultHighlights(result = {}, won = false) {
  const reason = result.reason ?? 'partner_rescued';
  const rawHighlights = Array.isArray(result.highlights) && result.highlights.length ? result.highlights : [reason];
  const keys = [...new Set([...rawHighlights, reason].filter(Boolean))].slice(0, 2);
  return keys.map((key) => resultHighlightForKey(key, won));
}

function resultRewardPresentation(reason, won) {
  if (won && ['boss_final_hit', 'boss_slowed'].includes(reason)) {
    return {
      rewardTone: 'boss',
      rewardIcon: 'unlock_capsule',
      rewardLabel: '전리품'
    };
  }
  return {
    rewardTone: 'standard',
    rewardIcon: 'soft_currency',
    rewardLabel: '획득'
  };
}

export function unitUpgradeCost(level = 1) {
  return 40 + Math.max(0, level - 1) * 20;
}

export const REBOOT_MISSIONS = [
  {
    id: 'first-run',
    title: '첫 작전 완료',
    goal: '전투 1회 완료',
    target: 1,
    reward: { gems: 20 },
    progress(profile = {}) {
      return profile.processedRuns?.length ?? 0;
    }
  },
  {
    id: 'train-unit',
    title: '유닛 강화',
    goal: '유닛 1회 강화',
    target: 1,
    reward: { gems: 20 },
    progress(profile = {}) {
      return Object.values(profile.unitLevels ?? {}).filter((level) => level > 1).length;
    }
  },
  {
    id: 'unlock-cosmetic',
    title: '외형 해금',
    goal: '외형 1개 보유',
    target: 1,
    reward: { gems: 25 },
    progress(profile = {}) {
      return profile.unlocks?.length ?? 0;
    }
  }
];

const LOBBY_OPERATION_SEQUENCE = [
  {
    seedName: 'tutorial_success',
    title: '첫 구원 작전',
    hudTitle: '첫 구원',
    detail: '파트너 구원 · 보스 저지',
    cta: '출격',
    poster: 'first',
    threatLabel: '보스 저지'
  },
  {
    seedName: 'lucky_clutch',
    title: '보스 막타 작전',
    hudTitle: '보스 막타',
    detail: '막판 소환 · 결정타',
    cta: '출격',
    poster: 'boss',
    threatLabel: '보스 막타'
  },
  {
    seedName: 'bad_recoverable',
    title: '역전 구원 작전',
    hudTitle: '역전 구원',
    detail: '나쁜 운 회복 · 구원',
    cta: '출격',
    poster: 'recovery',
    threatLabel: '역전 구원'
  },
  {
    seedName: 'boss_clutch',
    title: '보스 대응 작전',
    hudTitle: '보스 대응',
    detail: '소환/합성 선택',
    cta: '출격',
    poster: 'response',
    threatLabel: '보스 대응'
  }
];

export function operationForSeedName(seedName) {
  return LOBBY_OPERATION_SEQUENCE.find((operation) => operation.seedName === seedName)
    ?? { seedName: 'unknown', title: '신호릴레이', hudTitle: '신호릴레이', detail: '협동 타워디펜스', cta: '출격', poster: 'first', threatLabel: '협동 방어' };
}

export function missionProgress(profile, mission) {
  return Math.min(mission.target, mission.progress(profile));
}

function countClaimableMissions(profile = {}) {
  const claimed = new Set(profile.claimedMissions ?? []);
  return REBOOT_MISSIONS.filter((mission) => !claimed.has(mission.id) && missionProgress(profile, mission) >= mission.target).length;
}

function countClaimablePassTiers(profile = {}) {
  const claimed = new Set(profile.claimedPassTiers ?? []);
  const xp = profile.xp ?? 0;
  return SHOP.pass.tiers.filter((tier, index) => xp >= tier.xp && !claimed.has(index)).length;
}

function countTrainableUnits(profile = {}) {
  const xp = profile.xp ?? 0;
  const unitLevels = profile.unitLevels ?? {};
  return Object.values(REBOOT_UNITS).filter((unit) => xp >= unitUpgradeCost(unitLevels[unit.id] ?? 1)).length;
}

function countAffordableCosmetics(profile = {}) {
  const gems = profile.gems ?? 0;
  const unlocks = new Set(profile.unlocks ?? []);
  return SHOP.items.filter((item) => item.category === 'cosmetic' && item.grant?.cosmetic && !unlocks.has(item.grant.cosmetic) && gems >= (item.price?.gems ?? 0)).length;
}

function progressFillPercent(current, target) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function buildMetaProgress(kind, current, target, label) {
  const valueNow = Math.min(current, target);
  return `<span class="meta-progress" data-progress-kind="${kind}" style="--progress-fill:${progressFillPercent(current, target)}%" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${valueNow}" aria-label="${label}"></span>`;
}

const CARD_STATE_BADGES = {
  ready: '<span class="card-state-badge" data-card-state="ready" aria-hidden="true"></span>',
  owned: '<span class="card-state-badge" data-card-state="owned" aria-hidden="true"></span>',
  locked: '<span class="card-state-badge" data-card-state="locked" aria-hidden="true"></span>'
};
const SHOP_PURPOSE_LABEL = '외형 전용';
const SHOP_PURPOSE_BADGE = '외형';
const SHOP_NO_POWER_LABEL = '전투력 영향 없음';
const CLAIM_ACTION_LABEL = '받기';

function cardStateBadge(state) {
  return CARD_STATE_BADGES[state] ?? CARD_STATE_BADGES.locked;
}

function passiveCardStateMarkup(label, state = 'locked', displayLabel = label, extraClass = '') {
  const className = extraClass ? `card-passive-state ${extraClass}` : 'card-passive-state';
  return `<span class="${className}" data-passive-state="${state}" aria-label="${label}">${displayLabel}</span>`;
}

function passiveCardState(label, state = 'locked', displayLabel = label) {
  return passiveCardStateMarkup(label, state, displayLabel);
}

function rewardGrantLabel(grant = {}) {
  if (grant.gems) return `${grant.gems} 보석`;
  if (grant.cosmetic) return '외형';
  return '보상';
}

function rewardGrantCompactLabel(grant = {}) {
  if (grant.gems) return `${grant.gems}보석`;
  return rewardGrantLabel(grant);
}

function objectiveStateLabel(state) {
  if (state === 'claimed') return '받음';
  if (state === 'ready') return '수령 가능';
  return '진행중';
}

function objectiveAction(kind, state, control) {
  return `
      <div class="objective-action" data-objective-kind="${kind}" data-objective-state="${state}">
        <span class="objective-status-stamp" data-objective-kind="${kind}" data-objective-state="${state}" aria-hidden="true"></span>
        ${control}
      </div>
  `;
}

export function buildMetaNavAlerts(profile = {}) {
  return {
    collection: countTrainableUnits(profile) > 0,
    shop: countAffordableCosmetics(profile) > 0,
    missions: countClaimableMissions(profile) > 0,
    season: countClaimablePassTiers(profile) > 0
  };
}

function showcaseStatBadge(stat) {
  if (typeof stat === 'object' && stat !== null) {
    const label = stat.label ? ` aria-label="${stat.label}"` : '';
    return `<span class="meta-showcase-chip"${label}>${stat.text}</span>`;
  }
  return `<span class="meta-showcase-chip">${stat}</span>`;
}

function buildMetaShowcase({
  kind,
  label,
  title,
  detail,
  chip,
  stats,
  spriteClass,
  spriteAttr,
  spriteValue,
  extraClass = '',
  attrs = '',
  previewClass = '',
  previewExtra = '',
  action = ''
}) {
  const className = extraClass ? `meta-showcase ${extraClass}` : 'meta-showcase';
  const previewClassName = previewClass ? `meta-showcase-preview ${previewClass}` : 'meta-showcase-preview';
  const statBadges = (stats ?? (chip ? [chip] : [])).map((stat) => showcaseStatBadge(stat)).join('');
  return `
    <section class="${className}" data-showcase-kind="${kind}" data-summary-kind="${kind}"${attrs}>
      <div class="${previewClassName}">
        ${previewExtra}
        <span class="sprite-token ${spriteClass}" ${spriteAttr}="${spriteValue}" aria-hidden="true"></span>
      </div>
      <div class="meta-showcase-copy">
        <span>${label}</span>
        <strong>${title}</strong>
        <p>${detail}</p>
      </div>
      <div class="meta-showcase-stats" aria-label="${kind} 상태">${statBadges}</div>
      ${action}
    </section>
  `;
}

function missionState(progress, target, received) {
  if (received) return 'claimed';
  if (progress >= target) return 'ready';
  return 'locked';
}

function missionCardState(state) {
  if (state === 'claimed') return 'owned';
  if (state === 'ready') return 'ready';
  return 'locked';
}

function buildFeaturedMissionCommand(featuredMission) {
  if (!featuredMission) {
    return `
      <div class="mission-board-command" data-feature-command="locked">
        <span class="reward-token board-feature-reward" data-reward-icon="unlock_capsule" aria-hidden="true"></span>
        ${passiveCardStateMarkup('진행중', 'locked', '진행중', 'featured-objective-passive')}
      </div>
    `;
  }
  const rewardLabel = rewardGrantLabel(featuredMission.reward);
  return `
      <div class="mission-board-command" data-feature-command="ready">
        <span class="reward-token board-feature-reward" data-reward-icon="${rewardIconForGrant(featuredMission.reward, 'mission')}" aria-hidden="true"></span>
        <button type="button" class="featured-objective-action" data-mission-claim="${featuredMission.id}" aria-label="${featuredMission.title} 보상 ${rewardLabel} 수령">${CLAIM_ACTION_LABEL}</button>
      </div>
    `;
}

function buildMissionStampBoard(profile = {}, claimed = new Set()) {
  const claimable = countClaimableMissions(profile);
  const boardStatus = claimable > 0 ? CLAIM_ACTION_LABEL : '작전 진행';
  const boardAriaState = claimable > 0 ? `수령 가능 ${claimable}개` : '대기 보상 없음';
  const missionStates = REBOOT_MISSIONS.map((mission) => {
    const progress = missionProgress(profile, mission);
    const state = missionState(progress, mission.target, claimed.has(mission.id));
    return { mission, progress, state };
  });
  const featuredMission = missionStates.find(({ state }) => state === 'ready')?.mission;
  const boardState = featuredMission ? 'ready' : 'locked';
  const stamps = missionStates.map(({ mission, progress, state }) => {
    return `
      <span class="mission-stamp-slot" data-mission-state="${state}" data-mission-id="${mission.id}" aria-label="${mission.title} ${progress}/${mission.target}">
        <span class="reward-token mission-reward-token" data-reward-icon="${rewardIconForGrant(mission.reward, 'mission')}" aria-hidden="true"></span>
      </span>
    `;
  }).join('');

  return `
    <section class="mission-stamp-board" data-board-kind="missions" data-board-layout="contract-stamps" aria-label="미션 보드 · ${boardAriaState} · 완료 목표 보상 전환" data-featured-mission="${featuredMission?.id ?? ''}" data-board-state="${boardState}">
      <div class="mission-board-copy">
        <span>받을 보상</span>
        <strong>${claimable}</strong>
        <p>${boardStatus}</p>
      </div>
      ${buildFeaturedMissionCommand(featuredMission)}
      <div class="mission-stamp-grid">${stamps}</div>
    </section>
  `;
}

function seasonState(xp, tier, index, claimed = new Set()) {
  if (claimed.has(index)) return 'claimed';
  if (xp >= tier.xp) return 'ready';
  return 'locked';
}

function seasonCardState(state) {
  if (state === 'claimed') return 'owned';
  if (state === 'ready') return 'ready';
  return 'locked';
}

function buildFeaturedSeasonCommand(featuredTier) {
  if (!featuredTier) {
    return `
      <div class="season-board-command" data-feature-command="locked">
        <span class="reward-token board-feature-reward" data-reward-icon="season_progress" aria-hidden="true"></span>
        ${passiveCardStateMarkup('보상 없음', 'locked', '대기', 'featured-objective-passive')}
      </div>
    `;
  }
  const rewardLabel = rewardGrantLabel(featuredTier.tier.grant);
  return `
      <div class="season-board-command" data-feature-command="ready">
        <span class="reward-token board-feature-reward" data-reward-icon="${rewardIconForGrant(featuredTier.tier.grant, 'season')}" aria-hidden="true"></span>
        <button type="button" class="featured-objective-action" data-pass-claim="${featuredTier.index}" aria-label="${featuredTier.index + 1}단계 시즌 보상 ${rewardLabel} 수령">${CLAIM_ACTION_LABEL}</button>
      </div>
    `;
}

function buildSeasonTrackBoard(profile = {}, claimed = new Set()) {
  const xp = profile.xp ?? 0;
  const claimable = countClaimablePassTiers(profile);
  const rewardStatus = claimable > 0 ? CLAIM_ACTION_LABEL : '보상 없음';
  const rewardAriaState = claimable > 0 ? `보상 가능 ${claimable}개` : '대기 보상 없음';
  const tierStates = SHOP.pass.tiers.map((tier, index) => {
    const state = seasonState(xp, tier, index, claimed);
    return { tier, index, state };
  });
  const featuredTier = tierStates.find(({ state }) => state === 'ready');
  const currentTier = tierStates.find(({ state }) => state !== 'claimed');
  const currentIndex = currentTier?.index ?? -1;
  const boardState = featuredTier ? 'ready' : 'locked';
  const nodes = tierStates.map(({ tier, index, state }) => {
    const current = index === currentIndex;
    const currentAttrs = current ? ' data-season-current="true" aria-current="step"' : '';
    const currentLabel = current ? ' · 현재 목표' : '';
    return `
      <span class="season-track-node" data-season-state="${state}" data-pass-tier="${index}"${currentAttrs} aria-label="${index + 1}단계 ${Math.min(xp, tier.xp)}/${tier.xp}${currentLabel}">
        <span class="reward-token season-reward-token" data-reward-icon="${rewardIconForGrant(tier.grant, 'season')}" aria-hidden="true"></span>
      </span>
    `;
  }).join('');

  return `
    <section class="season-track-board" data-board-kind="season" data-board-layout="season-pass-road" aria-label="시즌 보드 · 시즌 경험치 ${xp} · ${rewardAriaState}" data-featured-tier="${featuredTier?.index ?? ''}" data-board-state="${boardState}">
      <div class="season-board-copy">
        <span>시즌 XP</span>
        <strong>${xp}</strong>
        <p>${rewardStatus}</p>
      </div>
      ${buildFeaturedSeasonCommand(featuredTier)}
      <div class="season-track-rail">${nodes}</div>
    </section>
  `;
}

export function nextLobbyAction(profile = {}) {
  if (countClaimableMissions(profile) > 0) {
    return { label: '미션 보상', status: CLAIM_ACTION_LABEL, title: '받을 미션 보상', detail: '완료 목표 수령', screen: 'missions', cta: CLAIM_ACTION_LABEL, ariaCta: '수령', beacon: 'mission' };
  }
  if (countClaimablePassTiers(profile) > 0) {
    return { label: '시즌 보상', status: CLAIM_ACTION_LABEL, title: '시즌 보상 도착', detail: '시즌 보상 수령', screen: 'season', cta: CLAIM_ACTION_LABEL, ariaCta: '수령', beacon: 'season' };
  }
  if (countTrainableUnits(profile) > 0) {
    return { label: '강화 가능', status: '강화', title: '유닛 강화 가능', detail: '전투 유닛 성장', screen: 'collection', cta: '강화', beacon: 'training' };
  }
  if (countAffordableCosmetics(profile) > 0) {
    return { label: '외형 해금', status: '해금', title: '외형 해금 가능', detail: '보석으로 외형 해금', screen: 'shop', cta: '해금', beacon: 'shop' };
  }
  const operation = nextLobbyOperation(profile);
  return { label: '다음 작전', status: '준비', title: operation.title, detail: operation.detail, screen: 'battle', cta: '출전', beacon: 'battle' };
}

export function nextLobbyOperation(profile = {}) {
  const completedRuns = Array.isArray(profile.processedRuns) ? profile.processedRuns.length : 0;
  const index = Math.min(completedRuns, LOBBY_OPERATION_SEQUENCE.length - 1);
  const operation = LOBBY_OPERATION_SEQUENCE[index];
  return {
    ...operation,
    launchAriaLabel: `${operation.title} ${operation.cta}`,
    step: index + 1,
    total: LOBBY_OPERATION_SEQUENCE.length
  };
}

function operationAfterSeed(seedName) {
  const index = LOBBY_OPERATION_SEQUENCE.findIndex((operation) => operation.seedName === seedName);
  if (index < 0) return null;
  return LOBBY_OPERATION_SEQUENCE[(index + 1) % LOBBY_OPERATION_SEQUENCE.length];
}

export function postRewardRoute(profile = {}, fallbackScreen = 'lobby') {
  const nextAction = nextLobbyAction(profile);
  if (!nextAction?.screen || nextAction.screen === 'battle') return fallbackScreen;
  return nextAction.screen;
}

function buildLobbyNextActionControl(nextAction) {
  const ariaAction = nextAction.ariaCta ?? nextAction.cta;
  return `<button type="button" class="lobby-next-action" data-lobby-open="${nextAction.screen}" aria-label="${nextAction.label} ${ariaAction}"><span class="lobby-next-action-label">${nextAction.cta}</span></button>`;
}

function buildLobbyNextActionStrip(nextAction) {
  if (nextAction.screen === 'battle') return '';
  return `
    <section
      class="lobby-intel-strip next-hook"
      aria-label="${nextAction.label}: ${nextAction.title}. ${nextAction.detail}"
      data-next-action="${nextAction.label}"
      data-next-beacon="${nextAction.beacon}">
      <img class="lobby-intel-frame" src="/src/client/assets/generated/reboot-lobby-intel-next.png?v=intel-strips-alpha1" alt="" aria-hidden="true">
      <span class="lobby-next-beacon" data-next-beacon="${nextAction.beacon}" aria-hidden="true"></span>
      <span class="lobby-next-state" aria-label="${nextAction.label}">${nextAction.status}</span>
      <strong class="lobby-next-title">${nextAction.title}</strong>
      <p>${nextAction.detail}</p>
      ${buildLobbyNextActionControl(nextAction)}
    </section>`;
}

function trainingAvailabilityCopy(profile = {}) {
  const trainable = countTrainableUnits(profile);
  return trainable > 0 ? `${trainable}기 강화 가능` : '강화 대기';
}

function unitFeatureState({ xp, cost }) {
  return xp >= cost ? 'ready' : 'locked';
}

function buildUnitFeatureAction(featuredUnit, featuredState) {
  if (featuredState === 'ready') {
    return `<button type="button" class="featured-unit-action" data-unit-upgrade="${featuredUnit.id}" aria-label="${featuredUnit.name} 강화">강화</button>`;
  }
  return passiveCardStateMarkup('경험치 부족', 'locked', '부족', 'featured-unit-passive');
}

function buildUnitFeaturedShowcase({ featuredUnit, profile, xp, unitLevels }) {
  const featuredLevel = unitLevels[featuredUnit.id] ?? 1;
  const featuredCost = unitUpgradeCost(featuredLevel);
  const featuredState = unitFeatureState({ xp, cost: featuredCost });
  const roleLabel = ROLE_LABELS[featuredUnit.role] ?? featuredUnit.role;
  const stateLabel = featuredState === 'ready' ? '강화 가능' : '경험치 부족';
  const previewExtra = '<span class="unit-feature-ring" aria-hidden="true"></span>';
  const action = `
      <div class="unit-feature-command">
        <span class="unit-cost unit-feature-cost" aria-label="강화 비용 ${featuredCost} 경험치">${featuredCost}</span>
        ${buildUnitFeatureAction(featuredUnit, featuredState)}
      </div>`;
  return buildMetaShowcase({
    kind: 'collection',
    label: '대표 유닛',
    title: featuredUnit.name,
    detail: `${roleLabel} · ${trainingAvailabilityCopy(profile)}`,
    stats: [`Lv.${featuredLevel}`, `${Math.min(xp, featuredCost)}/${featuredCost} 경험치`],
    spriteClass: 'unit-sprite',
    spriteAttr: 'data-sprite',
    spriteValue: featuredUnit.spriteKey,
    extraClass: 'unit-feature-showcase',
    attrs: ` data-featured-unit="${featuredUnit.id}" data-featured-state="${featuredState}" aria-label="대표 강화 ${featuredUnit.name} · ${roleLabel} · Lv.${featuredLevel} · 강화 비용 ${featuredCost} 경험치 · ${stateLabel}"`,
    previewExtra,
    previewClass: 'unit-feature-pedestal',
    action
  });
}

function operationProgressMarkup(operation) {
  return `
      <span class="operation-progress" aria-label="작전 진행 ${operation.step}/${operation.total}">
        ${Array.from({ length: operation.total }, (_, index) => {
          const step = index + 1;
          return `<span class="operation-progress-node" data-operation-node="${step === operation.step ? 'active' : 'idle'}" aria-hidden="true"></span>`;
        }).join('')}
      </span>`;
}

function operationIntelMarkup(operation) {
  const rewardIcon = operation.rewardIcon ?? 'unlock_capsule';
  const rewardLabel = operation.rewardLabel ?? '전리품 캡슐';
  const rewardShort = operation.rewardShort ?? '전리품';
  const threatSprite = operation.threatSprite ?? 'heavy_noise';
  const threatLabel = operation.threatLabel ?? '보스 위협';
  const threatShort = operation.threatShort ?? '위협';
  return `
      <div class="operation-intel-board" aria-label="작전 정보: 보상 ${rewardLabel}, 위협 ${threatLabel}, 진행 ${operation.step}/${operation.total}">
        <span class="operation-intel-chip" data-operation-intel="reward">
          <span class="operation-intel-icon reward-token" data-reward-icon="${rewardIcon}" aria-hidden="true"></span>
          <b>${rewardShort}</b>
        </span>
        <span class="operation-intel-chip" data-operation-intel="threat">
          <span class="operation-intel-icon operation-intel-enemy" data-enemy-sprite="${threatSprite}" aria-hidden="true"></span>
          <b>${threatShort}</b>
        </span>
        <span class="operation-intel-chip" data-operation-intel="progress">
          <span class="operation-intel-icon operation-intel-step" aria-hidden="true"></span>
          <b>${operation.step}/${operation.total}</b>
        </span>
      </div>`;
}

function lobbyToyPreviewMarkup() {
  return `
      <div class="lobby-toy-preview" aria-hidden="true">
        <span class="lobby-preview-unit" data-sprite="spark_pin" data-preview-slot="front"></span>
        <span class="lobby-preview-unit" data-sprite="slow_coil" data-preview-slot="control"></span>
        <span class="lobby-preview-unit" data-sprite="rescue_coil" data-preview-slot="rescue"></span>
        <span class="lobby-preview-enemy" data-enemy-sprite="quick_noise"></span>
        <span class="lobby-preview-enemy" data-enemy-sprite="heavy_noise"></span>
        <span class="lobby-preview-reward reward-token" data-reward-icon="unlock_capsule"></span>
      </div>`;
}

function lobbyProfileModel(profile = {}) {
  const xp = Number.isFinite(profile.xp) ? Math.max(0, Math.floor(profile.xp)) : 0;
  const completedRuns = Array.isArray(profile.processedRuns) ? profile.processedRuns.length : 0;
  const profileScore = xp + completedRuns * 60;
  const level = Math.min(99, Math.floor(profileScore / 100) + 1);
  const progress = level === 99 ? 100 : profileScore % 100;
  const medal = level >= 6 ? 'boss' : level >= 3 ? 'tactics' : 'rescue';
  return { level, progress, medal };
}

function buildLobbyProfilePlate(profile = {}) {
  const profileRank = lobbyProfileModel(profile);
  const profileAriaLabel = profileRank.level === 99
    ? `지휘관 랭크 Lv.${profileRank.level}, 최고 랭크 도달`
    : `지휘관 랭크 Lv.${profileRank.level}, 다음 랭크 ${profileRank.progress}/100`;
  return `
    <section class="lobby-profile-plate" aria-label="${profileAriaLabel}">
      <span class="lobby-profile-emblem" data-rank-medal="${profileRank.medal}" aria-hidden="true"></span>
      <span class="lobby-profile-label">지휘관</span>
      <strong>Lv.${profileRank.level}</strong>
      <span class="lobby-profile-progress" data-progress-kind="season" style="--profile-progress:${profileRank.progress}%" aria-hidden="true"></span>
    </section>`;
}

export function buildRebootLobby(model = {}) {
  const gems = model.gems ?? 0;
  const nextAction = nextLobbyAction(model);
  const operation = nextLobbyOperation(model);
  return `
    ${buildLobbyProfilePlate(model)}
    <section class="operation-card" data-operation-poster="${operation.poster}">
      <img class="operation-poster-frame" src="/src/client/assets/generated/reboot-lobby-operation-posters.png?v=operation-posters1" alt="" aria-hidden="true">
      ${lobbyToyPreviewMarkup()}
      ${operationProgressMarkup(operation)}
      ${operationIntelMarkup(operation)}
      <div class="operation-copy">
        <span>작전 ${operation.step}</span>
        <strong>${operation.title}</strong>
        <p>${operation.detail}</p>
      </div>
    </section>
    <section class="lobby-intel-strip reward-hook coop-hook" aria-label="동료 준비됨, 보유 보석 ${gems}, 외형 해금 전용 재화">
      <img class="lobby-intel-frame" src="/src/client/assets/generated/reboot-lobby-intel-gems.png?v=intel-strips-alpha1" alt="" aria-hidden="true">
      <span class="lobby-partner-capsule" aria-hidden="true"><span class="lobby-partner-avatar" data-sprite="rescue_coil"></span><strong class="lobby-partner-name">동료</strong><span class="lobby-partner-status">준비</span></span>
      <span class="lobby-currency-capsule" aria-hidden="true"><span class="lobby-currency-icon" data-reward-icon="soft_currency"></span><strong class="lobby-currency-value">${gems}</strong><span class="lobby-currency-label">보석</span></span>
    </section>
    ${buildLobbyNextActionStrip(nextAction)}
  `;
}

export function buildRebootCollection(profile = {}) {
  const xp = profile.xp ?? 0;
  const unitLevels = profile.unitLevels ?? {};
  const featuredUnit = Object.values(REBOOT_UNITS).find((unit) => xp >= unitUpgradeCost(unitLevels[unit.id] ?? 1)) ?? Object.values(REBOOT_UNITS)[0];
  const showcase = buildUnitFeaturedShowcase({ featuredUnit, profile, xp, unitLevels });
  const units = Object.values(REBOOT_UNITS).map((unit) => {
    const level = unitLevels[unit.id] ?? 1;
    const cost = unitUpgradeCost(level);
    const ready = xp >= cost;
    const roleLabel = ROLE_LABELS[unit.role] ?? unit.role;
    const unitStateLabel = ready ? '강화 가능' : '경험치 부족';
    const tileState = ready ? 'ready' : 'locked';
    const action = ready
      ? `<button type="button" data-unit-upgrade="${unit.id}" aria-label="${unit.name} 강화"><span class="unit-upgrade-label">강화</span></button>`
      : passiveCardState('경험치 부족', 'locked', '부족');
    return `
    <article class="screen-card unit-card" data-unit-card="${unit.id}" data-role="${unit.role}" data-tile-state="${tileState}" aria-label="${unit.name} · ${roleLabel} · Lv.${level} · 강화 비용 ${cost} 경험치 · ${unitStateLabel}">
      ${cardStateBadge(ready ? 'ready' : 'locked')}
      <span class="sprite-token unit-sprite" data-sprite="${unit.spriteKey}"></span>
      <div class="card-copy">
        <span class="role-pill">${roleLabel}</span>
        <strong>${unit.name}</strong>
        <p>등급 ${unit.grade} · <span class="unit-level">Lv.${level}</span></p>
        ${buildMetaProgress('training', Math.min(xp, cost), cost, `강화 경험치 ${Math.min(xp, cost)}/${cost}`)}
        <span class="unit-cost" aria-label="강화 비용 ${cost} 경험치">${cost}</span>
      </div>
      ${action}
    </article>
  `;
  }).join('');
  return `${showcase}<section class="meta-shelf-grid" data-shelf-kind="collection">${units}</section>`;
}

function shopFeatureState({ item, profile, unlocks, gems }) {
  const cosmetic = item.grant.cosmetic;
  const owned = unlocks.includes(cosmetic);
  const equipped = owned && profile.equippedCosmetic === cosmetic;
  const price = item.price?.gems ?? 0;
  if (equipped) return 'equipped';
  if (owned) return 'owned';
  if (gems < price) return 'locked';
  return 'ready';
}

function buildShopFeatureAction(featuredItem, featuredState) {
  if (featuredState === 'ready') {
    return `<button type="button" class="featured-shop-action" data-shop-buy="${featuredItem.id}" aria-label="${featuredItem.name} 해금">해금</button>`;
  }
  if (featuredState === 'owned') {
    return `<button type="button" class="featured-shop-action" data-shop-buy="${featuredItem.id}" aria-label="${featuredItem.name} 착용">착용</button>`;
  }
  if (featuredState === 'equipped') {
    return passiveCardStateMarkup('장착중', 'owned', '장착중', 'featured-shop-passive');
  }
  return passiveCardStateMarkup('보석 부족', 'locked', '부족', 'featured-shop-passive');
}

function buildShopFeaturedShowcase({ featuredItem, profile, unlocks, gems }) {
  const featuredState = shopFeatureState({ item: featuredItem, profile, unlocks, gems });
  const price = featuredItem.price?.gems ?? 0;
  const stateLabel = featuredState === 'equipped'
    ? '장착중'
    : featuredState === 'owned'
      ? '착용 가능'
      : featuredState === 'ready'
        ? '해금 가능'
        : '보석 부족';
  const previewExtra = `
        <span class="cosmetic-equip-aura shop-feature-aura" data-cosmetic-effect="${featuredItem.id}" aria-hidden="true"></span>
        <span class="reward-token shop-feature-currency" data-reward-icon="soft_currency" aria-hidden="true"></span>`;
  const action = `
      <div class="shop-feature-command">
        <span class="shop-price shop-feature-price" aria-label="해금 비용 ${price} 보석">${price}</span>
        ${buildShopFeatureAction(featuredItem, featuredState)}
      </div>`;
  return buildMetaShowcase({
    kind: 'shop',
    label: '추천 외형',
    title: featuredItem.name,
    detail: featuredItem.description,
    stats: [
      { text: SHOP_PURPOSE_BADGE, label: `${SHOP_PURPOSE_LABEL} · ${SHOP_NO_POWER_LABEL}` },
      { text: `보유 ${gems}`, label: `보유 ${gems} 보석` },
      { text: `가격 ${price}`, label: `가격 ${price} 보석` }
    ],
    spriteClass: 'shop-cosmetic',
    spriteAttr: 'data-shop-cosmetic',
    spriteValue: featuredItem.id,
    extraClass: 'shop-feature-showcase',
    attrs: ` data-featured-shop="${featuredItem.id}" data-featured-state="${featuredState}" data-shop-purpose="cosmetic-only" aria-label="추천 외형 ${featuredItem.name} · ${featuredItem.description} · ${SHOP_PURPOSE_LABEL} · ${SHOP_NO_POWER_LABEL} · 보유 ${gems} 보석 · 가격 ${price} 보석 · ${stateLabel}"`,
    previewExtra,
    previewClass: 'shop-feature-pedestal',
    action
  });
}

export function buildRebootShop(profile = {}) {
  const gems = profile.gems ?? 0;
  const unlocks = Array.isArray(profile.unlocks) ? profile.unlocks : [];
  const items = SHOP.items.filter((item) => item.category === 'cosmetic' && item.grant?.cosmetic);
  const featuredItem = items.find((item) => !unlocks.includes(item.grant.cosmetic) && gems >= (item.price?.gems ?? 0)) ?? items[0];
  const showcase = buildShopFeaturedShowcase({ featuredItem, profile, unlocks, gems });
  const shopItems = items.map((item) => {
    const cosmetic = item.grant.cosmetic;
    const owned = unlocks.includes(cosmetic);
    const equipped = owned && profile.equippedCosmetic === cosmetic;
    const price = item.price?.gems ?? 0;
    const locked = !owned && gems < price;
    const cardState = owned || equipped ? 'owned' : locked ? 'locked' : 'ready';
    const tileState = equipped ? 'equipped' : owned ? 'owned' : locked ? 'locked' : 'ready';
    const shopStateLabel = equipped ? '장착중' : owned ? '착용 가능' : locked ? '보석 부족' : '해금 가능';
    const action = equipped
      ? passiveCardState('장착중', 'owned')
      : owned
        ? `<button type="button" data-shop-buy="${item.id}" aria-label="${item.name} 착용">착용</button>`
        : locked
          ? passiveCardState('보석 부족', 'locked', '부족')
          : `<button type="button" data-shop-buy="${item.id}" aria-label="${item.name} 해금">해금</button>`;
    return `
    <article class="screen-card shop-card" data-item="${item.id}" data-shop-purpose="cosmetic-only" data-owned="${owned}" data-equipped="${equipped}" data-tile-state="${tileState}" aria-label="${item.name} · ${item.description} · ${SHOP_PURPOSE_LABEL} · ${SHOP_NO_POWER_LABEL} · 해금 비용 ${price} 보석 · ${shopStateLabel}">
      ${cardStateBadge(cardState)}
      <span class="cosmetic-equip-aura" data-cosmetic-effect="${item.id}" aria-hidden="true"></span>
      <span class="sprite-token shop-cosmetic" data-shop-cosmetic="${item.id}"></span>
      <div class="card-copy">
        <span class="role-pill" aria-label="${SHOP_PURPOSE_LABEL}">${SHOP_PURPOSE_BADGE}</span>
        <strong>${item.name}</strong>
        <p>${item.description}</p>
        <span class="shop-price" aria-label="해금 비용 ${price} 보석">${price}</span>
      </div>
      ${action}
    </article>
  `;
  }).join('');
  return `${showcase}<section class="meta-shelf-grid" data-shelf-kind="shop">${shopItems}</section>`;
}

export function buildMissionScreen(profile = {}) {
  const claimed = new Set(profile.claimedMissions ?? []);
  const board = buildMissionStampBoard(profile, claimed);
  const missions = REBOOT_MISSIONS.map((mission) => {
    const progress = missionProgress(profile, mission);
    const done = progress >= mission.target;
    const received = claimed.has(mission.id);
    const stampState = missionState(progress, mission.target, received);
    const cardState = missionCardState(stampState);
    const actionLabel = objectiveStateLabel(stampState);
    const rewardLabel = rewardGrantLabel(mission.reward);
    const action = received
      ? passiveCardState('받음', 'owned')
      : done
        ? `<button type="button" data-mission-claim="${mission.id}" aria-label="${mission.title} 보상 ${rewardLabel} 수령">${CLAIM_ACTION_LABEL}</button>`
        : passiveCardState('진행중', 'locked');
    return `
    <article class="screen-card mission-card" data-mission="${mission.id}" data-owned="${received}" data-objective-state="${stampState}" aria-label="${mission.title} · 미션 진행 ${progress}/${mission.target} · 보상 ${rewardLabel} · ${actionLabel}">
      ${cardStateBadge(cardState)}
      <span class="reward-token mission-reward-token" data-reward-icon="${rewardIconForGrant(mission.reward, 'mission')}"></span>
      <div class="card-copy">
        <span class="role-pill">미션</span>
        <strong>${mission.title}</strong>
        <p class="objective-detail">${mission.goal}</p>
        ${buildMetaProgress('mission', progress, mission.target, `미션 진행 ${progress}/${mission.target}`)}
        <span class="objective-cost shop-price">${rewardLabel}</span>
      </div>
      ${objectiveAction('mission', stampState, action)}
    </article>
  `;
  }).join('');
  return `${board}<section class="meta-progress-board" data-progress-board="missions" data-board-layout="mission-contracts">${missions}</section>`;
}

function seasonRewardLabel(grant = {}) {
  return rewardGrantLabel(grant);
}

function rewardIconForGrant(grant = {}, source = 'mission') {
  if (grant.cosmetic) return 'cosmetic_shard';
  if (grant.gems && source === 'season') return 'season_progress';
  if (grant.gems) return 'soft_currency';
  return 'unlock_capsule';
}

export function buildSeasonScreen(profile = {}) {
  const claimed = new Set(profile.claimedPassTiers ?? []);
  const xp = profile.xp ?? 0;
  const board = buildSeasonTrackBoard(profile, claimed);
  const tiers = SHOP.pass.tiers.map((tier, index) => {
    const done = xp >= tier.xp;
    const received = claimed.has(index);
    const progress = Math.min(tier.xp, xp);
    const stampState = seasonState(xp, tier, index, claimed);
    const cardState = seasonCardState(stampState);
    const actionLabel = objectiveStateLabel(stampState);
    const rewardLabel = seasonRewardLabel(tier.grant);
    const action = received
      ? passiveCardState('받음', 'owned')
      : done
        ? `<button type="button" data-pass-claim="${index}" aria-label="${index + 1}단계 시즌 보상 ${rewardLabel} 수령">${CLAIM_ACTION_LABEL}</button>`
        : passiveCardState('진행중', 'locked');
    return `
    <article class="screen-card season-card" data-pass-tier="${index}" data-owned="${received}" data-objective-state="${stampState}" aria-label="${index + 1}단계 · 시즌 경험치 ${progress}/${tier.xp} · 보상 ${rewardLabel} · ${actionLabel}">
      ${cardStateBadge(cardState)}
      <span class="reward-token season-reward-token" data-reward-icon="${rewardIconForGrant(tier.grant, 'season')}"></span>
      <div class="card-copy">
        <span class="role-pill">시즌</span>
        <strong>${index + 1}단계 · ${rewardGrantCompactLabel(tier.grant)}</strong>
        <p class="objective-detail">${progress}/${tier.xp} 경험치</p>
        ${buildMetaProgress('season', progress, tier.xp, `시즌 경험치 ${progress}/${tier.xp}`)}
        <span class="objective-cost shop-price">${tier.xp} 경험치</span>
      </div>
      ${objectiveAction('season', stampState, action)}
    </article>
  `;
  }).join('');
  return `${board}<section class="meta-progress-board" data-progress-board="season" data-board-layout="season-pass-tiers">${tiers}</section>`;
}

export function buildRebootResultModel({ result, rewards = [], profile, seedName } = {}) {
  const won = result?.status === 'won';
  const reason = result?.reason ?? 'partner_rescued';
  const highlights = resultHighlights(result, won);
  const nextAction = profile ? nextLobbyAction(profile) : null;
  const nextOperation = won ? operationAfterSeed(seedName) : null;
  const retryAction = { label: won ? '다시 방어' : '다시 도전', action: 'retry' };
  const homeAction = { label: '준비실', action: 'home' };
  const nextOperationAction = nextOperation
    ? {
        label: '다시 방어',
        action: 'retry',
        title: nextOperation.title,
        ariaLabel: `${nextOperation.title} 시작`
      }
    : null;
  const profileAction = (() => {
    if (!won || !nextAction || nextAction.screen === 'battle') return null;
    if (nextAction.screen === 'missions') {
      return {
        label: '미션 받기',
        action: 'claim-missions',
        screen: 'missions',
        title: nextAction.title,
        ariaLabel: `${nextAction.title} 수령`
      };
    }
    if (nextAction.screen === 'season') {
      return {
        label: '시즌 받기',
        action: 'claim-season',
        screen: 'season',
        title: nextAction.title,
        ariaLabel: `${nextAction.title} 수령`
      };
    }
    const resultLabels = {
      collection: '유닛 강화',
      shop: '외형 해금'
    };
    return {
      label: resultLabels[nextAction.screen] ?? nextAction.cta,
      action: nextAction.screen,
      screen: nextAction.screen,
      title: nextAction.title,
      ariaLabel: `${nextAction.title} 열기`
    };
  })();
  const primaryAction = profileAction ?? nextOperationAction ?? retryAction;
  const secondaryAction = profileAction ? (nextOperationAction ?? homeAction) : homeAction;
  return {
    status: won ? 'won' : 'lost',
    code: won ? '작전 성공' : '작전 실패',
    title: won ? '같이 버텼다' : '거의 버텼다',
    highlight: highlights[0],
    highlights,
    reason: { label: REASON_LABELS[reason] ?? '전투 완료', reason },
    nextGoal: {
      label: GOAL_LABELS[result?.nextGoal] ?? '핵심 타이밍 재도전',
      goal: result?.nextGoal ?? 'retry',
      tone: resultGoalTone(result?.nextGoal)
    },
    rewards,
    ...resultRewardPresentation(reason, won),
    primaryAction,
    secondaryAction,
    forbiddenActions: []
  };
}

export function startRebootRetry({ previousGame, action }) {
  if (action?.action !== 'retry') return previousGame;
  const botSeedIndex = REBOOT_RETRY_SEED_SEQUENCE.indexOf(previousGame.seedName);
  const shouldRotateSeed = previousGame.mode === 'bot'
    && previousGame.result?.status === 'won'
    && botSeedIndex >= 0;
  const nextSeedName = shouldRotateSeed
    ? REBOOT_RETRY_SEED_SEQUENCE[(botSeedIndex + 1) % REBOOT_RETRY_SEED_SEQUENCE.length]
    : previousGame.seedName;
  return createGame({
    mode: previousGame.mode,
    seedName: nextSeedName,
    seed: Number.isFinite(previousGame.seed) ? previousGame.seed + 1 : Date.now(),
    branch: shouldRotateSeed ? undefined : previousGame.branch,
    retryContext: previousGame.result
      ? {
          status: previousGame.result.status,
          reason: previousGame.result.reason,
          nextGoal: previousGame.result.nextGoal
        }
      : null
  });
}
