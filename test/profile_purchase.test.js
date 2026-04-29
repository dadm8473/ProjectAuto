import test from 'node:test';
import assert from 'node:assert/strict';

import { approveClientPurchase, approveProfilePurchase, safeProfile } from '../server/profile_purchase.js';

test('online purchases are approved from the buyer profile, not a shared gem pool', () => {
  const denied = approveProfilePurchase({ gems: 0, unlocks: [] }, 'mythic-aura');

  assert.equal(denied.ok, false);
  assert.equal(denied.reason, '젬 부족.');

  const approved = approveProfilePurchase({ gems: 98, unlocks: [] }, 'mythic-aura');

  assert.equal(approved.ok, true);
  assert.deepEqual(approved.profile, { gems: 8, unlocks: ['mythic-aura'] });

  const duplicate = approveProfilePurchase({ gems: 200, unlocks: ['mythic-aura'] }, 'mythic-aura');

  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, '이미 해금됨.');
});

test('profile purchase input is normalized before approval', () => {
  const profile = safeProfile({ gems: 12.9, unlocks: ['x', 'x', 4] });

  assert.deepEqual(profile, { gems: 12, unlocks: ['x'] });
});

test('server purchase approval ignores stale echoed profile after the first ACK', () => {
  const client = { profile: safeProfile({ gems: 98, unlocks: [] }) };
  const staleAction = { itemId: 'mythic-aura', profile: { gems: 98, unlocks: [] } };

  const first = approveClientPurchase(client, staleAction);
  const second = approveClientPurchase(client, staleAction);

  assert.equal(first.ok, true);
  assert.deepEqual(client.profile, { gems: 8, unlocks: ['mythic-aura'] });
  assert.equal(second.ok, false);
  assert.equal(second.reason, '이미 해금됨.');
  assert.deepEqual(client.profile, { gems: 8, unlocks: ['mythic-aura'] });
});

test('server purchase approval requires a joined client profile', () => {
  const unjoined = {};

  const result = approveClientPurchase(unjoined, { itemId: 'mythic-aura', profile: { gems: 500, unlocks: [] } });

  assert.equal(result.ok, false);
  assert.equal(result.reason, '참가 후 이용 가능.');
  assert.equal(unjoined.profile, undefined);
});
