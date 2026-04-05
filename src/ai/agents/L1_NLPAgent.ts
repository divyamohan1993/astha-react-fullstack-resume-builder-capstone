/**
 * L1 NLP Agent -- Keyword extraction, section detection, entity parsing.
 *
 * Uses TF-IDF + Jaccard for skills matching (zero external dependencies).
 * Runs instantly on any device.
 *
 * Citations:
 * - Jaccard, P. (1901). Bulletin de la Societe Vaudoise des Sciences Naturelles.
 * - Salton, G. (1975). A Theory of Indexing. SIAM.
 * - Ladders Eye-Tracking Study 2018 (section detection order).
 * - NACE Job Outlook 2024 (skills as #1 attribute).
 */

import { jaccard } from '../scoring/jaccard';
import { TfIdfVectorizer, cosineSimilarity } from '../scoring/tfidf';

export interface L1Result {
  sections: string[];
  keywords: string[];
  skills: string[];
  dates: string[];
  email: string;
  phone: string;
  name: string;
  skillsScore: number;
  educationScore: number;
  completenessScore: number;
  parseability: boolean;
}

// Section heading patterns (Ladders 2018 F-pattern scan order)
const SECTION_PATTERNS: Record<string, RegExp> = {
  education:
    /\b(education|academic|qualification|degree|university|college|school|bachelor|master|phd|b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?e|m\.?e)\b/i,
  experience:
    /\b(experience|employment|work\s*history|internship|professional|career|job)\b/i,
  skills:
    /\b(skills?|technical\s*skills?|core\s*competenc|proficienc|technologies|tech\s*stack|tools?)\b/i,
  projects:
    /\b(projects?|portfolio|personal\s*projects?|academic\s*projects?|side\s*projects?)\b/i,
  summary:
    /\b(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective)\b/i,
  certifications:
    /\b(certifications?|certificates?|credentials?|licenses?|accreditations?)\b/i,
  extracurricular:
    /\b(extracurricular|activities|leadership|volunteer|community|clubs?|organizations?|societies?)\b/i,
  contact:
    /\b(contact|address|phone|email|personal\s*info|personal\s*details)\b/i,
};

// Entity extraction patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
const DATE_PATTERN =
  /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|\d{1,2}\/\d{2,4}|\d{4}\s*[-–]\s*(?:\d{4}|present|current|ongoing|now)|\b\d{4}\b)/gi;

/**
 * Extract the candidate name from resume text.
 * Heuristic: first non-empty line that is not an email/phone/URL.
 */
function extractName(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (EMAIL_PATTERN.test(line)) continue;
    if (PHONE_PATTERN.test(line)) continue;
    if (/^https?:\/\//i.test(line)) continue;
    if (/^(education|experience|skills|projects|summary|objective)/i.test(line))
      continue;
    // Name lines are typically short and contain letters
    if (line.length <= 60 && /[a-zA-Z]/.test(line)) {
      return line.replace(/[|,].*$/, '').trim();
    }
  }
  return '';
}

/**
 * Extract skills from text using common skill token patterns.
 */
function extractSkills(text: string): string[] {
  const skillTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\s/]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  // Deduplicate
  return [...new Set(skillTokens)];
}

/**
 * Detect which sections are present in the resume.
 * Based on Ladders Eye-Tracking Study 2018 section identification.
 */
function detectSections(text: string): string[] {
  const found: string[] = [];
  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(text)) {
      found.push(name);
    }
  }
  return found;
}

/**
 * Compute education relevance score.
 * Checks for education section presence and degree keywords.
 */
function computeEducationScore(
  sections: string[],
  resumeText: string,
  jdText: string
): number {
  if (!sections.includes('education')) return 0;

  const educationKeywords = [
    'computer science',
    'engineering',
    'information technology',
    'software',
    'mathematics',
    'statistics',
    'data science',
    'artificial intelligence',
    'machine learning',
    'electronics',
    'electrical',
    'mechanical',
    'business',
    'management',
    'finance',
    'economics',
    'marketing',
    'design',
    'arts',
    'humanities',
    'science',
  ];

  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  const resumeEduTerms = educationKeywords.filter((k) =>
    resumeLower.includes(k)
  );
  const jdEduTerms = educationKeywords.filter((k) => jdLower.includes(k));

  if (jdEduTerms.length === 0) return 0.6; // No specific education requirement in JD

  const overlap = resumeEduTerms.filter((t) => jdEduTerms.includes(t));
  return overlap.length > 0 ? 1.0 : 0.3;
}

