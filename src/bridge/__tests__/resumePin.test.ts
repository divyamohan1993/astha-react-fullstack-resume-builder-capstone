import { describe, it, expect } from 'vitest';
import {
  normalizeResumeText,
  hashResume,
  computeChangePct,
  classifyChange,
  createResumePin,
} from '../resumePin';
import type { Resume } from '@/store/types';

describe('normalizeResumeText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeResumeText('  Hello   World  ')).toBe('hello world');
  });

  it('strips punctuation', () => {
    expect(normalizeResumeText('Hello, World! How are you?')).toBe(
      'hello world how are you',
    );
  });

  it('keeps alphanumeric and spaces only', () => {
    expect(normalizeResumeText('C++ & C# @work')).toBe('c c work');
  });

  it('handles empty string', () => {
    expect(normalizeResumeText('')).toBe('');
  });

  it('handles string with only punctuation', () => {
    expect(normalizeResumeText('!@#$%^&*()')).toBe('');
  });
});

describe('hashResume', () => {
  it('returns consistent hash for same content', async () => {
    const hash1 = await hashResume('hello world');
    const hash2 = await hashResume('hello world');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different content', async () => {
    const hash1 = await hashResume('hello world');
    const hash2 = await hashResume('hello universe');
    expect(hash1).not.toBe(hash2);
  });

  it('returns a 64-character hex string', async () => {
    const hash = await hashResume('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('computeChangePct', () => {
  it('returns 0 for identical texts', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    expect(computeChangePct(text, text)).toBe(0);
  });

  it('returns 100 for completely different texts', () => {
    const a = 'alpha beta gamma delta epsilon zeta eta theta';
    const b = 'uno dos tres cuatro cinco seis siete ocho';
    expect(computeChangePct(a, b)).toBe(100);
  });

  it('returns partial value for partial edit', () => {
    const a = 'the quick brown fox jumps over the lazy dog';
    const b = 'the quick red fox jumps over the lazy cat';
    const pct = computeChangePct(a, b);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it('handles short texts with unigrams and bigrams', () => {
    const a = 'hello world';
    const b = 'hello earth';
    const pct = computeChangePct(a, b);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it('handles empty strings', () => {
    expect(computeChangePct('', '')).toBe(0);
    expect(computeChangePct('hello', '')).toBe(100);
    expect(computeChangePct('', 'hello')).toBe(100);
  });
});

describe('classifyChange', () => {
  it('returns same for < 10%', () => {
    expect(classifyChange(0)).toBe('same');
    expect(classifyChange(5)).toBe('same');
    expect(classifyChange(9.9)).toBe('same');
  });

  it('returns moderate for 10-30%', () => {
    expect(classifyChange(10)).toBe('moderate');
    expect(classifyChange(20)).toBe('moderate');
    expect(classifyChange(30)).toBe('moderate');
  });

  it('returns substantial for > 30%', () => {
    expect(classifyChange(30.1)).toBe('substantial');
    expect(classifyChange(50)).toBe('substantial');
    expect(classifyChange(100)).toBe('substantial');
  });
});

describe('createResumePin', () => {
  const mockResume: Resume = {
    id: 'r1',
    meta: {
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      templateId: 'ats-classic',
    },
    personal: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-1234',
      location: 'Delhi',
      linkedin: 'linkedin.com/jane',
      github: 'github.com/jane',
    },
    summary: 'Experienced software engineer.',
    sections: [
      {
        id: 's1',
        type: 'experience',
        heading: 'Work Experience',
        layout: 'list',
        entries: [
          {
            id: 'e1',
            fields: { title: 'Senior Dev', company: 'Acme Corp' },
            bullets: ['Led team of 5', 'Built microservices'],
          },
        ],
      },
      {
        id: 's2',
        type: 'skills',
        heading: 'Skills',
        layout: 'tags',
        entries: [
          {
            id: 'e2',
            fields: { skills: 'TypeScript, React, Node.js' },
            bullets: ['Python', 'Docker'],
          },
        ],
      },
      {
        id: 's3',
        type: 'education',
        heading: 'Education',
        layout: 'list',
        entries: [
          {
            id: 'e3',
            fields: { degree: 'B.Tech', institution: 'IIT Delhi' },
            bullets: [],
          },
        ],
      },
    ],
  };

  it('returns a ResumePin with hash and scoreAtTest', async () => {
    const pin = await createResumePin(mockResume, 85);
    expect(pin.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(pin.scoreAtTest).toBe(85);
  });

  it('extracts section headings', async () => {
    const pin = await createResumePin(mockResume, 85);
    expect(pin.sections).toContain('Work Experience');
    expect(pin.sections).toContain('Skills');
    expect(pin.sections).toContain('Education');
  });

  it('extracts skills from skills sections', async () => {
    const pin = await createResumePin(mockResume, 85);
    expect(pin.skillsClaimed).toContain('TypeScript');
    expect(pin.skillsClaimed).toContain('React');
    expect(pin.skillsClaimed).toContain('Node.js');
    expect(pin.skillsClaimed).toContain('Python');
    expect(pin.skillsClaimed).toContain('Docker');
  });

  it('produces consistent hash for same resume', async () => {
    const pin1 = await createResumePin(mockResume, 85);
    const pin2 = await createResumePin(mockResume, 90);
    expect(pin1.hash).toBe(pin2.hash);
  });
});
