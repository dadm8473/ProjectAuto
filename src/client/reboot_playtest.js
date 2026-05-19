export const PLAYTEST_STORAGE_KEY = 'projectauto.reboot.playtest.v1';

const EARLY_ACTION_SECONDS = 8;
const EARLY_SIGNAL_SECONDS = 30;

const EMPTY_EARLY_ENGAGEMENT = {
  firstActionWithin8s: false,
  partnerJoinedWithin30s: false,
  threatSeenWithin30s: false,
  rewardFeedbackWithin30s: false,
  feedbackVarietyWithin30s: false,
  feedbackTypesWithin30s: [],
  passed: false,
  moments: {
    firstAction: null,
    partnerJoined: null,
    threatSeen: null,
    rewardFeedback: null
  }
};

const EMPTY_SUMMARY = {
  enabled: false,
  totalEvents: 0,
  screensVisited: [],
  actionCounts: { summon: 0, merge: 0, rescue: 0, failed: 0 },
  firstAction: null,
  earlyEngagement: EMPTY_EARLY_ENGAGEMENT,
  completedCoreLoopWithin120s: false,
  result: null,
  durationMs: 0
};

function safeSeconds(value, fallbackMs) {
  const next = Number(value);
  if (Number.isFinite(next)) return Math.round(next * 10) / 10;
  return Math.round(fallbackMs / 100) / 10;
}

function uniq(values) {
  return [...new Set(values)];
}

function feedbackTypes(events) {
  const bySignal = new Map([
    ['threatSeen', 'threat'],
    ['partnerJoined', 'partner'],
    ['hitFeedback', 'hit'],
    ['rewardFeedback', 'reward']
  ]);
  return [...bySignal.entries()]
    .filter(([signal]) => events.some((event) => (
      event.type === 'signal'
      && event.signal === signal
      && event.atSeconds <= EARLY_SIGNAL_SECONDS
    )))
    .map(([, type]) => type);
}

function finiteSeconds(value, fallbackMs) {
  const seconds = safeSeconds(value, fallbackMs);
  return Number.isFinite(seconds) ? seconds : safeSeconds(undefined, fallbackMs);
}

