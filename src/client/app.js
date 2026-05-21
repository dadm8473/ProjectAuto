import { castLinkPulse, createGame, mergeRelays, serializeState, supplyRelay, tickGame } from '../shared/game.js?v=retry-context1';
import { SHOP } from '../shared/content.js';
import { createMetaProfile, normalizeMetaProfile } from '../shared/meta.js';
import { REBOOT_UNITS } from '../shared/reboot_content.js?v=unit-roster1';
import { buildRebootActionState, commandForRebootAction } from './reboot_actions.js?v=combat-meter2';
import { buildCombatActionExposure, buildCombatCoachCue, buildCombatCommandLabels, buildSummonCooldownState, isCriticalRebootAction } from './reboot_action_ui.js?v=hud-meter1';
import { createRebootAudio } from './reboot_audio.js?v=audio-safe1';
import { updateCombatHudMeters } from './reboot_hud.js?v=board-copy1';
import { createPlaytestRecorder } from './reboot_playtest.js?v=playtest2';
import { preloadCriticalRebootAssets } from './reboot_preload.js?v=mission-command-board1';
import { createRebootAssetImages, drawRebootBattle } from './reboot_render.js?v=unit-pedestal1';
import { applyRebootResultView } from './reboot_result_ui.js?v=result-ui2';
import {
  buildMetaNavAlerts,
  buildMissionScreen,
  buildRebootCollection,
  buildRebootLobby,
  buildRebootResultModel,
  buildRebootShop,
  buildSeasonScreen,
  missionProgress,
  nextLobbyOperation,
  postRewardRoute,
  REBOOT_MISSIONS,
  startRebootRetry,
  unitUpgradeCost
} from './reboot_screens.js?v=meta-clarity1';
import { createRebootOnlineClient } from './reboot_online.js';
const qs = (selector) => document.querySelector(selector);
const query = new URLSearchParams(location.search);
const muted = query.get('mute') === '1';
const qaFast = query.get('qaFast') === '1';
const playtestEnabled = query.get('playtest') === '1';
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: false };

const dom = {
  loadingGate: qs('#loadingGate'),
  canvas: qs('#gameCanvas'),
  launchOverlay: qs('#launchOverlay'),
  resultOverlay: qs('#resultOverlay'),
  splash: qs('#splashScreen'),
  lobby: qs('#lobbyScreen'),
  collection: qs('#collectionScreen'),
  shop: qs('#shopScreen'),
  missions: qs('#missionsScreen'),
  season: qs('#seasonScreen'),
  lobbyContent: qs('#lobbyContent'),
  collectionList: qs('#collectionList'),
  shopList: qs('#shopList'),
  missionsList: qs('#missionsList'),
  seasonList: qs('#seasonList'),
  toast: qs('#toast'),
  summonMeter: qs('#summonMeter'),
  rescueMeter: qs('#rescueMeter'),
  dangerMeter: qs('#dangerMeter'),
  statusLine: qs('.status-line'),
  timeMeter: qs('#timeMeter'),
  bossMeter: qs('#bossMeter'),
  soundToggle: qs('#soundToggle'),
  gameTitle: qs('#gameTitle'),
  netStatus: qs('#netStatus'),
  summonButton: qs('#summonButton'),
  mergeButton: qs('#mergeButton'),
  rescueButton: qs('#rescueButton'),
  launchBotButton: qs('#launchBotButton'),
  launchBotLabel: qs('#launchBotButton span'),
  resultCode: qs('#resultCode'),
  resultTitle: qs('#resultTitle'),
  resultReason: qs('#resultReason'),
  resultNextGoal: qs('#resultNextGoal'),
  resultHighlights: qs('#resultHighlights'),
  resultReward: qs('#resultReward'),
  resultRetryButton: qs('#resultRetryButton'),
  resultRetryLabel: qs('#resultRetryButton span'),
  resultLobbyButton: qs('#resultLobbyButton'),
  resultLobbyLabel: qs('#resultLobbyButton span'),
  primaryActions: qs('.primary-actions'),
  rewardReveal: qs('#rewardReveal'),
  rewardRevealSource: qs('#rewardRevealSource'),
  rewardRevealIcon: qs('#rewardRevealIcon'),
  rewardRevealTitle: qs('#rewardRevealTitle'),
  rewardRevealDetail: qs('#rewardRevealDetail'),
  matchmakingBanner: qs('#matchmakingBanner'),
  matchmakingBannerTitle: qs('#matchmakingBannerTitle'),
  matchmakingBannerDetail: qs('#matchmakingBannerDetail')
};

