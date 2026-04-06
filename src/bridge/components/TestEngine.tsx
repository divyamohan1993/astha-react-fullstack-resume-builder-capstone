import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../../firebase/config';
import { signInAnon, getCurrentUser } from '../../firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initFirebase } from '../../firebase/config';
import { useBridgeStore } from '../store';
import { useResumeStore } from '@/store/resumeStore';
import CalibrationPhase from '../test/CalibrationPhase';
import { createAntiCheatMonitor, checkSpeedAnomaly } from '../test/antiCheat';
import { createAudioMonitor } from '../test/audioMonitor';
import { generateTestQuestions } from '../test/questionGenerator';
import { getNextLevel, computeVerificationScore, computeIntegrityScore } from '../test/adaptiveScoring';
import { createResumePin } from '../resumePin';
import type {
  BridgeCriteria,
  Calibration,
  DifficultyLevel,
  GeneratedQuestion,
  IntegrityFlag,
  AudioFlag,
  QuestionResponse,
} from '../types';
import type { SkillData } from '../test/adaptiveScoring';

type Phase = 'loading' | 'calibration' | 'generating' | 'testing' | 'completed' | 'error';

interface Props {
  criteriaCode: string;
}

export function TestEngine({ criteriaCode }: Props) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState('');

  // Store selectors
  const criteria = useBridgeStore((s) => s.criteria);
  const setCriteria = useBridgeStore((s) => s.setCriteria);
  const testSession = useBridgeStore((s) => s.testSession);
  const initTestSession = useBridgeStore((s) => s.initTestSession);
  const setCalibration = useBridgeStore((s) => s.setCalibration);
  const setQuestions = useBridgeStore((s) => s.setQuestions);
  const recordResponse = useBridgeStore((s) => s.recordResponse);
  const addFlag = useBridgeStore((s) => s.addFlag);
  const addAudioFlag = useBridgeStore((s) => s.addAudioFlag);
  const updateLevel = useBridgeStore((s) => s.updateLevel);
  const incrementConsecutive = useBridgeStore((s) => s.incrementConsecutive);
  const resetConsecutive = useBridgeStore((s) => s.resetConsecutive);
  const advanceQuestion = useBridgeStore((s) => s.advanceQuestion);
  const completeTest = useBridgeStore((s) => s.completeTest);
  const resume = useResumeStore((s) => s.resume);

  // Refs for mutable state that doesn't need re-renders
  const flagsRef = useRef<IntegrityFlag[]>([]);
  const audioFlagsRef = useRef<AudioFlag[]>([]);
  const responsesRef = useRef<QuestionResponse[]>([]);
  const levelsRef = useRef<Record<string, DifficultyLevel>>({});
  const consecutiveRef = useRef<Record<string, number>>({});
  const questionsRef = useRef<GeneratedQuestion[]>([]);
  const currentIndexRef = useRef(0);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const cleanupAntiCheatRef = useRef<(() => void) | null>(null);
  const audioMonitorRef = useRef<ReturnType<typeof createAudioMonitor> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabHiddenRef = useRef(false);
  const tabHiddenTsRef = useRef(0);
  const announcedHalfRef = useRef(false);
  const announcedTenRef = useRef(false);
  const calibrationRef = useRef<Calibration | null>(null);
  const criteriaRef = useRef<BridgeCriteria | null>(null);

  // Track tab visibility for speed anomaly
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        tabHiddenRef.current = true;
        tabHiddenTsRef.current = Date.now();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      cleanupAntiCheatRef.current?.();
      audioMonitorRef.current?.stop();
    };
  }, []);

  // Phase: loading
  useEffect(() => {
    if (phase !== 'loading') return;
    let cancelled = false;

    async function load() {
      try {
        // Ensure anonymous auth
        if (!getCurrentUser()) {
          await signInAnon();
        }

        // Load criteria from Firestore
        const db = getDb();
        const snap = await getDoc(doc(db, 'bridge_criteria', criteriaCode));
        if (!snap.exists()) {
          if (!cancelled) {
            setError('Criteria not found. Check the link and try again.');
            setPhase('error');
          }
          return;
        }

        const data = snap.data() as BridgeCriteria;
        if (!cancelled) {
          setCriteria(data);
          criteriaRef.current = data;
          setPhase('calibration');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load criteria');
          setPhase('error');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [phase, criteriaCode, setCriteria]);

  // Handle calibration complete
  const handleCalibrationComplete = useCallback(async (cal: Calibration) => {
    calibrationRef.current = cal;
    setCalibration(cal);
    setPhase('generating');

    const activeCriteria = criteriaRef.current ?? criteria;
    if (!activeCriteria) {
      setError('Criteria lost. Reload the page.');
      setPhase('error');
      return;
    }

    try {
      setGeneratingProgress('Pinning your resume...');
      const resumeScore = 0; // Will be computed later
      const pin = await createResumePin(resume, resumeScore);

      const user = getCurrentUser();
      if (!user) {
        setError('Authentication lost. Reload the page.');
        setPhase('error');
        return;
      }

      initTestSession(
        `ts_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        criteriaCode,
        user.uid,
        pin,
      );

      // Start server session via Cloud Function
      setGeneratingProgress('Starting test session...');
      try {
        const { app } = initFirebase();
        const functions = getFunctions(app);
        const startSession = httpsCallable(functions, 'startTestSession');
        await startSession({ criteriaCode, resumePin: pin });
      } catch {
        // Non-critical: continue even if server session fails
      }

      // Extract resume claims per skill
      const skillsClaimed = pin.skillsClaimed;
      const skillsToTest = activeCriteria.testConfig.skillsToTest.length > 0
        ? activeCriteria.testConfig.skillsToTest
        : activeCriteria.requiredSkills;
      const questionsPerSkill = Math.max(
        1,
        Math.ceil(activeCriteria.testConfig.questionCount / Math.max(1, skillsToTest.length)),
      );

      // Generate questions via Gemini
      setGeneratingProgress('Generating questions...');
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
      const questions = await generateTestQuestions(
        skillsToTest,
        skillsClaimed,
        cal.wpm,
        questionsPerSkill,
        geminiKey,
      );

      if (questions.length === 0) {
        setError('Could not generate questions. Try again.');
        setPhase('error');
        return;
      }

      questionsRef.current = questions;
      setQuestions(questions);

      // Initialize levels
      const initialLevels: Record<string, DifficultyLevel> = {};
      const initialConsecutive: Record<string, number> = {};
      for (const skill of skillsToTest) {
        initialLevels[skill] = (activeCriteria.testConfig.difficultyFloor || 1) as DifficultyLevel;
        initialConsecutive[skill] = 0;
      }
      levelsRef.current = initialLevels;
      consecutiveRef.current = initialConsecutive;

      // Start anti-cheat monitor
      cleanupAntiCheatRef.current = createAntiCheatMonitor((flag) => {
        flagsRef.current = [...flagsRef.current, flag];
        addFlag(flag);
        // Check speech + tab switch correlation
        if (flag.type === 'tabSwitch') {
          audioMonitorRef.current?.checkSpeechPlusTabSwitch(flag.timestamp);
        }
      });

      // Start audio monitor
      if (cal.micPermission) {
        audioMonitorRef.current = createAudioMonitor({
          onFlag: (flag) => {
            audioFlagsRef.current = [...audioFlagsRef.current, flag];
            addAudioFlag(flag);
          },
          baselineDb: cal.ambientDb,
        });
        audioMonitorRef.current.start();
      }

      // Request fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Not critical
      }

      // Start heartbeat (30s interval)
      heartbeatRef.current = setInterval(() => {
        try {
          const { app: fbApp } = initFirebase();
          const fns = getFunctions(fbApp);
          const heartbeat = httpsCallable(fns, 'testHeartbeat');
          heartbeat({
            criteriaCode,
            questionIndex: currentIndexRef.current,
            flagCount: flagsRef.current.length,
          }).catch(() => {});
        } catch {
          // Non-critical
        }
      }, 30_000);

      // Start testing
      currentIndexRef.current = 0;
      setPhase('testing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate test');
      setPhase('error');
    }
  }, [
    criteria, criteriaCode, resume, setCriteria, setCalibration,
    initTestSession, setQuestions, addFlag, addAudioFlag,
  ]);

  // Timer management for testing phase
  const currentQuestion = phase === 'testing' && questionsRef.current.length > 0
    ? questionsRef.current[currentIndexRef.current]
    : null;

  useEffect(() => {
    if (phase !== 'testing' || !currentQuestion) return;

    setTimer(currentQuestion.timeAllotted);
    setSelectedOption(null);
    questionStartRef.current = Date.now();
    announcedHalfRef.current = false;
    announcedTenRef.current = false;

    timerIdRef.current = setInterval(() => {
      setTimer((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Timeout: record as wrong
          handleAnswer(-1);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndexRef.current, currentQuestion?.id]);

  function handleAnswer(optionIndex: number) {
    if (!currentQuestion || selectedOption !== null) return;

    // Stop timer
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    const timeElapsed = (Date.now() - questionStartRef.current) / 1000;
    const correct = optionIndex === currentQuestion.correctIndex;
    const expectedReadTime = currentQuestion.timeAllotted;
    const wpmRatio = timeElapsed / expectedReadTime;

    setSelectedOption(optionIndex);

    const response: QuestionResponse = {
      questionId: currentQuestion.id,
      selectedIndex: optionIndex,
      correct,
      timeElapsed,
      expectedReadTime,
      wpmRatio,
    };

    responsesRef.current = [...responsesRef.current, response];
    recordResponse(response);

    // Check speed anomaly
    checkSpeedAnomaly(
      timeElapsed,
      expectedReadTime,
      correct,
      tabHiddenRef.current,
      tabHiddenTsRef.current,
      (flag) => {
        flagsRef.current = [...flagsRef.current, flag];
        addFlag(flag);
      },
    );

    // Reset tab hidden tracking for next question
    tabHiddenRef.current = false;

    // Update adaptive level
    const skill = currentQuestion.skill;
    const currentLevel = levelsRef.current[skill] ?? (1 as DifficultyLevel);

    if (correct) {
      consecutiveRef.current[skill] = (consecutiveRef.current[skill] ?? 0) + 1;
      incrementConsecutive(skill);
    } else {
      consecutiveRef.current[skill] = 0;
      resetConsecutive(skill);
    }

    const wrongCount = correct ? 0 : 1;
    const nextLevel = getNextLevel(currentLevel, correct, wrongCount);
    levelsRef.current[skill] = nextLevel;
    updateLevel(skill, nextLevel);

    // Advance after 500ms delay
    setTimeout(() => {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= questionsRef.current.length) {
        finishTest();
      } else {
        currentIndexRef.current = nextIndex;
        advanceQuestion();
        // Force re-render by updating timer (triggers the effect)
        setSelectedOption(null);
      }
    }, 500);
  }

  function finishTest() {
    // Stop monitors
    cleanupAntiCheatRef.current?.();
    audioMonitorRef.current?.stop();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    completeTest();
    setPhase('completed');
  }

  // Completed phase: compute scores and navigate
  useEffect(() => {
    if (phase !== 'completed') return;

    const activeCriteria = criteriaRef.current ?? criteria;
    if (!activeCriteria) return;

    const skillsToTest = activeCriteria.testConfig.skillsToTest.length > 0
      ? activeCriteria.testConfig.skillsToTest
      : activeCriteria.requiredSkills;

    // Build per-skill data
    const skillDataMap: Record<string, { responses: QuestionResponse[]; levels: DifficultyLevel[] }> = {};
    for (const skill of skillsToTest) {
      skillDataMap[skill] = { responses: [], levels: [] };
    }

    for (let i = 0; i < questionsRef.current.length; i++) {
      const q = questionsRef.current[i];
      const r = responsesRef.current[i];
      if (!r || !skillDataMap[q.skill]) continue;
      skillDataMap[q.skill].responses.push(r);
      skillDataMap[q.skill].levels.push(q.level);
    }

    const skillsData: SkillData[] = Object.entries(skillDataMap).map(([skill, data]) => ({
      skill,
      responses: data.responses,
      levels: data.levels,
    }));

    const verification = computeVerificationScore(skillsData);
    verification.duration = testSession
      ? (testSession.completedAt ?? Date.now()) - testSession.startedAt
      : 0;

    const integrity = computeIntegrityScore(
      flagsRef.current,
      audioFlagsRef.current,
      calibrationRef.current?.micPermission ?? false,
    );

    navigate(`/bridge/${criteriaCode}/scorecard`, {
      state: {
        verification,
        integrity,
      },
    });
  }, [phase, criteria, criteriaCode, navigate, testSession]);

  // Aria-live announcements for timer
  const ariaTimerMessage = (() => {
    if (!currentQuestion || phase !== 'testing') return '';
    const total = currentQuestion.timeAllotted;
    const halfTime = Math.ceil(total / 2);
    const tenPct = Math.ceil(total * 0.1);

    if (timer === halfTime && !announcedHalfRef.current) {
      announcedHalfRef.current = true;
      return `${timer} seconds remaining. Half time.`;
    }
    if (timer === tenPct && !announcedTenRef.current) {
      announcedTenRef.current = true;
      return `${timer} seconds remaining. Almost out of time.`;
    }
    return '';
  })();

  // --- Render ---

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" role="status" aria-label="Loading test">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden="true" />
          <p className="text-sm text-gray-600">Loading criteria...</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" role="alert">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => { setPhase('loading'); setError(''); }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'calibration') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <CalibrationPhase onComplete={handleCalibrationComplete} />
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" role="status" aria-label="Generating test questions">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden="true" />
          <p className="text-sm text-gray-600">{generatingProgress || 'Preparing your test...'}</p>
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" role="status" aria-label="Computing scores">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Computing your scores...</p>
        </div>
      </div>
    );
  }

  // --- Testing Phase ---
  if (!currentQuestion) {
    return null;
  }

  const totalQuestions = questionsRef.current.length;
  const progress = ((currentIndexRef.current) / totalQuestions) * 100;
  const timerPct = (timer / currentQuestion.timeAllotted) * 100;
  const timerDanger = timer <= 5;

  // Anti-OCR: slight font-weight and letter-spacing variation per option
  const antiOcrStyles = [
    { letterSpacing: '0.01em', fontWeight: 400 },
    { letterSpacing: '0.015em', fontWeight: 410 },
    { letterSpacing: '0.005em', fontWeight: 405 },
    { letterSpacing: '0.02em', fontWeight: 395 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Aria-live region for timer announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {ariaTimerMessage}
      </div>

      {/* Sticky timer bar (phone: top, desktop: top) */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-[720px] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Progress */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">
                {currentIndexRef.current + 1}/{totalQuestions}
              </span>
              <span className="hidden sm:inline">{currentQuestion.skill}</span>
            </div>

            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors ${
                timerDanger
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-gray-100 text-gray-700'
              }`}
              role="timer"
              aria-label={`${timer} seconds remaining`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timer}s
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 w-full rounded-full bg-gray-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Test progress">
            <div
              className="h-1 rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Timer bar */}
          <div className="mt-1 h-0.5 w-full rounded-full bg-gray-100">
            <div
              className={`h-0.5 rounded-full transition-all duration-1000 linear ${
                timerDanger ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6 sm:py-10">
        {/* Skill + level badge */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {currentQuestion.skill}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
            Level {currentQuestion.level}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
            {currentQuestion.type}
          </span>
        </div>

        {/* Question text */}
        <h2 className="text-lg font-medium leading-relaxed text-gray-900 sm:text-xl">
          {currentQuestion.text}
        </h2>

        {/* Options */}
        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer options">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQuestion.correctIndex;
            const showResult = selectedOption !== null;
            const style = antiOcrStyles[idx % antiOcrStyles.length];

            let optionClass = 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 focus:ring-indigo-500';
            if (showResult) {
              if (isCorrect) {
                optionClass = 'border-green-400 bg-green-50';
              } else if (isSelected && !isCorrect) {
                optionClass = 'border-red-400 bg-red-50';
              } else {
                optionClass = 'border-gray-200 bg-gray-50 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={selectedOption !== null}
                onClick={() => handleAnswer(idx)}
                className={`w-full min-h-[48px] rounded-lg border-2 px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${optionClass}`}
                style={{
                  letterSpacing: style.letterSpacing,
                  fontWeight: style.fontWeight,
                  fontSize: undefined, // Let CSS handle responsive sizing
                }}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-medium text-gray-500">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-[18px] leading-relaxed text-gray-800 sm:text-[20px]">
                    {option.text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
