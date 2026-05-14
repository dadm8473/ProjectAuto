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

export function buildMetaNavAlerts(profile = {}) {
  return {
    collection: countTrainableUnits(profile) > 0,
    shop: countAffordableCosmetics(profile) > 0,
    missions: countClaimableMissions(profile) > 0,
    season: countClaimablePassTiers(profile) > 0
  };
}

function buildMetaSummary(kind, label, value, detail) {
  return `
    <article class="meta-summary screen-card" data-summary-kind="${kind}">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${detail}</p>
    </article>
  `;
}

export function nextLobbyAction(profile = {}) {
  if (countClaimableMissions(profile) > 0) {
    return { label: '미션 보상', title: '받을 미션 보상', detail: '완료 목표 수령', screen: 'missions', cta: '수령하기', beacon: 'mission' };
  }
  if (countClaimablePassTiers(profile) > 0) {
    return { label: '시즌 보상', title: '시즌 보상 도착', detail: '시즌 보상 열기', screen: 'season', cta: '열기', beacon: 'season' };
  }
  if (countTrainableUnits(profile) > 0) {
    return { label: '훈련 가능', title: '유닛 강화 가능', detail: '전투 유닛 성장', screen: 'collection', cta: '훈련하기', beacon: 'training' };
  }
  if (countAffordableCosmetics(profile) > 0) {
    return { label: '외형 해금', title: '외형 해금 가능', detail: '젬으로 외형 해금', screen: 'shop', cta: '상점가기', beacon: 'shop' };
  }
  return { label: '다음 작전', title: '첫 구원 작전', detail: '유닛/외형 성장', screen: 'battle', cta: '출전', beacon: 'battle' };
}

export function buildRebootLobby(model = {}) {
  const gems = model.gems ?? 0;
  const nextAction = nextLobbyAction(model);
  return `
    <section class="operation-card">
      <img class="operation-poster-frame" src="/src/client/assets/generated/reboot-lobby-operation-poster.png?v=operation-poster" alt="" aria-hidden="true">
      <div class="operation-copy">
        <span>협동 작전</span>
        <strong>첫 구원 작전</strong>
        <p>파트너 구원 · 보스 저지</p>
      </div>
    </section>
    <section class="lobby-intel-strip reward-hook">
      <img class="lobby-intel-frame" src="/src/client/assets/generated/reboot-lobby-intel-gems.png?v=intel-strips" alt="" aria-hidden="true">
      <span>보유 젬</span>
      <strong>${gems}</strong>
      <p>외형만 해금</p>
    </section>
    <section class="lobby-intel-strip next-hook" data-next-action="${nextAction.label}" data-next-beacon="${nextAction.beacon}">
      <img class="lobby-intel-frame" src="/src/client/assets/generated/reboot-lobby-intel-next.png?v=intel-strips" alt="" aria-hidden="true">
      <span class="lobby-next-beacon" data-next-beacon="${nextAction.beacon}" aria-hidden="true"></span>
      <span>${nextAction.label}</span>
      <strong>${nextAction.title}</strong>
      <p>${nextAction.detail}</p>
      <button type="button" data-lobby-open="${nextAction.screen}">${nextAction.cta}</button>
    </section>
  `;
}

export function buildRebootCollection(profile = {}) {
  const xp = profile.xp ?? 0;
  const unitLevels = profile.unitLevels ?? {};
  const summary = buildMetaSummary('collection', '훈련 가능', `${countTrainableUnits(profile)}명`, `${xp} 경험치 보유`);
  const units = Object.values(REBOOT_UNITS).map((unit) => {
    const level = unitLevels[unit.id] ?? 1;
    const cost = unitUpgradeCost(level);
    const ready = xp >= cost;
    return `
    <article class="screen-card unit-card" data-role="${unit.role}">
      ${cardStateBadge(ready ? 'ready' : 'locked')}
      <span class="sprite-token unit-sprite" data-sprite="${unit.spriteKey}"></span>
      <div class="card-copy">
        <span class="role-pill">${ROLE_LABELS[unit.role] ?? unit.role}</span>
        <strong>${unit.name}</strong>
        <p>등급 ${unit.grade} · <span class="unit-level">Lv.${level}</span></p>
        ${buildMetaProgress('training', Math.min(xp, cost), cost, `훈련 경험치 ${Math.min(xp, cost)}/${cost}`)}
        <span class="unit-cost">${cost} 경험치</span>
      </div>
      <button type="button" data-unit-upgrade="${unit.id}"${ready ? '' : ' disabled'}>${ready ? '훈련' : '경험치 부족'}</button>
    </article>
  `;
  }).join('');
  return `${summary}${units}`;
}

