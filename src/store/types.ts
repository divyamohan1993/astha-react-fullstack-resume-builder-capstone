export interface Resume {
  id: string;
  meta: {
    createdAt: string;
    updatedAt: string;
    templateId: TemplateId;
  };
  personal: PersonalInfo;
  summary: string;
  sections: Section[];
}

export type TemplateId = 'ats-classic' | 'modern-blue' | 'creative' | 'minimal';

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
}

export interface Section {
  id: string;
  type:
    | 'education'
    | 'experience'
    | 'projects'
    | 'skills'
    | 'certifications'
    | 'extracurricular'
    | 'custom';
  heading: string;
  layout: 'list' | 'key-value' | 'tags' | 'freetext';
  entries: Entry[];
}

export interface Entry {
  id: string;
  fields: Record<string, string>;
  bullets: string[];
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  extractedRequirements: {
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: string;
    educationRequirements: string[];
    location: string;
  };
  candidates: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  resumeText: string;
  scores: CandidateScores;
  redFlags: RedFlag[];
  analysisLayers: AnalysisLayer[];
  analysisStatus: 'pending' | 'l1' | 'l2' | 'l3' | 'done' | 'error';
}

export type AnalysisLayer = 'L1' | 'L2' | 'L3' | 'L4';

export interface CandidateScores {
  overall: number;
  skillsMatch: {
    matched: string[];
    missing: string[];
    semantic: string[];
    score: number;
  };
  experience: { level: 'high' | 'medium' | 'low'; score: number };
  education: {
    relevance: 'relevant' | 'partial' | 'irrelevant';
    score: number;
  };
  projects: { hasQuantified: boolean; score: number };
  certifications: { relevant: string[]; score: number };
  distance: { km: number; minutes: number; score: number } | null;
  extracurricular: { hasLeadership: boolean; score: number };
  gpa: { value: number; score: number } | null;
  parseability: boolean;
  completeness: { missingSections: string[]; score: number };
}

export interface RedFlag {
  type:
    | 'contradiction'
    | 'framing'
    | 'date-inconsistency'
    | 'skill-inflation'
    | 'hidden-text';
  dimension: 'fabrication' | 'embellishment' | 'omission';
  description: string;
  evidence: string;
  penalty: number;
  citation: string;
}
