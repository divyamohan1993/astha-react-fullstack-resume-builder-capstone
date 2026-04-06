import type { IntegrityFlag, IntegrityFlagType } from '../types';
import { INTEGRITY_PENALTIES } from '../types';

export type FlagCallback = (flag: IntegrityFlag) => void;

function createFlag(type: IntegrityFlagType, penalty: number, metadata: Record<string, unknown> = {}): IntegrityFlag {
  return { type, timestamp: Date.now(), penalty, metadata };
}

/**
 * Monitors browser events for cheating behaviors: tab switches, paste, fullscreen exit.
 * Returns a cleanup function to remove all listeners.
 *
 * Dedup: blur within 500ms of a visibilitychange is ignored to avoid double-counting
 * the same tab switch.
 */
export function createAntiCheatMonitor(onFlag: FlagCallback): () => void {
  let lastVisibilityTs = 0;

  function handleVisibilityChange() {
    if (document.hidden) {
      lastVisibilityTs = Date.now();
      onFlag(createFlag('tabSwitch', INTEGRITY_PENALTIES.tabSwitch, { source: 'visibilitychange' }));
    }
  }

  function handleBlur() {
    const now = Date.now();
    // Dedup: if blur fires within 500ms of visibilitychange, skip it
    if (now - lastVisibilityTs < 500) return;
    onFlag(createFlag('tabSwitch', INTEGRITY_PENALTIES.tabSwitch, { source: 'blur' }));
  }

  function handlePaste(e: Event) {
    onFlag(createFlag('paste', INTEGRITY_PENALTIES.paste, {
      target: (e.target as HTMLElement)?.tagName ?? 'unknown',
    }));
  }

  function handleFullscreenChange() {
    if (!document.fullscreenElement) {
      onFlag(createFlag('fullscreenExit', INTEGRITY_PENALTIES.fullscreenExit));
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('paste', handlePaste, true);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('paste', handlePaste, true);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
}

/**
 * Flags suspiciously fast correct answers. Only fires for correct responses.
 *
 * ratio = timeElapsed / expectedReadTime
 * < 0.3: impossible speed (-10%), or compound anomaly (-15%) if tab was hidden in last 10s
 * 0.3-0.5: suspicious speed (-4%)
 */
export function checkSpeedAnomaly(
  timeElapsed: number,
  expectedReadTime: number,
  correct: boolean,
  wasTabHidden: boolean,
  tabHiddenTimestamp: number,
  onFlag: FlagCallback,
): void {
  if (!correct) return;

  const ratio = timeElapsed / expectedReadTime;

  if (ratio < 0.3) {
    const tabHiddenRecently = wasTabHidden && (Date.now() - tabHiddenTimestamp) < 10_000;
    if (tabHiddenRecently) {
      onFlag(createFlag('compoundAnomaly', INTEGRITY_PENALTIES.compoundAnomaly, {
        ratio,
        timeElapsed,
        expectedReadTime,
        tabHiddenTimestamp,
      }));
    } else {
      onFlag(createFlag('speedAnomaly', INTEGRITY_PENALTIES.speedAnomalyImpossible, {
        ratio,
        timeElapsed,
        expectedReadTime,
        severity: 'impossible',
      }));
    }
  } else if (ratio < 0.5) {
    onFlag(createFlag('speedAnomaly', INTEGRITY_PENALTIES.speedAnomalySuspicious, {
      ratio,
      timeElapsed,
      expectedReadTime,
      severity: 'suspicious',
    }));
  }
}