const ctx = dom.canvas.getContext('2d');
const rebootAssets = createRebootAssetImages();
const rebootAudio = createRebootAudio({ mutedByQuery: muted, reducedMotion: reduceMotion.matches });
const PROFILE_STORAGE_KEY = 'projectauto.reboot.profile.v1';
const TOAST_VISIBLE_MS = 1400;
const REWARD_REVEAL_MS = qaFast ? 6000 : 1500;
const SCREEN_TRANSITION_MS = 280;
const ONLINE_CONNECT_FALLBACK_MS = 2600;
const MATCH_BANNER_FLASH_MS = 1500;
const rewardClaimActions = new Set(['claim-missions', 'claim-season']);
const ACTION_LABELS = {
  summon: '소환',
  merge: '합성',
  rescue: '구원'
};
let appScreen = 'splash';
let game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
let localBoardId = 'p1';
let online = null;
let onlineFallbackTimer = null;
let lastTime = performance.now();
let resultShownFor = '';
let profile = loadProfile();
let pointerNavButton = null;
const playtestRecorder = createPlaytestRecorder({
  enabled: playtestEnabled,
  storage: globalThis.localStorage,
  now: () => performance.now()
});
if (playtestEnabled) globalThis.__rebootPlaytestSummary = () => playtestRecorder.summary();

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Install caching is optional; gameplay must continue if registration fails.
  });
}

function loadProfile() {
  const base = createMetaProfile();
  try {
    const raw = globalThis.localStorage?.getItem(PROFILE_STORAGE_KEY);
    return raw ? normalizeMetaProfile(JSON.parse(raw)) : base;
  } catch {
    return base;
  }
}

function saveProfile() {
  try {
    globalThis.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage can be blocked in private browser modes; keep the in-memory profile.
  }
}

function state() {
  return serializeState(game);
}

function showToast(text, kind = 'info') {
  dom.toast.textContent = text;
  dom.toast.dataset.toastKind = kind;
  dom.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    dom.toast.hidden = true;
    delete dom.toast.dataset.toastKind;
  }, TOAST_VISIBLE_MS);
}

function hideRewardReveal() {
  clearTimeout(showRewardReveal.timer);
  dom.rewardReveal.hidden = true;
  delete dom.rewardReveal.dataset.revealKind;
  delete dom.rewardReveal.dataset.revealSource;
}

function showRewardReveal(title, detail, icon = 'soft_currency', source = 'missions') {
  dom.rewardRevealTitle.textContent = title;
  dom.rewardRevealDetail.textContent = detail;
  dom.rewardReveal.dataset.revealKind = icon;
  dom.rewardReveal.dataset.revealSource = source;
  dom.rewardRevealSource.dataset.revealSource = source;
  dom.rewardRevealIcon.dataset.revealIcon = icon;
  dom.rewardReveal.setAttribute('aria-label', `${title} ${detail}`);
  dom.rewardReveal.hidden = false;
  clearTimeout(showRewardReveal.timer);
  showRewardReveal.timer = setTimeout(hideRewardReveal, REWARD_REVEAL_MS);
}

function hideLoadingGate() {
  if (!dom.loadingGate) return;
  dom.loadingGate.dataset.loadingState = 'ready';
  dom.loadingGate.hidden = true;
}

function hideMatchmakingBanner() {
  clearTimeout(showMatchmakingBanner.timer);
  showMatchmakingBanner.holdUntil = 0;
  dom.matchmakingBanner.hidden = true;
}

function isMatchmakingResetHoldActive() {
  return dom.matchmakingBanner.dataset.matchState === 'reset'
    && !dom.matchmakingBanner.hidden
    && (showMatchmakingBanner.holdUntil ?? 0) > performance.now();
}

