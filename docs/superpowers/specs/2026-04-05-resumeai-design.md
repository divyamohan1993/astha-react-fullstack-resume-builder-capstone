# ResumeAI -- Design Specification

**Author:** Astha Chandel (GF202214559)
**Institution:** Shoolini University, BTech CSE Final Semester Capstone
**Date:** 2026-04-05

---

## 1. Product Overview

ResumeAI is an offline-first, browser-based platform with two modes:

1. **Student Mode** (`/builder`): Build ATS-ready resumes with live preview, 4 templates, AI-powered refinement, and direct-edit preview. Download as PDF or print.
2. **Employer Mode** (`/employer`): Paste a job description, bulk-upload resumes, and get AI-scored candidate rankings with research-cited parameters, contradiction detection, and distance calculation.

### Core Constraints

- **Offline-first**: Internet required only for initial page load. All functionality works offline after that.
- **Old hardware compatible**: Must run on 10-year-old computers, phones, any OS, any browser.
- **Zero server cost**: Deploys as static files on Netlify / Cloud Run / any static host. 0 CPU, cold-start safe.
- **WCAG 2.2 AAA compliant**: Full accessibility -- ARIA, keyboard nav, screen reader, focus management, reduced motion, high contrast, captions, alt text.
- **Privacy-first**: No data leaves the user's device. All AI runs in-browser.

---

## 2. Architecture

### 2.1 Approach: Monolith SPA + Code Splitting

Single Vite + React 19 app. Student mode loads in <500KB. Employer mode + ML models lazy-load on demand.

```
/                     -> Landing page (hero, mode selection)
/builder              -> Student resume builder (form + live preview)
/builder/preview      -> Full-page print preview
/employer             -> Employer dashboard (JD input, bulk upload, table)
/employer/:id         -> Individual candidate detail view
/pitch                -> 10-slide capstone pitch deck
```

### 2.2 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Bundler | Vite 6 | Fast builds, native code-splitting, ESM |
| UI | React 19 | Component model, concurrent rendering |
| Routing | React Router 7 | Client-side routing, lazy routes |
| Styling | Tailwind CSS 4 | Utility-first, purged CSS <10KB, responsive |
| State | Zustand + IndexedDB persist | Lightweight, offline persistence |
| Offline | Workbox (vite-plugin-pwa) | Service worker, precache, background sync |
| PDF | CSS @media print + html2pdf.js | Browser-native print, PDF fallback |
| Drag/Drop | @dnd-kit | Section reordering, accessible drag |
| Resume Parsing | pdf.js (employer mode) | Parse uploaded PDF resumes in-browser |
| Maps | Google Maps Distance Matrix API | Commute distance (optional, online-only) |
| ML Layer 1 | Custom NLP (TF-IDF, regex) | Keyword extraction, zero-cost |
| ML Layer 2 | ONNX Runtime Web (WASM) + MiniLM-L6-v2 | Semantic embeddings, ~50MB, any browser |
| ML Layer 3 | WebLLM + Gemma 3 1B Q4 | Reasoning, contradiction detection, ~600MB, WebGPU + WASM CPU fallback |
| ML Layer 4 | Gemini 2.5 Pro API | Extreme fallback, user provides API key |
| Testing | Vitest + React Testing Library + Playwright | Unit, component, e2e |

### 2.3 Deployment

Static files only. No server runtime.

- **Netlify**: `npm run build` -> deploy `dist/`. Service worker handles offline.
- **Cloud Run**: Serve static files from a minimal container. 0 CPU when idle.
- **Any static host**: GitHub Pages, Vercel, Cloudflare Pages. Same build artifact.

Build output: `dist/` folder with HTML, JS, CSS. ML models cached in IndexedDB on first use, not bundled.

---

## 3. Branding

### 3.1 Shoolini University Identity

| Token | Value | Usage |
|-------|-------|-------|
| Shoolini Red | `#e41a1a` | Primary accent, buttons, highlights |
| Navy | `#182B49` | Navbar, headings, authority elements |
| White | `#ffffff` | Backgrounds (light mode) |
| Dark Gray | `#333333` | Body text (light mode) |
| Light Gray | `#f5f5f5` | Surface backgrounds (light mode) |

Logo source: `https://shooliniuniversity.com/assets/images/logo.png`

### 3.2 Attribution (Every Page)

- **Navbar**: Shoolini logo + "ResumeAI" + "Shoolini University - BTech CSE Capstone"
- **Footer**: "Developed by Astha Chandel" + GF202214559 + Shoolini University + Solan, Himachal Pradesh
- **Employer dashboard footer**: "Powered by ResumeAI - Astha Chandel"
- **Generated resumes**: No Shoolini branding (they belong to the student creating them)

### 3.3 Theme System (Light + Dark)

CSS custom properties for all colors. Theme class on `<html>`.

**Light tokens:**
```
--bg-primary: #ffffff
--bg-secondary: #f5f5f5
--bg-surface: #fafafa
--text-primary: #333333
--text-secondary: #666666
--text-muted: #999999
--border: #e0e0e0
--accent-red: #e41a1a
--accent-navy: #182B49
--accent-gold: #d4a800
--shadow: rgba(0,0,0,0.08)
```

**Dark tokens:**
```
--bg-primary: #0d1b2a
--bg-secondary: #0a1520
--bg-surface: #1a2a3a
--text-primary: #e0e0e0
--text-secondary: #a0a0a0
--text-muted: #666666
--border: #2a3a4a
--accent-red: #e85454
--accent-navy: #3a6a9a
--accent-gold: #ffdc00
--shadow: rgba(0,0,0,0.3)
```

**Behavior:**
1. First load: detect OS preference via `prefers-color-scheme`
2. Manual toggle (sun/moon) in navbar overrides OS preference
3. Persists to `localStorage`
4. Inline blocking `<script>` in `<head>` reads localStorage before first paint (zero FOUC)
5. `@media print` always forces light mode (white background, dark text)

