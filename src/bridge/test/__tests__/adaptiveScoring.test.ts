import { describe, it, expect } from 'vitest';
import { getNextLevel, computeVerificationScore, computeIntegrityScore } from '../adaptiveScoring';
import type { DifficultyLevel, QuestionResponse, IntegrityFlag, AudioFlag } from '../../types';

describe('getNextLevel', () => {
  it('advances one level on correct answer', () => {
    expect(getNextLevel(2, true, 0)).toBe(3);
  });

  it('caps at level 5', () => {
    expect(getNextLevel(5, true, 0)).toBe(5);
  });

  it('stays on first wrong at level', () => {
    expect(getNextLevel(3, false, 0)).toBe(3);
  });

  it('drops one level on second wrong', () => {
    expect(getNextLevel(3, false, 1)).toBe(2);
  });

  it('does not drop below level 1', () => {
    expect(getNextLevel(1, false, 1)).toBe(1);
  });
});

function makeResponse(correct: boolean, questionId = 'q1'): QuestionResponse {
  return { questionId, selectedIndex: 0, correct, timeElapsed: 10, expectedReadTime: 12, wpmRatio: 1.0 };
}

describe('computeVerificationScore', () => {
  it('scores 0 for all wrong answers', () => {
    const result = computeVerificationScore([{
      skill: 'js',
      responses: [makeResponse(false), makeResponse(false)],
      levels: [1 as DifficultyLevel, 1 as DifficultyLevel],
    }]);
    expect(result.overall).toBe(0);
    expect(result.perSkill[0].score).toBe(0);
  });

  it('scores higher for higher levels', () => {
    const lowLevel = computeVerificationScore([{
      skill: 'js',
      responses: [makeResponse(true)],
      levels: [1 as DifficultyLevel],
    }]);
    const highLevel = computeVerificationScore([{
      skill: 'js',
      responses: [makeResponse(true)],
      levels: [4 as DifficultyLevel],
    }]);
    expect(highLevel.perSkill[0].score).toBeGreaterThan(lowLevel.perSkill[0].score);
  });

  it('applies sustained performance bonus for 3+ consecutive correct at L3+', () => {
    const withBonus = computeVerificationScore([{
      skill: 'js',
      responses: [makeResponse(true, 'q1'), makeResponse(true, 'q2'), makeResponse(true, 'q3')],
      levels: [3 as DifficultyLevel, 3 as DifficultyLevel, 3 as DifficultyLevel],
    }]);
    const withoutBonus = computeVerificationScore([{
      skill: 'js',
      responses: [makeResponse(true, 'q1'), makeResponse(true, 'q2'), makeResponse(false, 'q3')],
      levels: [3 as DifficultyLevel, 3 as DifficultyLevel, 3 as DifficultyLevel],
    }]);
    // withBonus should have the 1.15x multiplier applied
    expect(withBonus.perSkill[0].score).toBeGreaterThan(withoutBonus.perSkill[0].score);
  });

  it('caps at L2 ceiling when peak level is 2', () => {
    const result = computeVerificationScore([{
      skill: 'js',
      responses: [makeResponse(true), makeResponse(true), makeResponse(true)],
      levels: [2 as DifficultyLevel, 2 as DifficultyLevel, 2 as DifficultyLevel],
    }]);
    expect(result.perSkill[0].score).toBeLessThanOrEqual(45);
  });
});

describe('computeIntegrityScore', () => {
  it('returns 100 with no flags', () => {
    const result = computeIntegrityScore([], [], true);
    expect(result.score).toBe(100);
  });

  it('deducts for tab switches', () => {
    const flag: IntegrityFlag = { type: 'tabSwitch', timestamp: 1000, penalty: 5, metadata: {} };
    const result = computeIntegrityScore([flag], [], true);
    expect(result.score).toBe(95);
  });

  it('compounds multiple flags', () => {
    const flags: IntegrityFlag[] = [
      { type: 'tabSwitch', timestamp: 1000, penalty: 5, metadata: {} },
      { type: 'paste', timestamp: 2000, penalty: 8, metadata: {} },
    ];
    const result = computeIntegrityScore(flags, [], true);
    expect(result.score).toBe(87);
  });

  it('deducts for audio flags', () => {
    const audioFlag: AudioFlag = { type: 'conversation', timestamp: 1000, durationMs: 5000, dbDelta: 10, penalty: 5 };
    const result = computeIntegrityScore([], [audioFlag], true);
    expect(result.score).toBe(95);
  });

  it('notes mic denied', () => {
    const result = computeIntegrityScore([], [], false);
    expect(result.micPermission).toBe(false);
  });

  it('never goes below 0', () => {
    const flags: IntegrityFlag[] = Array.from({ length: 25 }, (_, i) => ({
      type: 'compoundAnomaly' as const, timestamp: i * 1000, penalty: 15, metadata: {},
    }));
    const result = computeIntegrityScore(flags, [], true);
    expect(result.score).toBe(0);
  });
});
