import { useState, useEffect, useRef, useCallback } from 'react';
import type { Calibration } from '../types';

interface CalibrationPhaseProps {
  onComplete: (calibration: Calibration) => void;
}

const CALIBRATION_PARAGRAPHS = [
  'A well-designed API should handle edge cases gracefully. When a client sends malformed JSON in a POST request body, the server should return a 400 status code with a clear error message indicating which field failed validation, rather than a generic internal server error.',
  'Database indexes improve query performance by allowing the engine to locate rows without scanning the entire table. A composite index on columns used together in WHERE clauses can reduce lookup time from linear to logarithmic complexity for most common query patterns.',
  'Container orchestration platforms like Kubernetes manage the lifecycle of application containers across a cluster. When a pod crashes, the scheduler automatically restarts it on a healthy node, maintaining the desired replica count specified in the deployment configuration.',
] as const;

const VOICE_SENTENCE = 'The quick brown fox jumps over the lazy dog near the riverbank.';

type CalibrationStep = 'reading' | 'voice' | 'done';

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CalibrationPhase({ onComplete }: CalibrationPhaseProps) {
  const [step, setStep] = useState<CalibrationStep>('reading');
  const [paragraph, setParagraph] = useState(() => pickRandom(CALIBRATION_PARAGRAPHS));
  const [readStart, setReadStart] = useState(() => Date.now());
  const [wpm, setWpm] = useState(0);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [ambientDb, setAmbientDb] = useState(0);
  const [micPermission, setMicPermission] = useState(true);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMedia = useCallback(() => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Reset read timer when paragraph changes (re-calibration)
  useEffect(() => {
    setReadStart(Date.now());
  }, [paragraph]);

  function handleDoneReading() {
    const elapsed = (Date.now() - readStart) / 1000;
    const words = wordCount(paragraph);

    // Suspiciously fast check
    if (elapsed < 3 && isFirstAttempt) {
      setIsFirstAttempt(false);
      setShowWarning(true);
      // Pick a different paragraph for retry
      const others = CALIBRATION_PARAGRAPHS.filter(p => p !== paragraph);
      setParagraph(pickRandom(others));
      return;
    }

    const raw = (words / elapsed) * 60;
    const clamped = clamp(raw, 80, 400);
    setWpm(Math.round(clamped));
    setShowWarning(false);
    setStep('voice');
  }

  async function startVoiceCalibration() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Permission denied or unavailable
      finishCalibration(0, false);
      return;
    }

    mediaStreamRef.current = stream;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.fftSize);
    const dbSamples: number[] = [];
    let sampleCount = 0;
    const totalSamples = 15; // 3s / 200ms = 15

    setIsCapturing(true);
    setCaptureProgress(0);

    captureTimerRef.current = setInterval(() => {
      analyser.getFloatTimeDomainData(dataArray);

      // RMS calculation
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      dbSamples.push(db);

      sampleCount++;
      setCaptureProgress(Math.round((sampleCount / totalSamples) * 100));

      if (sampleCount >= totalSamples) {
        const avgDb = dbSamples.reduce((a, b) => a + b, 0) / dbSamples.length;
        finishCalibration(Math.round(avgDb * 10) / 10, true);
      }
    }, 200);
  }

  function finishCalibration(db: number, hasMic = true) {
    stopMedia();
    setIsCapturing(false);
    setAmbientDb(db);
    setMicPermission(hasMic);
    setStep('done');
  }

  function handleSkipVoice() {
    finishCalibration(0, false);
  }

  // Auto-complete after showing done state
  useEffect(() => {
    if (step !== 'done') return;
    const timer = setTimeout(() => {
      onComplete({ wpm, ambientDb, micPermission });
    }, 1500);
    return () => clearTimeout(timer);
  }, [step, wpm, ambientDb, micPermission, onComplete]);

  // --- Reading Step ---
  if (step === 'reading') {
    return (
      <div className="mx-auto max-w-xl space-y-6 p-6" role="region" aria-label="Reading speed calibration">
        <h2 className="text-xl font-semibold text-gray-900">Step 1: Reading Speed Calibration</h2>
        <p className="text-sm text-gray-600">
          Read the following paragraph at your normal pace, then press the button when done.
        </p>

        {showWarning && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800" role="alert">
            That was very fast. Please read the paragraph carefully this time.
          </div>
        )}

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-base leading-relaxed text-gray-800">
          {paragraph}
        </div>

        <button
          type="button"
          onClick={handleDoneReading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Done Reading
        </button>
      </div>
    );
  }

  // --- Voice Step ---
  if (step === 'voice') {
    return (
      <div className="mx-auto max-w-xl space-y-6 p-6" role="region" aria-label="Voice calibration">
        <h2 className="text-xl font-semibold text-gray-900">Step 2: Voice Baseline</h2>
        <p className="text-sm text-gray-600">
          Read the following sentence aloud clearly. This calibrates your voice profile for test integrity.
        </p>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-base leading-relaxed text-gray-800 text-center italic">
          &ldquo;{VOICE_SENTENCE}&rdquo;
        </div>

        {isCapturing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="relative flex h-4 w-4" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium text-green-700">Capturing voice baseline...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={captureProgress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${captureProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">{captureProgress}% complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={startVoiceCalibration}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Start Voice Calibration
            </button>
            <button
              type="button"
              onClick={handleSkipVoice}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Skip (reduces integrity score)
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Done Step ---
  return (
    <div className="mx-auto max-w-xl space-y-4 p-6 text-center" role="status" aria-label="Calibration complete">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Calibration Complete</h2>
      <div className="space-y-1 text-sm text-gray-600">
        <p>Reading speed: <span className="font-medium text-gray-900">{wpm} WPM</span></p>
        <p>Voice profile: <span className="font-medium text-gray-900">{micPermission ? 'saved' : 'skipped'}</span></p>
      </div>
    </div>
  );
}
