import { NOISE_TYPES } from './content.js';

function noiseName(type) {
  return NOISE_TYPES[type]?.name ?? type;
}

export function eventLabel(event) {
  if (event.type === 'boss_orchid_heatroot') return `Boss Orchid heated ${event.targets?.length ?? 0} Relays`;
  if (event.type === 'boss_mirror_linkbreak') return 'Boss Mirror broke team links';
  if (event.type === 'boss_origin_spore') return `Origin Null spawned ${event.spawnedSpores?.length ?? 0} spores`;
  if (event.type === 'link_pulse_save') return 'Link Pulse saved the partner board';
  if (event.type === 'link_pulse') return 'Link Pulse cooled partner Relays';
  if (event.type === 'supply') return `${event.relayName} supplied`;
  if (event.type === 'merge') return `${event.relayName} reached T${event.tier}`;
  if (event.type === 'swap') return 'Signal geometry shifted';
  if (event.type === 'focus') return `Supply focus raised to ${event.focusLevel}`;
  if (event.type === 'loop_complete') return `${noiseName(event.noiseType)} breached the loop`;
  if (event.type === 'overclock') return event.dualBossWindow ? 'Dual Overdrive boss window' : 'Overdrive armed';
  if (event.type === 'boss_defeated') return `Wave ${event.wave} boss defeated`;
  if (event.type === 'boss_wave_started') return `${event.waveName ?? `Wave ${event.wave} boss`} incoming`;
  if (event.type === 'wave_started') return `${event.waveName ?? `Wave ${event.wave}`} started`;
  if (event.type === 'wave_cleared') return `${event.waveName ?? `Wave ${event.wave}`} cleared`;
  if (event.type === 'run_finished') return event.text;
  return '';
}
