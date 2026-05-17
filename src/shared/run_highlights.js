function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function teamStat(stats, key) {
  const entry = stats?.[key];
  if (Number.isFinite(entry)) return entry;
  if (!entry || typeof entry !== 'object') return 0;
  return Object.values(entry).reduce((sum, value) => sum + safeNumber(value), 0);
}

function eventCount(state, type) {
  return (state?.eventLog ?? []).filter((event) => event.type === type).length;
}

function compactNumber(value) {
  const safe = Math.max(0, Math.floor(safeNumber(value)));
  return safe >= 1000 ? `${(safe / 1000).toFixed(1)}k` : String(safe);
}

export function buildRunHighlights(state, summary) {
  const stats = state?.result?.stats ?? state?.stats ?? {};
  const saves = eventCount(state, 'link_pulse_save');
  const merges = teamStat(stats, 'merges');
  const bosses = eventCount(state, 'boss_defeated');
  const overdrives = teamStat(stats, 'overclocks');
  const kills = safeNumber(stats.kills);
  const missions = summary?.missions?.length ?? 0;
  const candidates = [];

  if (saves > 0) candidates.push({ label: '결정적 구원', value: compactNumber(saves), detail: '보스 세이브', tone: 'link' });
  if (merges > 0) candidates.push({ label: '최고 합성', value: compactNumber(merges), detail: '릴레이 강화', tone: 'charge' });
  if (bosses > 0) candidates.push({ label: '보스 격파', value: compactNumber(bosses), detail: '위기 돌파', tone: 'danger' });
  if (overdrives > 0) candidates.push({ label: '오버드라이브', value: compactNumber(overdrives), detail: '폭발 구간', tone: 'charge' });
  if (missions > 0) candidates.push({ label: '미션', value: compactNumber(missions), detail: '즉시 수령', tone: 'gem' });
  if (kills > 0) candidates.push({ label: '노이즈 정리', value: compactNumber(kills), detail: '처치 대상', tone: 'link' });
  candidates.push({ label: '도달 웨이브', value: compactNumber(state?.result?.wave ?? state?.wave?.index ?? 1), detail: '최고 진도', tone: 'neutral' });

  return candidates.slice(0, 3);
}

export function buildRunProgress(summary, profile = {}) {
  const run = summary?.run ?? { gems: 0, xp: 0 };
  const missionCount = summary?.missions?.length ?? 0;
  const passCount = summary?.passRewards?.length ?? 0;
  const missionGems = safeNumber(summary?.missionGems);
  const totalGems = safeNumber(summary?.totalGems);
  return [
    { label: '전투', value: `+${safeNumber(run.xp)} 경험치`, detail: `+${safeNumber(run.gems)} 보석` },
    { label: '미션', value: `${missionCount}개 완료`, detail: `+${missionGems} 보석` },
    { label: '패스', value: `${passCount}개 해금`, detail: `${safeNumber(profile.xp)} 경험치` },
    { label: '보관함', value: `${safeNumber(profile.gems)} 보석`, detail: `${totalGems >= 0 ? '+' : ''}${totalGems} 보석` }
  ];
}
