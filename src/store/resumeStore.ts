import { create } from 'zustand';
import type { Resume, Section, Entry, PersonalInfo, TemplateId } from './types';
import { createIndexedDBStorage } from './persist';

function uuid(): string {
  return crypto.randomUUID();
}

function createDefaultResume(): Resume {
  return {
    id: uuid(),
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      {
        id: uuid(),
        type: 'education',
        heading: 'Education',
        layout: 'list',
        entries: [],
      },
      {
        id: uuid(),
        type: 'experience',
        heading: 'Experience',
        layout: 'list',
        entries: [],
      },
      {
        id: uuid(),
        type: 'projects',
        heading: 'Projects',
        layout: 'list',
        entries: [],
      },
      {
        id: uuid(),
        type: 'skills',
        heading: 'Skills',
        layout: 'tags',
        entries: [],
      },
      {
        id: uuid(),
        type: 'certifications',
        heading: 'Certifications',
        layout: 'list',
        entries: [],
      },
      {
        id: uuid(),
        type: 'extracurricular',
        heading: 'Extracurricular & Leadership',
        layout: 'list',
        entries: [],
      },
    ],
  };
}

function stamp(resume: Resume): Resume {
  return {
    ...resume,
    meta: { ...resume.meta, updatedAt: new Date().toISOString() },
  };
}

interface ResumeState {
  resume: Resume;
  loaded: boolean;
  setPersonal: (partial: Partial<PersonalInfo>) => void;
  setSummary: (summary: string) => void;
  setTemplate: (templateId: TemplateId) => void;
  addSection: (section: Section) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  updateSectionHeading: (sectionId: string, heading: string) => void;
  addEntry: (sectionId: string, entry: Entry) => void;
  removeEntry: (sectionId: string, entryId: string) => void;
  updateEntry: (
    sectionId: string,
    entryId: string,
    updates: Partial<Entry>,
  ) => void;
  reorderEntries: (
    sectionId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  load: () => Promise<void>;
}

const storage = createIndexedDBStorage<Resume>('resume');

export const useResumeStore = create<ResumeState>((set) => ({
  resume: createDefaultResume(),
  loaded: false,

  setPersonal: (partial) =>
    set((s) => {
      const resume = stamp({
        ...s.resume,
        personal: { ...s.resume.personal, ...partial },
      });
      storage.save(resume);
      return { resume };
    }),

  setSummary: (summary) =>
    set((s) => {
      const resume = stamp({ ...s.resume, summary });
      storage.save(resume);
      return { resume };
    }),

  setTemplate: (templateId) =>
    set((s) => {
      const resume = stamp({
        ...s.resume,
        meta: { ...s.resume.meta, templateId },
      });
      storage.save(resume);
      return { resume };
    }),

  addSection: (section) =>
    set((s) => {
      const resume = stamp({
        ...s.resume,
        sections: [...s.resume.sections, section],
      });
      storage.save(resume);
      return { resume };
    }),

  removeSection: (sectionId) =>
    set((s) => {
      const resume = stamp({
        ...s.resume,
        sections: s.resume.sections.filter((sec) => sec.id !== sectionId),
      });
      storage.save(resume);
      return { resume };
    }),

  reorderSections: (fromIndex, toIndex) =>
    set((s) => {
      const sections = [...s.resume.sections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      const resume = stamp({ ...s.resume, sections });
      storage.save(resume);
      return { resume };
    }),

  updateSectionHeading: (sectionId, heading) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, heading } : sec,
      );
      const resume = stamp({ ...s.resume, sections });
      storage.save(resume);
      return { resume };
    }),

  addEntry: (sectionId, entry) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, entries: [...sec.entries, entry] }
          : sec,
      );
      const resume = stamp({ ...s.resume, sections });
      storage.save(resume);
      return { resume };
    }),

  removeEntry: (sectionId, entryId) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, entries: sec.entries.filter((e) => e.id !== entryId) }
          : sec,
      );
      const resume = stamp({ ...s.resume, sections });
      storage.save(resume);
      return { resume };
    }),

  updateEntry: (sectionId, entryId, updates) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              entries: sec.entries.map((e) =>
                e.id === entryId ? { ...e, ...updates } : e,
              ),
            }
          : sec,
      );
      const resume = stamp({ ...s.resume, sections });
      storage.save(resume);
      return { resume };
    }),

  reorderEntries: (sectionId, fromIndex, toIndex) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const entries = [...sec.entries];
        const [moved] = entries.splice(fromIndex, 1);
        entries.splice(toIndex, 0, moved);
        return { ...sec, entries };
      });
      const resume = stamp({ ...s.resume, sections });
      storage.save(resume);
      return { resume };
    }),

  load: async () => {
    const saved = await storage.load();
    if (saved) {
      set({ resume: saved, loaded: true });
    } else {
      set({ loaded: true });
    }
  },
}));

export { uuid };
