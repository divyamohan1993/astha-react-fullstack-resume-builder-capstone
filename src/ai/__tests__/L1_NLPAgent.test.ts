/**
 * Tests for L1 NLP Agent -- analyzeL1().
 * Covers: email/phone extraction, section detection, skills extraction,
 * parseability, skillsScore, completenessScore.
 */

import { describe, it, expect } from 'vitest';
import { analyzeL1 } from '../agents/L1_NLPAgent';

const GOOD_RESUME = `
Astha Chandel
astha@example.com | +91 98765 43210

Summary
Motivated CS student with expertise in React, TypeScript, and Python.

Education
Shoolini University, Solan, Himachal Pradesh
B.Tech Computer Science and Engineering | 2020-2024 | GPA: 8.5

Experience
Software Engineering Intern, TechCorp
June 2023 - August 2023
- Built REST APIs serving 10k requests/day
- Reduced response time by 40%

Projects
ResumeAI - AI-powered resume builder
- Built with React, TypeScript, Zustand
- Offline-first PWA with in-browser scoring

Skills
Technical Skills: React, TypeScript, Python, Node.js, SQL, Git
Soft Skills: Leadership, Communication, Problem Solving

Certifications
AWS Cloud Practitioner - Amazon Web Services - 2023
`;

const JD_TEXT = `
Software Development Engineer
Required: React, TypeScript, Python, Node.js, SQL
Preferred: AWS, Docker, CI/CD
Education: B.Tech Computer Science or equivalent
Location: Bangalore, India
`;

const GIBBERISH = 'asdkjfh qlwkejr xncv mnbzxcv 12345 !@#$%';

describe('analyzeL1', () => {
  it('extracts email from resume text', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.email).toBe('astha@example.com');
  });

  it('extracts phone number', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.phone).toMatch(/98765/);
  });

  it('detects Education section', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.sections).toContain('education');
  });

  it('detects Experience section', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.sections).toContain('experience');
  });

  it('detects Skills section', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.sections).toContain('skills');
  });

  it('detects Projects section', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.sections).toContain('projects');
  });

  it('extracts skills from skills section', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.skills.length).toBeGreaterThan(0);
    // Should find common skill tokens
    expect(result.skills).toContain('react');
  });

  it('parseability=true when sections found', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.parseability).toBe(true);
  });

  it('parseability=false when gibberish', () => {
    const result = analyzeL1(GIBBERISH, JD_TEXT);
    expect(result.parseability).toBe(false);
  });

  it('skillsScore > 0 when resume skills match JD skills', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.skillsScore).toBeGreaterThan(0);
  });

  it('skillsScore is lower for unrelated resume', () => {
    const unrelated = 'Chef with 10 years experience in French cuisine. Pastry, baking, sauteing.';
    const result = analyzeL1(unrelated, JD_TEXT);
    const goodResult = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.skillsScore).toBeLessThan(goodResult.skillsScore);
  });

  it('completenessScore based on expected sections present', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    // Good resume has name, education, skills, projects/experience, summary = 5/5
    expect(result.completenessScore).toBe(1.0);
  });

  it('completenessScore is lower when sections missing', () => {
    const minimal = 'John Doe\njohn@test.com\nSkills: Python';
    const result = analyzeL1(minimal, JD_TEXT);
    expect(result.completenessScore).toBeLessThan(1.0);
  });

  it('extracts name from first line', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.name).toBe('Astha Chandel');
  });

  it('detects certifications section', () => {
    const result = analyzeL1(GOOD_RESUME, JD_TEXT);
    expect(result.sections).toContain('certifications');
  });
});
