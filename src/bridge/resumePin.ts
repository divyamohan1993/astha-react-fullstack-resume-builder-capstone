import type { Resume } from '@/store/types';
import type { ResumePin } from '@/bridge/types';

export function normalizeResumeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function hashResume(normalizedText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedText);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildNgrams(words: string[], n: number): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(' '));
  }
  return grams;
}

function unionSize(a: Set<string>, b: Set<string>): number {
  const union = new Set(a);
  for (const item of b) union.add(item);
  return union.size;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}

export function computeChangePct(
  oldNormalized: string,
  newNormalized: string,
): number {
  if (oldNormalized === newNormalized) return 0;
  const oldWords = oldNormalized.split(/\s+/).filter(Boolean);
  const newWords = newNormalized.split(/\s+/).filter(Boolean);
  if (oldWords.length === 0 && newWords.length === 0) return 0;
  if (oldWords.length === 0 || newWords.length === 0) return 100;

  const allGramsOld = new Set<string>();
  const allGramsNew = new Set<string>();

  const maxN = Math.min(3, Math.max(oldWords.length, newWords.length));
  for (let n = 1; n <= maxN; n++) {
    for (const g of buildNgrams(oldWords, n)) allGramsOld.add(g);
    for (const g of buildNgrams(newWords, n)) allGramsNew.add(g);
  }

  const union = unionSize(allGramsOld, allGramsNew);
  if (union === 0) return 0;
  const intersection = intersectionSize(allGramsOld, allGramsNew);
  const jaccard = intersection / union;
  return Math.round((1 - jaccard) * 100);
}

export function classifyChange(
  changePct: number,
): 'same' | 'moderate' | 'substantial' {
  if (changePct < 10) return 'same';
  if (changePct <= 30) return 'moderate';
  return 'substantial';
}

function extractResumeText(resume: Resume): string {
  const parts: string[] = [];

  parts.push(resume.personal.name);
  parts.push(resume.personal.email);
  parts.push(resume.summary);

  for (const section of resume.sections) {
    parts.push(section.heading);
    for (const entry of section.entries) {
      for (const value of Object.values(entry.fields)) {
        parts.push(value);
      }
      for (const bullet of entry.bullets) {
        parts.push(bullet);
      }
    }
  }

  return parts.filter(Boolean).join(' ');
}

function extractSkills(resume: Resume): string[] {
  const skills: string[] = [];

  for (const section of resume.sections) {
    if (section.type !== 'skills') continue;
    for (const entry of section.entries) {
      for (const value of Object.values(entry.fields)) {
        const parsed = value
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        skills.push(...parsed);
      }
      for (const bullet of entry.bullets) {
        const parsed = bullet
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        skills.push(...parsed);
      }
    }
  }

  return [...new Set(skills)];
}

export async function createResumePin(
  resume: Resume,
  scoreAtTest: number,
): Promise<ResumePin> {
  const rawText = extractResumeText(resume);
  const normalized = normalizeResumeText(rawText);
  const hash = await hashResume(normalized);
  const sections = resume.sections.map((s) => s.heading);
  const skillsClaimed = extractSkills(resume);

  return { hash, scoreAtTest, sections, skillsClaimed };
}
