import { SHOP } from '../src/shared/game.js';

export function safeProfile(value) {
  const profile = value && typeof value === 'object' ? value : {};
  return {
    gems: Number.isFinite(profile.gems) && profile.gems >= 0 ? Math.floor(profile.gems) : 0,
    unlocks: Array.isArray(profile.unlocks) ? [...new Set(profile.unlocks.filter((item) => typeof item === 'string'))] : []
  };
}

export function approveProfilePurchase(value, itemId) {
  const profile = safeProfile(value);
  const item = SHOP.items.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: '보상 항목 없음.', profile };
  if (item.grant.cosmetic && profile.unlocks.includes(item.grant.cosmetic)) return { ok: false, reason: '이미 해금됨.', profile };
  const gemPrice = item.price.gems ?? 0;
  if (profile.gems < gemPrice) return { ok: false, reason: '젬 부족.', profile };
  return {
    ok: true,
    item,
    profile: {
      gems: profile.gems - gemPrice,
      unlocks: item.grant.cosmetic ? [...profile.unlocks, item.grant.cosmetic] : profile.unlocks
    }
  };
}

export function approveClientPurchase(client, action) {
  if (!client?.profile) return { ok: false, reason: '참가 후 이용 가능.', profile: safeProfile(null) };
  const approval = approveProfilePurchase(client?.profile, action?.itemId);
  if (approval.ok && client) client.profile = approval.profile;
  return approval;
}