function showMatchmakingBanner(kind, title, detail, options = {}) {
  clearTimeout(showMatchmakingBanner.timer);
  showMatchmakingBanner.holdUntil = kind === 'reset' ? performance.now() + MATCH_BANNER_FLASH_MS : 0;
  dom.matchmakingBanner.dataset.matchState = kind;
  dom.matchmakingBannerTitle.textContent = title;
  dom.matchmakingBannerDetail.textContent = detail;
  if (kind === 'waiting') {
    dom.matchmakingBanner.hidden = true;
    return;
  }
  dom.matchmakingBanner.hidden = false;
  if (options.persistent) return;
  showMatchmakingBanner.timer = setTimeout(() => {
    if (kind === 'reset' && game.mode === 'online' && waitingForOnlinePartner(game)) {
      showMatchmakingBanner('waiting', '파트너 대기', '온라인 매칭 중', { persistent: true });
      return;
    }
    hideMatchmakingBanner();
  }, MATCH_BANNER_FLASH_MS);
}

function clearOnlineFallback() {
  clearTimeout(onlineFallbackTimer);
  onlineFallbackTimer = null;
}

function fallbackToBotPartner(reason) {
  if (appScreen !== 'battle' || game.mode !== 'online' || game.result) return;
  clearOnlineFallback();
  const previousOnline = online;
  online = null;
  game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
  localBoardId = 'p1';
  resultShownFor = '';
  dom.netStatus.textContent = '동료 협동';
  hideMatchmakingBanner();
  previousOnline?.close();
  showToast('온라인 응답이 없어 봇 파트너로 전환합니다', 'warning');
}

function cancelOnlineMatch() {
  if (appScreen !== 'battle' || !waitingForOnlinePartner(game)) return;
  clearOnlineFallback();
  const previousOnline = online;
  online = null;
  previousOnline?.close();
  game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
  localBoardId = 'p1';
  resultShownFor = '';
  dom.netStatus.textContent = '동료 협동';
  hideMatchmakingBanner();
  renderHomeScreens();
  setScreen('lobby');
  showToast('매칭 취소', 'info');
}

function waitingForOnlinePartner(current) {
  return current.mode === 'online' && current.players?.some((player) => player.bot);
}

function scheduleOnlineFallback() {
  clearOnlineFallback();
  onlineFallbackTimer = setTimeout(() => fallbackToBotPartner('timeout'), ONLINE_CONNECT_FALLBACK_MS);
}

function playScreenTransition(screen) {
  clearTimeout(playScreenTransition.timer);
  playScreenTransition.flip = !playScreenTransition.flip;
  document.body.dataset.screenWipe = screen;
  document.body.dataset.screenWipePulse = playScreenTransition.flip ? 'a' : 'b';
  playScreenTransition.timer = setTimeout(() => {
    delete document.body.dataset.screenWipe;
    delete document.body.dataset.screenWipePulse;
  }, SCREEN_TRANSITION_MS);
}

function updateSoundToggle() {
  if (!dom.soundToggle) return;
  const enabled = rebootAudio.isEnabled();
  dom.soundToggle.dataset.audioEnabled = String(enabled);
  dom.soundToggle.disabled = muted;
  dom.soundToggle.setAttribute('aria-label', enabled ? '소리 끄기' : '소리 켜기');
  dom.soundToggle.title = muted ? '무음 모드' : enabled ? '소리 끄기' : '소리 켜기';
}

function setScreen(screen, options = {}) {
  const changed = appScreen !== screen;
  appScreen = screen;
  playtestRecorder.recordScreen(screen);
  document.body.dataset.appScreen = screen;
  if (screen !== 'battle') delete document.body.dataset.coachCue;
  if (screen !== 'battle') delete document.body.dataset.statusKind;
  if (screen !== 'battle') hideMatchmakingBanner();
  if (changed && !options.preserveRewardReveal) hideRewardReveal();
  dom.launchOverlay.dataset.screen = screen;
  for (const panel of [dom.splash, dom.lobby, dom.collection, dom.shop, dom.missions, dom.season]) {
    panel.hidden = panel.dataset.screenPanel !== screen;
  }
  dom.launchOverlay.hidden = screen === 'battle' || screen === 'result';
  updateNavState();
  if (changed) playScreenTransition(screen);
}

function updateNavAlerts() {
  const alerts = buildMetaNavAlerts(profile);
  document.querySelectorAll('.bottom-dock [data-open-screen]').forEach((button) => {
    const screen = button.dataset.openScreen;
    if (alerts[screen]) button.dataset.navAlert = screen;
    else delete button.dataset.navAlert;
  });
}