**WCAG AAA contrast:**
- Navy on white: 13.5:1 (AAA)
- Red on white: 4.6:1 (AA large text only -- used for accents, not body text)
- All body text and interactive elements use navy or dark gray for AAA compliance

---

## 4. Mode 1: Student Resume Builder

### 4.1 Page Layout (`/builder`)

Split view:
- **Left panel (scrollable)**: Comprehensive form with all sections
- **Right panel (sticky)**: Live preview with template selection, directly editable

### 4.2 Form Sections

All sections are repeatable (multi-entry) and drag-reorderable via @dnd-kit.

**Built-in sections:**

1. **Personal Information** (required)
   - Full Name*, Email*, Phone*, Location, LinkedIn, GitHub/Portfolio URL

2. **Professional Summary**
   - Free-text textarea
   - "AI Refine" button

3. **Education** (repeatable)
   - Institution*, Degree*, Duration, GPA/Percentage, Relevant Coursework

4. **Experience / Internships** (repeatable)
   - Role*, Company*, Duration, Location
   - Bullet points (one per line)
   - "AI Refine Bullets" button per entry

5. **Projects** (repeatable)
   - Project Name*, Tech Stack, Description, Live URL / Repo URL
   - Bullet points

6. **Skills** (grouped by category)
   - Categories: Languages, Frameworks, Tools, Databases, etc.
   - Tag-style input (type to add, click to remove)
   - "Add Skill Category" for user-defined groups
   - Drag to reorder categories

7. **Certifications** (repeatable)
   - Name*, Issuer, Date, Credential URL

8. **Extracurricular & Leadership** (repeatable)
   - Role*, Organization, Duration, Description

**Custom sections:**

Users click "Add Custom Section" to create arbitrary sections:
- **Heading**: User-defined (e.g., "Publications", "Awards", "Languages", "Hobbies", "Volunteer Work")
- **Layout type**: List | Key-Value | Tags | Free Text
- **Custom fields per entry**: User defines field names, drag to reorder
- Custom sections are stored identically to built-in ones and render through templates the same way.

**Section ordering**: All sections (built-in + custom) can be drag-reordered. The preview reflects the order instantly. Order persists in IndexedDB.

### 4.3 Live-Editable Preview

The right panel shows a WYSIWYG resume rendered with the selected template.

- **Click any text to edit in-place**: Name, summary, bullets, skills -- all directly editable in the preview
- **Bidirectional sync via Zustand store**:
  - Edit in form -> store updates -> preview re-renders
  - Edit in preview -> store updates -> form re-renders
  - The Zustand store is the single source of truth. Both views are projections.
- **Template switching**: Dropdown with 4 templates. Switching re-renders the preview with the same data.
- **Auto-save**: Every keystroke debounced (300ms) to IndexedDB. Close tab, come back, everything is there.

### 4.4 AI Resume Refinement

Triggered by "AI Refine" buttons on individual sections or "Analyze Full Resume" button.

**AI Coach panel** slides in from the right, showing:
1. **Resume Strength Score** (0-100%) based on section completeness, quantification, keyword usage
2. **Prioritized suggestions** (High / Medium / Tip):
   - Quantify impact ("Built APIs" -> "Built 12 REST endpoints serving 10k req/day")
   - Remove generic language ("passionate student" -> specific differentiator)
   - Missing sections for freshers (projects, certifications)
   - Weak bullet points (no metrics, no action verbs)
   - Summary too long/short
3. **"Apply AI Fix" button** per suggestion: LLM generates improved text, user previews diff, accepts or dismisses
4. **Source**: Always reads from current Zustand store. If user edited preview directly, those edits are already in the store. No stale data.

**AI execution order:**
1. Layer 1 (NLP) runs first: keyword extraction, section detection, basic checks. Instant.
2. Layer 2 (MiniLM) runs: semantic similarity of summary/bullets vs common strong patterns. ~1s.
3. Layer 3 (Gemma 3) runs if available: deep reasoning for suggestion generation, rewriting. ~5-15s.
4. Layer 4 (Gemini API) runs only if Layer 3 completely fails to load.

### 4.5 Resume Templates

4 templates, all optimized for `@media print` CSS and ATS parsing:

1. **ATS Classic**: Single column, black & white, standard fonts (Georgia/Times), simple section headers with horizontal rules. Zero parsing risk. Passes Workday, Greenhouse, Taleo, iCIMS, Lever.

2. **Modern Blue**: Two-column sidebar layout. Left sidebar (navy background): contact info, skill bars, certifications. Right main: experience, education, projects. ATS-safe structure (no tables, proper heading hierarchy, semantic HTML).

3. **Creative**: Bold gradient header (Shoolini red), skill pills/tags, section icons. Eye-catching but structured. Uses CSS only, no images-as-text.

4. **Minimal**: Clean whitespace, light typography (Helvetica/system sans), thin dividers, uppercase muted section labels. Understated elegance.

All templates:
- Use semantic HTML (h1-h3 hierarchy, section elements, proper lists)
- Have `@media print` CSS that produces clean A4/Letter output
- Support all built-in and custom sections
- Render identically whether data comes from form input or preview editing

### 4.6 Print & Download

- **Print button**: Opens browser print dialog. `@media print` CSS handles layout, margins, page breaks. Forces light mode. Hides UI chrome.
- **Download PDF button**: Uses html2pdf.js to capture the preview div as PDF. Same visual output as print.
- **Full-page print preview** (`/builder/preview`): Shows the resume full-screen in print layout. Clean URL for sharing/bookmarking.

---

## 5. Mode 2: Employer Analysis Dashboard

### 5.1 Page Layout (`/employer`)

- **Top bar**: JD input (paste or upload .txt/.pdf) + "Upload Resumes" button + "Analyze All" button
- **Main area**: Sortable candidate table
- **Detail view** (`/employer/:id`): Individual candidate deep-dive, expandable from table row click

