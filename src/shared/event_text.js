import { NOISE_TYPES } from './content.js';

function noiseName(type) {
  return NOISE_TYPES[type]?.name ?? type;
}

export function eventLabel(event) {
  if (event.type === 'boss_orchid_heatroot') return `보스 오키드가 릴레이 ${event.targets?.length ?? 0}개 가열`;
  if (event.type === 'boss_mirror_linkbreak') return '보스 미러가 팀 연결 파괴';
  if (event.type === 'boss_origin_spore') return `기원 널 포자 ${event.spawnedSpores?.length ?? 0}개 생성`;
  if (event.type === 'link_pulse_save') return '파트너 구원 성공';
  if (event.type === 'link_pulse') return '파트너 보드 안정화';
  if (event.type === 'supply') return `${event.relayName} 보급`;
  if (event.type === 'merge') return `${event.relayName} Lv${event.tier}`;
  if (event.type === 'swap') return '릴레이 배치 변경';
  if (event.type === 'focus') return `보급 집중 ${event.focusLevel}단계`;
  if (event.type === 'loop_complete') return `${noiseName(event.noiseType)} 루프 침입`;
  if (event.type === 'overclock') return event.dualBossWindow ? '협동 오버드라이브 창' : '오버드라이브 발동';
  if (event.type === 'boss_defeated') return `${event.wave}웨이브 보스 격파`;
  if (event.type === 'boss_wave_started') return `${event.waveName ?? `${event.wave}웨이브 보스`} 접근`;
  if (event.type === 'wave_started') return `${event.waveName ?? `${event.wave}웨이브`} 시작`;
  if (event.type === 'wave_cleared') return `${event.waveName ?? `${event.wave}웨이브`} 정리`;
  if (event.type === 'run_finished') return event.text;
  return '';
}
