import type { QuestionType, DifficultyLevel, GeneratedQuestion } from '../types';

export interface RawQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  type: QuestionType;
}

const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  1: 'Fundamentals',
  2: 'Applied',
  3: 'Architecture & Edge Cases',
  4: 'Expert Tradeoffs',
  5: 'Novel Problem',
};

const ANSWER_BUFFER: Record<QuestionType, number> = {
  concept: 3,
  scenario: 5,
  'micro-challenge': 8,
};

const LEVEL_TIME_MODIFIERS: Record<DifficultyLevel, number> = {
  1: 1.0,
  2: 0.9,
  3: 1.0,
  4: 1.1,
  5: 1.1,
};

export function buildQuestionPrompt(
  skill: string,
  level: DifficultyLevel,
  type: QuestionType,
  resumeClaims: string[],
): string {
  const claimsBlock =
    resumeClaims.length > 0
      ? `\nResume claims context:\n${resumeClaims.map((c) => `- ${c}`).join('\n')}\n`
      : '';

  return `Generate a single ${type} question for the skill "${skill}" at level ${level} (${LEVEL_LABELS[level]}).
${claimsBlock}
Anti-LLM-tell constraints (you MUST follow all of these):
- Option character count variance must be <20% from the mean
- The correct option must not be longest (uniquely)
- No qualifier stacking (avoid hedging words like "typically", "generally", "usually" in the correct answer)
- Randomized verbosity across all options
- Use plain language throughout
- Never use "all of the above" or "none of the above" as an option

Respond with ONLY valid JSON in this exact format:
{
  "text": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "type": "${type}"
}`;
}

export function validateQuestion(q: RawQuestion): boolean {
  const lengths = q.options.map((o) => o.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Reject if character count variance > 20%
  for (const len of lengths) {
    if (Math.abs(len - mean) / mean > 0.2) {
      return false;
    }
  }

  // Reject if correct option is uniquely the longest
  const correctLen = lengths[q.correctIndex];
  const maxLen = Math.max(...lengths);
  if (correctLen === maxLen) {
    const countAtMax = lengths.filter((l) => l === maxLen).length;
    if (countAtMax === 1) {
      return false;
    }
  }

  // Reject if correct option has more commas/semicolons than any distractor
  const countPunctuation = (s: string) =>
    (s.match(/[,;]/g) || []).length;
  const correctPunc = countPunctuation(q.options[q.correctIndex]);
  const maxDistractorPunc = Math.max(
    ...q.options
      .filter((_, i) => i !== q.correctIndex)
      .map(countPunctuation),
  );
  if (correctPunc > maxDistractorPunc) {
    return false;
  }

  return true;
}

export function calculateTimeAllotted(
  wordCount: number,
  candidateWpm: number,
  type: QuestionType,
  level: DifficultyLevel,
): number {
  const readingTime = (wordCount / candidateWpm) * 60;
  const buffer = ANSWER_BUFFER[type];
  const modifier = LEVEL_TIME_MODIFIERS[level];
  const raw = (readingTime + buffer) * modifier;
  return Math.max(10, Math.round(raw));
}

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function shuffleWithCorrect(
  options: string[],
  correctIndex: number,
): { shuffled: string[]; newCorrectIndex: number } {
  const correct = options[correctIndex];
  const indices = options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map((i) => options[i]);
  const newCorrectIndex = shuffled.indexOf(correct);
  return { shuffled, newCorrectIndex };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function generateQuestion(
  skill: string,
  level: DifficultyLevel,
  type: QuestionType,
  resumeClaims: string[],
  candidateWpm: number,
  geminiApiKey: string,
): Promise<GeneratedQuestion | null> {
  const prompt = buildQuestionPrompt(skill, level, type, resumeClaims);
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: 'application/json',
            },
          }),
        },
      );

      if (!response.ok) continue;

      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed: RawQuestion = JSON.parse(rawText);

      if (
        !parsed.text ||
        !Array.isArray(parsed.options) ||
        parsed.options.length < 2 ||
        typeof parsed.correctIndex !== 'number' ||
        parsed.correctIndex < 0 ||
        parsed.correctIndex >= parsed.options.length
      ) {
        continue;
      }

      if (!validateQuestion(parsed)) continue;

      const { shuffled, newCorrectIndex } = shuffleWithCorrect(
        parsed.options,
        parsed.correctIndex,
      );

      const totalText = `${parsed.text} ${shuffled.join(' ')}`;
      const wordCount = countWords(totalText);
      const timeAllotted = calculateTimeAllotted(
        wordCount,
        candidateWpm,
        type,
        level,
      );

      return {
        id: generateId(),
        skill,
        type,
        level,
        text: parsed.text,
        options: shuffled.map((t) => ({ text: t, charCount: t.length })),
        correctIndex: newCorrectIndex,
        timeAllotted,
        wordCount,
      };
    } catch {
      continue;
    }
  }

  return null;
}

const QUESTION_TYPES: QuestionType[] = [
  'concept',
  'scenario',
  'micro-challenge',
];

export async function generateTestQuestions(
  skills: string[],
  resumeClaims: string[],
  candidateWpm: number,
  questionsPerSkill: number,
  geminiApiKey: string,
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];

  for (const skill of skills) {
    for (let i = 0; i < questionsPerSkill; i++) {
      const type = QUESTION_TYPES[i % QUESTION_TYPES.length];
      const level = (Math.min(i + 1, 5)) as DifficultyLevel;
      const q = await generateQuestion(
        skill,
        level,
        type,
        resumeClaims,
        candidateWpm,
        geminiApiKey,
      );
      if (q) questions.push(q);
    }
  }

  return questions;
}
