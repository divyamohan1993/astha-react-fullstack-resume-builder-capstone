import type { AudioFlag, AudioFlagType } from '../types';
import { INTEGRITY_PENALTIES } from '../types';

export type AudioFlagCallback = (flag: AudioFlag) => void;

interface AudioMonitorConfig {
  onFlag: AudioFlagCallback;
  baselineDb: number;
}

function createAudioFlag(
  type: AudioFlagType,
  penalty: number,
  durationMs: number,
  dbDelta: number,
): AudioFlag {
  return { type, timestamp: Date.now(), durationMs, dbDelta, penalty };
}

/**
 * Three-layer audio intelligence for speech detection.
 *
 * Layer 1 (Spectral): Formant peaks in 300-3400Hz band (>50% energy concentration)
 * Layer 2 (Temporal): Syllabic modulation at 3-8Hz via zero-crossing rate of energy envelope
 * Layer 3 (Adaptive): Rolling 60s baseline recalibration for non-speech sustained elevation
 *
 * Decision: formants + syllables = speech. Impulse <200ms = ignore. Continuous non-speech >30s = recalibrate.
 * All processing via requestAnimationFrame. Zero audio data stored.
 */
export function createAudioMonitor(config: AudioMonitorConfig): {
  start: (existingStream?: MediaStream) => Promise<void>;
  stop: () => void;
  checkSpeechPlusTabSwitch: (tabSwitchTimestamp: number) => void;
} {
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let stream: MediaStream | null = null;
  let rafId = 0;
  let running = false;

  // Adaptive baseline
  let currentBaselineDb = config.baselineDb;
  let baselineSamples: number[] = [];
  const BASELINE_WINDOW_S = 60;
  const BASELINE_SAMPLE_RATE_MS = 1000;
  let lastBaselineSampleTs = 0;

  // Speech burst tracking
  let speechBurstStartTs = 0;
  let speechBurstActive = false;
  let speechBursts: { startTs: number; endTs: number }[] = [];
  let continuousSpeechFlagged = false;

  // Energy envelope for temporal analysis
  let energyHistory: { ts: number; db: number }[] = [];

  function getFrequencyData(): Float32Array {
    if (!analyser) return new Float32Array(0);
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    return data;
  }

  function getTimeDomainData(): Float32Array {
    if (!analyser) return new Float32Array(0);
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    return data;
  }

  function computeRmsDb(timeData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / timeData.length);
    return rms > 0 ? 20 * Math.log10(rms) : -100;
  }

  /**
   * Layer 1: Spectral analysis. Check if >50% of energy is in the 300-3400Hz speech band.
   */
  function checkFormants(freqData: Float32Array, sampleRate: number): boolean {
    if (freqData.length === 0) return false;

    const binWidth = sampleRate / (freqData.length * 2); // fftSize = frequencyBinCount * 2
    const lowBin = Math.floor(300 / binWidth);
    const highBin = Math.min(Math.ceil(3400 / binWidth), freqData.length - 1);

    let speechEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < freqData.length; i++) {
      // Convert dB to linear power for accurate energy comparison
      const power = Math.pow(10, freqData[i] / 10);
      totalEnergy += power;
      if (i >= lowBin && i <= highBin) {
        speechEnergy += power;
      }
    }

    if (totalEnergy === 0) return false;
    return speechEnergy / totalEnergy > 0.5;
  }

  /**
   * Layer 2: Temporal analysis. Check for syllabic modulation at 3-8Hz
   * by analyzing zero-crossing rate of the energy envelope.
   */
  function checkSyllabicModulation(): boolean {
    const now = Date.now();
    // Need at least 500ms of history
    const recent = energyHistory.filter((e) => now - e.ts < 1000);
    if (recent.length < 10) return false;

    // Compute mean energy
    const mean = recent.reduce((s, e) => s + e.db, 0) / recent.length;

    // Count zero crossings (crossings of the mean)
    let crossings = 0;
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1].db - mean;
      const curr = recent[i].db - mean;
      if ((prev > 0 && curr <= 0) || (prev <= 0 && curr > 0)) {
        crossings++;
      }
    }

    // Duration in seconds
    const durationS = (recent[recent.length - 1].ts - recent[0].ts) / 1000;
    if (durationS === 0) return false;

    // Zero crossing rate in Hz (each crossing is half a cycle)
    const zcRate = crossings / (2 * durationS);

    // Syllabic rate: 3-8 Hz
    return zcRate >= 3 && zcRate <= 8;
  }

  /**
   * Layer 3: Adaptive baseline recalibration.
   * Non-speech sustained elevation recalibrates the baseline.
   */
  function updateBaseline(db: number, isSpeech: boolean, now: number): void {
    if (now - lastBaselineSampleTs < BASELINE_SAMPLE_RATE_MS) return;
    lastBaselineSampleTs = now;

    if (!isSpeech) {
      baselineSamples.push(db);
      // Keep only last 60s worth of samples
      const maxSamples = BASELINE_WINDOW_S;
      if (baselineSamples.length > maxSamples) {
        baselineSamples = baselineSamples.slice(-maxSamples);
      }
      // Recalibrate if we have enough non-speech samples
      if (baselineSamples.length >= 30) {
        currentBaselineDb =
          baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length;
      }
    }
  }

  function processSpeechEvent(isSpeech: boolean, db: number, now: number): void {
    const dbDelta = db - currentBaselineDb;

    if (isSpeech) {
      if (!speechBurstActive) {
        speechBurstActive = true;
        speechBurstStartTs = now;
      }

      const burstDurationMs = now - speechBurstStartTs;

      // Continuous speech >10s
      if (burstDurationMs > 10_000 && !continuousSpeechFlagged) {
        continuousSpeechFlagged = true;
        config.onFlag(
          createAudioFlag('continuousSpeech', INTEGRITY_PENALTIES.continuousSpeech, burstDurationMs, dbDelta),
        );
      }

      // Whisper detection: low energy but formant presence
      if (dbDelta < 6 && dbDelta > 0) {
        // Low energy speech = whisper. Flag once per burst.
        if (burstDurationMs > 2000 && burstDurationMs < 2100) {
          config.onFlag(
            createAudioFlag('whisper', INTEGRITY_PENALTIES.whisper, burstDurationMs, dbDelta),
          );
        }
      }
    } else {
      if (speechBurstActive) {
        const burstDurationMs = now - speechBurstStartTs;
        speechBurstActive = false;

        // Impulse <200ms = hammer, ignore
        if (burstDurationMs >= 200) {
          speechBursts.push({ startTs: speechBurstStartTs, endTs: now });

          // Speech burst 2-5s
          if (burstDurationMs >= 2000 && burstDurationMs <= 5000) {
            config.onFlag(
              createAudioFlag('speechBurst', INTEGRITY_PENALTIES.speechBurst, burstDurationMs, dbDelta),
            );
          }

          // Conversation detection: 3+ bursts in 30s window
          const recentBursts = speechBursts.filter((b) => now - b.endTs < 30_000);
          speechBursts = recentBursts; // Trim old bursts
          if (recentBursts.length >= 3) {
            const windowMs = now - recentBursts[0].startTs;
            config.onFlag(
              createAudioFlag('conversation', INTEGRITY_PENALTIES.conversation, windowMs, dbDelta),
            );
            // Reset to avoid reflagging the same conversation
            speechBursts = [];
          }
        }

        continuousSpeechFlagged = false;
      }
    }
  }

  function processFrame(): void {
    if (!running || !analyser || !audioCtx) return;

    const now = Date.now();
    const freqData = getFrequencyData();
    const timeData = getTimeDomainData();
    const db = computeRmsDb(timeData);

    // Store energy for temporal analysis
    energyHistory.push({ ts: now, db });
    // Keep 2s of history
    energyHistory = energyHistory.filter((e) => now - e.ts < 2000);

    const hasFormants = checkFormants(freqData, audioCtx.sampleRate);
    const hasSyllables = checkSyllabicModulation();

    // Decision: formants + syllables = speech
    const isSpeech = hasFormants && hasSyllables && db > currentBaselineDb + 3;

    updateBaseline(db, isSpeech, now);
    processSpeechEvent(isSpeech, db, now);

    rafId = requestAnimationFrame(processFrame);
  }

  return {
    async start(existingStream?: MediaStream) {
      if (running) return;

      try {
        stream = existingStream ?? await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // No mic access, silently degrade
        return;
      }

      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.3;

      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      running = true;
      lastBaselineSampleTs = Date.now();
      rafId = requestAnimationFrame(processFrame);
    },

    stop() {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (source) {
        source.disconnect();
        source = null;
      }
      if (analyser) {
        analyser = null;
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
      // Only stop tracks if we created the stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      // Reset state
      energyHistory = [];
      baselineSamples = [];
      speechBursts = [];
      speechBurstActive = false;
      continuousSpeechFlagged = false;
    },

    checkSpeechPlusTabSwitch(tabSwitchTimestamp: number) {
      const now = Date.now();
      // If speech was detected within 5s of a tab switch, compound flag
      if (speechBurstActive && now - tabSwitchTimestamp < 5000) {
        const burstDurationMs = now - speechBurstStartTs;
        const dbDelta = energyHistory.length > 0
          ? energyHistory[energyHistory.length - 1].db - currentBaselineDb
          : 0;
        config.onFlag(
          createAudioFlag(
            'speechPlusTabSwitch',
            INTEGRITY_PENALTIES.speechPlusTabSwitch,
            burstDurationMs,
            dbDelta,
          ),
        );
      }
    },
  };
}