### 5.2 Job Description Input

- Paste JD text directly into a textarea, or upload .txt/.pdf file
- JD is parsed by Layer 1 (NLP) to extract: required skills, preferred skills, experience level, education requirements, location, job title
- Extracted requirements shown as editable tags so the recruiter can adjust weights

### 5.3 Bulk Resume Upload

- Upload multiple PDF/DOCX files (drag-drop zone or file picker)
- Each resume parsed by pdf.js (PDF) or mammoth.js (DOCX) in a Web Worker
- Parsed text fed through the 4-layer AI pipeline
- Progress indicator per resume (parsing -> L1 -> L2 -> L3 -> done)
- Handles 100+ resumes. Processing happens in parallel Web Workers (4 concurrent by default, configurable).

### 5.4 Candidate Dashboard Table

Sortable, filterable table with columns:

| Column | Type | Source |
|--------|------|--------|
| Rank | Auto-computed | Composite ATS score |
| Name | Parsed | Resume header |
| ATS Score | 0-100% | Weighted composite of all parameters |
| Skills Match | X/Y | L1 keyword + L2 semantic match |
| Experience Fit | High/Medium/Low | L1 date parsing + L3 reasoning |
| Education | Relevant/Partial/Irrelevant | L1 keyword + L2 semantic |
| Distance | km | Google Maps API (optional) |
| Red Flags | Count | L3 contradiction + framing detection |
| Actions | Button | Expand detail view |

**Sorting**: Click any column header to sort ascending/descending. Multi-column sort with Shift+click.
**Filtering**: Search bar filters by name. Dropdown filters by score range, red flag count, distance radius.
**Persistence**: All analysis results stored in IndexedDB. Close tab, come back, results are there.

### 5.5 Candidate Detail View (`/employer/:id`)

Expanded view with three panels:

**Panel 1: Keyword Analysis**
- Matched keywords (green tags)
- Missing required keywords (red tags)
- Missing preferred keywords (yellow tags)
- Semantic matches (L2): "led a team" matched to "leadership" requirement
- Citation: methodology sources displayed inline

**Panel 2: AI Red Flags (L3 Gemma 3)**
- Contradiction detection: "3 years Python experience" but graduation date is 2025
- Framing detection: inflated titles ("CEO" of college club), vague project descriptions without measurable outcomes
- Skill clustering: claims proficiency in too many unrelated skills (credibility flag)
- Date inconsistencies: overlapping dates, unexplained gaps
- Each flag cites the research source for why it matters

**Panel 3: Scoring Breakdown**
- Each parameter with its weight, raw score, weighted score
- Research citation per parameter
- Final composite score calculation shown transparently

### 5.6 Distance Calculation

- Uses Google Maps Distance Matrix API
- Inputs: candidate address (parsed from resume) + JD office location (parsed or manually entered)
- Shows driving distance in km and estimated commute time
- **Optional and online-only**: If no API key configured or offline, column shows "N/A" and scoring excludes distance parameter. Weights redistribute proportionally.
- API key entered by user in settings, stored in localStorage (never transmitted anywhere else).

---

## 6. ATS Scoring System

### 6.0 Verification Principle

Every formula, weight, and threshold in this scoring system is derived from a published, cross-verifiable source. The employer dashboard displays the citation next to every score so recruiters can trace any number back to its origin. No formula is invented. Every `+`, `*`, threshold, and decay function below names its source.

### 6.1 Parameter 1: Skills-to-JD Keyword Match (Weight: 30%)

**Formula**: Hybrid of Jaccard set similarity (L1) and cosine similarity on TF-IDF vectors (L2).

```
L1_exact = |resume_skills ∩ jd_skills| / |resume_skills ∪ jd_skills|
```

