export const PLAYTEST_STORAGE_KEY = 'projectauto.reboot.playtest.v1';

const EMPTY_SUMMARY = {
  enabled: false,
  totalEvents: 0,
  screensVisited: [],
  actionCounts: { summon: 0, merge: 0, rescue: 0, failed: 0 },
  firstAction: null,
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

  function summary() {
    if (!enabled) return { ...EMPTY_SUMMARY, actionCounts: { ...EMPTY_SUMMARY.actionCounts } };

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
      record('action', {
        action,
        ok: Boolean(ok),
        reason: reason || '',
        atSeconds: safeSeconds(atSeconds, ms)
      });
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
