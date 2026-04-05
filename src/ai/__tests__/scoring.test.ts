/**
 * Tests for the AI scoring pipeline.
 *
 * Covers: jaccard, tfidf, cosineSimilarity, distanceDecay, gpaScore,
 * valueRubric, and ScoreAgent with known fixture data.
 */

import { describe, it, expect } from 'vitest';
import { jaccard } from '../scoring/jaccard';
import { TfIdfVectorizer, cosineSimilarity } from '../scoring/tfidf';
import { distanceScore, distanceScoreFromKm } from '../scoring/distanceDecay';
import { gpaScore } from '../scoring/gpaScore';
import {
  classifyProject,
  rubricScore,
} from '../scoring/valueRubric';
import { computeScore } from '../agents/ScoreAgent';
import type { L1Result } from '../agents/L1_NLPAgent';
import type { L2Result } from '../agents/L2_EmbedAgent';
import type { L3Result } from '../agents/L3_ReasonAgent';

// ============================================================
// Jaccard Similarity
// Citation: Jaccard, P. (1901). Bulletin de la Societe Vaudoise.
// ============================================================

describe('jaccard', () => {
  it('returns 1 for identical sets', () => {
    const s = new Set(['a', 'b', 'c']);
    expect(jaccard(s, s)).toBe(1);
  });

  it('returns 0 for disjoint sets', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['c', 'd']))).toBe(0);
  });

  it('returns 0 for two empty sets', () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it('returns 0 when one set is empty', () => {
    expect(jaccard(new Set(['a']), new Set())).toBe(0);
  });

  it('computes correct value for partial overlap', () => {
    // {a,b,c} ∩ {b,c,d} = {b,c}, union = {a,b,c,d}
    // Jaccard = 2/4 = 0.5
    expect(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBe(
      0.5
    );
  });

  it('is symmetric', () => {
    const a = new Set(['react', 'typescript', 'node']);
    const b = new Set(['typescript', 'python', 'django']);
    expect(jaccard(a, b)).toBe(jaccard(b, a));
  });
});

// ============================================================
// TF-IDF + Cosine Similarity
// Citation: Salton (1975), scikit-learn cosine_similarity
// ============================================================

