import test from 'node:test';
import assert from 'node:assert/strict';

import { eventLabel } from '../src/shared/event_text.js';

test('event labels cover recorded player actions and loop pressure', () => {
  assert.equal(eventLabel({ type: 'swap', from: 1, to: 5 }), '릴레이 배치 변경');
  assert.equal(eventLabel({ type: 'focus', focusLevel: 2 }), '보급 집중 2단계');
  assert.equal(eventLabel({ type: 'loop_complete', noiseType: 'null', signalDamage: 8 }), '널 루프 침입');
  assert.equal(eventLabel({ type: 'wave_started', wave: 1, waveName: '보정 드리프트' }), '보정 드리프트 시작');
  assert.equal(eventLabel({ type: 'boss_wave_started', wave: 3, waveName: '보스 오키드' }), '보스 오키드 접근');
  assert.equal(eventLabel({ type: 'wave_cleared', wave: 1, waveName: '보정 드리프트' }), '보정 드리프트 정리');
  assert.equal(eventLabel({ type: 'overclock', dualBossWindow: false }), '오버드라이브 발동');
  assert.equal(eventLabel({ type: 'link_pulse_save' }), '파트너 구원 성공');
  assert.equal(eventLabel({ type: 'overclock', dualBossWindow: true }), '협동 오버드라이브 창');
});