Jaccard similarity is the standard set-overlap measure for keyword matching, defined as the ratio of intersection over union. Used by open-source ATS implementations including [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher) and [indiser/Beat-The-ATS](https://github.com/indiser/Beat-The-ATS).

```
L2_semantic = cosine_similarity(tfidf(resume_text), tfidf(jd_text))
```

TF-IDF vectorization + cosine similarity is the established method for document-level matching. Cosine similarity measures the angle between two document vectors, producing a score from 0 (no match) to 1 (identical). This is the same method used by scikit-learn's `TfidfVectorizer` + `cosine_similarity`, documented in the [scikit-learn user guide](https://scikit-learn.org/stable/modules/metrics.html#cosine-similarity).

```
skills_score = 0.4 * L1_exact + 0.6 * L2_semantic
```

The 40/60 blend weights exact keyword matching (what legacy ATS like Taleo do -- literal string matching, per [Jobscan's ATS comparison](https://www.jobscan.co/blog/fortune-500-use-applicant-tracking-systems/)) against semantic similarity (what modern ATS like Workday Skills Cloud do -- ontology-based matching, per [Workday Skills Cloud documentation](https://www.workday.com/en-us/products/talent-management/skills-cloud.html)).

**Weight source**: NACE Job Outlook 2024 -- skills are the #1 attribute employers seek in new graduates. [NACE](https://www.naceweb.org/about-us/press/the-key-attributes-employers-are-looking-for-on-graduates-resumes).

**Verification**: User can inspect matched/unmatched keywords directly. Jaccard and cosine values shown separately in the detail view. Both formulas are deterministic and reproducible.

### 6.2 Parameter 2: Internship / Practical Experience (Weight: 20%)

**Formula**: Section detection (L1) + O*NET job zone matching (L2) + quality assessment (L3).

```
has_experience = 1 if experience section detected, else 0
relevance = cosine_similarity(embed(experience_text), embed(jd_text))
experience_score = has_experience * relevance
```

The embedding similarity uses MiniLM-L6-v2 sentence embeddings, which encode semantic meaning beyond keyword overlap.

O*NET rates each occupation on a Job Zone scale of 1-5, where Zone 1 = little preparation, Zone 5 = extensive preparation. Entry-level/fresher roles are Zone 2-3. The O*NET skill importance scale (1-5) is used to weight which experiences matter most for a given occupation. Source: [O*NET Content Model](https://www.onetcenter.org/content.html); [BLS mapping methodology](https://www.bls.gov/opub/mlr/2021/article/mapping-employment-projections-and-onet-data.htm).

**Weight source**: NACE 2024 Internship & Co-op Survey -- 56.1% intern-to-hire conversion rate; internship experience is the strongest differentiator for freshers. [NACE](https://www.naceweb.org/job-market/internships/).

### 6.3 Parameter 3: Degree / Major Relevance (Weight: 15%)

**Formula**: BLS CIP-SOC Crosswalk lookup.

The U.S. Department of Education and Bureau of Labor Statistics maintain the CIP-SOC Crosswalk, which maps Classification of Instructional Programs (CIP) codes to Standard Occupational Classification (SOC) codes. This is the authoritative source for "does this degree program prepare someone for this occupation?"

```
If jd_occupation_soc matches any SOC code linked to candidate's CIP code:
  education_score = 1.0  (direct match)
Elif jd_occupation shares same broad SOC group (first 4 digits):
  education_score = 0.6  (related field)
Else:
  education_score = cosine_similarity(embed(degree_description), embed(jd_text))
  # Fallback to semantic similarity for non-standard programs
```

Source: [NCES CIP-SOC Crosswalk](https://nces.ed.gov/ipeds/cipcode/post3.aspx?y=56); [BLS Crosswalks](https://www.bls.gov/emp/documentation/crosswalks.htm). The crosswalk explicitly states relationships are "direct" -- programs provide knowledge "directly applicable to performance in jobs in the SOC occupation."

**Weight source**: NACE Job Outlook 2024 -- 73.4% of employers screen by major/degree relevance for entry-level. [NACE](https://www.naceweb.org/store/2023/job-outlook-2024/).

### 6.4 Parameter 4: Projects with Measurable Outcomes (Weight: 10%)

**Formula**: AAC&U VALUE Rubric scoring (4-level scale).

The AAC&U VALUE (Valid Assessment of Learning in Undergraduate Education) rubrics are the most widely used framework for assessing student work, used by 5,600+ organizations across 159 countries. The "Problem Solving" and "Integrative Learning" rubrics define 4 levels:

| Level | Descriptor | Score |
|-------|-----------|-------|
| Capstone (4) | Quantified outcome + tech stack + problem statement + methodology | 1.0 |
| Milestone 3 | Quantified outcome + tech stack, missing methodology | 0.75 |
| Milestone 2 | Describes project with tech stack, no quantification | 0.5 |
| Benchmark (1) | Vague description, no measurable outcome | 0.25 |

```
project_score = average(rubric_level(project) for each project) / 4.0
```

L3 (Gemma 3) classifies each project description into a rubric level by checking: (a) does it state a measurable outcome? (b) does it name specific technologies? (c) does it describe methodology? (d) does it articulate the problem solved?

Source: [AAC&U VALUE Rubrics](https://www.aacu.org/value/rubrics) -- freely available, open educational resource. Specific rubrics used: "Problem Solving" and "Integrative and Applied Learning."

**Weight source**: Hart Research Associates / AAC&U 2018 -- 93% of employers value demonstrated capacity to solve complex problems over undergraduate major.

### 6.5 Parameter 5: Certifications (Weight: 5%)

**Formula**: Binary presence + JD relevance via embedding similarity.

```
cert_relevance = max(cosine_similarity(embed(cert_name), embed(jd_skill)) for each jd_skill)
cert_score = average(cert_relevance for each certification)
```

If no certifications: score = 0 (no penalty, just no points).

Source: SHRM "The Value of Credentials" 2021 -- 87% of HR professionals say certifications increase confidence in competence. Methodology: SHRM surveyed 1,576 HR professionals. [SHRM Credentials Report](https://www.shrm.org/).

### 6.6 Parameter 6: Location / Commute Distance (Weight: 5%)

**Formula**: Exponential distance decay derived from Marinescu & Rathelot (2018).

The paper found that job seekers are **35% less likely to apply to a job 10 miles away**. This implies a distance decay function:

```
distance_score = exp(-0.043 * distance_miles)

Where 0.043 = -ln(0.65) / 10
  (35% reduction at 10 miles means 65% remaining, solving for decay rate)
```

At 0 miles: score = 1.0
At 10 miles: score = 0.65
At 25 miles: score = 0.34
At 50 miles: score = 0.12

Source: Marinescu, I. & Rathelot, R. (2018). "Mismatch Unemployment and the Geography of Job Search." *American Economic Journal: Macroeconomics*, 10(3), 42-70. [AEA](https://www.aeaweb.org/articles?id=10.1257/mac.20160312). Replication data: [ICPSR](https://www.openicpsr.org/openicpsr/project/114147/).

Google Maps Distance Matrix API provides actual driving distance in km (converted to miles for the formula). If offline or no API key: parameter excluded, weight redistributed.

### 6.7 Parameter 7: Extracurricular / Leadership (Weight: 5%)

**Formula**: Binary detection + leadership role bonus.

```
has_extracurricular = 1 if section detected, else 0
has_leadership_role = 1 if role contains "president|lead|captain|founder|head|chair", else 0
extra_score = 0.6 * has_extracurricular + 0.4 * has_leadership_role
```

Source: Roulin, N. & Bangerter, A. (2013). "Students' Use of Extra-Curricular Activities for Positional Advantage in Competitive Job Markets." *Journal of Education and Work*, 26(1), 21-47. [Wiley](https://onlinelibrary.wiley.com/doi/10.1080/00207594.2012.692793). The study found significant positive callback effects for leadership roles in student organizations.

Cole et al. (2007). "Recruiters' Inferences of Applicant Personality Based on Resume Screening." *Journal of Business and Psychology*, 22, 163-177 -- found extracurriculars signal conscientiousness and extraversion.

### 6.8 Parameter 8: GPA (Weight: 3%)

**Formula**: Linear scale above the 3.0/4.0 cutoff.

```
If GPA not provided: score = 0.5 (neutral, no penalty)
If GPA >= 3.0: score = min(1.0, (GPA - 2.0) / 2.0)  # Linear 2.0->0.0, 3.0->0.5, 4.0->1.0
If GPA < 3.0: score = max(0.0, (GPA - 2.0) / 2.0)
```

The 3.0 cutoff is the median employer threshold. Source: NACE Job Outlook 2024 -- 38.3% of employers use GPA as criterion, average cutoff remains 3.0. [NACE](https://www.naceweb.org/job-market/trends-and-predictions/percentage-of-employers-screening-college-graduates-by-gpa-drops-sharply/). The linear scale rather than binary is used because NACE reports it as a screening threshold, not a hard gate -- employers who use GPA prefer higher GPAs proportionally.

### 6.9 Parameter 9: Resume Parseability (Pass/Fail Gate)

**Formula**: Section identification rate.

```
expected_sections = ["contact_info", "education", "experience_or_projects", "skills"]
identified = count of expected sections successfully parsed
parseability = identified / len(expected_sections) >= 0.75
```

If parseability fails (< 75% of expected sections identifiable): `final_score = 0`. This is a hard gate.

L1 identifies sections via regex patterns for common headings ("Education", "Experience", "Skills", "Projects", etc.) and structural cues (date patterns, bullet points, email/phone regex).

Source: Ladders Eye-Tracking Study 2018 -- recruiters scan in F-pattern, spending 7.4 seconds on average. They look at: (1) current title/company, (2) previous position, (3) dates, (4) education. If these sections can't be found, the resume fails initial screen. [Ladders](https://www.theladders.com/career-advice/you-only-get-6-seconds-of-fame-make-it-count); [PR Newswire](https://www.prnewswire.com/news-releases/ladders-updates-popular-recruiter-eye-tracking-study-with-new-key-insights-on-how-job-seekers-can-improve-their-resumes-300744217.html).

Jobscan (2023) tested 20 ATS systems and found parse accuracy ranged from 60-95% depending on format. Single-column .docx parsed best, multi-column PDF parsed worst. Our templates are designed to produce parseable output. [Jobscan](https://www.jobscan.co/blog/fortune-500-use-applicant-tracking-systems/).

### 6.10 Parameter 10: Section Completeness (Weight: 2%)

**Formula**: Presence check against Ladders F-pattern priority.

The Ladders 2018 eye-tracking study identified the scan order: (1) name/title, (2) current role, (3) previous role + dates, (4) education. For freshers without work history, projects substitute for roles.

```
fresher_expected = ["name", "education", "skills", "projects_or_experience", "summary"]
completeness_score = count(present_sections) / len(fresher_expected)
```

Source: [Ladders Eye-Tracking Study 2018](https://www.theladders.com/career-advice/you-only-get-6-seconds-of-fame-make-it-count); [HR Dive coverage](https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/).

### 6.11 Parameter 11: Contradiction / Credibility (Penalty: -5 to -20 per flag)

**Formula**: L3 (Gemma 3) cross-reference using Henle et al.'s taxonomy.

Henle, Dineen, & Duffy (2019) developed a validated three-dimensional taxonomy of resume fraud:

| Dimension | Definition | Penalty | Example |
|-----------|-----------|---------|---------|
| **Fabrication** | Knowingly stating false information | -20 | Claiming a degree never earned |
| **Embellishment** | Exaggerating real experience | -10 | Inflating role in a group project |
| **Omission** | Strategically hiding information | -5 | Hiding employment gaps by removing dates |

Source: Henle, C.A., Dineen, B.R., & Duffy, M.K. (2019). "Assessing Intentional Resume Deception: Development and Nomological Network of a Resume Fraud Measure." *Journal of Business and Psychology*, 34, 207-225. [Springer](https://link.springer.com/article/10.1007/s10869-017-9527-4); [Purdue Research](https://business.purdue.edu/news/features/?research=5135).

L3 detects contradictions by cross-referencing:
- Graduation year vs claimed years of experience
- Skill claims vs evidence in project/experience descriptions
- Overlapping date ranges
- Title inflation ("CEO" of a college club)

Each flag is classified into one of the three dimensions. Penalty values correspond to severity: fabrication is the most severe, omission the least. These severity levels mirror the original Henle et al. taxonomy where fabrication had the strongest negative employer reaction.

### 6.12 Parameter 12: Framing / Inflation Detection (Penalty: -3 to -10 per flag)

**Formula**: L3 checks for specific inflation patterns identified in research.

| Pattern | Detection Method | Penalty | Source |
|---------|-----------------|---------|--------|
| Unsubstantiated skill claims | Skill listed but never mentioned in experience/projects | -5 | Knouse, S.B. (1994). "Impressions of the Resume." *Personnel Psychology* |
| Vague quantification | "Improved performance" without numbers | -3 | AAC&U VALUE Rubric Benchmark level |
| Title inflation | Title disproportionate to role description | -7 | Henle et al. 2019 (embellishment dimension) |
| Buzzword stuffing | Abnormally high density of keywords vs. substantive content | -5 | [Jobscan ATS Study](https://www.jobscan.co/) -- hidden text / keyword stuffing detection |
| Skill count credibility | >15 unrelated skills listed | -3 | Knouse 1994 -- claiming too many unrelated proficiencies triggers credibility doubt |

### 6.13 Score Calculation

```
# All parameter scores are normalized to [0, 1]
base_score = (
  0.30 * skills_score +        # §6.1 - Jaccard + cosine TF-IDF
  0.20 * experience_score +     # §6.2 - Embedding similarity + O*NET zones
  0.15 * education_score +      # §6.3 - CIP-SOC crosswalk
  0.10 * project_score +        # §6.4 - AAC&U VALUE rubric levels
  0.05 * cert_score +           # §6.5 - Embedding similarity to JD
  0.05 * distance_score +       # §6.6 - Exponential decay, Marinescu & Rathelot
  0.05 * extra_score +          # §6.7 - Binary + leadership detection
  0.03 * gpa_score +            # §6.8 - Linear scale, NACE 3.0 cutoff
  0.02 * completeness_score +   # §6.10 - Ladders F-pattern section check
) * 100  # Scale to 0-100

# Sum penalties from §6.11 and §6.12
penalty = sum(flag.penalty for flag in red_flags)

# Final score
final_score = max(0, min(100, base_score + penalty))

# Hard gate: §6.9
If parseability == False: final_score = 0

# Distance unavailable: redistribute 5% proportionally across params 1-5
If distance unavailable:
  Multiply weights of params 1-5 by (sum_of_1_to_5 + 0.05) / sum_of_1_to_5
  # i.e., 0.30 becomes 0.30 * (0.80/0.75) = 0.32, etc.
  # Total still sums to 0.95 (excluding the missing 0.05)
  # Then normalize: all weights * (1.0 / sum_of_active_weights)

# Weights always sum to 1.0 (before penalty)
# Weight redistribution formula:
#   w_i_adjusted = w_i / (1.0 - sum_of_excluded_weights)
```

**Weight sources summary** (displayed on dashboard):

| Weight | Source | Verification URL |
|--------|--------|-----------------|
| 30% skills | NACE Job Outlook 2024 | https://www.naceweb.org/about-us/press/the-key-attributes-employers-are-looking-for-on-graduates-resumes |
| 20% experience | NACE Internship Survey 2024 | https://www.naceweb.org/job-market/internships/ |
| 15% education | NACE Job Outlook 2024 (73.4%) | https://www.naceweb.org/store/2023/job-outlook-2024/ |
| 10% projects | AAC&U / Hart Research 2018 | https://www.aacu.org/value/rubrics |
| 5% certifications | SHRM Credentials 2021 | https://www.shrm.org/ |
| 5% distance | Marinescu & Rathelot 2018, AEJ:Macro | https://www.aeaweb.org/articles?id=10.1257/mac.20160312 |
| 5% extracurricular | Roulin & Bangerter 2013 | https://onlinelibrary.wiley.com/doi/10.1080/00207594.2012.692793 |
| 3% GPA | NACE 2024 (38.3% use 3.0 cutoff) | https://www.naceweb.org/job-market/trends-and-predictions/percentage-of-employers-screening-college-graduates-by-gpa-drops-sharply/ |
| 2% completeness | Ladders Eye-Tracking 2018 | https://www.theladders.com/career-advice/you-only-get-6-seconds-of-fame-make-it-count |
| Penalties | Henle et al. 2019, Knouse 1994 | https://link.springer.com/article/10.1007/s10869-017-9527-4 |

**External scoring frameworks used** (all open/published):

| Framework | Publisher | Access |
|-----------|----------|--------|
| CIP-SOC Crosswalk | BLS + NCES (US Dept of Education) | https://nces.ed.gov/ipeds/cipcode/post3.aspx?y=56 |
| O*NET Content Model | US Dept of Labor | https://www.onetcenter.org/content.html |
| ESCO Skills Ontology | European Commission | https://esco.ec.europa.eu/en/use-esco/download |
| AAC&U VALUE Rubrics | AAC&U | https://www.aacu.org/value/rubrics |
| Jaccard Similarity | Standard math (1901) | https://en.wikipedia.org/wiki/Jaccard_index |
| Cosine Similarity / TF-IDF | Standard IR (Salton, 1975) | https://scikit-learn.org/stable/modules/metrics.html#cosine-similarity |

### 6.3 Agentic Pipeline

Each resume analysis runs as a pipeline of agents in Web Workers:

```
ResumeAgent (orchestrator)
  |-> ParseAgent      : Extract text from PDF/DOCX
  |-> L1_NLPAgent     : Keywords, sections, dates, entities (instant)
  |-> L2_EmbedAgent   : MiniLM semantic embeddings + similarity (1-2s)
  |-> L3_ReasonAgent  : Gemma 3 contradiction/framing/quality (5-15s, if available)
  |-> L4_FallbackAgent: Gemini API (only if L3 fails entirely)
  |-> ScoreAgent      : Compute weighted composite from all agent outputs
  |-> DistanceAgent   : Maps API call (optional, async, online-only)
```

Agents communicate via structured message passing. Each agent outputs a typed result. ScoreAgent aggregates all results into the final candidate record.

Progressive results: L1 scores appear instantly. L2 enriches within 2s. L3 adds reasoning flags over 5-15s. The dashboard table updates progressively as each layer completes.

---

## 7. Offline Strategy

### 7.1 Service Worker (Workbox)

- **Precache**: HTML, JS, CSS, fonts, icons -- everything needed for the app shell
- **Runtime cache**: ML model files cached in IndexedDB on first download
- **Strategy**: App shell = cache-first. ML models = cache-first with background update check. API calls (Maps, Gemini) = network-only with graceful degradation.

### 7.2 Model Caching

| Model | Size | Cache Location | Download Trigger |
|-------|------|---------------|-----------------|
| MiniLM-L6-v2 | ~50MB | IndexedDB | First time employer mode or AI refine is used |
| Gemma 3 1B Q4 | ~600MB | IndexedDB via WebLLM cache | First time L3 analysis is triggered |

Models are never bundled in the build. Downloaded on-demand, cached permanently in IndexedDB. Subsequent visits use cached models with zero network.

### 7.3 Data Persistence

All user data stored in IndexedDB via Zustand persist middleware:
- Resume form data (student mode)
- Analysis results (employer mode)
- JD text and extracted requirements
- Theme preference (localStorage)
- Model cache status

### 7.4 Progressive Enhancement for ML

| Device Capability | What Works |
|-------------------|------------|
| Any browser with JS | Student mode fully functional. Form, preview, templates, print, download. |
| Browser with WASM | + L1 keyword analysis + L2 semantic matching (MiniLM via ONNX WASM) |
| Browser with WebGPU | + L3 Gemma 3 reasoning at full speed |
| Browser with WASM only (no WebGPU) | + L3 Gemma 3 via WASM CPU fallback (slower, 30-60s per analysis) |
| Online + API key | + L4 Gemini 2.5 Pro as extreme backup |
| Online + Maps API key | + Distance calculation |

The app detects capabilities on load and shows appropriate UI. Users without WebGPU see: "Basic analysis available. For deep AI reasoning, use a browser with WebGPU support."

---

## 8. Accessibility (WCAG 2.2 AAA)

- **Contrast**: All text meets 7:1 ratio (AAA). Navy (#182B49) on white = 13.5:1. Red used only for non-text indicators; text uses navy/dark gray.
- **Keyboard navigation**: All interactive elements focusable. Tab order follows visual order. Focus ring visible (3px solid, high contrast). Skip-to-content link on every page.
- **Screen reader**: All form fields have associated labels. Live regions (`aria-live`) for dynamic content (preview updates, AI suggestions, analysis progress). Landmark roles on all sections.
- **Drag and drop**: All drag-reorder operations also accessible via keyboard (arrow keys to move) and have screen reader announcements.
- **Reduced motion**: `prefers-reduced-motion` respected. Animations disabled. Transitions instant.
- **Focus management**: When AI panel opens, focus moves to panel. On close, focus returns to trigger button. Modal trap for dialogs.
- **Error handling**: Form validation errors announced via `aria-live`. Inline error messages associated with fields via `aria-describedby`.
- **Text scaling**: All text in rem/em. Layouts don't break up to 200% zoom.
- **Touch targets**: Minimum 44x44px for all interactive elements (WCAG 2.5.8 AAA).

---

## 9. Pages

### 9.1 Landing Page (`/`)

- **Navbar**: Shoolini logo, ResumeAI, page links, mode toggle, theme toggle, a11y button
- **Hero**: Navy-to-red gradient. "Your Resume. Your Career. AI-Powered." Feature pills (Offline, In-Browser AI, WCAG AAA, Research-Backed, Zero Server).
- **Mode selection cards**: "I'm a Student" (navy CTA) and "I'm a Recruiter" (red CTA)
- **Footer**: Astha Chandel attribution, GF202214559, Shoolini University

### 9.2 Builder Page (`/builder`)

- Split layout: form (left, scrollable) + preview (right, sticky)
- Template selector above preview
- AI Refine panel slides from right
- Download/Print buttons at bottom of form
- Auto-save indicator

### 9.3 Print Preview (`/builder/preview`)

- Full-screen resume in selected template
- Print-optimized layout (A4 margins, page breaks)
- Back button to return to builder
- Print and Download buttons floating

### 9.4 Employer Dashboard (`/employer`)

- JD input bar at top
- Bulk resume upload zone (drag-drop)
- Candidate table with sorting/filtering
- Progress indicators during analysis
- Research citations toggle (show/hide sources)

### 9.5 Candidate Detail (`/employer/:id`)

- Three-panel layout: keyword analysis, AI red flags, scoring breakdown
- Full parsed resume view
- Side-by-side JD vs resume comparison
- All citations inline

### 9.6 Pitch Deck (`/pitch`)

- 10 HTML-based slides, keyboard-navigable (arrow keys)
- Shoolini-branded throughout
- WCAG AAA compliant
- Printable (one slide per page via @media print)

**Slide content:**
1. Title: ResumeAI + Shoolini logo + Astha Chandel + GF202214559
2. Problem: 75% of resumes rejected by ATS before human eyes (Jobscan 2023). Freshers lack tools and knowledge.
3. Solution: Offline-first, in-browser AI resume builder + employer analysis platform.
4. Architecture: 4-layer AI pipeline diagram. Vite + React + ONNX + WebLLM.
5. Demo: Student Builder: live form, template switching, print preview.
6. Demo: Employer Dashboard: JD upload, bulk analysis, sortable table, red flags.
7. Research Backing: 12 parameters, all cited (NACE, SHRM, Jobscan, academic papers).
8. Technical Deep-Dive: Offline strategy, WASM, WebGPU, service worker, progressive enhancement.
9. Accessibility & Compatibility: WCAG 2.2 AAA. Any OS, any browser, any device.
10. Thank You: Astha Chandel, GF202214559, Shoolini University, Solan HP. Q&A.

---

## 10. Data Model

### 10.1 Resume (Student Mode)

```typescript
interface Resume {
  id: string;
  meta: {
    createdAt: string;
    updatedAt: string;
    templateId: 'ats-classic' | 'modern-blue' | 'creative' | 'minimal';
  };
  personal: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  summary?: string;
  sections: Section[]; // ordered array, drag-reorderable
}

interface Section {
  id: string;
  type: 'education' | 'experience' | 'projects' | 'skills' | 'certifications' | 'extracurricular' | 'custom';
  heading: string; // user-editable for custom sections
  layout: 'list' | 'key-value' | 'tags' | 'freetext';
  entries: Entry[];
}

interface Entry {
  id: string;
  fields: Record<string, string>; // flexible key-value
  bullets?: string[]; // for list-type sections
}
```

### 10.2 Employer Analysis

```typescript
interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
  extractedRequirements: {
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: string;
    educationRequirements: string[];
    location?: string;
  };
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  resumeText: string;
  resumeFile?: Blob;
  scores: {
    overall: number; // 0-100
    skillsMatch: { matched: string[]; missing: string[]; semantic: string[]; score: number };
    experience: { level: 'high' | 'medium' | 'low'; score: number };
    education: { relevance: 'relevant' | 'partial' | 'irrelevant'; score: number };
    projects: { hasQuantified: boolean; score: number };
    certifications: { relevant: string[]; score: number };
    distance?: { km: number; minutes: number; score: number };
    extracurricular: { hasLeadership: boolean; score: number };
    gpa?: { value: number; score: number };
    parseability: boolean;
    completeness: { missingSections: string[]; score: number };
  };
  redFlags: RedFlag[];
  analysisLayers: ('L1' | 'L2' | 'L3' | 'L4')[];
}

interface RedFlag {
  type: 'contradiction' | 'framing' | 'date-inconsistency' | 'skill-inflation' | 'hidden-text';
  description: string;
  evidence: string;
  penalty: number;
  citation: string;
}
```

---

## 11. File Structure

```
resume-builder/
  src/
    main.tsx                    # Entry point
    App.tsx                     # Router shell
    theme/
      tokens.css                # CSS custom properties (light + dark)
      ThemeProvider.tsx          # Theme context, toggle, persistence
    layout/
      Navbar.tsx                # Shared nav with Shoolini branding
      Footer.tsx                # Shared footer with Astha attribution
      Layout.tsx                # Shell wrapper
    pages/
      Landing.tsx               # / route
      Builder.tsx               # /builder route
      PrintPreview.tsx          # /builder/preview route
      Employer.tsx              # /employer route (lazy-loaded)
      CandidateDetail.tsx       # /employer/:id route (lazy-loaded)
      PitchDeck.tsx             # /pitch route
    builder/
      components/
        ResumeForm.tsx          # Left panel form
        SectionEditor.tsx       # Generic section editor (built-in + custom)
        CustomSectionModal.tsx  # Add custom section dialog
        SkillTagInput.tsx       # Tag-style skill input with categories
        DraggableSections.tsx   # @dnd-kit section reordering
        LivePreview.tsx         # Right panel editable preview
        EditableText.tsx        # Inline-editable text component
        TemplateSelector.tsx    # Template dropdown/cards
        AICoachPanel.tsx        # AI refinement slide-in panel
      templates/
        ATSClassic.tsx          # Template 1
        ModernBlue.tsx          # Template 2
        Creative.tsx            # Template 3
        Minimal.tsx             # Template 4
        print.css               # @media print styles shared across templates
    employer/
      components/
        JDInput.tsx             # JD paste/upload bar
        ResumeUploader.tsx      # Bulk file upload zone
        CandidateTable.tsx      # Sortable/filterable table
        ScoreBreakdown.tsx      # Detailed scoring panel
        RedFlagPanel.tsx        # AI red flags with citations
        KeywordAnalysis.tsx     # Matched/missing keywords
        CitationTooltip.tsx     # Research citation popover
    ai/
      pipeline.ts              # Agentic pipeline orchestrator
      agents/
        ParseAgent.ts           # Resume text extraction
        L1_NLPAgent.ts          # Keyword/TF-IDF/regex
        L2_EmbedAgent.ts        # ONNX MiniLM embeddings
        L3_ReasonAgent.ts       # WebLLM Gemma 3
        L4_FallbackAgent.ts     # Gemini API
        ScoreAgent.ts           # Weighted score computation
        DistanceAgent.ts        # Maps API
      workers/
        nlp.worker.ts           # Web Worker for L1
        embed.worker.ts         # Web Worker for L2
        llm.worker.ts           # Web Worker for L3/L4
      models/
        loader.ts               # Model download + IndexedDB cache
        capabilities.ts         # Detect WebGPU, WASM, RAM
    store/
      resumeStore.ts            # Zustand store for student mode
      employerStore.ts          # Zustand store for employer mode
      persist.ts                # IndexedDB persistence middleware
    pitch/
      slides/
        Slide01Title.tsx
        Slide02Problem.tsx
        Slide03Solution.tsx
        Slide04Architecture.tsx
        Slide05DemoBuilder.tsx
        Slide06DemoEmployer.tsx
        Slide07Research.tsx
        Slide08TechDeep.tsx
        Slide09Accessibility.tsx
        Slide10ThankYou.tsx
      PitchNav.tsx              # Slide navigation (arrows, dots)
    utils/
      pdf.ts                    # html2pdf.js wrapper
      print.ts                  # Print trigger helper
      a11y.ts                   # Focus management, announcements
    hooks/
      useTheme.ts               # Theme hook
      useAutoSave.ts            # Debounced IndexedDB save
      useCapabilities.ts        # Detect device ML capabilities
  public/
    favicon.ico
    manifest.json               # PWA manifest
    robots.txt
  index.html                    # SPA entry with blocking theme script
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
```

---

## 12. Testing Strategy

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Vitest | Store logic, score calculation, NLP parsing, template rendering |
| Component | React Testing Library | Form interactions, preview updates, bidirectional sync |
| E2E | Playwright | Full user flows: fill form -> preview -> print. Upload JD -> upload resumes -> see scores. |
| Accessibility | axe-core + Playwright | Every page scanned for WCAG violations |
| Print | Playwright PDF comparison | Print output matches expected layout |
| Offline | Playwright with network throttling | App works after going offline |

---

## 13. Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | <1.5s | Vite code-splitting, Tailwind purge, precache |
| Largest Contentful Paint | <2.5s | Hero image/text above fold, no blocking resources |
| INP | <200ms | React concurrent rendering, debounced inputs |
| CLS | <0.1 | Fixed layout, no layout shifts from lazy content |
| Student mode JS bundle | <500KB gzipped | Code-split employer mode, tree-shake |
| Time to interactive (offline) | <500ms | Service worker serves from cache |

---

## 14. Security

- No data leaves the device (except optional Maps/Gemini API calls, user-initiated)
- API keys stored in localStorage, never transmitted to any server
- CSP headers: `default-src 'self'`; script-src, style-src restricted
- No cookies, no tracking, no analytics
- Resume data in IndexedDB is browser-sandboxed
- XSS prevention: React's default escaping + CSP
- Uploaded resumes parsed in Web Workers (sandboxed)