describe('TfIdfVectorizer', () => {
  it('produces non-empty vectors for fitted documents', () => {
    const v = new TfIdfVectorizer();
    v.fit(['hello world', 'world of code']);
    const vec = v.transform('hello world');
    expect(vec.size).toBeGreaterThan(0);
  });

  it('gives higher weight to rare terms', () => {
    const v = new TfIdfVectorizer();
    v.fit(['apple banana', 'apple cherry', 'apple date']);
    const vec = v.transform('banana apple');
    // "banana" appears in 1/3 docs, "apple" in 3/3 docs
    // banana should have higher TF-IDF weight
    const bananaWeight = vec.get('banana') ?? 0;
    const appleWeight = vec.get('apple') ?? 0;
    expect(bananaWeight).toBeGreaterThan(appleWeight);
  });

  it('returns empty map for empty input', () => {
    const v = new TfIdfVectorizer();
    v.fit(['some text']);
    expect(v.transform('').size).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = new Map([
      ['a', 0.5],
      ['b', 0.5],
    ]);
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = new Map([['x', 1]]);
    const b = new Map([['y', 1]]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns 0 when either vector is empty', () => {
    expect(cosineSimilarity(new Map(), new Map([['a', 1]]))).toBe(0);
    expect(cosineSimilarity(new Map([['a', 1]]), new Map())).toBe(0);
  });

  it('produces values between 0 and 1 for non-negative vectors', () => {
    const a = new Map([
      ['react', 0.6],
      ['typescript', 0.4],
    ]);
    const b = new Map([
      ['react', 0.3],
      ['python', 0.7],
    ]);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// Distance Decay
// Citation: Marinescu & Rathelot (2018), AEJ:Macro 10(3):42-70
// ============================================================

describe('distanceScore', () => {
  it('returns 1.0 at 0 miles', () => {
    expect(distanceScore(0)).toBe(1);
  });

  it('returns ~0.65 at 10 miles (35% reduction)', () => {
    // exp(-0.043 * 10) = exp(-0.43) ≈ 0.6505
    expect(distanceScore(10)).toBeCloseTo(0.6505, 3);
  });

  it('returns ~0.34 at 25 miles', () => {
    // exp(-0.043 * 25) = exp(-1.075) ≈ 0.3413
    expect(distanceScore(25)).toBeCloseTo(0.3413, 3);
  });

  it('returns ~0.12 at 50 miles', () => {
    // exp(-0.043 * 50) = exp(-2.15) ≈ 0.1165
    expect(distanceScore(50)).toBeCloseTo(0.1165, 3);
  });

  it('approaches 0 for very large distances', () => {
    expect(distanceScore(200)).toBeLessThan(0.001);
  });

  it('returns 1 for negative distance', () => {
    expect(distanceScore(-5)).toBe(1);
  });
});

describe('distanceScoreFromKm', () => {
  it('converts km to miles then applies decay', () => {
    // 16.0934 km = 10 miles -> ~0.65
    expect(distanceScoreFromKm(16.0934)).toBeCloseTo(0.6505, 2);
  });
});

// ============================================================
// GPA Score
// Citation: NACE Job Outlook 2024, 38.3% use 3.0 cutoff
// ============================================================

describe('gpaScore', () => {
  it('returns 0.5 for null GPA (neutral)', () => {
    expect(gpaScore(null)).toBe(0.5);
  });

  it('returns 1.0 for GPA 4.0', () => {
    // (4.0 - 2.0) / 2.0 = 1.0
    expect(gpaScore(4.0)).toBe(1);
  });

  it('returns 0.5 for GPA 3.0 (median cutoff)', () => {
    // (3.0 - 2.0) / 2.0 = 0.5
    expect(gpaScore(3.0)).toBe(0.5);
  });

  it('returns 0.0 for GPA 2.0', () => {
    expect(gpaScore(2.0)).toBe(0);
  });

  it('returns 0.0 for GPA below 2.0', () => {
    expect(gpaScore(1.5)).toBe(0);
  });

  it('clamps at 1.0 for GPA above 4.0', () => {
    expect(gpaScore(4.5)).toBe(1);
  });

  it('returns 0.75 for GPA 3.5', () => {
    expect(gpaScore(3.5)).toBe(0.75);
  });
});

// ============================================================
// VALUE Rubric
// Citation: AAC&U VALUE Rubrics, aacu.org/value/rubrics
// ============================================================

describe('classifyProject', () => {
  it('classifies capstone: quantified + tech + methodology + problem', () => {
    const desc =
      'Built a REST API using Node.js and Express with TDD methodology, ' +
      'solving latency issues and achieving 200ms p95 response time serving 10k users';
    expect(classifyProject(desc)).toBe('capstone');
  });

  it('classifies milestone3: quantified + tech, no methodology', () => {
    const desc =
      'Developed a React dashboard that improved user engagement by 40%';
    expect(classifyProject(desc)).toBe('milestone3');
  });

  it('classifies milestone2: tech stack, no quantification', () => {
    const desc = 'Built a web application using React and Node.js for student management';
    expect(classifyProject(desc)).toBe('milestone2');
  });

  it('classifies benchmark: vague description', () => {
    const desc = 'Worked on a team project for college assignment about data';
    expect(classifyProject(desc)).toBe('benchmark');
  });
});

describe('rubricScore', () => {
  it('returns 1.0 for capstone', () => {
    expect(rubricScore('capstone')).toBe(1.0);
  });
  it('returns 0.75 for milestone3', () => {
    expect(rubricScore('milestone3')).toBe(0.75);
  });
  it('returns 0.5 for milestone2', () => {
    expect(rubricScore('milestone2')).toBe(0.5);
  });
  it('returns 0.25 for benchmark', () => {
    expect(rubricScore('benchmark')).toBe(0.25);
  });
});

// ============================================================
// ScoreAgent -- Composite scoring (spec section 6.13)
// ============================================================

describe('computeScore', () => {
  const baseL1: L1Result = {
    sections: ['education', 'experience', 'skills', 'projects', 'summary', 'contact'],
    keywords: ['react', 'typescript', 'node', 'python'],
    skills: ['react', 'typescript', 'node'],
    dates: ['2022', '2024'],
    email: 'test@example.com',
    phone: '+1234567890',
    name: 'Test Candidate',
    skillsScore: 0.7,
    educationScore: 0.8,
    completenessScore: 1.0,
    parseability: true,
  };

  const baseL2: L2Result = {
    semanticScore: 0.75,
    semanticMatches: ['react typescript', 'node express', 'web development'],
    method: 'tfidf-fallback',
  };

  it('produces a score between 0 and 100', () => {
    const result = computeScore(baseL1, baseL2, null, null);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('returns 0 when parseability fails (hard gate, spec 6.9)', () => {
    const l1 = { ...baseL1, parseability: false };
    const result = computeScore(l1, baseL2, null, null);
    expect(result.overall).toBe(0);
    expect(result.parseability).toBe(false);
  });

  it('applies red flag penalties (Henle et al. 2019)', () => {
    const l3: L3Result = {
      redFlags: [
        {
          type: 'contradiction',
          dimension: 'fabrication',
          description: 'Claimed degree not verifiable',
          evidence: 'PhD from unknown institution',
          penalty: -20,
          citation: 'Henle et al. (2019)',
        },
      ],
      experienceLevel: 'medium',
      projectScores: [3],
      reasoning: 'Found fabrication',
    };
    const withFlags = computeScore(baseL1, baseL2, l3, null);
    const withoutFlags = computeScore(baseL1, baseL2, null, null);
    expect(withFlags.overall).toBeLessThan(withoutFlags.overall);
  });

  it('includes distance score when distance is provided', () => {
    const result = computeScore(baseL1, baseL2, null, { km: 16 });
    expect(result.distance).not.toBeNull();
    expect(result.distance!.score).toBeGreaterThan(0);
    expect(result.distance!.score).toBeLessThanOrEqual(1);
  });

  it('excludes distance and redistributes weights when null', () => {
    const result = computeScore(baseL1, baseL2, null, null);
    expect(result.distance).toBeNull();
    // Score should still be valid (weights redistributed)
    expect(result.overall).toBeGreaterThan(0);
  });

  it('reports missing sections in completeness', () => {
    const l1: L1Result = {
      ...baseL1,
      sections: ['skills'],
      name: '',
      completenessScore: 0.2,
    };
    const result = computeScore(l1, baseL2, null, null);
    expect(result.completeness.missingSections.length).toBeGreaterThan(0);
  });

  it('uses L3 project scores when available (AAC&U VALUE rubric)', () => {
    const l3: L3Result = {
      redFlags: [],
      experienceLevel: 'high',
      projectScores: [4, 3, 2], // Capstone, Milestone3, Milestone2
      reasoning: 'Good projects',
    };
    const result = computeScore(baseL1, baseL2, l3, null);
    // Average: (4+3+2) / (3*4) = 9/12 = 0.75
    expect(result.projects.score).toBeCloseTo(0.75, 5);
  });

  it('detects leadership in extracurricular (Roulin & Bangerter 2013)', () => {
    const l1: L1Result = {
      ...baseL1,
      sections: [...baseL1.sections, 'extracurricular'],
      keywords: [...baseL1.keywords, 'president', 'club'],
    };
    const result = computeScore(l1, baseL2, null, null);
    expect(result.extracurricular.hasLeadership).toBe(true);
    // extra_score = 0.6 * 1 + 0.4 * 1 = 1.0
    expect(result.extracurricular.score).toBe(1.0);
  });

  it('never exceeds 100', () => {
    const l1: L1Result = {
      ...baseL1,
      skillsScore: 1.0,
      educationScore: 1.0,
      completenessScore: 1.0,
    };
    const l2: L2Result = { semanticScore: 1.0, semanticMatches: [], method: 'tfidf-fallback' };
    const result = computeScore(l1, l2, null, null);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});
