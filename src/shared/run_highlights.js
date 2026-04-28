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

  if (saves > 0) candidates.push({ label: 'Clutch Pulse', value: compactNumber(saves), detail: 'boss save', tone: 'link' });
  if (merges > 0) candidates.push({ label: 'Best Merge', value: compactNumber(merges), detail: 'relay upgrades', tone: 'charge' });
  if (bosses > 0) candidates.push({ label: 'Boss Break', value: compactNumber(bosses), detail: 'windows cleared', tone: 'danger' });
  if (overdrives > 0) candidates.push({ label: 'Overdrive', value: compactNumber(overdrives), detail: 'burst windows', tone: 'charge' });
  if (missions > 0) candidates.push({ label: 'Missions', value: compactNumber(missions), detail: 'claimed now', tone: 'gem' });
  if (kills > 0) candidates.push({ label: 'Noise Clear', value: compactNumber(kills), detail: 'targets cut', tone: 'link' });
  candidates.push({ label: 'Wave Reach', value: compactNumber(state?.result?.wave ?? state?.wave?.index ?? 1), detail: 'deepest push', tone: 'neutral' });

  return candidates.slice(0, 3);
}

export function buildRunProgress(summary, profile = {}) {
  const run = summary?.run ?? { gems: 0, xp: 0 };
  const missionCount = summary?.missions?.length ?? 0;
  const passCount = summary?.passRewards?.length ?? 0;
  const missionGems = safeNumber(summary?.missionGems);
  const totalGems = safeNumber(summary?.totalGems);
  return [
    { label: 'Run', value: `+${safeNumber(run.xp)} XP`, detail: `+${safeNumber(run.gems)} G` },
    { label: 'Missions', value: `${missionCount} clear`, detail: `+${missionGems} G` },
    { label: 'Pass', value: `${passCount} unlock`, detail: `${safeNumber(profile.xp)} XP` },
    { label: 'Vault', value: `${safeNumber(profile.gems)} G`, detail: `${totalGems >= 0 ? '+' : ''}${totalGems} G` }
  ];
}
