export const REBOOT_AUDIO_STORAGE_KEY = 'projectauto.reboot.audio.enabled.v1';

const CUE_SPECS = {
  summon: { frequency: 540, duration: 0.12, type: 'triangle', volume: 0.18 },
  merge: { frequency: 420, duration: 0.18, type: 'sawtooth', volume: 0.16 },
  rescue: { frequency: 720, duration: 0.24, type: 'triangle', volume: 0.2 },
  partner_summon: { frequency: 480, duration: 0.1, type: 'triangle', volume: 0.1 },
  partner_rescue: { frequency: 620, duration: 0.18, type: 'triangle', volume: 0.11 },
  hit: { frequency: 260, duration: 0.045, type: 'square', volume: 0.05 },
  critical_hit: { frequency: 360, duration: 0.09, type: 'square', volume: 0.11 },
  kill: { frequency: 680, duration: 0.13, type: 'triangle', volume: 0.13 },
  boss_kill: { frequency: 820, duration: 0.28, type: 'triangle', volume: 0.18 },
  wave: { frequency: 330, duration: 0.14, type: 'sawtooth', volume: 0.1 },
  boss_warning: { frequency: 180, duration: 0.2, type: 'sawtooth', volume: 0.12 },
  danger: { frequency: 220, duration: 0.11, type: 'sawtooth', volume: 0.1 },
  win: { frequency: 760, duration: 0.32, type: 'triangle', volume: 0.18 },
  loss: { frequency: 190, duration: 0.28, type: 'sawtooth', volume: 0.12 }
};

function readEnabled(storage) {
  try {
    return storage?.getItem(REBOOT_AUDIO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(storage, enabled) {
  try {
    storage?.setItem(REBOOT_AUDIO_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Audio preference is non-critical; blocked storage should not affect play.
  }
}

function eventKey(event = {}) {
  return [
    event.type,
    event.at,
    event.playerId ?? '',
    event.action ?? '',
    event.unitId ?? '',
    event.reason ?? ''
  ].join(':');
}

function partnerBoardId(localBoardId) {
  return localBoardId === 'p2' ? 'p1' : 'p2';
}

function cueForEvent(event = {}, localBoardId = 'p1', result = null) {
  const partner = event.playerId && event.playerId !== localBoardId;
  if (event.type === 'summon') return { name: 'summon', bus: partner ? 'partner' : 'sfx' };
  if (event.type === 'merge') return { name: 'merge', bus: partner ? 'partner' : 'sfx' };
  if (event.type === 'rescue') return { name: partner ? 'partner_rescue' : 'rescue', bus: partner ? 'partner' : 'sfx', haptic: !partner };
  if (event.type === 'partner_auto') return { name: `partner_${event.action ?? 'summon'}`, bus: 'partner' };
  if (event.type === 'wave') return { name: 'wave', bus: 'ui' };
  if (event.type === 'result') return { name: result?.status === 'won' ? 'win' : 'loss', bus: 'ui' };
  return null;
}

function cueForEffect(effect = {}) {
  if (effect.type === 'hit') return { name: effect.critical ? 'critical_hit' : 'hit', bus: 'sfx' };
  if (effect.type === 'death_burst') return { name: effect.targetType === 'mini_boss' ? 'boss_kill' : 'kill', bus: 'sfx' };
  return null;
}

function defaultPlayCue(cue, context, { reducedMotion = false } = {}) {
  if (!context) return false;
  const spec = CUE_SPECS[cue.name] ?? CUE_SPECS.hit;
  const now = context.currentTime ?? 0;
  const busGain = cue.bus === 'partner' ? 0.62 : cue.bus === 'ui' ? 0.82 : 1;
  const volume = spec.volume * busGain;
  const duration = reducedMotion ? Math.min(spec.duration, 0.16) : spec.duration;
  const oscillator = context.createOscillator?.();
  const gain = context.createGain?.();
  if (!oscillator || !gain) return false;
  oscillator.type = spec.type;
  oscillator.frequency?.setValueAtTime?.(spec.frequency, now);
  gain.gain?.setValueAtTime?.(0.0001, now);
  gain.gain?.exponentialRampToValueAtTime?.(Math.max(0.0002, volume), now + 0.012);
  gain.gain?.exponentialRampToValueAtTime?.(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
  return true;
}

export function createRebootAudio({
  mutedByQuery = false,
  reducedMotion = false,
  storage = globalThis.localStorage,
  navigator = globalThis.navigator,
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  playCue = defaultPlayCue,
  onError = () => {}
} = {}) {
  let enabled = mutedByQuery ? false : readEnabled(storage);
  let unlocked = false;
  let context = null;
  const seenEvents = new Set();
  const seenEffects = new Set();
  let lastPartnerDanger = null;
  let bossWarningPlayed = false;

  function isEnabled() {
    return !mutedByQuery && enabled;
  }

  function setEnabled(nextEnabled) {
    enabled = mutedByQuery ? false : Boolean(nextEnabled);
    writeEnabled(storage, enabled);
    return enabled;
  }

  function unlock() {
    unlocked = true;
    if (!isEnabled() || context || !AudioContextCtor) return false;
    try {
      context = new AudioContextCtor();
      context.resume?.();
      return true;
    } catch (error) {
      onError(error);
      return false;
    }
  }

  function play(cue) {
    if (!isEnabled() || !unlocked) return false;
    if (!context && AudioContextCtor) unlock();
    try {
      return Boolean(playCue(cue, context, { reducedMotion }));
    } catch (error) {
      onError(error);
      return false;
    }
  }

  function vibrate(pattern) {
    if (!isEnabled() || !unlocked || typeof navigator?.vibrate !== 'function') return;
    navigator.vibrate(pattern);
  }

  function consume(current = {}, { localBoardId = 'p1', appScreen = 'battle' } = {}) {
    const played = [];
    if (mutedByQuery) return played;

    const partner = partnerBoardId(localBoardId);
    const partnerDanger = Math.round(current.boards?.[partner]?.danger ?? 0);
    if (lastPartnerDanger != null && lastPartnerDanger < 70 && partnerDanger >= 70) {
      const dangerCue = { name: 'danger', bus: 'ui' };
      if (play(dangerCue)) played.push(dangerCue);
      vibrate(15);
    }
    lastPartnerDanger = partnerDanger;

    if (appScreen === 'battle' && current.now >= 92 && current.now < 120 && !current.result && !bossWarningPlayed) {
      const bossCue = { name: 'boss_warning', bus: 'ui' };
      if (play(bossCue)) played.push(bossCue);
      bossWarningPlayed = true;
    }
    if (current.result) bossWarningPlayed = false;

    for (const event of current.events ?? []) {
      const key = eventKey(event);
      if (seenEvents.has(key)) continue;
      seenEvents.add(key);
      const cue = cueForEvent(event, localBoardId, current.result);
      if (!cue) continue;
      if (play(cue)) played.push(cue);
      if (cue.haptic) vibrate([15, 24, 15]);
    }

    for (const effect of current.effects ?? []) {
      if (!effect.id || seenEffects.has(effect.id)) continue;
      seenEffects.add(effect.id);
      const cue = cueForEffect(effect);
      if (cue && play(cue)) played.push(cue);
    }

    return played;
  }

  return {
    consume,
    isEnabled,
    setEnabled,
    unlock
  };
}
