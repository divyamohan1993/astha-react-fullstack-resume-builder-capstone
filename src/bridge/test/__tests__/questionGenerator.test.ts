import { describe, it, expect } from 'vitest';
import {
  buildQuestionPrompt,
  validateQuestion,
  calculateTimeAllotted,
} from '../questionGenerator';
import type { RawQuestion } from '../questionGenerator';

describe('buildQuestionPrompt', () => {
  it('includes skill name and level label in prompt', () => {
    const prompt = buildQuestionPrompt('React', 3, 'concept', ['Built SPAs with React']);
    expect(prompt).toContain('React');
    expect(prompt).toContain('Architecture');
    expect(prompt).toContain('Edge Cases');
  });

  it('includes level number for all levels', () => {
    const levels = [1, 2, 3, 4, 5] as const;
    const labels = ['Fundamentals', 'Applied', 'Architecture', 'Expert Tradeoffs', 'Novel Problem'];
    for (let i = 0; i < levels.length; i++) {
      const prompt = buildQuestionPrompt('JS', levels[i], 'concept', []);
      expect(prompt).toContain(labels[i]);
    }
  });

  it('includes question type', () => {
    const prompt = buildQuestionPrompt('Python', 2, 'scenario', []);
    expect(prompt).toContain('scenario');
  });

  it('includes resume claims context', () => {
    const claims = ['5 years Python', 'Led team of 8'];
    const prompt = buildQuestionPrompt('Python', 1, 'concept', claims);
    expect(prompt).toContain('5 years Python');
    expect(prompt).toContain('Led team of 8');
  });

  it('includes anti-LLM-tell constraints', () => {
    const prompt = buildQuestionPrompt('Go', 1, 'concept', []);
    expect(prompt.toLowerCase()).toContain('character count variance');
    expect(prompt.toLowerCase()).toContain('correct option must not be longest');
    expect(prompt.toLowerCase()).toContain('no qualifier stacking');
    expect(prompt.toLowerCase()).toContain('plain language');
    expect(prompt.toLowerCase()).toContain('all of the above');
  });

  it('requests JSON response format', () => {
    const prompt = buildQuestionPrompt('Go', 1, 'concept', []);
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('text');
    expect(prompt).toContain('options');
    expect(prompt).toContain('correctIndex');
  });
});

describe('validateQuestion', () => {
  const wellFormed: RawQuestion = {
    text: 'What is closure in JavaScript?',
    options: [
      'A function with access to outer scope',
      'A loop that runs until condition met',
      'A variable declared with const keyword',
      'A method that returns a new object',
    ],
    correctIndex: 0,
    type: 'concept',
  };

  it('accepts a well-formed question', () => {
    expect(validateQuestion(wellFormed)).toBe(true);
  });

  it('rejects when correct option is uniquely the longest', () => {
    const q: RawQuestion = {
      text: 'What is X?',
      options: [
        'This is a very long and detailed correct answer that goes on and on with extra words',
        'Short wrong A',
        'Short wrong B',
        'Short wrong C',
      ],
      correctIndex: 0,
      type: 'concept',
    };
    expect(validateQuestion(q)).toBe(false);
  });

  it('rejects when character count variance exceeds 20%', () => {
    const q: RawQuestion = {
      text: 'What is X?',
      options: [
        'AB',
        'This is a tremendously long option that far exceeds the mean character count of the group by a huge margin',
        'CD',
        'EF',
      ],
      correctIndex: 2,
      type: 'concept',
    };
    expect(validateQuestion(q)).toBe(false);
  });

  it('rejects when correct option has more commas than any distractor', () => {
    const q: RawQuestion = {
      text: 'What is X?',
      options: [
        'First, second, third, fourth, fifth item',
        'One single answer here no commas',
        'Another answer here no commas at',
        'Yet another answer here no commas',
      ],
      correctIndex: 0,
      type: 'concept',
    };
    expect(validateQuestion(q)).toBe(false);
  });

  it('rejects when correct option has more semicolons than any distractor', () => {
    const q: RawQuestion = {
      text: 'What is X?',
      options: [
        'Step one; step two; step three; step four',
        'A single step without semicolons here',
        'Another step without semicolons here',
        'Third option without semicolons here a',
      ],
      correctIndex: 0,
      type: 'concept',
    };
    expect(validateQuestion(q)).toBe(false);
  });
});

describe('calculateTimeAllotted', () => {
  it('calculates reading time using candidate WPM', () => {
    // 60 words, 200 wpm => 60/200*60 = 18s reading + 3s concept buffer = 21s * 1.0 (L1) = 21
    const time = calculateTimeAllotted(60, 200, 'concept', 1);
    expect(time).toBe(21);
  });

  it('applies scenario buffer', () => {
    // 60 words, 200 wpm => 18s reading + 5s scenario buffer = 23s * 1.0 (L1) = 23
    const time = calculateTimeAllotted(60, 200, 'scenario', 1);
    expect(time).toBe(23);
  });

  it('applies micro-challenge buffer', () => {
    // 60 words, 200 wpm => 18s reading + 8s micro-challenge buffer = 26s * 1.0 (L1) = 26
    const time = calculateTimeAllotted(60, 200, 'micro-challenge', 1);
    expect(time).toBe(26);
  });

  it('applies level modifier L2 (0.9x)', () => {
    // 60 words, 200 wpm => 18s + 3s = 21s * 0.9 = 18.9 => 19
    const time = calculateTimeAllotted(60, 200, 'concept', 2);
    expect(time).toBe(19);
  });

  it('applies level modifier L4 (1.1x)', () => {
    // 60 words, 200 wpm => 18s + 3s = 21s * 1.1 = 23.1 => 23
    const time = calculateTimeAllotted(60, 200, 'concept', 4);
    expect(time).toBe(23);
  });

  it('enforces 10s floor', () => {
    // 5 words, 200 wpm => 1.5s + 3s = 4.5s * 0.9 = 4.05 => should be 10
    const time = calculateTimeAllotted(5, 200, 'concept', 2);
    expect(time).toBe(10);
  });

  it('applies level modifier L5 (1.1x)', () => {
    // 100 words, 150 wpm => 40s + 5s = 45s * 1.1 = 49.5 => 50
    const time = calculateTimeAllotted(100, 150, 'scenario', 5);
    expect(time).toBe(50);
  });
});
