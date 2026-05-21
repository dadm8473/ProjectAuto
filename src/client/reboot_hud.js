import { REBOOT_RULES } from '../shared/reboot_content.js?v=unit-roster1';
import { buildCombatStatusDisplay, buildCombatStatusPrompt, partnerDangerAriaLabel, partnerDangerMeterLabel } from './reboot_action_ui.js?v=hud-meter1';
import { operationForSeedName } from './reboot_screens.js?v=board-copy1';

function setMeterValue(meter, value, label, state = 'idle', visibleLabel = '') {
  const labelNode = meter?.querySelector('.meter-label');
  const valueNode = meter?.querySelector('.meter-value');
  if (visibleLabel && labelNode) labelNode.textContent = visibleLabel;
  if (valueNode) valueNode.textContent = value;
  else if (meter) meter.textContent = value;
  meter?.setAttribute('aria-label', label);
  if (meter) meter.dataset.meterState = state;
}

export function updateCombatHudMeters({ dom, current, localBoardId, appScreen, onlineWaiting, body = document.body }) {
  dom.gameTitle.textContent = operationForSeedName(current.seedName).hudTitle;
  const resources = current.resources?.[localBoardId] ?? current.resources.p1;
  const partner = localBoardId === 'p1' ? 'p2' : 'p1';
  const partnerDanger = Math.round(current.boards[partner]?.danger ?? 0);
  setMeterValue(
    dom.summonMeter,
    `${resources.summon}`,
    `전력 ${resources.summon}`,
    (resources.summon ?? 0) >= REBOOT_RULES.summon.cost ? 'ready' : 'charging'
  );
  setMeterValue(
    dom.rescueMeter,
    `${Math.round(resources.rescue)}%`,
    `구원 충전 ${Math.round(resources.rescue)}%`,
    (resources.rescue ?? 0) >= 100 ? 'ready' : partnerDanger >= 70 ? 'warning' : 'charging'
  );
  setMeterValue(
    dom.dangerMeter,
    `${partnerDanger}`,
    partnerDangerAriaLabel(current, partner, partnerDanger),
    partnerDanger >= 70 ? 'danger' : partnerDanger >= 40 ? 'warning' : 'safe',
    partnerDangerMeterLabel(current, partner)
  );
  const statusPrompt = buildCombatStatusPrompt({ current, localBoardId, onlineWaiting });
  const statusDisplay = buildCombatStatusDisplay({ statusPrompt, bossWarning: current.now >= 92 && current.now < 120 });
  dom.timeMeter.hidden = !statusDisplay.showPrompt;
  dom.timeMeter.textContent = statusPrompt;
  if (appScreen === 'battle') body.dataset.statusKind = statusPrompt.startsWith('충전 ') ? 'cooldown' : 'active';
  else delete body.dataset.statusKind;
  dom.statusLine.hidden = !statusDisplay.visible;
  dom.bossMeter.hidden = !statusDisplay.showBossWarning;
  dom.bossMeter.textContent = statusDisplay.showBossWarning ? '보스 경고' : '';
}
