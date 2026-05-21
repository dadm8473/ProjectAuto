function resultRewardText(reward) {
  if (reward.type === 'soft') return `보석 +${reward.amount}`;
  if (reward.type === 'xp') return `경험치 +${reward.amount}`;
  return `보상 +${reward.amount}`;
}

function resultRewardKind(reward) { return reward.type === 'soft' ? 'soft' : reward.type === 'xp' ? 'xp' : 'generic'; }

export function formatResultRewards(rewards = []) {
  if (!rewards.length) return '보석 +0';
  return rewards.map(resultRewardText).join(' · ');
}

export function resultRewardMarkup(rewards = [], icon, label) {
  const rewardItems = rewards.length
    ? rewards.map((reward) => `<span class="result-reward-chip" data-reward-kind="${resultRewardKind(reward)}">${resultRewardText(reward)}</span>`).join('')
    : '<span class="result-reward-chip" data-reward-kind="soft">보석 +0</span>';
  return `<span class="result-reward-label" aria-hidden="true">${label}</span> <span class="result-reward-icon" data-reward-icon="${selectorValue(icon)}" aria-hidden="true"></span> <strong class="result-reward-value" aria-hidden="true">${rewardItems}</strong>`;
}

export function resultHighlightMarkup(model) {
  return model.highlights.map((highlight) => `<span><i class="result-medal" data-result-medal="${highlight.medal}" aria-hidden="true"></i><b>${highlight.label}</b></span>`).join('');
}

function selectorValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export function applyRebootResultView({ dom, model, rewardClaimActions = new Set() }) {
  const {
    resultOverlay,
    resultCode,
    resultTitle,
    resultReason,
    resultNextGoal,
    resultHighlights,
    resultReward,
    resultRetryLabel,
    resultRetryButton,
    resultLobbyLabel,
    resultLobbyButton
  } = dom;

  resultOverlay.dataset.resultStatus = model.status;
  resultOverlay.dataset.resultCta = rewardClaimActions.has(model.primaryAction.action) ? 'claim' : 'default';
  resultCode.textContent = model.code;
  resultTitle.textContent = model.title;
  resultReason.textContent = model.reason.label;
  resultNextGoal.textContent = model.nextGoal.label;
  resultNextGoal.dataset.resultGoalTone = model.nextGoal.tone;
  resultNextGoal.setAttribute('aria-label', `다음 목표 ${model.nextGoal.label}`);
  resultHighlights.innerHTML = resultHighlightMarkup(model);
  resultReward.setAttribute('aria-label', `획득 ${formatResultRewards(model.rewards)}`);
  resultReward.dataset.rewardTone = model.rewardTone;
  resultReward.innerHTML = resultRewardMarkup(model.rewards, model.rewardIcon, model.rewardLabel);
  resultRetryLabel.textContent = model.primaryAction.label;
  resultRetryButton.title = model.primaryAction.title ?? model.primaryAction.label;
  resultRetryButton.setAttribute('aria-label', model.primaryAction.ariaLabel ?? model.primaryAction.label);
  resultRetryButton.dataset.resultOpen = model.primaryAction.action;
  resultLobbyLabel.textContent = model.secondaryAction.label;
  resultLobbyButton.title = model.secondaryAction.title ?? model.secondaryAction.label;
  resultLobbyButton.setAttribute('aria-label', model.secondaryAction.ariaLabel ?? model.secondaryAction.label);
  resultLobbyButton.dataset.resultOpen = model.secondaryAction.action;
  resultOverlay.hidden = false;
}
