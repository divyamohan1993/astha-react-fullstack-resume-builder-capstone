/**
 * Tests for resume templates.
 * Covers: ATSClassic, ModernBlue, Creative, Minimal rendering.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ATSClassic } from '../templates/ATSClassic';
import { ModernBlue } from '../templates/ModernBlue';
import { Creative } from '../templates/Creative';
import { Minimal } from '../templates/Minimal';
import type { Resume } from '@/store/types';

function makeResume(): Resume {
  return {
    id: 'test-resume',
    meta: {
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      templateId: 'ats-classic',
    },
    personal: {
      name: 'Astha Chandel',
      email: 'astha@example.com',
      phone: '+91 98765 43210',
      location: 'Solan, HP',
      linkedin: 'https://linkedin.com/in/astha',
      github: 'https://github.com/astha',
    },
    summary: 'CS student with strong skills in React and TypeScript.',
    sections: [
      {
        id: 'sec-edu',
        type: 'education',
        heading: 'Education',
        layout: 'list',
        entries: [
          {
            id: 'e1',
            fields: { institution: 'Shoolini University', degree: 'B.Tech CSE', duration: '2020-2024' },
            bullets: [],
          },
        ],
      },
      {
        id: 'sec-exp',
        type: 'experience',
        heading: 'Experience',
        layout: 'list',
        entries: [
          {
            id: 'e2',
            fields: { role: 'SDE Intern', company: 'TechCorp', duration: 'Jun-Aug 2023' },
            bullets: ['Built REST APIs', 'Reduced latency by 40%'],
          },
        ],
      },
      {
        id: 'sec-skills',
        type: 'skills',
        heading: 'Skills',
        layout: 'tags',
        entries: [
          {
            id: 'e3',
            fields: { category: 'Languages' },
            bullets: ['TypeScript', 'Python', 'Java'],
          },
        ],
      },
      {
        id: 'sec-proj',
        type: 'projects',
        heading: 'Projects',
        layout: 'list',
        entries: [
          {
            id: 'e4',
            fields: { name: 'ResumeAI', tech: 'React + Zustand' },
            bullets: ['Offline-first PWA'],
          },
        ],
      },
      {
        id: 'sec-cert',
        type: 'certifications',
        heading: 'Certifications',
        layout: 'list',
        entries: [],
      },
      {
        id: 'sec-extra',
        type: 'extracurricular',
        heading: 'Extracurricular',
        layout: 'list',
        entries: [],
      },
    ],
  };
}

describe('ATSClassic', () => {
  it('renders personal info (name, email, phone)', () => {
    render(<ATSClassic resume={makeResume()} />);
    expect(screen.getByText('Astha Chandel')).toBeInTheDocument();
    expect(screen.getByText('astha@example.com')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
  });

  it('renders section headings', () => {
    render(<ATSClassic resume={makeResume()} />);
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('renders skill bullets', () => {
    render(<ATSClassic resume={makeResume()} />);
    expect(screen.getByText('TypeScript, Python, Java')).toBeInTheDocument();
  });

  it('renders summary text', () => {
    render(<ATSClassic resume={makeResume()} />);
    expect(screen.getByText(/CS student with strong skills/)).toBeInTheDocument();
  });
});

describe('ModernBlue', () => {
  it('renders two-column layout with aside and main', () => {
    const { container } = render(<ModernBlue resume={makeResume()} />);
    expect(container.querySelector('aside')).toBeInTheDocument();
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('renders personal name', () => {
    render(<ModernBlue resume={makeResume()} />);
    expect(screen.getByText('Astha Chandel')).toBeInTheDocument();
  });

  it('renders contact info in sidebar', () => {
    render(<ModernBlue resume={makeResume()} />);
    expect(screen.getByText('astha@example.com')).toBeInTheDocument();
  });
});

describe('Creative', () => {
  it('renders without crashing with valid Resume data', () => {
    const { container } = render(<Creative resume={makeResume()} />);
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(screen.getByText('Astha Chandel')).toBeInTheDocument();
  });
});

describe('Minimal', () => {
  it('renders without crashing with valid Resume data', () => {
    const { container } = render(<Minimal resume={makeResume()} />);
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(screen.getByText('Astha Chandel')).toBeInTheDocument();
  });
});

describe('All templates', () => {
  const templates = [
    { name: 'ATSClassic', Component: ATSClassic },
    { name: 'ModernBlue', Component: ModernBlue },
    { name: 'Creative', Component: Creative },
    { name: 'Minimal', Component: Minimal },
  ];

  templates.forEach(({ name, Component }) => {
    it(`${name} renders without crashing given valid Resume data`, () => {
      expect(() => render(<Component resume={makeResume()} />)).not.toThrow();
    });
  });
});