function updateNavState() {
  document.querySelectorAll('.bottom-dock [data-open-screen]').forEach((button) => {
    const active = button.dataset.openScreen === appScreen;
    if (active) {
      button.dataset.navActive = 'true';
      button.setAttribute('aria-current', 'page');
    } else {
      delete button.dataset.navActive;
      button.removeAttribute('aria-current');
    }
  });
}

function renderHomeScreens() {
  dom.lobbyContent.innerHTML = buildRebootLobby(profile);
  const launchOperation = nextLobbyOperation(profile);
  dom.launchBotLabel.textContent = launchOperation.cta;
  dom.launchBotButton.setAttribute('aria-label', launchOperation.launchAriaLabel);
  dom.collectionList.innerHTML = buildRebootCollection(profile);
  dom.shopList.innerHTML = buildRebootShop(profile);
  dom.missionsList.innerHTML = buildMissionScreen(profile);
  dom.seasonList.innerHTML = buildSeasonScreen(profile);
  updateNavAlerts();
  updateNavState();
}

function resultRewards(current) {
  if (!current.result) return [];
  const won = current.result.status === 'won';
  return [
    { type: 'soft', amount: won ? 24 : 8 },
    { type: 'xp', amount: won ? 60 : 20 }
  ];
}

function settleResultRewards(current) {
  const rewards = resultRewards(current);
  if (!current.result || profile.processedRuns.includes(current.runId)) return rewards;
  const gemReward = rewards.reduce((sum, reward) => sum + (reward.type === 'soft' ? reward.amount : 0), 0);
  const xpReward = rewards.reduce((sum, reward) => sum + (reward.type === 'xp' ? reward.amount : 0), 0);
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems + gemReward,
    xp: profile.xp + xpReward,
    processedRuns: [...profile.processedRuns, current.runId]
  });
  saveProfile();
  renderHomeScreens();
  return rewards;
}

function selectorValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function flashMetaClaim(container, selector, kind) {
  const target = container.querySelector(selector)?.closest('.screen-card');
  if (!target) return;
  target.dataset.claimFlash = kind;
  clearTimeout(target.claimFlashTimer);
  target.claimFlashTimer = setTimeout(() => {
    delete target.dataset.claimFlash;
  }, 900);
}

function handleShopPurchase(event) {
  const button = event.target.closest('[data-shop-buy]');
  if (!button) return;
  const item = SHOP.items.find((entry) => entry.id === button.dataset.shopBuy && entry.category === 'cosmetic' && entry.grant?.cosmetic);
  if (!item) return;
  const cosmetic = item.grant.cosmetic;
  if (profile.unlocks.includes(cosmetic)) {
    if (profile.equippedCosmetic === cosmetic) {
      showToast('이미 장착 중입니다');
      return;
    }
    profile = normalizeMetaProfile({
      ...profile,
      equippedCosmetic: cosmetic
    });
    saveProfile();
    renderHomeScreens();
    flashMetaClaim(dom.shopList, `[data-item="${selectorValue(item.id)}"]`, 'shop');
    showRewardReveal('외형 장착', item.name, 'cosmetic_shard', 'shop');
    showToast(`${item.name} 장착`, 'reward');
    return;
  }
  const price = item.price?.gems ?? 0;
  if (profile.gems < price) {
    showToast('보석이 부족합니다');
    return;
  }
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems - price,
    unlocks: [...profile.unlocks, cosmetic],
    equippedCosmetic: cosmetic
  });
  saveProfile();
  renderHomeScreens();
  flashMetaClaim(dom.shopList, `[data-item="${selectorValue(item.id)}"]`, 'shop');
  showRewardReveal('외형 해금', item.name, 'unlock_capsule', 'shop');
  showToast(`${item.name} 해금`, 'reward');
}

function handleLobbyOpen(event) {
  const button = event.target.closest('[data-lobby-open]');
  if (!button) return;
  const screen = button.dataset.lobbyOpen;
  if (screen === 'battle') {
    startBotRun();
    return;
  }
  setScreen(screen);
}

