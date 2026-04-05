/**
 * Tests for the resume Zustand store.
 * Covers all actions: personal, summary, template, sections, entries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useResumeStore } from '../resumeStore';
import type { Section, Entry } from '../types';

// Mock IndexedDB persistence so store works without browser DB
vi.mock('../persist', () => ({
  createIndexedDBStorage: () => ({
    load: () => Promise.resolve(undefined),
    save: () => {},
  }),
}));

function getState() {
  return useResumeStore.getState();
}

describe('resumeStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useResumeStore.setState({
      resume: {
        id: 'test-id',
        meta: {
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
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
        sections: [
          { id: 'sec-edu', type: 'education', heading: 'Education', layout: 'list', entries: [] },
          { id: 'sec-exp', type: 'experience', heading: 'Experience', layout: 'list', entries: [] },
          { id: 'sec-proj', type: 'projects', heading: 'Projects', layout: 'list', entries: [] },
          { id: 'sec-skills', type: 'skills', heading: 'Skills', layout: 'tags', entries: [] },
          { id: 'sec-cert', type: 'certifications', heading: 'Certifications', layout: 'list', entries: [] },
          { id: 'sec-extra', type: 'extracurricular', heading: 'Extracurricular & Leadership', layout: 'list', entries: [] },
        ],
      },
      loaded: false,
    });
  });

  it('default resume has 6 sections', () => {
    expect(getState().resume.sections).toHaveLength(6);
  });

  it('setPersonal updates fields and triggers updatedAt change', () => {
    const before = getState().resume.meta.updatedAt;
    getState().setPersonal({ name: 'Astha Chandel', email: 'astha@test.com' });
    const after = getState().resume;
    expect(after.personal.name).toBe('Astha Chandel');
    expect(after.personal.email).toBe('astha@test.com');
    expect(after.personal.phone).toBe(''); // unchanged
    expect(after.meta.updatedAt).not.toBe(before);
  });

  it('setSummary works', () => {
    getState().setSummary('A motivated CS student.');
    expect(getState().resume.summary).toBe('A motivated CS student.');
  });

  it('setTemplate switches template', () => {
    getState().setTemplate('modern-blue');
    expect(getState().resume.meta.templateId).toBe('modern-blue');
  });

  it('addSection adds a section', () => {
    const newSection: Section = {
      id: 'sec-custom',
      type: 'custom',
      heading: 'Awards',
      layout: 'list',
      entries: [],
    };
    getState().addSection(newSection);
    expect(getState().resume.sections).toHaveLength(7);
    expect(getState().resume.sections[6].heading).toBe('Awards');
  });

  it('removeSection removes correctly', () => {
    getState().removeSection('sec-cert');
    expect(getState().resume.sections).toHaveLength(5);
    expect(getState().resume.sections.find((s) => s.id === 'sec-cert')).toBeUndefined();
  });

  it('reorderSections swaps positions', () => {
    // Move education (index 0) to index 2
    getState().reorderSections(0, 2);
    const sections = getState().resume.sections;
    expect(sections[0].id).toBe('sec-exp');
    expect(sections[1].id).toBe('sec-proj');
    expect(sections[2].id).toBe('sec-edu');
  });

  it('addEntry adds entry to specific section', () => {
    const entry: Entry = {
      id: 'entry-1',
      fields: { institution: 'Shoolini University' },
      bullets: ['B.Tech CSE'],
    };
    getState().addEntry('sec-edu', entry);
    const edu = getState().resume.sections.find((s) => s.id === 'sec-edu')!;
    expect(edu.entries).toHaveLength(1);
    expect(edu.entries[0].fields['institution']).toBe('Shoolini University');
  });

  it('removeEntry removes entry from section', () => {
    const entry: Entry = { id: 'entry-1', fields: { role: 'Intern' }, bullets: [] };
    getState().addEntry('sec-exp', entry);
    expect(getState().resume.sections.find((s) => s.id === 'sec-exp')!.entries).toHaveLength(1);
    getState().removeEntry('sec-exp', 'entry-1');
    expect(getState().resume.sections.find((s) => s.id === 'sec-exp')!.entries).toHaveLength(0);
  });

  it('updateEntry updates entry fields', () => {
    const entry: Entry = { id: 'entry-1', fields: { role: 'Intern' }, bullets: ['Did stuff'] };
    getState().addEntry('sec-exp', entry);
    getState().updateEntry('sec-exp', 'entry-1', { fields: { role: 'SDE Intern' } });
    const updated = getState().resume.sections.find((s) => s.id === 'sec-exp')!.entries[0];
    expect(updated.fields['role']).toBe('SDE Intern');
  });

  it('reorderEntries within a section', () => {
    const e1: Entry = { id: 'e1', fields: { name: 'First' }, bullets: [] };
    const e2: Entry = { id: 'e2', fields: { name: 'Second' }, bullets: [] };
    const e3: Entry = { id: 'e3', fields: { name: 'Third' }, bullets: [] };
    getState().addEntry('sec-proj', e1);
    getState().addEntry('sec-proj', e2);
    getState().addEntry('sec-proj', e3);

    // Move first to last
    getState().reorderEntries('sec-proj', 0, 2);
    const entries = getState().resume.sections.find((s) => s.id === 'sec-proj')!.entries;
    expect(entries[0].id).toBe('e2');
    expect(entries[1].id).toBe('e3');
    expect(entries[2].id).toBe('e1');
  });

  it('updateSectionHeading changes heading text', () => {
    getState().updateSectionHeading('sec-edu', 'Academic Background');
    expect(getState().resume.sections.find((s) => s.id === 'sec-edu')!.heading).toBe('Academic Background');
  });
});
