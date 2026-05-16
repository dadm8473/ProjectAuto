import { createGame } from '../shared/game.js';
import { SHOP } from '../shared/content.js';
import { REBOOT_UNITS } from '../shared/reboot_content.js';

const REASON_LABELS = {
  partner_rescued: '파트너 구원 성공',
  boss_final_hit: '보스 막타 성공',
  boss_slowed: '보스 둔화 성공',
  greed: '합성 욕심 실패',
  rescue_missed: '구원 타이밍 실패',
  boss_leaked: '보스 돌파',
  merge_gap: '합성 지연',
  bad_luck: '약한 조합 방치'
};

const GOAL_LABELS = {
  time_next_rescue: '위험 80 전 구원',
  repeat_boss_timing: '보스 경고 후 선택',
  protect_control_unit: '느림 코일 생존',
  rescue_before_merge_greed: '위험 높으면 구원',
  save_rescue_for_partner_danger: '구원 게이지 보존',
  answer_boss_warning: '보스 실루엣 대응',
  merge_before_boss: '보스 전 합성',
  turn_bad_rolls_into_utility: '약한 유닛 활용'
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
  if (['boss_final_hit', 'boss_slowed', 'boss_leaked'].includes(reason)) return 'boss';
  return 'tactics';
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
    title: '유닛 훈련',
    goal: '유닛 1회 훈련',
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
    detail: '파트너 구원 · 보스 저지',
    cta: '첫 구원 작전 시작',
    poster: 'first'
  },
  {
    seedName: 'lucky_clutch',
    title: '보스 막타 작전',
    detail: '막판 소환 · 결정타',
    cta: '보스 막타 작전 시작',
    poster: 'boss'
  },
  {
    seedName: 'bad_recoverable',
    title: '역전 구원 작전',
    detail: '나쁜 운 회복 · 구원',
    cta: '역전 구원 작전 시작',
    poster: 'recovery'
  },
  {
    seedName: 'boss_clutch',
    title: '보스 대응 작전',
    detail: '소환/합성 선택',
    cta: '보스 대응 작전 시작',
    poster: 'response'
  }
];

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

function cardStateBadge(state) {
  return CARD_STATE_BADGES[state] ?? CARD_STATE_BADGES.locked;
}

function passiveCardState(label, state = 'locked', displayLabel = label) {
  return `<span class="card-passive-state" data-passive-state="${state}" aria-label="${label}">${displayLabel}</span>`;
}

function rewardGrantLabel(grant = {}) {
  if (grant.gems) return `${grant.gems} 젬`;
  if (grant.cosmetic) return '외형';
  return '보상';
}

