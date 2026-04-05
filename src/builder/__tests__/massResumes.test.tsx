/**
 * Mass Resume Generation Tests
 *
 * Tests all 4 templates against a variety of fake resumes:
 * - Full/overloaded content (many sections, long bullets, many skills)
 * - Minimal/underflow content (just name, nothing else)
 * - Incomplete entries (partial fields, missing required fields)
 * - Edge cases (unicode, very long strings, empty strings, special chars)
 * - Single field only resumes
 * - 20+ skill categories, 50+ skills
 * - 10+ experience entries
 * - Custom sections with various layouts
 *
 * Verifies: no crashes, correct content rendering, graceful empty handling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Resume, Section, Entry } from '@/store/types';
import { ATSClassic } from '../templates/ATSClassic';
import { ModernBlue } from '../templates/ModernBlue';
import { Creative } from '../templates/Creative';
import { Minimal } from '../templates/Minimal';
import { templateRegistry } from '../templates/index';

// ============================================================
// Helpers
// ============================================================

let _id = 0;
function id(): string {
  return `test-${++_id}`;
}

function entry(fields: Record<string, string>, bullets: string[] = []): Entry {
  return { id: id(), fields, bullets };
}

function section(
  type: Section['type'],
  heading: string,
  layout: Section['layout'],
  entries: Entry[],
): Section {
  return { id: id(), type, heading, layout, entries };
}

function resume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: id(),
    meta: {
      createdAt: '2026-04-05T00:00:00Z',
      updatedAt: '2026-04-05T00:00:00Z',
      templateId: 'ats-classic',
    },
    personal: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    sections: [],
    ...overrides,
  };
}

const TEMPLATES = Object.entries(templateRegistry) as [string, typeof ATSClassic][];

// ============================================================
// Fake Resume Generators
// ============================================================

function makeFullResume(): Resume {
  return resume({
    personal: {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+91-9876543210',
      location: 'Mumbai, Maharashtra',
      linkedin: 'https://linkedin.com/in/priyasharma',
      github: 'https://github.com/priyasharma',
    },
    summary:
      'Full-stack developer with 2 years of experience building scalable web applications using React, Node.js, and PostgreSQL. Led a team of 4 during capstone project. Passionate about accessible design and performance optimization. Experienced in CI/CD pipelines and cloud deployment.',
    sections: [
      section('education', 'Education', 'list', [
        entry(
          {
            institution: 'Indian Institute of Technology Bombay',
            degree: 'BTech Computer Science',
            duration: '2022 - 2026',
            gpa: '8.9 CGPA',
            coursework:
              'Data Structures, Algorithms, Machine Learning, Database Systems, Computer Networks, Operating Systems',
          },
          [],
        ),
        entry(
          {
            institution: 'Delhi Public School',
            degree: 'CBSE Class XII',
            duration: '2020 - 2022',
            gpa: '95.6%',
          },
          [],
        ),
      ]),
      section('experience', 'Experience', 'list', [
        entry(
          {
            role: 'Software Engineering Intern',
            company: 'Google India',
            duration: 'May 2025 - Aug 2025',
            location: 'Bangalore',
          },
          [
            'Built real-time data pipeline processing 2M events/day using Apache Kafka and Go',
            'Reduced API response latency by 35% through query optimization and Redis caching',
            'Implemented feature flags system serving 500K daily active users',
            'Authored 150+ unit tests achieving 92% code coverage on critical paths',
          ],
        ),
        entry(
          {
            role: 'Full Stack Developer Intern',
            company: 'Flipkart',
            duration: 'Jan 2025 - Apr 2025',
            location: 'Remote',
          },
          [
            'Developed React dashboard for supply chain analytics used by 200+ warehouse managers',
            'Integrated GraphQL APIs with PostgreSQL reducing frontend data fetching by 60%',
            'Migrated legacy jQuery codebase to React improving load time from 8s to 1.2s',
          ],
        ),
      ]),
      section('projects', 'Projects', 'list', [
        entry(
          {
            name: 'ResumeAI',
            tech: 'React, TypeScript, Vite, ONNX Runtime, WebLLM',
            description:
              'Offline-first resume builder with in-browser AI scoring using Gemma 3 and research-backed ATS parameters',
            url: 'https://github.com/priya/resumeai',
          },
          [
            'Implemented 4-layer AI pipeline: NLP keyword extraction, MiniLM embeddings, Gemma 3 reasoning, Gemini fallback',
            'Built 4 ATS-optimized templates with @media print CSS producing clean A4 output',
            'Achieved 100% offline functionality via Workbox service worker and IndexedDB persistence',
          ],
        ),
        entry(
          {
            name: 'EcoTrack',
            tech: 'Python, FastAPI, React Native, PostgreSQL',
            description: 'Carbon footprint tracking mobile app with gamification',
          },
          [
            'Built REST API handling 50K daily requests with <100ms p95 latency',
            'Implemented leaderboard with real-time updates using WebSockets',
          ],
        ),
      ]),
      section('skills', 'Skills', 'tags', [
        entry({ category: 'Languages' }, ['Python', 'TypeScript', 'JavaScript', 'Go', 'SQL', 'Rust']),
        entry({ category: 'Frontend' }, ['React', 'Next.js', 'Tailwind CSS', 'Vue.js', 'HTML5', 'CSS3']),
        entry({ category: 'Backend' }, ['Node.js', 'FastAPI', 'Django', 'Express', 'GraphQL']),
        entry({ category: 'Databases' }, ['PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB']),
        entry({ category: 'DevOps' }, ['Docker', 'Kubernetes', 'AWS', 'GCP', 'CI/CD', 'Terraform']),
        entry({ category: 'Tools' }, ['Git', 'Vim', 'Linux', 'Figma', 'Jira']),
      ]),
      section('certifications', 'Certifications', 'list', [
        entry({ name: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', date: 'Mar 2025', url: 'https://aws.amazon.com/cert/123' }, []),
        entry({ name: 'Google Cloud Digital Leader', issuer: 'Google', date: 'Jan 2025' }, []),
      ]),
      section('extracurricular', 'Extracurricular & Leadership', 'list', [
        entry(
          { role: 'President', org: 'Coding Club IIT Bombay', duration: '2024 - 2025' },
          ['Organized hackathon with 500+ participants from 30 colleges', 'Led weekly workshops on competitive programming'],
        ),
        entry(
          { role: 'Open Source Contributor', org: 'Mozilla Firefox', duration: '2023 - Present' },
          ['Contributed 12 pull requests to CSS layout engine'],
        ),
      ]),
    ],
  });
}

function makeMinimalResume(): Resume {
  return resume({
    personal: { name: 'Raj Kumar', email: '', phone: '', location: '', linkedin: '', github: '' },
  });
}

function makeNameOnlyResume(): Resume {
  return resume({
    personal: { name: 'A', email: '', phone: '', location: '', linkedin: '', github: '' },
  });
}

function makeTotallyEmptyResume(): Resume {
  return resume();
}

function makeOnlyEmailResume(): Resume {
  return resume({
    personal: { name: '', email: 'test@test.com', phone: '', location: '', linkedin: '', github: '' },
  });
}

function makeOverloadedResume(): Resume {
  // 10 experience entries, 50+ skills, very long bullets
  const experiences: Entry[] = Array.from({ length: 10 }, (_, i) =>
    entry(
      {
        role: `Software Engineer ${i + 1}`,
        company: `Company ${String.fromCharCode(65 + i)}`,
        duration: `${2016 + i} - ${2017 + i}`,
        location: `City ${i + 1}`,
      },
      Array.from({ length: 8 }, (_, j) =>
        `Accomplished task ${j + 1} involving complex distributed systems architecture, microservices migration, database sharding, and performance optimization resulting in ${(j + 1) * 15}% improvement across all key metrics including throughput, latency, error rates, and user satisfaction scores measured over a 6-month period`,
      ),
    ),
  );

  const skillCategories: Entry[] = Array.from({ length: 8 }, (_, i) =>
    entry(
      { category: `Category ${i + 1}` },
      Array.from({ length: 12 }, (_, j) => `Skill_${i}_${j}`),
    ),
  );

  return resume({
    personal: {
      name: 'Overloaded Candidate With An Extremely Long Name That Might Cause Layout Issues',
      email: 'extremely.long.email.address.that.goes.on.and.on@very-long-domain-name-example.co.in',
      phone: '+91-9876543210-ext-12345',
      location: 'Thiruvananthapuram, Kerala, India, Earth, Solar System',
      linkedin: 'https://www.linkedin.com/in/overloaded-candidate-with-a-very-long-profile-slug-123456789',
      github: 'https://github.com/overloaded-candidate-with-impossibly-long-username',
    },
    summary: Array.from({ length: 10 }, () =>
      'This is a very verbose summary sentence that goes on and on repeating itself to test how templates handle extremely long summary text that exceeds what any reasonable person would write in a professional resume summary section.'
    ).join(' '),
    sections: [
      section('education', 'Education', 'list', [
        entry({
          institution: 'The Very Long Name International Institute of Technology and Advanced Research Studies',
          degree: 'Master of Technology in Computer Science and Engineering with Specialization in Artificial Intelligence and Machine Learning',
          duration: '2020 - 2022',
          gpa: '9.8/10 CGPA with Distinction and Gold Medal',
          coursework: Array.from({ length: 20 }, (_, i) => `Course ${i + 1}`).join(', '),
        }, []),
      ]),
      section('experience', 'Experience', 'list', experiences),
      section('skills', 'Skills', 'tags', skillCategories),
      section('projects', 'Projects', 'list', [
        entry(
          {
            name: 'A Project With An Extremely Long Title That Tests Title Wrapping Behavior',
            tech: Array.from({ length: 15 }, (_, i) => `Tech${i}`).join(', '),
            description: 'x'.repeat(500),
            url: 'https://github.com/' + 'a'.repeat(100),
          },
          Array.from({ length: 12 }, (_, i) => `Bullet point ${i + 1} with detailed description of what was done`),
        ),
      ]),
    ],
  });
}

function makeIncompleteEntriesResume(): Resume {
  return resume({
    personal: {
      name: 'Incomplete Person',
      email: 'half@done.com',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    sections: [
      // Education with only institution, no degree/duration/gpa
      section('education', 'Education', 'list', [
        entry({ institution: 'Some University' }, []),
        entry({ degree: 'BTech' }, []), // no institution
        entry({}, []), // completely empty entry
      ]),
      // Experience with only role, no company
      section('experience', 'Experience', 'list', [
        entry({ role: 'Intern' }, []),
        entry({ company: 'SomeCorp' }, []), // no role
        entry({ role: 'Developer', company: 'TechCo' }, []), // no bullets
        entry({}, ['Bullet with no parent fields']), // bullets but no fields
      ]),
      // Projects with only name
      section('projects', 'Projects', 'list', [
        entry({ name: 'Half Project' }, []),
        entry({ tech: 'React' }, []), // tech but no name
      ]),
      // Skills with empty categories
      section('skills', 'Skills', 'tags', [
        entry({ category: 'Languages' }, []), // category but no skills
        entry({}, ['Python', 'Go']), // skills but no category
        entry({ category: '' }, ['Rust']), // empty category string
      ]),
      // Empty sections
      section('certifications', 'Certifications', 'list', []),
      section('extracurricular', 'Leadership', 'list', []),
    ],
  });
}

function makeUnicodeResume(): Resume {
  return resume({
    personal: {
      name: 'आस्था चंदेल',
      email: 'आस्था@example.com',
      phone: '+91-9876543210',
      location: 'सोलन, हिमाचल प्रदेश',
      linkedin: '',
      github: '',
    },
    summary: 'हिंदी में सारांश। RTL text: مرحبا بالعالم. Emoji: 🚀💻🎓. CJK: 你好世界. Tamil: வணக்கம்.',
    sections: [
      section('education', 'शिक्षा', 'list', [
        entry({ institution: 'शूलिनी विश्वविद्यालय', degree: 'बीटेक कंप्यूटर साइंस', duration: '२०२२ - २०२६', gpa: '८.५' }, []),
      ]),
      section('skills', 'कौशल', 'tags', [
        entry({ category: 'भाषाएँ' }, ['पायथन', 'जावास्क्रिप्ट', 'टाइपस्क्रिप्ट']),
        entry({ category: '日本語' }, ['リアクト', 'ノード']),
      ]),
      section('experience', 'अनुभव', 'list', [
        entry(
          { role: 'डेवलपर इंटर्न', company: 'テック株式会社', duration: 'مايو ٢٠٢٥' },
          ['Built API handling 1万 requests/day', 'تحسين الأداء بنسبة 40٪'],
        ),
      ]),
    ],
  });
}

function makeSpecialCharsResume(): Resume {
  return resume({
    personal: {
      name: "O'Brien-Smith & Partners <script>alert('xss')</script>",
      email: 'test+special@exam"ple.com',
      phone: '+1 (555) 123-4567 ext. 890',
      location: 'São Paulo, Brazil / München, Deutschland',
      linkedin: 'https://linkedin.com/in/o%27brien',
      github: 'https://github.com/user?tab=repos&q=test',
    },
    summary: 'C++ developer with experience in "enterprise" solutions. Uses <angular> & React. Salary: $150K+. Ratio: 3/4.',
    sections: [
      section('experience', 'Experience', 'list', [
        entry(
          { role: 'C++ / C# Developer', company: 'AT&T / T-Mobile', duration: '2020-2025', location: 'N/A' },
          [
            'Improved performance by ~45% using O(n log n) algorithm',
            'Managed $2M budget for infrastructure & DevOps',
            'Tech: C++, C#, F#, SQL*Plus, PL/SQL',
            "Fixed bugs in customer's codebase (100% SLA compliance)",
          ],
        ),
      ]),
    ],
  });
}

function makeSingleSectionResumes(): Resume[] {
  return [
    // Only education
    resume({
      personal: { name: 'Edu Only', email: 'edu@test.com', phone: '', location: '', linkedin: '', github: '' },
      sections: [
        section('education', 'Education', 'list', [
          entry({ institution: 'MIT', degree: 'CS', duration: '2020-2024' }, []),
        ]),
      ],
    }),
    // Only skills
    resume({
      personal: { name: 'Skills Only', email: '', phone: '', location: '', linkedin: '', github: '' },
      sections: [
        section('skills', 'Skills', 'tags', [
          entry({ category: 'Programming' }, ['Python', 'Java']),
        ]),
      ],
    }),
    // Only summary
    resume({
      personal: { name: 'Summary Person', email: '', phone: '', location: '', linkedin: '', github: '' },
      summary: 'I am a developer with some experience.',
    }),
    // Only custom section
    resume({
      personal: { name: 'Custom Only', email: '', phone: '', location: '', linkedin: '', github: '' },
      sections: [
        section('custom', 'Publications', 'list', [
          entry({ name: 'My Paper', description: 'Published in IEEE' }, []),
        ]),
      ],
    }),
  ];
}

function makeOneBulletResume(): Resume {
  return resume({
    personal: { name: 'One Bullet', email: 'one@test.com', phone: '', location: '', linkedin: '', github: '' },
    sections: [
      section('experience', 'Experience', 'list', [
        entry({ role: 'Intern', company: 'Co' }, ['Did stuff']),
      ]),
    ],
  });
}

function makeManyCustomSectionsResume(): Resume {
  return resume({
    personal: { name: 'Custom Sections Person', email: 'custom@test.com', phone: '', location: '', linkedin: '', github: '' },
    sections: [
      section('custom', 'Publications', 'list', [
        entry({ name: 'Paper 1' }, ['Published at ICML 2025']),
        entry({ name: 'Paper 2' }, ['Published at NeurIPS 2025']),
      ]),
      section('custom', 'Awards', 'list', [
        entry({ name: 'Best Paper Award', description: 'ICML 2025' }, []),
      ]),
      section('custom', 'Languages', 'tags', [
        entry({}, ['English', 'Hindi', 'Japanese', 'French']),
      ]),
      section('custom', 'Volunteer Work', 'list', [
        entry({ role: 'Mentor', org: 'Code.org', duration: '2024' }, ['Taught 50 students']),
      ]),
      section('custom', 'Hobbies', 'freetext', [
        entry({ content: 'Chess, hiking, photography, open source contribution' }, []),
      ]),
    ],
  });
}

// ============================================================
// Test matrix: every resume variant x every template
// ============================================================

const RESUME_VARIANTS: [string, () => Resume | Resume[]][] = [
  ['full/realistic', makeFullResume],
  ['minimal (name only)', makeMinimalResume],
  ['single letter name', makeNameOnlyResume],
  ['totally empty', makeTotallyEmptyResume],
  ['only email', makeOnlyEmailResume],
  ['overloaded (10 exp, 96 skills, long strings)', makeOverloadedResume],
  ['incomplete entries (partial fields, empty entries)', makeIncompleteEntriesResume],
  ['unicode (Hindi, Arabic, CJK, emoji)', makeUnicodeResume],
  ['special characters (XSS, ampersands, quotes, slashes)', makeSpecialCharsResume],
  ['one bullet point total', makeOneBulletResume],
  ['many custom sections', makeManyCustomSectionsResume],
];

describe('Mass Resume Template Tests', () => {
  // Core matrix: every variant x every template = no crash
  describe.each(TEMPLATES)('Template: %s', (templateName, Template) => {
    it.each(RESUME_VARIANTS)('renders %s without crashing', (_label, generator) => {
      const data = generator();
      const resumes = Array.isArray(data) ? data : [data];
      for (const r of resumes) {
        const { unmount } = render(<Template resume={r} />);
        unmount();
      }
    });
  });

  // Single-section variants separately (array of resumes)
  describe.each(TEMPLATES)('Template: %s - single section resumes', (templateName, Template) => {
    const singles = makeSingleSectionResumes();
    it.each([
      ['only education', singles[0]],
      ['only skills', singles[1]],
      ['only summary', singles[2]],
      ['only custom section', singles[3]],
    ] as const)('renders %s', (_label, r) => {
      const { unmount } = render(<Template resume={r} />);
      unmount();
    });
  });
});

// ============================================================
// Content verification tests
// ============================================================

describe('Full resume content verification', () => {
  const full = makeFullResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders the candidate name', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });

    it('renders email', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('priya.sharma@example.com')).toBeInTheDocument();
    });

    it('renders phone', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('+91-9876543210')).toBeInTheDocument();
    });

    it('renders education institution', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('Indian Institute of Technology Bombay')).toBeInTheDocument();
    });

    it('renders experience role', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('Software Engineering Intern')).toBeInTheDocument();
    });

    it('renders experience bullet with metric', () => {
      render(<Template resume={full} />);
      expect(screen.getByText(/2M events\/day/)).toBeInTheDocument();
    });

    it('renders project name', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('ResumeAI')).toBeInTheDocument();
    });

    it('renders skills', () => {
      render(<Template resume={full} />);
      expect(screen.getAllByText(/Python/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/React/).length).toBeGreaterThan(0);
    });

    it('renders certification', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('AWS Solutions Architect Associate')).toBeInTheDocument();
    });

    it('renders extracurricular role', () => {
      render(<Template resume={full} />);
      expect(screen.getByText('President')).toBeInTheDocument();
    });
  });
});

// ============================================================
// Empty/underflow handling
// ============================================================

describe('Empty resume handling', () => {
  const empty = makeTotallyEmptyResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders fallback name for empty personal', () => {
      render(<Template resume={empty} />);
      expect(screen.getByText('Your Name')).toBeInTheDocument();
    });

    it('does not render summary section when empty', () => {
      const { container } = render(<Template resume={empty} />);
      expect(container.textContent).not.toContain('Summary');
    });

    it('does not crash with zero sections', () => {
      const { container } = render(<Template resume={empty} />);
      expect(container).toBeTruthy();
    });
  });
});

// ============================================================
// Incomplete entries: partial fields, empty entries
// ============================================================

describe('Incomplete entries handling', () => {
  const incomplete = makeIncompleteEntriesResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders without crashing', () => {
      const { container } = render(<Template resume={incomplete} />);
      expect(container).toBeTruthy();
    });

    it('renders name', () => {
      render(<Template resume={incomplete} />);
      expect(screen.getByText('Incomplete Person')).toBeInTheDocument();
    });

    it('renders entries that have at least some data', () => {
      render(<Template resume={incomplete} />);
      expect(screen.getByText('Some University')).toBeInTheDocument();
    });

    it('renders role-only experience entry', () => {
      render(<Template resume={incomplete} />);
      expect(screen.getByText('Intern')).toBeInTheDocument();
    });

    it('renders bullets even without parent fields', () => {
      render(<Template resume={incomplete} />);
      expect(screen.getByText('Bullet with no parent fields')).toBeInTheDocument();
    });

    it('skips empty sections (certifications, extracurricular with 0 entries)', () => {
      const { container } = render(<Template resume={incomplete} />);
      // Empty sections return null, so their headings should not appear
      // Certifications has 0 entries, Leadership has 0 entries
      const text = container.textContent ?? '';
      expect(text).not.toContain('Certifications');
      expect(text).not.toContain('Leadership');
    });

    it('handles skills with empty category string', () => {
      render(<Template resume={incomplete} />);
      // "Rust" skill with empty category should still render
      expect(screen.getByText(/Rust/)).toBeInTheDocument();
    });
  });
});

// ============================================================
// Overloaded resume: tests that long content doesn't crash
// ============================================================

describe('Overloaded resume handling', () => {
  const overloaded = makeOverloadedResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders without crashing', () => {
      const { container } = render(<Template resume={overloaded} />);
      expect(container).toBeTruthy();
    });

    it('renders the long name', () => {
      render(<Template resume={overloaded} />);
      expect(screen.getByText(/Overloaded Candidate/)).toBeInTheDocument();
    });

    it('renders all 10 experience entries', () => {
      render(<Template resume={overloaded} />);
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Software Engineer ${i}`)).toBeInTheDocument();
      }
    });

    it('renders skill categories', () => {
      render(<Template resume={overloaded} />);
      expect(screen.getByText(/Category 1/)).toBeInTheDocument();
      expect(screen.getByText(/Category 8/)).toBeInTheDocument();
    });

    it('renders many skills without truncation', () => {
      render(<Template resume={overloaded} />);
      expect(screen.getByText(/Skill_0_0/)).toBeInTheDocument();
      expect(screen.getByText(/Skill_7_11/)).toBeInTheDocument();
    });

    it('handles long email without crashing', () => {
      render(<Template resume={overloaded} />);
      expect(screen.getByText(/extremely.long.email/)).toBeInTheDocument();
    });
  });
});

// ============================================================
// Unicode handling
// ============================================================

describe('Unicode resume handling', () => {
  const unicode = makeUnicodeResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders Hindi name', () => {
      render(<Template resume={unicode} />);
      expect(screen.getByText('आस्था चंदेल')).toBeInTheDocument();
    });

    it('renders Hindi institution', () => {
      render(<Template resume={unicode} />);
      expect(screen.getByText('शूलिनी विश्वविद्यालय')).toBeInTheDocument();
    });

    it('renders mixed script summary (Hindi, Arabic, CJK, emoji)', () => {
      render(<Template resume={unicode} />);
      expect(screen.getByText(/हिंदी में सारांश/)).toBeInTheDocument();
    });

    it('renders CJK company name', () => {
      render(<Template resume={unicode} />);
      expect(screen.getByText('テック株式会社')).toBeInTheDocument();
    });

    it('renders Hindi skill names', () => {
      render(<Template resume={unicode} />);
      expect(screen.getByText(/पायथन/)).toBeInTheDocument();
    });
  });
});

// ============================================================
// Special characters & XSS safety
// ============================================================

describe('Special characters handling', () => {
  const special = makeSpecialCharsResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders without crashing', () => {
      const { container } = render(<Template resume={special} />);
      expect(container).toBeTruthy();
    });

    it('renders name with special chars escaped (no script execution)', () => {
      const { container } = render(<Template resume={special} />);
      // React escapes by default, so the script tag should appear as text, not execute
      expect(container.innerHTML).toContain('&lt;script&gt;');
      expect(container.innerHTML).not.toContain('<script>alert');
    });

    it('renders ampersands in company name', () => {
      render(<Template resume={special} />);
      expect(screen.getByText(/AT&T/)).toBeInTheDocument();
    });

    it('renders dollar signs and special math chars', () => {
      render(<Template resume={special} />);
      expect(screen.getByText(/\$2M budget/)).toBeInTheDocument();
    });

    it('renders O(n log n) notation', () => {
      render(<Template resume={special} />);
      expect(screen.getByText(/O\(n log n\)/)).toBeInTheDocument();
    });
  });
});

// ============================================================
// Custom sections
// ============================================================

describe('Custom sections handling', () => {
  const custom = makeManyCustomSectionsResume();

  describe.each(TEMPLATES)('Template: %s', (_name, Template) => {
    it('renders all custom section headings', () => {
      render(<Template resume={custom} />);
      expect(screen.getByText('Publications')).toBeInTheDocument();
      expect(screen.getByText('Awards')).toBeInTheDocument();
      expect(screen.getByText('Volunteer Work')).toBeInTheDocument();
    });

    it('renders custom section entries', () => {
      render(<Template resume={custom} />);
      expect(screen.getByText('Paper 1')).toBeInTheDocument();
      expect(screen.getByText('Best Paper Award')).toBeInTheDocument();
    });

    it('renders custom tags section', () => {
      render(<Template resume={custom} />);
      expect(screen.getByText(/English/)).toBeInTheDocument();
      expect(screen.getByText(/Japanese/)).toBeInTheDocument();
    });
  });
});

// ============================================================
// Structural assertions
// ============================================================

describe('Template structural integrity', () => {
  const full = makeFullResume();

  it('ATSClassic uses semantic heading hierarchy', () => {
    const { container } = render(<ATSClassic resume={full} />);
    const h1s = container.querySelectorAll('h1');
    const h2s = container.querySelectorAll('h2');
    const h3s = container.querySelectorAll('h3');
    expect(h1s.length).toBe(1); // name
    expect(h2s.length).toBeGreaterThan(0); // section headings
    expect(h3s.length).toBeGreaterThan(0); // entry titles
  });

  it('ATSClassic uses ul/li for bullets', () => {
    const { container } = render(<ATSClassic resume={full} />);
    const lists = container.querySelectorAll('ul');
    const items = container.querySelectorAll('li');
    expect(lists.length).toBeGreaterThan(0);
    expect(items.length).toBeGreaterThan(0);
  });

  it('ModernBlue has aside and main elements', () => {
    const { container } = render(<ModernBlue resume={full} />);
    expect(container.querySelector('aside')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });

  it('ModernBlue puts skills in sidebar', () => {
    const { container } = render(<ModernBlue resume={full} />);
    const aside = container.querySelector('aside');
    expect(aside?.textContent).toContain('Python');
    expect(aside?.textContent).toContain('Skills');
  });

  it('Creative has gradient header', () => {
    const { container } = render(<Creative resume={full} />);
    const header = container.querySelector('header');
    expect(header?.style.background).toContain('linear-gradient');
  });

  it('Minimal uses light font weight for name', () => {
    const { container } = render(<Minimal resume={full} />);
    const h1 = container.querySelector('h1');
    expect(h1?.className).toContain('font-light');
  });

  it('all templates have exactly one h1', () => {
    for (const [, Template] of TEMPLATES) {
      const { container, unmount } = render(<Template resume={full} />);
      expect(container.querySelectorAll('h1').length).toBe(1);
      unmount();
    }
  });
});
