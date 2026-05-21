import test from 'node:test';
import assert from 'node:assert/strict';

import { applyRebootResultView, formatResultRewards } from '../src/client/reboot_result_ui.js';

function fakeNode() {
  return {
    textContent: '',
    innerHTML: '',
    hidden: true,
    title: '',
    dataset: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function fakeDom() {
  return {
    resultOverlay: fakeNode(),
    resultCode: fakeNode(),
    resultTitle: fakeNode(),
    resultReason: fakeNode(),
    resultNextGoal: fakeNode(),
    resultHighlights: fakeNode(),
    resultReward: fakeNode(),
    resultRetryLabel: fakeNode(),
    resultRetryButton: fakeNode(),
    resultLobbyLabel: fakeNode(),
    resultLobbyButton: fakeNode()
  };
}

test('result view module applies tactical goal, reward, and action state without app bootstrap logic', () => {
  const dom = fakeDom();
  const model = {
    status: 'won',
    code: '작전 성공',
    title: '같이 버텼다',
    reason: { label: '파트너 구원 성공' },
    nextGoal: { label: '위험 80 직전 구원', tone: 'rescue' },
    highlights: [{ label: '결정적 구원', medal: 'rescue' }],
    rewards: [{ type: 'soft', amount: 20 }],
    rewardTone: 'standard',
    rewardIcon: 'soft_currency',
    rewardLabel: '획득',
    primaryAction: { label: '미션 받기', action: 'claim-missions', title: '받을 미션 보상', ariaLabel: '받을 미션 보상 수령' },
    secondaryAction: { label: '다시 방어', action: 'retry', title: '보스 막타 작전', ariaLabel: '보스 막타 작전 시작' }
  };

  applyRebootResultView({ dom, model, rewardClaimActions: new Set(['claim-missions']) });

  assert.equal(dom.resultOverlay.dataset.resultStatus, 'won');
  assert.equal(dom.resultOverlay.dataset.resultCta, 'claim');
  assert.equal(dom.resultOverlay.hidden, false);
  assert.equal(dom.resultNextGoal.dataset.resultGoalTone, 'rescue');
  assert.equal(dom.resultNextGoal.attributes['aria-label'], '다음 목표 위험 80 직전 구원');
  assert.match(dom.resultHighlights.innerHTML, /data-result-medal="rescue"/);
  assert.equal(dom.resultReward.attributes['aria-label'], '획득 보석 +20');
  assert.match(dom.resultReward.innerHTML, /data-reward-icon="soft_currency"/);
  assert.equal(dom.resultRetryLabel.textContent, '미션 받기');
  assert.equal(dom.resultRetryButton.dataset.resultOpen, 'claim-missions');
  assert.equal(dom.resultLobbyButton.dataset.resultOpen, 'retry');
});

test('result reward formatter keeps empty and mixed rewards compact', () => {
  assert.equal(formatResultRewards([]), '보석 +0');
  assert.equal(formatResultRewards([{ type: 'soft', amount: 20 }, { type: 'xp', amount: 12 }]), '보석 +20 · 경험치 +12');
});
