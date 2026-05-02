import { createGame } from '../shared/game.js';
import { REBOOT_UNITS } from '../shared/reboot_content.js';

const REASON_LABELS = {
  partner_rescued: '파트너를 구했습니다',
  boss_final_hit: '보스를 막타로 정리했습니다',
  boss_slowed: '보스를 둔화시켜 버텼습니다',
  greed: '구원보다 합성을 욕심냈습니다',
  rescue_missed: '구원 타이밍을 놓쳤습니다',
  boss_leaked: '보스가 방어선을 돌파했습니다',
  merge_gap: '보스 전에 합성이 늦었습니다',
  bad_luck: '나쁜 결과를 활용하지 못했습니다'
};

const GOAL_LABELS = {
  time_next_rescue: '다음 판에는 위험 80 전에 구원을 준비하세요',
  repeat_boss_timing: '보스 경고 후 10초 안에 소환이나 합성을 선택하세요',
  protect_control_unit: '느림 코일을 보스 전까지 살려두세요',
  rescue_before_merge_greed: '파트너 위험이 높으면 합성보다 구원을 먼저 누르세요',
  save_rescue_for_partner_danger: '구원은 파트너 위험 80 전에 준비하세요',
  answer_boss_warning: '보스 실루엣이 보이면 마지막 선택을 아끼지 마세요',
  merge_before_boss: '보스 전 합성 후보를 놓치지 마세요',
  turn_bad_rolls_into_utility: '애매한 유닛도 제어와 구원 재료로 활용하세요'
};

const ROLE_LABELS = {
  attack: '공격',
  support: '지원',
  control: '제어',
  rescue: '구원'
};

export function buildRebootLobby(model = {}) {
  const gems = model.gems ?? 0;
  return `
    <section class="lobby-card">
      <span>오늘의 협동</span>
      <strong>첫 구원 작전</strong>
      <p>세 버튼으로 파트너 라인을 살리고 보스를 막으세요</p>
    </section>
    <section class="lobby-card reward-hook">
      <span>보유 젬</span>
      <strong>${gems}</strong>
      <p>전투력 판매 없이 외형만 해금합니다</p>
    </section>
  `;
}

export function buildRebootCollection() {
  return Object.values(REBOOT_UNITS).map((unit) => `
    <article class="screen-card unit-card" data-role="${unit.role}">
      <span class="sprite-token unit-sprite" data-sprite="${unit.spriteKey}"></span>
      <div class="card-copy">
        <span class="role-pill">${ROLE_LABELS[unit.role] ?? unit.role}</span>
        <strong>${unit.name}</strong>
        <p>등급 ${unit.grade}</p>
      </div>
    </article>
  `).join('');
}

export function buildRebootShop() {
  const items = [
    ['board_theme', '보드 테마', '전장 외형', 'partner_danger'],
    ['merge_effect', '합성 효과', '연출 외형', 'merge_action'],
    ['rescue_effect', '구원 효과', '구원 빔 외형', 'rescue_action'],
    ['emote', '협동 이모트', '파트너 반응', 'reward_shard'],
    ['profile_frame', '프로필 프레임', '홈 외형', 'soft_currency']
  ];
  return items.map(([id, name, desc, icon]) => `
    <article class="screen-card shop-card" data-item="${id}">
      <span class="sprite-token shop-token" data-shop-icon="${icon}"></span>
      <div class="card-copy">
        <span class="role-pill">외형</span>
        <strong>${name}</strong>
        <p>${desc}</p>
      </div>
      <button type="button">해금</button>
    </article>
  `).join('');
}

export function buildMissionScreen() {
  return `
    <article class="screen-card"><strong>파트너 구원 1회</strong><p>구원 버튼으로 위험을 낮추세요</p></article>
    <article class="screen-card"><strong>보스 경고 대응</strong><p>92초 이후 소환 또는 합성</p></article>
  `;
}

export function buildSeasonScreen() {
  return `
    <article class="screen-card"><strong>시즌 진행</strong><p>플레이 보상으로 외형을 엽니다</p></article>
    <article class="screen-card"><strong>무료 보상</strong><p>전투력 판매 없음</p></article>
  `;
}

export function buildRebootResultModel({ result, rewards = [] }) {
  const won = result?.status === 'won';
  const reason = result?.reason ?? 'partner_rescued';
  return {
    title: won ? '승리' : '패배',
    highlight: { label: REASON_LABELS[reason] ?? '전투 완료', kind: won ? 'success' : 'danger' },
    reason: { label: REASON_LABELS[reason] ?? '전투 완료', reason },
    nextGoal: { label: GOAL_LABELS[result?.nextGoal] ?? '다시 도전해 핵심 타이밍을 익히세요', goal: result?.nextGoal ?? 'retry' },
    rewards,
    primaryAction: { label: '다시 도전', action: 'retry' },
    secondaryAction: { label: '홈', action: 'home' },
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
