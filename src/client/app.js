import { castLinkPulse, createGame, mergeRelays, serializeState, supplyRelay, tickGame } from '../shared/game.js';
import { SHOP } from '../shared/content.js';
import { createMetaProfile, normalizeMetaProfile } from '../shared/meta.js';
import { buildRebootActionState, commandForRebootAction } from './reboot_actions.js';
import { createRebootAssetImages, drawRebootBattle } from './reboot_render.js';
import {
  buildMissionScreen,
  buildRebootCollection,
  buildRebootLobby,
  buildRebootResultModel,
  buildRebootShop,
  buildSeasonScreen,
  startRebootRetry
} from './reboot_screens.js';
import { createRebootOnlineClient } from './reboot_online.js';

const qs = (selector) => document.querySelector(selector);
const muted = new URLSearchParams(location.search).get('mute') === '1';

const dom = {
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
  timeMeter: qs('#timeMeter'),
  bossMeter: qs('#bossMeter'),
  netStatus: qs('#netStatus'),
  summonButton: qs('#summonButton'),
  mergeButton: qs('#mergeButton'),
  rescueButton: qs('#rescueButton'),
  resultTitle: qs('#resultTitle'),
  resultReason: qs('#resultReason'),
  resultNextGoal: qs('#resultNextGoal'),
  resultHighlights: qs('#resultHighlights'),
  resultReward: qs('#resultReward')
};

const ctx = dom.canvas.getContext('2d');
const rebootAssets = createRebootAssetImages();
const PROFILE_STORAGE_KEY = 'projectauto.reboot.profile.v1';
let appScreen = 'splash';
let game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
let localBoardId = 'p1';
let online = null;
let lastTime = performance.now();
let resultShownFor = '';
let profile = loadProfile();

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

function showToast(text) {
  dom.toast.textContent = text;
  dom.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    dom.toast.hidden = true;
  }, 900);
}

function softFeedback(kind) {
  if (muted) return;
  navigator.vibrate?.(kind === 'rescue' ? [18, 24, 18] : [8]);
}

function setScreen(screen) {
  appScreen = screen;
  document.body.dataset.appScreen = screen;
  dom.launchOverlay.dataset.screen = screen;
  for (const panel of [dom.splash, dom.lobby, dom.collection, dom.shop, dom.missions, dom.season]) {
    panel.hidden = panel.dataset.screenPanel !== screen;
  }
  dom.launchOverlay.hidden = screen === 'battle' || screen === 'result';
}

function renderHomeScreens() {
  dom.lobbyContent.innerHTML = buildRebootLobby(profile);
  dom.collectionList.innerHTML = buildRebootCollection();
  dom.shopList.innerHTML = buildRebootShop(profile);
  dom.missionsList.innerHTML = buildMissionScreen();
  dom.seasonList.innerHTML = buildSeasonScreen();
}

function resultRewards(current) {
  if (!current.result) return [];
  return [{ type: 'soft', amount: current.result.status === 'won' ? 24 : 8 }];
}

function settleResultRewards(current) {
  const rewards = resultRewards(current);
  if (!current.result || profile.processedRuns.includes(current.runId)) return rewards;
  const gemReward = rewards.reduce((sum, reward) => sum + (reward.type === 'soft' ? reward.amount : 0), 0);
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems + gemReward,
    xp: profile.xp + (current.result.status === 'won' ? 60 : 20),
    processedRuns: [...profile.processedRuns, current.runId]
  });
  saveProfile();
  renderHomeScreens();
  return rewards;
}

function handleShopPurchase(event) {
  const button = event.target.closest('[data-shop-buy]');
  if (!button) return;
  const item = SHOP.items.find((entry) => entry.id === button.dataset.shopBuy && entry.category === 'cosmetic' && entry.grant?.cosmetic);
  if (!item) return;
  const cosmetic = item.grant.cosmetic;
  if (profile.unlocks.includes(cosmetic)) {
    showToast('이미 보유 중입니다');
    return;
  }
  const price = item.price?.gems ?? 0;
  if (profile.gems < price) {
    showToast('젬이 부족합니다');
    return;
  }
  profile = normalizeMetaProfile({
    ...profile,
    gems: profile.gems - price,
    unlocks: [...profile.unlocks, cosmetic]
  });
  saveProfile();
  renderHomeScreens();
  showToast(`${item.name} 해금`);
}