/**
 * Compute section completeness score.
 *
 * Citation: Ladders Eye-Tracking Study 2018. Scan order:
 * (1) name/title, (2) current role, (3) previous role + dates, (4) education.
 * For freshers: projects substitute for roles.
 *
 * Spec section 6.10:
 * fresher_expected = ["name", "education", "skills", "projects_or_experience", "summary"]
 * completeness_score = count(present) / len(expected)
 */
function computeCompletenessScore(
  sections: string[],
  name: string
): { score: number; missing: string[] } {
  const expected = ['name', 'education', 'skills', 'projects_or_experience', 'summary'];
  const present: string[] = [];
  const missing: string[] = [];

  if (name) present.push('name');
  else missing.push('name');

  if (sections.includes('education')) present.push('education');
  else missing.push('education');

  if (sections.includes('skills')) present.push('skills');
  else missing.push('skills');

  if (sections.includes('projects') || sections.includes('experience'))
    present.push('projects_or_experience');
  else missing.push('projects_or_experience');

  if (sections.includes('summary')) present.push('summary');
  else missing.push('summary');

  return {
    score: present.length / expected.length,
    missing,
  };
}

/**
 * Analyze resume text against a job description using L1 NLP methods.
 *
 * Combines:
 * - Jaccard similarity for exact keyword matching (Jaccard 1901)
 * - TF-IDF + cosine similarity for document-level matching (Salton 1975)
 * - Regex-based section detection (Ladders 2018)
 * - Entity extraction (email, phone, dates)
 *
 * Skills score formula (spec section 6.1):
 *   skills_score = 0.4 * L1_exact + 0.6 * L2_semantic
 *   (40% Jaccard + 60% TF-IDF cosine)
 */
export function analyzeL1(resumeText: string, jdText: string): L1Result {
  // Section detection
  const sections = detectSections(resumeText);

  // Entity extraction
  const emailMatch = resumeText.match(EMAIL_PATTERN);
  const phoneMatch = resumeText.match(PHONE_PATTERN);
  const dates = resumeText.match(DATE_PATTERN) ?? [];
  const name = extractName(resumeText);

  // Keyword / skill extraction
  const resumeSkills = extractSkills(resumeText);
  const jdSkills = extractSkills(jdText);
  const keywords = [...new Set([...resumeSkills, ...jdSkills])];

  // L1 exact match: Jaccard similarity (Jaccard 1901)
  const resumeSkillSet = new Set(resumeSkills);
  const jdSkillSet = new Set(jdSkills);
  const l1Exact = jaccard(resumeSkillSet, jdSkillSet);

  // L1 semantic proxy: TF-IDF cosine similarity (Salton 1975)
  const vectorizer = new TfIdfVectorizer();
  vectorizer.fit([resumeText, jdText]);
  const resumeVec = vectorizer.transform(resumeText);
  const jdVec = vectorizer.transform(jdText);
  const l1Semantic = cosineSimilarity(resumeVec, jdVec);

  // Blended skills score: 0.4 * exact + 0.6 * semantic
  // Source: Jobscan ATS comparison (legacy literal matching 40%)
  //         + Workday Skills Cloud (ontology matching 60%)
  const skillsScore = 0.4 * l1Exact + 0.6 * l1Semantic;

  // Education score
  const educationScore = computeEducationScore(sections, resumeText, jdText);

  // Completeness (Ladders 2018 F-pattern)
  const { score: completenessScore } = computeCompletenessScore(sections, name);

  // Parseability gate (spec section 6.9):
  // expected = ["contact_info", "education", "experience_or_projects", "skills"]
  // parseability = identified / 4 >= 0.75
  const parseExpected = ['contact', 'education', 'experience', 'skills'];
  const parseFound = parseExpected.filter(
    (s) =>
      sections.includes(s) ||
      (s === 'contact' && (emailMatch || phoneMatch)) ||
      (s === 'experience' && sections.includes('projects'))
  );
  const parseability = parseFound.length / parseExpected.length >= 0.75;

  return {
    sections,
    keywords,
    skills: resumeSkills,
    dates: dates.map((d) => d.trim()),
    email: emailMatch?.[0] ?? '',
    phone: phoneMatch?.[0] ?? '',
    name,
    skillsScore,
    educationScore,
    completenessScore,
    parseability,
  };
}