function handleUnitUpgrade(event) {
  const button = event.target.closest('[data-unit-upgrade]');
  if (!button) return;
  const unit = REBOOT_UNITS[button.dataset.unitUpgrade];
  if (!unit) return;
  const currentLevel = profile.unitLevels?.[unit.id] ?? 1;
  const cost = unitUpgradeCost(currentLevel);
  if (profile.xp < cost) {
    showToast('경험치가 부족합니다');
    return;
  }
  profile = normalizeMetaProfile({
    ...profile,
    xp: profile.xp - cost,
    unitLevels: {
      ...profile.unitLevels,
      [unit.id]: currentLevel + 1
    }
  });
  saveProfile();
  renderHomeScreens();
  flashMetaClaim(dom.collectionList, `[data-unit-card="${selectorValue(unit.id)}"]`, 'training');
  showRewardReveal('강화 완료', `${unit.name} Lv.${currentLevel + 1}`, 'season_progress', 'collection');
  showToast(`${unit.name} Lv.${currentLevel + 1}`, 'reward');
}

function applyGrantToProfile(grant = {}) {
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems + (grant.gems ?? 0),
    unlocks: grant.cosmetic && !profile.unlocks.includes(grant.cosmetic)
      ? [...profile.unlocks, grant.cosmetic]
      : profile.unlocks
  });
}

function grantBundle(grants = []) {
  const unlocks = new Set(profile.unlocks ?? []);
  const gems = grants.reduce((total, grant) => total + (grant.gems ?? 0), 0);
  for (const grant of grants) {
    if (grant.cosmetic) unlocks.add(grant.cosmetic);
  }
  return { gems, unlocks: [...unlocks] };
}

function rewardDetailFromParts(gems = 0, hasCosmetic = false) {
  const parts = [];
  if (gems > 0) parts.push(`보석 +${gems}`);
  if (hasCosmetic) parts.push('외형 해금');
  return parts.join(' · ') || '보상 획득';
}

function rewardGrantDetail(grant = {}) { return rewardDetailFromParts(grant.gems ?? 0, Boolean(grant.cosmetic)); }

function rewardBundleDetail(grants = []) {
  const gems = grants.reduce((total, grant) => total + (grant.gems ?? 0), 0);
  const hasCosmetic = grants.some((grant) => Boolean(grant.cosmetic));
  return rewardDetailFromParts(gems, hasCosmetic);
}

function claimReadyMissionsFromResult() {
  const claimed = new Set(profile.claimedMissions ?? []);
  const ready = REBOOT_MISSIONS.filter((mission) => !claimed.has(mission.id) && missionProgress(profile, mission) >= mission.target);
  if (ready.length === 0) return false;
  const grants = ready.map((mission) => mission.reward);
  const bundle = grantBundle(grants);
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems + bundle.gems,
    unlocks: bundle.unlocks,
    claimedMissions: [...profile.claimedMissions, ...ready.map((mission) => mission.id)]
  });
  saveProfile();
  renderHomeScreens();
  flashMetaClaim(dom.missionsList, `[data-mission="${selectorValue(ready[0].id)}"]`, 'mission');
  showRewardReveal('미션 보상', rewardBundleDetail(grants), 'soft_currency', 'missions');
  return true;
}

function claimReadySeasonFromResult() {
  const claimed = new Set(profile.claimedPassTiers ?? []);
  const ready = SHOP.pass.tiers
    .map((tier, index) => ({ tier, index }))
    .filter(({ tier, index }) => profile.xp >= tier.xp && !claimed.has(index));
  if (ready.length === 0) return false;
  const grants = ready.map(({ tier }) => tier.grant);
  const bundle = grantBundle(grants);
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems + bundle.gems,
    unlocks: bundle.unlocks,
    claimedPassTiers: [...profile.claimedPassTiers, ...ready.map(({ index }) => index)]
  });
  saveProfile();
  renderHomeScreens();
  flashMetaClaim(dom.seasonList, `.season-card[data-pass-tier="${ready[0].index}"]`, 'season');
  const hasCosmetic = ready.some(({ tier }) => tier.grant.cosmetic);
  showRewardReveal('시즌 보상', rewardBundleDetail(grants), hasCosmetic ? 'cosmetic_shard' : 'season_progress', 'season');
  return true;
}

function handleMissionClaim(event) {
  const button = event.target.closest('[data-mission-claim]');
  if (!button) return;
  const mission = REBOOT_MISSIONS.find((entry) => entry.id === button.dataset.missionClaim);
  if (!mission || profile.claimedMissions.includes(mission.id) || missionProgress(profile, mission) < mission.target) return;
  applyGrantToProfile(mission.reward);
  profile = normalizeMetaProfile({
    ...profile,
    claimedMissions: [...profile.claimedMissions, mission.id]
  });
  saveProfile();
  renderHomeScreens();
  flashMetaClaim(dom.missionsList, `[data-mission="${selectorValue(mission.id)}"]`, 'mission');
  showRewardReveal('미션 보상', rewardGrantDetail(mission.reward), 'soft_currency', 'missions');
  showToast(`${mission.title} 보상`, 'reward');
}