function startBotRun() {
  game = createGame({ mode: 'bot', seedName: 'tutorial_success', seed: 1 });
  localBoardId = 'p1';
  resultShownFor = '';
  dom.netStatus.textContent = '봇 협동';
  setScreen('battle');
}

function startOnlineRun() {
  game = createGame({ mode: 'online', seedName: 'tutorial_success', seed: 2 });
  localBoardId = 'p1';
  resultShownFor = '';
  dom.netStatus.textContent = '온라인 연결 중';
  online?.close();
  online = createRebootOnlineClient({
    onState(nextState, meta) {
      game = nextState;
      localBoardId = meta.boardPlayer ?? 'p1';
      dom.netStatus.textContent = '온라인 협동';
    },
    onError(reason) {
      showToast(reason);
    }
  });
  online.connect();
  setScreen('battle');
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
  if (game.mode === 'online') {
    online?.send(action);
    return;
  }
  const result = executeLocal(action);
  if (!result.ok) {
    showToast(result.reason);
    return;
  }
  softFeedback(actionName);
  showToast({ summon: '소환 완료', merge: '합성 완료', rescue: '구원 성공' }[actionName]);
}

function updateMeters(current) {
  const resources = current.resources?.[localBoardId] ?? current.resources.p1;
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  dom.summonMeter.textContent = `소환 ${resources.summon}`;
  dom.rescueMeter.textContent = `구원 ${Math.round(resources.rescue)}%`;
  dom.dangerMeter.textContent = `위험 ${Math.round(current.boards[partner]?.danger ?? 0)}`;
  dom.timeMeter.textContent = `${Math.floor(current.now)}초`;
  dom.bossMeter.textContent = current.now >= 92 && current.now < 120 ? '보스 경고' : '보스 대기';
}

function updateButtons(current) {
  const actions = buildRebootActionState(current, localBoardId);
  for (const [key, button] of [
    ['summon', dom.summonButton],
    ['merge', dom.mergeButton],
    ['rescue', dom.rescueButton]
  ]) {
    button.disabled = !actions[key].enabled;
    button.dataset.ready = String(actions[key].enabled);
    button.title = actions[key].reason;
  }
}

function showResult(current) {
  if (!current.result || resultShownFor === current.runId) return;
  resultShownFor = current.runId;
  const rewards = settleResultRewards(current);
  const model = buildRebootResultModel({ result: current.result, rewards });
  dom.resultOverlay.dataset.resultStatus = model.status;
  dom.resultTitle.textContent = model.title;
  dom.resultReason.textContent = model.reason.label;
  dom.resultNextGoal.textContent = model.nextGoal.label;
  dom.resultHighlights.innerHTML = `<span>${model.highlight.label}</span>`;
  dom.resultReward.textContent = model.rewards.map((reward) => `보상 ${reward.amount}`).join(' · ');
  dom.resultOverlay.hidden = false;
  setScreen('result');
}

function retry() {
  game = startRebootRetry({ previousGame: game, action: { action: 'retry' } });
  resultShownFor = '';
  dom.resultOverlay.hidden = true;
  setScreen('battle');
}

function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (appScreen === 'battle' && !game.result && game.mode !== 'online') tickGame(game, dt);
  const current = state();
  drawRebootBattle(ctx, current, { width: dom.canvas.width, height: dom.canvas.height }, rebootAssets);
  updateMeters(current);
  updateButtons(current);
  showResult(current);
  requestAnimationFrame(loop);
}

function bind() {
  qs('#splashStartButton').addEventListener('click', () => setScreen('lobby'));
  qs('#launchBotButton').addEventListener('click', startBotRun);
  qs('#launchOnlineButton').addEventListener('click', startOnlineRun);
  dom.summonButton.addEventListener('click', () => command('summon'));
  dom.mergeButton.addEventListener('click', () => command('merge'));
  dom.rescueButton.addEventListener('click', () => command('rescue'));
  dom.shopList.addEventListener('click', handleShopPurchase);
  qs('#resultRetryButton').addEventListener('click', retry);
  qs('#resultLobbyButton').addEventListener('click', () => {
    dom.resultOverlay.hidden = true;
    setScreen('lobby');
  });
  document.querySelectorAll('[data-open-screen]').forEach((button) => {
    button.addEventListener('click', () => setScreen(button.dataset.openScreen));
  });
}

renderHomeScreens();
bind();
setScreen('splash');
requestAnimationFrame(loop);