function rewardGrantCompactLabel(grant = {}) {
  if (grant.gems) return `${grant.gems}젬`;
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

function buildMetaShowcase({ kind, label, title, detail, chip, stats, spriteClass, spriteAttr, spriteValue }) {
  const statBadges = (stats ?? (chip ? [chip] : [])).map((stat) => `<span class="meta-showcase-chip">${stat}</span>`).join('');
  return `
    <section class="meta-showcase" data-showcase-kind="${kind}" data-summary-kind="${kind}">
      <div class="meta-showcase-preview">
        <span class="sprite-token ${spriteClass}" ${spriteAttr}="${spriteValue}" aria-hidden="true"></span>
      </div>
      <div class="meta-showcase-copy">
        <span>${label}</span>
        <strong>${title}</strong>
        <p>${detail}</p>
      </div>
      <div class="meta-showcase-stats" aria-label="${kind} 상태">${statBadges}</div>
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

function buildMissionStampBoard(profile = {}, claimed = new Set()) {
  const claimable = countClaimableMissions(profile);
  const stamps = REBOOT_MISSIONS.map((mission) => {
    const progress = missionProgress(profile, mission);
    const state = missionState(progress, mission.target, claimed.has(mission.id));
    return `
      <span class="mission-stamp-slot" data-mission-state="${state}" data-mission-id="${mission.id}" aria-label="${mission.title} ${progress}/${mission.target}">
        <span class="reward-token mission-reward-token" data-reward-icon="${rewardIconForGrant(mission.reward, 'mission')}" aria-hidden="true"></span>
      </span>
    `;
  }).join('');

  return `
    <section class="mission-stamp-board" data-board-kind="missions" aria-label="미션 보드 · 수령 가능 ${claimable}개 · 완료 목표 보상 전환">
      <div class="mission-board-copy">
        <span>보상 대기</span>
        <strong>${claimable}</strong>
        <p>수령 가능</p>
      </div>
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

function buildSeasonTrackBoard(profile = {}, claimed = new Set()) {
  const xp = profile.xp ?? 0;
  const claimable = countClaimablePassTiers(profile);
  const nodes = SHOP.pass.tiers.map((tier, index) => {
    const state = seasonState(xp, tier, index, claimed);
    return `
      <span class="season-track-node" data-season-state="${state}" data-pass-tier="${index}" aria-label="${index + 1}단계 ${Math.min(xp, tier.xp)}/${tier.xp}">
        <span class="reward-token season-reward-token" data-reward-icon="${rewardIconForGrant(tier.grant, 'season')}" aria-hidden="true"></span>
      </span>
    `;
  }).join('');

  return `
    <section class="season-track-board" data-board-kind="season" aria-label="시즌 보드 · 시즌 경험치 ${xp} · 보상 가능 ${claimable}개">
      <div class="season-board-copy">
        <span>시즌 점수</span>
        <strong>${xp}</strong>
        <p>보상 ${claimable}개</p>
      </div>
      <div class="season-track-rail">${nodes}</div>
    </section>
  `;
}

export function nextLobbyAction(profile = {}) {
  if (countClaimableMissions(profile) > 0) {
    return { label: '미션 보상', status: '수령', title: '받을 미션 보상', detail: '완료 목표 수령', screen: 'missions', cta: '수령', beacon: 'mission' };
  }
  if (countClaimablePassTiers(profile) > 0) {
    return { label: '시즌 보상', status: '보상', title: '시즌 보상 도착', detail: '시즌 보상 열기', screen: 'season', cta: '열기', beacon: 'season' };
  }
  if (countTrainableUnits(profile) > 0) {
    return { label: '훈련 가능', status: '훈련', title: '유닛 강화 가능', detail: '전투 유닛 성장', screen: 'collection', cta: '훈련', beacon: 'training' };
  }
  if (countAffordableCosmetics(profile) > 0) {
    return { label: '외형 해금', status: '해금', title: '외형 해금 가능', detail: '젬으로 외형 해금', screen: 'shop', cta: '해금', beacon: 'shop' };
  }
  const operation = nextLobbyOperation(profile);
  return { label: '다음 작전', status: '준비', title: operation.title, detail: operation.detail, screen: 'battle', cta: '출전', beacon: 'battle' };
}

export function nextLobbyOperation(profile = {}) {
  const completedRuns = Array.isArray(profile.processedRuns) ? profile.processedRuns.length : 0;
  return LOBBY_OPERATION_SEQUENCE[Math.min(completedRuns, LOBBY_OPERATION_SEQUENCE.length - 1)];
}

export function postRewardRoute(profile = {}, fallbackScreen = 'lobby') {
  const nextAction = nextLobbyAction(profile);
  if (!nextAction?.screen || nextAction.screen === 'battle') return fallbackScreen;
  return nextAction.screen;
}

function buildLobbyNextActionControl(nextAction) {
  if (nextAction.screen === 'battle') {
    return '<span class="lobby-battle-cue" aria-hidden="true"></span>';
  }
  return `<button type="button" data-lobby-open="${nextAction.screen}" aria-label="${nextAction.label} ${nextAction.cta}">${nextAction.cta}</button>`;
}

export function buildRebootLobby(model = {}) {
  const gems = model.gems ?? 0;
  const nextAction = nextLobbyAction(model);
  const operation = nextLobbyOperation(model);
  return `
    <section class="operation-card" data-operation-poster="${operation.poster}">
      <img class="operation-poster-frame" src="/src/client/assets/generated/reboot-lobby-operation-posters.png?v=operation-posters1" alt="" aria-hidden="true">
      <div class="operation-copy">
        <span>협동 작전</span>
        <strong>${operation.title}</strong>
        <p>${operation.detail}</p>
      </div>
    </section>
    <section class="lobby-intel-strip reward-hook" aria-label="보유 젬 ${gems}, 외형 해금 전용 재화">
      <img class="lobby-intel-frame" src="/src/client/assets/generated/reboot-lobby-intel-gems.png?v=intel-strips-alpha1" alt="" aria-hidden="true">
      <span class="lobby-currency-icon" data-reward-icon="soft_currency" aria-hidden="true"></span>
      <strong class="lobby-currency-value">${gems}</strong>
      <span class="lobby-currency-label">젬</span>
    </section>
    <section class="lobby-intel-strip next-hook" aria-label="${nextAction.label}: ${nextAction.title}. ${nextAction.detail}" data-next-action="${nextAction.label}" data-next-beacon="${nextAction.beacon}">
      <img class="lobby-intel-frame" src="/src/client/assets/generated/reboot-lobby-intel-next.png?v=intel-strips-alpha1" alt="" aria-hidden="true">
      <span class="lobby-next-beacon" data-next-beacon="${nextAction.beacon}" aria-hidden="true"></span>
      <span class="lobby-next-state" aria-label="${nextAction.label}">${nextAction.status}</span>
      <strong>${nextAction.title}</strong>
      <p>${nextAction.detail}</p>
      ${buildLobbyNextActionControl(nextAction)}
    </section>
  `;
}

export function buildRebootCollection(profile = {}) {
  const xp = profile.xp ?? 0;
  const unitLevels = profile.unitLevels ?? {};
  const featuredUnit = Object.values(REBOOT_UNITS).find((unit) => xp >= unitUpgradeCost(unitLevels[unit.id] ?? 1)) ?? Object.values(REBOOT_UNITS)[0];
  const featuredLevel = unitLevels[featuredUnit.id] ?? 1;
  const featuredCost = unitUpgradeCost(featuredLevel);
  const showcase = buildMetaShowcase({
    kind: 'collection',
    label: '대표 유닛',
    title: featuredUnit.name,
    detail: `${ROLE_LABELS[featuredUnit.role] ?? featuredUnit.role} · ${countTrainableUnits(profile)}명 훈련 가능`,
    stats: [`Lv.${featuredLevel}`, `${Math.min(xp, featuredCost)}/${featuredCost} 경험치`],
    spriteClass: 'unit-sprite',
    spriteAttr: 'data-sprite',
    spriteValue: featuredUnit.spriteKey
  });
  const units = Object.values(REBOOT_UNITS).map((unit) => {
    const level = unitLevels[unit.id] ?? 1;
    const cost = unitUpgradeCost(level);
    const ready = xp >= cost;
    const roleLabel = ROLE_LABELS[unit.role] ?? unit.role;
    const unitStateLabel = ready ? '훈련 가능' : '경험치 부족';
    const tileState = ready ? 'ready' : 'locked';
    const action = ready
      ? `<button type="button" data-unit-upgrade="${unit.id}" aria-label="${unit.name} 훈련">훈련</button>`
      : passiveCardState('경험치 부족', 'locked', '부족');
    return `
    <article class="screen-card unit-card" data-unit-card="${unit.id}" data-role="${unit.role}" data-tile-state="${tileState}" aria-label="${unit.name} · ${roleLabel} · Lv.${level} · 훈련 비용 ${cost} 경험치 · ${unitStateLabel}">
      ${cardStateBadge(ready ? 'ready' : 'locked')}
      <span class="sprite-token unit-sprite" data-sprite="${unit.spriteKey}"></span>
      <div class="card-copy">
        <span class="role-pill">${roleLabel}</span>
        <strong>${unit.name}</strong>
        <p>등급 ${unit.grade} · <span class="unit-level">Lv.${level}</span></p>
        ${buildMetaProgress('training', Math.min(xp, cost), cost, `훈련 경험치 ${Math.min(xp, cost)}/${cost}`)}
        <span class="unit-cost" aria-label="훈련 비용 ${cost} 경험치">${cost}</span>
      </div>
      ${action}
    </article>
  `;
  }).join('');
  return `${showcase}<section class="meta-shelf-grid" data-shelf-kind="collection">${units}</section>`;
}

export function buildRebootShop(profile = {}) {
  const gems = profile.gems ?? 0;
  const unlocks = Array.isArray(profile.unlocks) ? profile.unlocks : [];
  const items = SHOP.items.filter((item) => item.category === 'cosmetic' && item.grant?.cosmetic);
  const featuredItem = items.find((item) => !unlocks.includes(item.grant.cosmetic) && gems >= (item.price?.gems ?? 0)) ?? items[0];
  const showcase = buildMetaShowcase({
    kind: 'shop',
    label: '추천 외형',
    title: featuredItem.name,
    detail: featuredItem.description,
    stats: [`보유 ${gems} 젬`, `가격 ${featuredItem.price?.gems ?? 0} 젬`],
    spriteClass: 'shop-cosmetic',
    spriteAttr: 'data-shop-cosmetic',
    spriteValue: featuredItem.id
  });
  const shopItems = items.map((item) => {
    const cosmetic = item.grant.cosmetic;
    const owned = unlocks.includes(cosmetic);
    const equipped = owned && profile.equippedCosmetic === cosmetic;
    const price = item.price?.gems ?? 0;
    const locked = !owned && gems < price;
    const cardState = owned || equipped ? 'owned' : locked ? 'locked' : 'ready';
    const tileState = equipped ? 'equipped' : owned ? 'owned' : locked ? 'locked' : 'ready';
    const shopStateLabel = equipped ? '장착중' : owned ? '착용 가능' : locked ? '젬 부족' : '해금 가능';
    const action = equipped
      ? passiveCardState('장착중', 'owned')
      : owned
        ? `<button type="button" data-shop-buy="${item.id}" aria-label="${item.name} 착용">착용</button>`
        : locked
          ? passiveCardState('젬 부족', 'locked', '부족')
          : `<button type="button" data-shop-buy="${item.id}" aria-label="${item.name} 해금">해금</button>`;
    return `
    <article class="screen-card shop-card" data-item="${item.id}" data-owned="${owned}" data-equipped="${equipped}" data-tile-state="${tileState}" aria-label="${item.name} · ${item.description} · 해금 비용 ${price} 젬 · ${shopStateLabel}">
      ${cardStateBadge(cardState)}
      <span class="cosmetic-equip-aura" data-cosmetic-effect="${item.id}" aria-hidden="true"></span>
      <span class="sprite-token shop-cosmetic" data-shop-cosmetic="${item.id}"></span>
      <div class="card-copy">
        <span class="role-pill">외형</span>
        <strong>${item.name}</strong>
        <p>${item.description}</p>
        <span class="shop-price" aria-label="해금 비용 ${price} 젬">${price}</span>
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
        ? `<button type="button" data-mission-claim="${mission.id}">수령</button>`
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
  return `${board}<section class="meta-progress-board" data-progress-board="missions">${missions}</section>`;
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
        ? `<button type="button" data-pass-claim="${index}">수령</button>`
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
  return `${board}<section class="meta-progress-board" data-progress-board="season">${tiers}</section>`;
}

export function buildRebootResultModel({ result, rewards = [], profile } = {}) {
  const won = result?.status === 'won';
  const reason = result?.reason ?? 'partner_rescued';
  const nextAction = profile ? nextLobbyAction(profile) : null;
  const secondaryAction = (() => {
    if (!nextAction || nextAction.screen === 'battle') return { label: '홈', action: 'home' };
    if (nextAction.screen === 'missions') return { label: '수령하기', action: 'claim-missions', screen: 'missions', title: nextAction.title };
    if (nextAction.screen === 'season') return { label: '수령하기', action: 'claim-season', screen: 'season', title: nextAction.title };
    return { label: nextAction.cta, action: nextAction.screen, screen: nextAction.screen, title: nextAction.title };
  })();
  return {
    status: won ? 'won' : 'lost',
    code: won ? '작전 성공' : '작전 실패',
    title: won ? '승리' : '패배',
    highlight: { label: REASON_LABELS[reason] ?? '전투 완료', kind: won ? 'success' : 'danger', medal: resultMedalForReason(reason) },
    reason: { label: REASON_LABELS[reason] ?? '전투 완료', reason },
    nextGoal: { label: GOAL_LABELS[result?.nextGoal] ?? '핵심 타이밍 재도전', goal: result?.nextGoal ?? 'retry' },
    rewards,
    primaryAction: { label: '다시 도전', action: 'retry' },
    secondaryAction,
    forbiddenActions: []
  };
}

export function startRebootRetry({ previousGame, action }) {
  if (action?.action !== 'retry') return previousGame;
  const botSeedIndex = REBOOT_RETRY_SEED_SEQUENCE.indexOf(previousGame.seedName);
  const shouldRotateSeed = previousGame.mode === 'bot' && botSeedIndex >= 0;
  const nextSeedName = shouldRotateSeed
    ? REBOOT_RETRY_SEED_SEQUENCE[(botSeedIndex + 1) % REBOOT_RETRY_SEED_SEQUENCE.length]
    : previousGame.seedName;
  return createGame({
    mode: previousGame.mode,
    seedName: nextSeedName,
    seed: Number.isFinite(previousGame.seed) ? previousGame.seed + 1 : Date.now(),
    branch: shouldRotateSeed ? undefined : previousGame.branch
  });
}