function handlePassClaim(event) {
  const button = event.target.closest('[data-pass-claim]');
  if (!button) return;
  const index = Number(button.dataset.passClaim);
  const tier = SHOP.pass.tiers[index];
  if (!tier || profile.claimedPassTiers.includes(index) || profile.xp < tier.xp) return;
  applyGrantToProfile(tier.grant);
  profile = normalizeMetaProfile({
    ...profile,
    claimedPassTiers: [...profile.claimedPassTiers, index]
  });
  saveProfile();
  renderHomeScreens();
  flashMetaClaim(dom.seasonList, `.season-card[data-pass-tier="${index}"]`, 'season');
  showRewardReveal('시즌 보상', rewardGrantDetail(tier.grant), tier.grant.cosmetic ? 'cosmetic_shard' : 'season_progress', 'season');
  showToast(`${index + 1}단계 보상`, 'reward');
}

function startBotRun() {
  clearOnlineFallback();
  const previousOnline = online;
  online = null;
  const operation = nextLobbyOperation(profile);
  game = createGame({ mode: 'bot', seedName: operation.seedName, seed: 1 });
  localBoardId = 'p1';
  resultShownFor = '';
  dom.netStatus.textContent = '동료 협동';
  hideMatchmakingBanner();
  previousOnline?.close();
  setScreen('battle');
}

function startOnlineRun() {
  clearOnlineFallback();
  const previousOnline = online;
  online = null;
  previousOnline?.close();
  game = createGame({ mode: 'online', seedName: 'tutorial_success', seed: 2 });
  localBoardId = 'p1';
  resultShownFor = '';
  dom.netStatus.textContent = '온라인 연결 중';
  let nextOnline = null;
  nextOnline = createRebootOnlineClient({
    name: '플레이어',
    profile,
    onState(nextState, meta) {
      if (online !== nextOnline) return;
      clearOnlineFallback();
      const previousRunId = game.runId;
      const previousOnlineWaiting = waitingForOnlinePartner(game);
      const previousOnlineReady = game.mode === 'online' && !previousOnlineWaiting;
      const nextOnlineWaiting = waitingForOnlinePartner(nextState);
      const partnerDisconnected = previousOnlineReady && nextOnlineWaiting && previousRunId !== nextState.runId;
      game = nextState;
      localBoardId = meta.boardPlayer ?? 'p1';
      const partner = nextState.players?.find((player) => player.id !== meta.playerId);
      dom.netStatus.textContent = partner?.bot ? '온라인 대기' : '온라인 협동';
      if (partnerDisconnected) {
        showMatchmakingBanner('reset', '파트너 이탈', '새 파트너를 찾는 중');
      } else if (nextOnlineWaiting) {
        if (!isMatchmakingResetHoldActive()) {
          showMatchmakingBanner('waiting', '파트너 대기', '온라인 매칭 중', { persistent: true });
        }
      } else if (previousOnlineWaiting) {
        showMatchmakingBanner('ready', '협동 시작', '파트너가 입장했습니다');
      } else if (dom.matchmakingBanner.dataset.matchState !== 'ready') {
        hideMatchmakingBanner();
      }
    },
    onStatus(status) {
      if (online !== nextOnline) return;
      if (status.state === 'open') dom.netStatus.textContent = '온라인 입장';
      if (status.state === 'closed' && appScreen === 'battle' && game.mode === 'online' && !game.result) {
        fallbackToBotPartner('closed');
      }
    },
    onError(reason) {
      if (online !== nextOnline) return;
      if (reason === '연결 오류' || reason === '온라인 메시지 오류') {
        fallbackToBotPartner(reason);
        return;
      }
      if (reason !== '온라인 연결 대기 중') showToast(reason, 'warning');
    }
  });
  online = nextOnline;
  scheduleOnlineFallback();
  setScreen('battle');
  nextOnline.connect();
}

function executeLocal(action) {
  if (action.type === 'summon') return supplyRelay(game, { playerId: localBoardId });
  if (action.type === 'merge') return mergeRelays(game, { playerId: localBoardId });
  if (action.type === 'rescue') return castLinkPulse(game, { playerId: localBoardId });
  return { ok: false, reason: '알 수 없는 행동' };
}

