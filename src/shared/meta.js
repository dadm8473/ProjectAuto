import { SHOP } from './content.js';

export const META_PROFILE_VERSION = 1;

function unique(items) {
  return [...new Set(items)];
}

function safeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function safeStringList(value) {
  return Array.isArray(value) ? unique(value.filter((item) => typeof item === 'string')) : [];
}

function safeTierList(value) {
  return Array.isArray(value) ? unique(value.filter((item) => Number.isInteger(item) && item >= 0)) : [];
}

export function createMetaProfile() {
  return {
    version: META_PROFILE_VERSION,
    gems: 0,
    xp: 0,
    claimedMissions: [],
    claimedPassTiers: [],
    unlocks: [],
    processedRuns: []
  };
}

export function normalizeMetaProfile(value) {
  const base = createMetaProfile();
  if (!value || typeof value !== 'object') return base;
  return {
    version: META_PROFILE_VERSION,
    gems: safeNumber(value.gems),
    xp: safeNumber(value.xp),
    claimedMissions: safeStringList(value.claimedMissions),
    claimedPassTiers: safeTierList(value.claimedPassTiers),
    unlocks: safeStringList(value.unlocks),
    processedRuns: safeStringList(value.processedRuns)
  };
}

function teamStat(stats, key) {
  const entry = stats?.[key] ?? {};
  return Object.values(entry).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
}

function runKey(state) {
  const result = state?.result;
  if (!result) return '';
  return [result.runId ?? state.id ?? 'local-run', result.code ?? 'unknown', result.time ?? 0].join(':');
}

function runReward(state) {
  const earned = state?.result?.earned ?? {};
  return {
    gems: safeNumber(earned.gems),
    xp: safeNumber(earned.xp)
  };
}

function spentGems(state) {
  return safeNumber(state?.result?.spent?.gems);
}

function settlementStartGems(profile, state) {
  const value = state?.result?.startingProfileGems;
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : profile.gems;
}

function completedMissions(state) {
  const result = state?.result ?? {};
  const eventLog = state?.eventLog ?? [];
  const completed = new Set();
  if (teamStat(result.stats, 'merges') > 0) completed.add('merge-three');
  if (eventLog.some((event) => event.type === 'link_pulse_save' && event.bossActive === true)) completed.add('save-partner');
  if (eventLog.some((event) => event.type === 'wave_cleared' && Number.isFinite(event.signalIntegrity) && event.signalIntegrity < 35)) completed.add('signal-clutch');
  return SHOP.dailyMissions.filter((mission) => completed.has(mission.id));
}

function applyGrant(profile, grant) {
  if (grant.gems) profile.gems += safeNumber(grant.gems);
  if (grant.cosmetic && !profile.unlocks.includes(grant.cosmetic)) profile.unlocks.push(grant.cosmetic);
}

export function applyRunToProfile(value, state) {
  const profile = normalizeMetaProfile(value);
  const key = runKey(state);
  const duplicate = key !== '' && profile.processedRuns.includes(key);
  const summary = {
    duplicate,
    run: { gems: 0, xp: 0 },
    missions: [],
    missionGems: 0,
    passRewards: [],
    spentGems: 0,
    totalGems: 0,
    totalXp: 0
  };

  if (duplicate || !state?.result) return { profile, summary };

  const run = runReward(state);
  const spent = spentGems(state);
  profile.gems = Math.max(0, settlementStartGems(profile, state) + run.gems - spent);
  profile.xp += run.xp;
  summary.run = run;
  summary.spentGems = spent;

  for (const mission of completedMissions(state)) {
    if (profile.claimedMissions.includes(mission.id)) continue;
    const gems = safeNumber(mission.reward?.gems);
    profile.gems += gems;
    profile.claimedMissions.push(mission.id);
    summary.missions.push({ id: mission.id, text: mission.text, gems });
    summary.missionGems += gems;
  }

  SHOP.pass.tiers.forEach((tier, index) => {
    if (profile.xp < tier.xp || profile.claimedPassTiers.includes(index)) return;
    applyGrant(profile, tier.grant);
    profile.claimedPassTiers.push(index);
    summary.passRewards.push({ tier: index, gems: safeNumber(tier.grant.gems), cosmetic: tier.grant.cosmetic ?? '' });
  });

  if (key) profile.processedRuns.push(key);
  summary.totalGems = run.gems + summary.missionGems + summary.passRewards.reduce((sum, reward) => sum + reward.gems, 0) - spent;
  summary.totalXp = run.xp;
  return { profile: normalizeMetaProfile(profile), summary };
}
