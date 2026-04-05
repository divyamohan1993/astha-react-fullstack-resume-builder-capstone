/**
 * Tests for AICoachPanel component.
 * Covers: score calculation, suggestions for empty/filled/generic content.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { AICoachPanel } from '../components/AICoachPanel';
import type { Resume, Entry } from '@/store/types';

vi.mock('@/store/persist', () => ({
  createIndexedDBStorage: () => ({
    load: () => Promise.resolve(undefined),
    save: () => {},
  }),
}));

function makeEmptyResume(): Resume {
  return {
    id: 'test',
    meta: { createdAt: '', updatedAt: '', templateId: 'ats-classic' },
    personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '',
    sections: [
      { id: 'edu', type: 'education', heading: 'Education', layout: 'list', entries: [] },
      { id: 'exp', type: 'experience', heading: 'Experience', layout: 'list', entries: [] },
      { id: 'proj', type: 'projects', heading: 'Projects', layout: 'list', entries: [] },
      { id: 'skills', type: 'skills', heading: 'Skills', layout: 'tags', entries: [] },
      { id: 'cert', type: 'certifications', heading: 'Certifications', layout: 'list', entries: [] },
      { id: 'extra', type: 'extracurricular', heading: 'Extracurricular', layout: 'list', entries: [] },
    ],
  };
}

function makeSkillEntries(count: number): Entry[] {
  const bullets: string[] = [];
  for (let i = 0; i < count; i++) {
    bullets.push(`Skill${i}`);
  }
  return [{ id: 'sk-1', fields: { category: 'Tech' }, bullets }];
}

describe('AICoachPanel', () => {
  beforeEach(() => {
    useResumeStore.setState({ resume: makeEmptyResume(), loaded: true });
  });

  it('shows low score for empty resume', () => {
    render(<AICoachPanel />);
    // Empty resume with education+skills sections present but empty gets partial credit
    // The button text contains the score
    const btn = screen.getByRole('button', { name: /AI Resume Coach/i });
    const match = btn.textContent!.match(/(\d+)%/);
    const score = Number(match![1]);
    // Empty resume should have a low score (some sections exist so not zero)
    expect(score).toBeLessThan(30);
  });

  it('score increases when personal info is filled', () => {
    // Get baseline score
    const { unmount } = render(<AICoachPanel />);
    const baseBtn = screen.getByRole('button', { name: /AI Resume Coach/i });
    const baseMatch = baseBtn.textContent!.match(/(\d+)%/);
    const baseScore = Number(baseMatch![1]);
    unmount();

    // Fill personal info
    const resume = makeEmptyResume();
    resume.personal = {
      name: 'Astha Chandel',
      email: 'astha@test.com',
      phone: '+91 98765 43210',
      location: 'Solan',
      linkedin: 'https://linkedin.com/in/astha',
      github: '',
    };
    useResumeStore.setState({ resume });
    render(<AICoachPanel />);
    const btn = screen.getByRole('button', { name: /AI Resume Coach/i });
    const match = btn.textContent!.match(/(\d+)%/);
    const filledScore = Number(match![1]);
    expect(filledScore).toBeGreaterThan(baseScore);
  });

  it('shows education suggestion when education section empty', () => {
    render(<AICoachPanel />);
    const btn = screen.getByRole('button', { name: /AI Resume Coach/i });
    act(() => {
      fireEvent.click(btn);
    });
    // Should find either "Add your education details" or "Add an Education section"
    expect(screen.getByText(/Add your education details/i)).toBeInTheDocument();
  });

  it('shows "generic language" warning when summary contains "passionate"', () => {
    const resume = makeEmptyResume();
    resume.summary = 'I am a passionate developer who is motivated and hardworking with great team player skills and extensive experience.';
    useResumeStore.setState({ resume });
    render(<AICoachPanel />);
    const btn = screen.getByRole('button', { name: /AI Resume Coach/i });
    act(() => {
      fireEvent.click(btn);
    });
    expect(screen.getByText(/Remove generic language/i)).toBeInTheDocument();
  });

  it('no "too many skills" warning with < 15 skills', () => {
    const resume = makeEmptyResume();
    resume.sections = resume.sections.map((s) =>
      s.type === 'skills' ? { ...s, entries: makeSkillEntries(5) } : s,
    );
    useResumeStore.setState({ resume });
    render(<AICoachPanel />);
    const btn = screen.getByRole('button', { name: /AI Resume Coach/i });
    act(() => {
      fireEvent.click(btn);
    });
    const tooMany = screen.queryByText(/Trim your skills list/i);
    expect(tooMany).not.toBeInTheDocument();
  });

  it('shows "too many skills" when > 15 skills', () => {
    const resume = makeEmptyResume();
    resume.sections = resume.sections.map((s) =>
      s.type === 'skills' ? { ...s, entries: makeSkillEntries(20) } : s,
    );
    useResumeStore.setState({ resume });
    render(<AICoachPanel />);
    const btn = screen.getByRole('button', { name: /AI Resume Coach/i });
    act(() => {
      fireEvent.click(btn);
    });
    expect(screen.getByText(/Trim your skills list/i)).toBeInTheDocument();
  });
});