function command(actionName) {
  if (appScreen !== 'battle') return;
  const action = commandForRebootAction(actionName);
  if (game.mode === 'online' && waitingForOnlinePartner(game)) {
    cancelOnlineMatch();
    return;
  }
  if (game.mode === 'online') {
    if (!online?.send(action)) {
      showToast('온라인 연결 대기 중', 'warning');
    }
    return;
  }
  const result = executeLocal(action);
  playtestRecorder.recordAction(actionName, { ok: result.ok, reason: result.reason, atSeconds: state().now });
  if (!result.ok) {
    showToast(result.reason);
    return;
  }
}

function updateButtons(current) {
  const actions = buildRebootActionState(current, localBoardId);
  const exposure = buildCombatActionExposure({ current, localBoardId, actions });
  const onlineWaiting = waitingForOnlinePartner(current);
  const commandLabels = buildCombatCommandLabels({ current, localBoardId, actions, onlineWaiting });
  if (onlineWaiting && appScreen === 'battle') document.body.dataset.onlineWaiting = 'true';
  else delete document.body.dataset.onlineWaiting;
  const coachCue = appScreen === 'battle' && !onlineWaiting
    ? buildCombatCoachCue({ current, localBoardId, actions })
    : '';
  if (coachCue) document.body.dataset.coachCue = coachCue;
  else delete document.body.dataset.coachCue;
  dom.primaryActions.dataset.focus = exposure.focus;
  dom.primaryActions.dataset.openCount = String(exposure.openCount);
  if (onlineWaiting) {
    dom.primaryActions.dataset.focus = 'summon';
    dom.primaryActions.dataset.openCount = '1';
    for (const [key, button] of [
      ['summon', dom.summonButton],
      ['merge', dom.mergeButton],
      ['rescue', dom.rescueButton]
    ]) {
      const cancel = key === 'summon';
      button.disabled = !cancel;
      button.querySelector('span').textContent = cancel ? '취소' : ACTION_LABELS[key];
      button.setAttribute('aria-label', cancel ? '매칭 취소' : ACTION_LABELS[key]);
      button.dataset.ready = String(cancel);
      button.dataset.unlocked = String(cancel);
      button.dataset.focus = String(cancel);
      button.dataset.critical = 'false';
      button.dataset.cooldown = 'false';
      button.dataset.cooldownPhase = 'ready';
      button.style.setProperty('--cooldown-progress', '100%');
      if (cancel) button.dataset.matchCancel = 'true';
      else delete button.dataset.matchCancel;
      button.title = cancel ? '매칭을 취소하고 준비실로 돌아가기' : '파트너 입장 대기 중';
    }
    return;
  }
  for (const [key, button] of [
    ['summon', dom.summonButton],
    ['merge', dom.mergeButton],
    ['rescue', dom.rescueButton]
  ]) {
    const enabled = actions[key].enabled && !onlineWaiting;
    const cooldownState = key === 'summon' ? buildSummonCooldownState({ current, localBoardId, enabled }) : { active: false, progress: 1, phase: 'ready' };
    const label = commandLabels[key];
    const ariaLabel = label === ACTION_LABELS[key]
      ? ACTION_LABELS[key]
      : label.startsWith(ACTION_LABELS[key])
        ? `${label} 후 가능`
        : `${ACTION_LABELS[key]} ${label} 후 가능`;
    button.disabled = !enabled;
    button.querySelector('span').textContent = label;
    button.setAttribute('aria-label', ariaLabel);
    button.dataset.ready = String(enabled);
    button.dataset.unlocked = String(exposure[key]);
    button.dataset.focus = String(exposure.focus === key);
    button.dataset.critical = String(isCriticalRebootAction({ actionKey: key, current, localBoardId, enabled }));
    button.dataset.cooldown = String(cooldownState.active);
    button.dataset.cooldownPhase = cooldownState.phase;
    button.style.setProperty('--cooldown-progress', `${Math.round(cooldownState.progress * 100)}%`);
    delete button.dataset.matchCancel;
    button.title = onlineWaiting ? '파트너 입장 대기 중' : actions[key].reason;
  }
}