export function createPlaytestRecorder({
  enabled = false,
  storage = null,
  now = () => 0
} = {}) {
  const startedAt = now();
  const events = [];
  let result = null;

  function elapsedMs() {
    return Math.max(0, Math.round(now() - startedAt));
  }

  function record(type, payload = {}) {
    if (!enabled) return;
    events.push({ type, elapsedMs: elapsedMs(), ...payload });
    if (result && type !== 'result') persist();
  }

  function firstSignal(signal) {
    return events.find((event) => event.type === 'signal' && event.signal === signal)?.atSeconds ?? null;
  }

  function recordSignal(signal, atSeconds, payload = {}) {
    if (!enabled || firstSignal(signal) !== null) return;
    const seconds = finiteSeconds(atSeconds, elapsedMs());
    record('signal', { signal, atSeconds: seconds, ...payload });
  }

  function earlyEngagement(successfulActions) {
    const firstAction = successfulActions[0]?.atSeconds ?? null;
    const moments = {
      firstAction,
      partnerJoined: firstSignal('partnerJoined'),
      threatSeen: firstSignal('threatSeen'),
      rewardFeedback: firstSignal('rewardFeedback')
    };
    const checks = {
      firstActionWithin8s: moments.firstAction !== null && moments.firstAction <= EARLY_ACTION_SECONDS,
      partnerJoinedWithin30s: moments.partnerJoined !== null && moments.partnerJoined <= EARLY_SIGNAL_SECONDS,
      threatSeenWithin30s: moments.threatSeen !== null && moments.threatSeen <= EARLY_SIGNAL_SECONDS,
      rewardFeedbackWithin30s: moments.rewardFeedback !== null && moments.rewardFeedback <= EARLY_SIGNAL_SECONDS
    };
    const feedbackTypesWithin30s = feedbackTypes(events);

    return {
      ...checks,
      feedbackVarietyWithin30s: feedbackTypesWithin30s.length >= 3,
      feedbackTypesWithin30s,
      passed: Object.values(checks).every(Boolean),
      moments
    };
  }

  function summary() {
    if (!enabled) {
      return {
        ...EMPTY_SUMMARY,
        actionCounts: { ...EMPTY_SUMMARY.actionCounts },
        earlyEngagement: {
          ...EMPTY_EARLY_ENGAGEMENT,
          moments: { ...EMPTY_EARLY_ENGAGEMENT.moments }
        }
      };
    }

    const actions = events.filter((event) => event.type === 'action');
    const successfulActions = actions.filter((event) => event.ok);
    const actionCounts = {
      summon: successfulActions.filter((event) => event.action === 'summon').length,
      merge: successfulActions.filter((event) => event.action === 'merge').length,
      rescue: successfulActions.filter((event) => event.action === 'rescue').length,
      failed: actions.filter((event) => !event.ok).length
    };
    const firstActionEvent = actions[0] ?? null;
    const firstSuccessfulByAction = ['summon', 'merge', 'rescue'].map((action) => (
      successfulActions.find((event) => event.action === action)?.atSeconds ?? Number.POSITIVE_INFINITY
    ));
    const completedCoreLoopWithin120s = firstSuccessfulByAction.every((seconds) => seconds <= 120);

    return {
      enabled: true,
      totalEvents: events.length,
      screensVisited: uniq(events.filter((event) => event.type === 'screen').map((event) => event.screen)),
      actionCounts,
      firstAction: firstActionEvent ? { action: firstActionEvent.action, atSeconds: firstActionEvent.atSeconds } : null,
      earlyEngagement: earlyEngagement(successfulActions),
      completedCoreLoopWithin120s,
      result,
      durationMs: events.at(-1)?.elapsedMs ?? 0
    };
  }

  function persist() {
    if (!enabled || !storage?.setItem) return;
    try {
      storage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(summary()));
    } catch {
      // Playtest data is diagnostic only; blocked storage must not affect play.
    }
  }

  return {
    recordScreen(screen) {
      record('screen', { screen });
    },
    recordAction(action, { ok = true, reason = '', atSeconds } = {}) {
      const ms = elapsedMs();
      const seconds = finiteSeconds(atSeconds, ms);
      record('action', {
        action,
        ok: Boolean(ok),
        reason: reason || '',
        atSeconds: seconds
      });
    },
    recordCombatSnapshot(state = {}) {
      if (!enabled) return;
      const atSeconds = finiteSeconds(state.now, elapsedMs());
      if (atSeconds <= EARLY_SIGNAL_SECONDS && (state.enemies?.length ?? 0) > 0) {
        recordSignal('threatSeen', atSeconds);
      }
      const partnerEvent = (state.events ?? []).find((event) => (
        event.type === 'partner_auto'
        && Number.isFinite(Number(event.at))
        && Number(event.at) <= EARLY_SIGNAL_SECONDS
      ));
      if (partnerEvent) recordSignal('partnerJoined', partnerEvent.at, { action: partnerEvent.action ?? '' });
      const hitEffect = (state.effects ?? []).find((effect) => effect.type === 'hit');
      if (atSeconds <= EARLY_SIGNAL_SECONDS && hitEffect) {
        recordSignal('hitFeedback', atSeconds, { targetType: hitEffect.targetType ?? '' });
      }
      const rewardEffect = (state.effects ?? []).find((effect) => (
        effect.type === 'death_burst'
        && ((effect.rewardCharge ?? 0) > 0 || (effect.rewardLink ?? 0) > 0)
      ));
      if (atSeconds <= EARLY_SIGNAL_SECONDS && rewardEffect) {
        recordSignal('rewardFeedback', atSeconds, { targetType: rewardEffect.targetType ?? '' });
      }
    },
    recordResult({ status, reason, nextGoal, atSeconds } = {}) {
      const ms = elapsedMs();
      result = {
        status: status ?? '',
        reason: reason ?? '',
        nextGoal: nextGoal ?? '',
        atSeconds: safeSeconds(atSeconds, ms)
      };
      record('result', result);
      persist();
    },
    summary
  };
}