export function buildRebootShop(profile = {}) {
  const gems = profile.gems ?? 0;
  const unlocks = Array.isArray(profile.unlocks) ? profile.unlocks : [];
  const items = SHOP.items.filter((item) => item.category === 'cosmetic' && item.grant?.cosmetic);
  const summary = buildMetaSummary('shop', '해금 가능', `${countAffordableCosmetics(profile)}개`, `${gems} 젬 보유`);
  const shopItems = items.map((item) => {
    const cosmetic = item.grant.cosmetic;
    const owned = unlocks.includes(cosmetic);
    const equipped = owned && profile.equippedCosmetic === cosmetic;
    const price = item.price?.gems ?? 0;
    const locked = !owned && gems < price;
    const cardState = owned || equipped ? 'owned' : locked ? 'locked' : 'ready';
    const actionLabel = equipped ? '장착중' : owned ? '착용' : locked ? '젬 부족' : '해금';
    return `
    <article class="screen-card shop-card" data-item="${item.id}" data-owned="${owned}" data-equipped="${equipped}">
      ${cardStateBadge(cardState)}
      <span class="cosmetic-equip-aura" data-cosmetic-effect="${item.id}" aria-hidden="true"></span>
      <span class="sprite-token shop-cosmetic" data-shop-cosmetic="${item.id}"></span>
      <div class="card-copy">
        <span class="role-pill">외형</span>
        <strong>${item.name}</strong>
        <p>${item.description}</p>
        <span class="shop-price">${price} 젬</span>
      </div>
      <button type="button" data-shop-buy="${item.id}"${equipped || locked ? ' disabled' : ''}>${actionLabel}</button>
    </article>
  `;
  }).join('');
  return `${summary}${shopItems}`;
}

export function buildMissionScreen(profile = {}) {
  const claimed = new Set(profile.claimedMissions ?? []);
  const summary = buildMetaSummary('missions', '수령 가능', `${countClaimableMissions(profile)}개`, '완료 목표 보상 전환');
  const missions = REBOOT_MISSIONS.map((mission) => {
    const progress = missionProgress(profile, mission);
    const done = progress >= mission.target;
    const received = claimed.has(mission.id);
    const cardState = received ? 'owned' : done ? 'ready' : 'locked';
    const label = received ? '받음' : done ? '수령' : '진행중';
    return `
    <article class="screen-card mission-card" data-mission="${mission.id}" data-owned="${received}">
      ${cardStateBadge(cardState)}
      <span class="reward-token mission-reward-token" data-reward-icon="${rewardIconForGrant(mission.reward, 'mission')}"></span>
      <div class="card-copy">
        <span class="role-pill">미션</span>
        <strong>${mission.title}</strong>
        <p>${mission.goal}</p>
        ${buildMetaProgress('mission', progress, mission.target, `미션 진행 ${progress}/${mission.target}`)}
        <span class="shop-price">${mission.reward.gems} 젬</span>
      </div>
      <button type="button" data-mission-claim="${mission.id}"${done && !received ? '' : ' disabled'}>${label}</button>
    </article>
  `;
  }).join('');
  return `${summary}${missions}`;
}

function seasonRewardLabel(grant = {}) {
  if (grant.gems) return `${grant.gems} 젬`;
  if (grant.cosmetic) return '외형 보상';
  return '보상';
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
  const summary = buildMetaSummary('season', '시즌 경험치', `${xp} 경험치`, `${countClaimablePassTiers(profile)}개 보상 가능`);
  const tiers = SHOP.pass.tiers.map((tier, index) => {
    const done = xp >= tier.xp;
    const received = claimed.has(index);
    const label = received ? '받음' : done ? '수령' : '진행중';
    const progress = Math.min(tier.xp, xp);
    const cardState = received ? 'owned' : done ? 'ready' : 'locked';
    return `
    <article class="screen-card season-card" data-pass-tier="${index}" data-owned="${received}">
      ${cardStateBadge(cardState)}
      <span class="reward-token season-reward-token" data-reward-icon="${rewardIconForGrant(tier.grant, 'season')}"></span>
      <div class="card-copy">
        <span class="role-pill">시즌</span>
        <strong>${index + 1}단계 · ${seasonRewardLabel(tier.grant)}</strong>
        <p>${progress}/${tier.xp} 경험치</p>
        ${buildMetaProgress('season', progress, tier.xp, `시즌 경험치 ${progress}/${tier.xp}`)}
        <span class="shop-price">${tier.xp} 경험치</span>
      </div>
      <button type="button" data-pass-claim="${index}"${done && !received ? '' : ' disabled'}>${label}</button>
    </article>
  `;
  }).join('');
  return `${summary}${tiers}`;
}

export function buildRebootResultModel({ result, rewards = [], profile } = {}) {
  const won = result?.status === 'won';
  const reason = result?.reason ?? 'partner_rescued';
  const nextAction = profile ? nextLobbyAction(profile) : null;
  return {
    status: won ? 'won' : 'lost',
    title: won ? '승리' : '패배',
    highlight: { label: REASON_LABELS[reason] ?? '전투 완료', kind: won ? 'success' : 'danger', medal: resultMedalForReason(reason) },
    reason: { label: REASON_LABELS[reason] ?? '전투 완료', reason },
    nextGoal: { label: GOAL_LABELS[result?.nextGoal] ?? '핵심 타이밍 재도전', goal: result?.nextGoal ?? 'retry' },
    rewards,
    primaryAction: { label: '다시 도전', action: 'retry' },
    secondaryAction: nextAction && nextAction.screen !== 'battle'
      ? { label: nextAction.cta, action: nextAction.screen, title: nextAction.title }
      : { label: '홈', action: 'home' },
    forbiddenActions: []
  };
}

export function startRebootRetry({ previousGame, action }) {
  if (action?.action !== 'retry') return previousGame;
  return createGame({
    mode: previousGame.mode,
    seedName: previousGame.seedName,
    seed: previousGame.seed,
    branch: previousGame.branch
  });
}