function showResult(current) {
  if (!current.result || resultShownFor === current.runId) return;
  resultShownFor = current.runId;
  const rewards = settleResultRewards(current);
  const model = buildRebootResultModel({ result: current.result, rewards, profile, seedName: current.seedName });
  playtestRecorder.recordResult({
    status: current.result.status,
    reason: model.reason.label,
    nextGoal: model.nextGoal.label,
    atSeconds: current.now
  });
  applyRebootResultView({ dom, model, rewardClaimActions });
  setScreen('result');
}

function retry() {
  game = startRebootRetry({ previousGame: game, action: { action: 'retry' } });
  resultShownFor = '';
  dom.resultOverlay.hidden = true;
  setScreen('battle');
}

function handleResultAction(target) {
  if (target === 'retry') {
    retry();
    return;
  }
  dom.resultOverlay.hidden = true;
  if (target === 'claim-missions') {
    if (!claimReadyMissionsFromResult()) showToast('수령할 미션 보상이 없습니다', 'warning');
    setScreen(postRewardRoute(profile, 'missions'), { preserveRewardReveal: true });
    return;
  }
  if (target === 'claim-season') {
    if (!claimReadySeasonFromResult()) showToast('수령할 시즌 보상이 없습니다', 'warning');
    setScreen(postRewardRoute(profile, 'season'), { preserveRewardReveal: true });
    return;
  }
  setScreen(target === 'home' ? 'lobby' : target);
}

function handleResultPrimary() {
  handleResultAction(dom.resultRetryButton.dataset.resultOpen || 'retry');
}

function handleResultSecondary() {
  handleResultAction(dom.resultLobbyButton.dataset.resultOpen || 'home');
}

function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (appScreen === 'battle' && !game.result && game.mode !== 'online') tickGame(game, dt);
  const current = state();
  const onlineWaiting = waitingForOnlinePartner(current);
  rebootAudio.consume(current, { localBoardId, appScreen });
  playtestRecorder.recordCombatSnapshot(current);
  drawRebootBattle(ctx, current, { width: dom.canvas.width, height: dom.canvas.height }, rebootAssets, {
    equippedCosmetic: profile.equippedCosmetic,
    reducedMotion: reduceMotion.matches,
    localBoardId,
    onlineWaiting,
    matchmakingBannerVisible: appScreen === 'battle' && !dom.matchmakingBanner.hidden
  });
  updateCombatHudMeters({ dom, current, localBoardId, appScreen, onlineWaiting });
  updateButtons(current);
  showResult(current);
  requestAnimationFrame(loop);
}

function bind() {
  dom.soundToggle.addEventListener('click', () => {
    if (rebootAudio.setEnabled(!rebootAudio.isEnabled())) rebootAudio.unlock();
    updateSoundToggle();
  });
  document.addEventListener('pointerdown', () => {
    rebootAudio.unlock();
  }, { passive: true });
  qs('#splashStartButton').addEventListener('click', () => setScreen('lobby'));
  qs('#launchBotButton').addEventListener('click', startBotRun);
  qs('#launchOnlineButton').addEventListener('click', startOnlineRun);
  dom.summonButton.addEventListener('click', () => command('summon'));
  dom.mergeButton.addEventListener('click', () => command('merge'));
  dom.rescueButton.addEventListener('click', () => command('rescue'));
  dom.lobbyContent.addEventListener('click', handleLobbyOpen);
  dom.collectionList.addEventListener('click', handleUnitUpgrade);
  dom.shopList.addEventListener('click', handleShopPurchase);
  dom.missionsList.addEventListener('click', handleMissionClaim);
  dom.seasonList.addEventListener('click', handlePassClaim);
  dom.resultRetryButton.addEventListener('click', handleResultPrimary);
  dom.resultLobbyButton.addEventListener('click', handleResultSecondary);
  dom.rewardReveal.addEventListener('click', hideRewardReveal);
  document.querySelectorAll('[data-open-screen]').forEach((button) => {
    button.addEventListener('pointerdown', () => {
      pointerNavButton = button;
    }, { passive: true });
    button.addEventListener('click', () => {
      setScreen(button.dataset.openScreen);
      if (pointerNavButton === button) {
        button.blur();
        pointerNavButton = null;
      }
    });
  });
}

renderHomeScreens();
bind();
updateSoundToggle();
setScreen('splash');
registerServiceWorker();
preloadCriticalRebootAssets().then(hideLoadingGate, hideLoadingGate);
requestAnimationFrame(loop);
