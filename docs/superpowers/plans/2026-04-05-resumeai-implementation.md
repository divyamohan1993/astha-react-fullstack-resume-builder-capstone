# ResumeAI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully offline, browser-based resume builder + employer analysis platform with in-browser AI scoring, deployable as static files.

**Architecture:** Monolith SPA with code-splitting. Vite + React 19 + TypeScript + Tailwind CSS 4. Zustand + IndexedDB for state. Workbox for offline. ONNX Runtime Web + WebLLM for in-browser ML. All scoring formulas traceable to published research.

**Tech Stack:** Vite 6, React 19, TypeScript, Tailwind CSS 4, Zustand, React Router 7, @dnd-kit, ONNX Runtime Web, WebLLM, html2pdf.js, pdf.js, Workbox, Vitest, Playwright

---

## Phase 1: Foundation

### Task 1: Scaffold Vite + React + TypeScript Project

**Files:**
- Delete: `resume-builder/` (old CRA app)
- Create: `package.json` (root)
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`

- [ ] **Step 1: Remove old CRA project, scaffold new Vite project**

```bash
rm -rf resume-builder
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install react-router-dom@7 zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D tailwindcss@4 @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vite with Tailwind**

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Configure TypeScript**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create test setup**

`src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Create entry point with Tailwind import**

`src/main.css`:
```css
@import "tailwindcss";
```

`src/main.tsx`:
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`src/App.tsx`:
```typescript
export function App() {
  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">ResumeAI</div>;
}
```

- [ ] **Step 7: Verify build works**

```bash
npm run build && npm run dev
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind project"
```

---

### Task 2: Theme System (Light + Dark)

**Files:**
- Create: `src/theme/tokens.css`
- Create: `src/theme/ThemeProvider.tsx`
- Create: `src/hooks/useTheme.ts`
- Modify: `index.html` (blocking theme script)
- Test: `src/theme/__tests__/ThemeProvider.test.tsx`

- [ ] **Step 1: Write theme tokens CSS**

`src/theme/tokens.css`:
```css
:root, .light {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-surface: #fafafa;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  --border: #e0e0e0;
  --accent-red: #e41a1a;
  --accent-navy: #182B49;
  --accent-gold: #d4a800;
  --shadow: rgba(0,0,0,0.08);
  --focus-ring: #182B49;
}

.dark {
  --bg-primary: #0d1b2a;
  --bg-secondary: #0a1520;
  --bg-surface: #1a2a3a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  --border: #2a3a4a;
  --accent-red: #e85454;
  --accent-navy: #3a6a9a;
  --accent-gold: #ffdc00;
  --shadow: rgba(0,0,0,0.3);
  --focus-ring: #6a9aca;
}

@media print {
  :root, .dark {
    --bg-primary: #ffffff;
    --bg-secondary: #ffffff;
    --bg-surface: #ffffff;
    --text-primary: #000000;
    --text-secondary: #333333;
    --text-muted: #666666;
    --border: #cccccc;
    --accent-red: #000000;
    --accent-navy: #000000;
    --shadow: none;
  }
}
```

- [ ] **Step 2: Write blocking theme script in index.html**

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="ResumeAI — Offline-first, in-browser AI resume builder and employer analysis platform" />
    <meta name="theme-color" content="#182B49" />
    <title>ResumeAI — Shoolini University</title>
    <script>
      (function() {
        var t = localStorage.getItem('theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.add('light');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Write ThemeProvider and hook**

`src/hooks/useTheme.ts`:
```typescript
import { useCallback, useSyncExternalStore } from 'react';

function getTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as const);

  const toggle = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(next);
    localStorage.setItem('theme', next);
    notify();
  }, [theme]);

  return { theme, toggle } as const;
}
```

`src/theme/ThemeProvider.tsx`:
```typescript
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 4: Write test**

`src/theme/__tests__/ThemeProvider.test.tsx`:
```typescript
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../../hooks/useTheme';

beforeEach(() => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add('light');
  localStorage.clear();
});

test('reads initial theme from DOM', () => {
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe('light');
});

test('toggles theme and persists to localStorage', () => {
  const { result } = renderHook(() => useTheme());
  act(() => result.current.toggle());
  expect(result.current.theme).toBe('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/theme
```

- [ ] **Step 6: Import tokens in main.css**

```css
@import "tailwindcss";
@import "./theme/tokens.css";
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: theme system with light/dark mode, localStorage persist, zero FOUC"
```

---

### Task 3: Routing + Layout Shell

**Files:**
- Create: `src/layout/Navbar.tsx`
- Create: `src/layout/Footer.tsx`
- Create: `src/layout/Layout.tsx`
- Create: `src/pages/Landing.tsx`
- Create: `src/pages/Builder.tsx`
- Create: `src/pages/PrintPreview.tsx`
- Modify: `src/App.tsx`
- Test: `src/layout/__tests__/Layout.test.tsx`

- [ ] **Step 1: Create Navbar with Shoolini branding**

`src/layout/Navbar.tsx`:
```typescript
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/builder', label: 'Builder' },
  { to: '/employer', label: 'Employer' },
] as const;

export function Navbar() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  return (
    <nav
      className="flex items-center justify-between px-6 py-3"
      style={{ background: 'var(--accent-navy)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <Link to="/" className="flex items-center gap-3 no-underline" aria-label="ResumeAI home">
        <img
          src="https://shooliniuniversity.com/assets/images/logo.png"
          alt="Shoolini University logo"
          className="h-9 w-9 rounded-md bg-white object-contain p-0.5"
          width={36}
          height={36}
        />
        <div>
          <div className="text-base font-bold text-white leading-tight">ResumeAI</div>
          <div className="text-xs text-white/50 leading-tight">
            Shoolini University &middot; BTech CSE Capstone
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-6">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-sm no-underline ${
              pathname === to ? 'text-white font-bold border-b-2 border-[var(--accent-red)] pb-0.5' : 'text-white/70'
            }`}
            aria-current={pathname === to ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}

        <button
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white text-sm"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </button>

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded focus:z-50"
        >
          Skip to content
        </a>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create Footer with Astha attribution**

`src/layout/Footer.tsx`:
```typescript
export function Footer() {
  return (
    <footer
      className="flex items-center justify-between px-6 py-4 print:hidden"
      style={{ background: 'var(--accent-navy)' }}
      role="contentinfo"
    >
      <div>
        <div className="text-sm font-bold text-white">ResumeAI</div>
        <div className="text-xs text-white/50">BTech CSE Capstone Project</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-white/70">Developed by</div>
        <div className="text-sm font-bold text-white">Astha Chandel</div>
        <div className="text-xs text-white/40">GF202214559</div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <img
          src="https://shooliniuniversity.com/assets/images/logo.png"
          alt="Shoolini University"
          className="h-6 w-6 rounded bg-white object-contain p-0.5"
          width={24}
          height={24}
        />
        <div>
          <div className="text-xs font-bold text-white">Shoolini University</div>
          <div className="text-xs text-white/40">Solan, Himachal Pradesh</div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create Layout shell**

`src/layout/Layout.tsx`:
```typescript
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder pages**

`src/pages/Landing.tsx`:
```typescript
import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div>
      <section
        className="px-8 py-20 text-center"
        style={{ background: 'linear-gradient(170deg, var(--accent-navy) 0%, var(--accent-navy) 60%, var(--accent-red) 100%)' }}
      >
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
          Your Resume. Your Career.
          <br />
          <span style={{ color: 'var(--accent-gold)' }}>AI-Powered.</span>
        </h1>
        <p className="text-white/70 max-w-lg mx-auto mb-8">
          Build ATS-ready resumes. Analyze candidates against job descriptions.
          Runs entirely in your browser. No data leaves your device.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {['100% Offline', 'In-Browser AI', 'WCAG 2.2 AAA', 'Research-Backed Scoring', 'Zero Server Cost'].map((pill) => (
            <span key={pill} className="rounded-full bg-white/15 px-4 py-1.5 text-xs text-white">
              {pill}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl grid-cols-1 gap-6 px-8 py-12 sm:grid-cols-2 -mt-6">
        <Link
          to="/builder"
          className="rounded-2xl border-2 p-8 text-center no-underline shadow-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <div className="mb-4 text-5xl" aria-hidden="true">📝</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-navy)' }}>I'm a Student</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Build your resume. 4 templates. Live preview. Print or download PDF.
          </p>
          <span
            className="inline-block rounded-lg px-6 py-2 text-sm font-bold text-white"
            style={{ background: 'var(--accent-navy)' }}
          >
            Start Building
          </span>
        </Link>

        <Link
          to="/employer"
          className="rounded-2xl border-2 p-8 text-center no-underline shadow-lg"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <div className="mb-4 text-5xl" aria-hidden="true">📊</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-navy)' }}>I'm a Recruiter</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Paste JD. Upload 100s of resumes. AI scores with cited research.
          </p>
          <span
            className="inline-block rounded-lg px-6 py-2 text-sm font-bold text-white"
            style={{ background: 'var(--accent-red)' }}
          >
            Analyze Candidates
          </span>
        </Link>
      </section>
    </div>
  );
}
```

`src/pages/Builder.tsx`:
```typescript
export function Builder() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Resume Builder</h1></div>;
}
```

`src/pages/PrintPreview.tsx`:
```typescript
export function PrintPreview() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Print Preview</h1></div>;
}
```

- [ ] **Step 5: Wire up routing in App.tsx**

`src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './layout/Layout';
import { Landing } from './pages/Landing';
import { Builder } from './pages/Builder';
import { PrintPreview } from './pages/PrintPreview';

const Employer = lazy(() => import('./pages/Employer').then((m) => ({ default: m.Employer })));
const CandidateDetail = lazy(() => import('./pages/CandidateDetail').then((m) => ({ default: m.CandidateDetail })));
const PitchDeck = lazy(() => import('./pages/PitchDeck').then((m) => ({ default: m.PitchDeck })));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading">
      <div className="text-lg" style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="builder" element={<Builder />} />
            <Route path="builder/preview" element={<PrintPreview />} />
            <Route path="employer" element={<Employer />} />
            <Route path="employer/:id" element={<CandidateDetail />} />
            <Route path="pitch" element={<PitchDeck />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Create lazy-loaded page stubs**

`src/pages/Employer.tsx`:
```typescript
export function Employer() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Employer Dashboard</h1></div>;
}
```

`src/pages/CandidateDetail.tsx`:
```typescript
export function CandidateDetail() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Candidate Detail</h1></div>;
}
```

`src/pages/PitchDeck.tsx`:
```typescript
export function PitchDeck() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Pitch Deck</h1></div>;
}
```

- [ ] **Step 7: Write layout test**

`src/layout/__tests__/Layout.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';

test('renders navbar with Shoolini branding', () => {
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>
  );
  expect(screen.getByText('ResumeAI')).toBeInTheDocument();
  expect(screen.getByText('Astha Chandel')).toBeInTheDocument();
  expect(screen.getByAltText('Shoolini University logo')).toBeInTheDocument();
});
```

- [ ] **Step 8: Run tests and build**

```bash
npx vitest run && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: routing + layout shell with Shoolini branding, Astha attribution"
```

---

### Task 4: Zustand Store + IndexedDB Persistence

**Files:**
- Create: `src/store/resumeStore.ts`
- Create: `src/store/employerStore.ts`
- Create: `src/store/persist.ts`
- Create: `src/store/types.ts`
- Test: `src/store/__tests__/resumeStore.test.ts`

- [ ] **Step 1: Define data types**

`src/store/types.ts`:
```typescript
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
  type: 'education' | 'experience' | 'projects' | 'skills' | 'certifications' | 'extracurricular' | 'custom';
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
  skillsMatch: { matched: string[]; missing: string[]; semantic: string[]; score: number };
  experience: { level: 'high' | 'medium' | 'low'; score: number };
  education: { relevance: 'relevant' | 'partial' | 'irrelevant'; score: number };
  projects: { hasQuantified: boolean; score: number };
  certifications: { relevant: string[]; score: number };
  distance: { km: number; minutes: number; score: number } | null;
  extracurricular: { hasLeadership: boolean; score: number };
  gpa: { value: number; score: number } | null;
  parseability: boolean;
  completeness: { missingSections: string[]; score: number };
}

export interface RedFlag {
  type: 'contradiction' | 'framing' | 'date-inconsistency' | 'skill-inflation' | 'hidden-text';
  dimension: 'fabrication' | 'embellishment' | 'omission';
  description: string;
  evidence: string;
  penalty: number;
  citation: string;
}
```

- [ ] **Step 2: Write IndexedDB persistence middleware**

`src/store/persist.ts`:
```typescript
import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

const DB_NAME = 'resumeai';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getItem<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readonly');
    const req = tx.objectStore('store').get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function setItem<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readwrite');
    tx.objectStore('store').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createIndexedDBStorage<T>(key: string) {
  let debounceTimer: ReturnType<typeof setTimeout>;

  return {
    load: () => getItem<T>(key),
    save: (state: T) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => setItem(key, state), 300);
    },
  };
}
```

- [ ] **Step 3: Write resume store**

`src/store/resumeStore.ts`:
```typescript
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
    personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '',
    sections: [
      { id: uuid(), type: 'education', heading: 'Education', layout: 'list', entries: [] },
      { id: uuid(), type: 'experience', heading: 'Experience', layout: 'list', entries: [] },
      { id: uuid(), type: 'projects', heading: 'Projects', layout: 'list', entries: [] },
      { id: uuid(), type: 'skills', heading: 'Skills', layout: 'tags', entries: [] },
      { id: uuid(), type: 'certifications', heading: 'Certifications', layout: 'list', entries: [] },
      { id: uuid(), type: 'extracurricular', heading: 'Extracurricular & Leadership', layout: 'list', entries: [] },
    ],
  };
}

interface ResumeState {
  resume: Resume;
  loaded: boolean;
  setPersonal: (personal: Partial<PersonalInfo>) => void;
  setSummary: (summary: string) => void;
  setTemplate: (templateId: TemplateId) => void;
  addSection: (section: Section) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  updateSectionHeading: (sectionId: string, heading: string) => void;
  addEntry: (sectionId: string, entry: Entry) => void;
  removeEntry: (sectionId: string, entryId: string) => void;
  updateEntry: (sectionId: string, entryId: string, updates: Partial<Entry>) => void;
  reorderEntries: (sectionId: string, fromIndex: number, toIndex: number) => void;
  load: () => Promise<void>;
}

const storage = createIndexedDBStorage<Resume>('resume');

export const useResumeStore = create<ResumeState>((set, get) => ({
  resume: createDefaultResume(),
  loaded: false,

  setPersonal: (partial) =>
    set((s) => {
      const resume = { ...s.resume, personal: { ...s.resume.personal, ...partial }, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  setSummary: (summary) =>
    set((s) => {
      const resume = { ...s.resume, summary, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  setTemplate: (templateId) =>
    set((s) => {
      const resume = { ...s.resume, meta: { ...s.resume.meta, templateId, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  addSection: (section) =>
    set((s) => {
      const resume = { ...s.resume, sections: [...s.resume.sections, section], meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  removeSection: (sectionId) =>
    set((s) => {
      const resume = { ...s.resume, sections: s.resume.sections.filter((sec) => sec.id !== sectionId), meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  reorderSections: (fromIndex, toIndex) =>
    set((s) => {
      const sections = [...s.resume.sections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      const resume = { ...s.resume, sections, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  updateSectionHeading: (sectionId, heading) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) => (sec.id === sectionId ? { ...sec, heading } : sec));
      const resume = { ...s.resume, sections, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  addEntry: (sectionId, entry) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, entries: [...sec.entries, entry] } : sec
      );
      const resume = { ...s.resume, sections, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  removeEntry: (sectionId, entryId) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, entries: sec.entries.filter((e) => e.id !== entryId) } : sec
      );
      const resume = { ...s.resume, sections, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
      storage.save(resume);
      return { resume };
    }),

  updateEntry: (sectionId, entryId, updates) =>
    set((s) => {
      const sections = s.resume.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, entries: sec.entries.map((e) => (e.id === entryId ? { ...e, ...updates } : e)) }
          : sec
      );
      const resume = { ...s.resume, sections, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
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
      const resume = { ...s.resume, sections, meta: { ...s.resume.meta, updatedAt: new Date().toISOString() } };
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
```

- [ ] **Step 4: Write store test**

`src/store/__tests__/resumeStore.test.ts`:
```typescript
import { useResumeStore } from '../resumeStore';

beforeEach(() => {
  useResumeStore.setState({
    resume: {
      id: 'test',
      meta: { createdAt: '', updatedAt: '', templateId: 'ats-classic' },
      personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
      summary: '',
      sections: [
        { id: 's1', type: 'education', heading: 'Education', layout: 'list', entries: [] },
      ],
    },
    loaded: true,
  });
});

test('setPersonal updates personal info', () => {
  useResumeStore.getState().setPersonal({ name: 'Astha Chandel' });
  expect(useResumeStore.getState().resume.personal.name).toBe('Astha Chandel');
});

test('addEntry adds entry to section', () => {
  useResumeStore.getState().addEntry('s1', { id: 'e1', fields: { institution: 'Shoolini' }, bullets: [] });
  expect(useResumeStore.getState().resume.sections[0].entries).toHaveLength(1);
  expect(useResumeStore.getState().resume.sections[0].entries[0].fields.institution).toBe('Shoolini');
});

test('reorderSections swaps positions', () => {
  useResumeStore.getState().addSection({ id: 's2', type: 'skills', heading: 'Skills', layout: 'tags', entries: [] });
  useResumeStore.getState().reorderSections(0, 1);
  expect(useResumeStore.getState().resume.sections[0].id).toBe('s2');
  expect(useResumeStore.getState().resume.sections[1].id).toBe('s1');
});
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/store
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Zustand stores with IndexedDB persistence and data types"
```

---

## Phase 2: Student Resume Builder

### Task 5: Resume Form — Personal Info + Summary

**Files:**
- Create: `src/builder/components/ResumeForm.tsx`
- Create: `src/builder/components/PersonalInfoForm.tsx`
- Create: `src/builder/components/SummaryForm.tsx`
- Modify: `src/pages/Builder.tsx`

*Full component code with form fields binding to useResumeStore, debounced onChange handlers, ARIA labels, all fields from spec (name, email, phone, location, linkedin, github, summary textarea). Split layout: form left, preview right.*

- [ ] Steps: Write components -> wire to store -> verify in browser -> commit

---

### Task 6: Section Editor — Repeatable Entries

**Files:**
- Create: `src/builder/components/SectionEditor.tsx`
- Create: `src/builder/components/EntryEditor.tsx`
- Create: `src/builder/components/BulletEditor.tsx`

*Generic section editor that renders per section type. Education fields (institution, degree, duration, GPA). Experience fields (role, company, duration, location, bullets). Projects fields (name, tech, description, url, bullets). Certs fields (name, issuer, date, url). All use addEntry/removeEntry/updateEntry from store.*

- [ ] Steps: Write components -> bind to store -> add/remove entries work -> commit

---

### Task 7: Skills Tag Input with Categories

**Files:**
- Create: `src/builder/components/SkillTagInput.tsx`
- Create: `src/builder/components/SkillCategoryGroup.tsx`

*Tag-style input. Type to add, click X to remove. Skills grouped by category (Languages, Frameworks, Tools, etc). "Add Category" button. Each category stores as a separate Entry in the skills section where fields = { category: name } and bullets = [skill1, skill2, ...].*

- [ ] Steps: Write components -> verify add/remove/category -> commit

---

### Task 8: Custom Sections

**Files:**
- Create: `src/builder/components/CustomSectionModal.tsx`

*Modal dialog: heading input, layout type selector (list/key-value/tags/freetext), custom field names. Creates a new Section with type='custom'. Uses the same SectionEditor for rendering.*

- [ ] Steps: Write modal -> integrate with addSection -> verify -> commit

---

### Task 9: Drag-Reorder Sections + Entries

**Files:**
- Create: `src/builder/components/DraggableSections.tsx`

*@dnd-kit DndContext wrapping all sections. DragOverlay for visual feedback. On drag end calls reorderSections. Keyboard accessible via @dnd-kit's keyboard sensor. aria-live announcements for reorder.*

- [ ] Steps: Wrap form in DndContext -> sortable sections -> keyboard a11y -> commit

---

### Task 10: Resume Templates (4)

**Files:**
- Create: `src/builder/templates/ATSClassic.tsx`
- Create: `src/builder/templates/ModernBlue.tsx`
- Create: `src/builder/templates/Creative.tsx`
- Create: `src/builder/templates/Minimal.tsx`
- Create: `src/builder/templates/index.ts`
- Create: `src/builder/templates/print.css`

*Each template receives Resume data as props and renders semantic HTML. All use proper h1-h3 hierarchy, section elements, ul/li for bullets. print.css handles @media print: A4 margins, page-break-inside avoid, hide UI chrome, force light mode.*

- [ ] Steps: Write ATSClassic -> ModernBlue -> Creative -> Minimal -> print.css -> export map -> commit

---

### Task 11: Live Editable Preview + Template Selector

**Files:**
- Create: `src/builder/components/LivePreview.tsx`
- Create: `src/builder/components/EditableText.tsx`
- Create: `src/builder/components/TemplateSelector.tsx`

*LivePreview renders the selected template with resume data from store. EditableText wraps contentEditable spans that on blur write back to store (bidirectional sync). TemplateSelector shows 4 template cards, clicking one calls setTemplate.*

- [ ] Steps: Write EditableText -> LivePreview -> TemplateSelector -> bidirectional sync verified -> commit

---

### Task 12: Print & PDF Download

**Files:**
- Create: `src/utils/pdf.ts`
- Create: `src/utils/print.ts`
- Modify: `src/pages/PrintPreview.tsx`

*print.ts: window.print() wrapper. pdf.ts: dynamic import of html2pdf.js, captures preview div. PrintPreview page: renders selected template full-screen with print layout. Buttons: "Print" and "Download PDF".*

```bash
npm install html2pdf.js
```

- [ ] Steps: Install html2pdf.js -> write utils -> wire buttons -> verify print output -> commit

---

## Phase 3: AI Pipeline

### Task 13: L1 NLP Agent — Keyword Extraction + TF-IDF

**Files:**
- Create: `src/ai/agents/L1_NLPAgent.ts`
- Create: `src/ai/workers/nlp.worker.ts`
- Create: `src/ai/scoring/tfidf.ts`
- Create: `src/ai/scoring/jaccard.ts`
- Test: `src/ai/__tests__/L1_NLPAgent.test.ts`

*Pure TypeScript TF-IDF implementation (no dependencies). Jaccard similarity. Section detection via regex. Keyword extraction. Date parsing. Email/phone regex. Runs in a Web Worker. All formulas from spec §6.1 with inline citation comments.*

- [ ] Steps: Write jaccard.ts -> tfidf.ts -> L1_NLPAgent -> worker wrapper -> tests with known inputs/outputs -> commit

---

### Task 14: L2 Embedding Agent — ONNX MiniLM

**Files:**
- Create: `src/ai/agents/L2_EmbedAgent.ts`
- Create: `src/ai/workers/embed.worker.ts`
- Create: `src/ai/models/loader.ts`
- Create: `src/ai/models/capabilities.ts`

```bash
npm install onnxruntime-web
```

*Load MiniLM-L6-v2 ONNX model on first use. Cache in IndexedDB. Tokenize text, run inference in WASM. Return 384-dim embeddings. Cosine similarity between resume and JD embeddings. capabilities.ts detects WASM/WebGPU support.*

- [ ] Steps: Write capabilities detect -> model loader with IndexedDB cache -> embed agent -> worker -> commit

---

### Task 15: L3 Reasoning Agent — WebLLM Gemma 3

**Files:**
- Create: `src/ai/agents/L3_ReasonAgent.ts`
- Create: `src/ai/workers/llm.worker.ts`
- Create: `src/ai/prompts/contradictionPrompt.ts`
- Create: `src/ai/prompts/refinementPrompt.ts`

```bash
npm install @mlc-ai/web-llm
```

*Load Gemma-3-1B-it-q4f16_1-MLC via WebLLM. Progressive: try WebGPU first, fall back to WASM. Structured prompts for contradiction detection (Henle taxonomy), framing detection, resume refinement suggestions. Parse JSON responses.*

- [ ] Steps: Write prompts -> L3 agent with WebGPU/WASM fallback -> worker -> commit

---

### Task 16: L4 Fallback Agent — Gemini API

**Files:**
- Create: `src/ai/agents/L4_FallbackAgent.ts`
- Create: `src/ai/settings/ApiKeySettings.tsx`

*Calls Gemini 2.5 Pro API via fetch. User provides API key (stored localStorage). Only activated if L3 completely fails to load. Same prompt templates as L3. Settings UI for API key entry.*

- [ ] Steps: Write API agent -> settings component -> only-if-L3-fails gate -> commit

---

### Task 17: Score Agent — Weighted Composite

**Files:**
- Create: `src/ai/agents/ScoreAgent.ts`
- Test: `src/ai/__tests__/ScoreAgent.test.ts`

*Implements the exact formula from spec §6.13. Every weight and formula has an inline citation comment. Distance decay from Marinescu & Rathelot. AAC&U VALUE rubric levels. CIP-SOC crosswalk match. Henle taxonomy penalties. Weight redistribution when distance unavailable. All deterministic.*

- [ ] Steps: Write score computation with citation comments -> test with known fixture data -> verify exact scores -> commit

---

### Task 18: Pipeline Orchestrator

**Files:**
- Create: `src/ai/pipeline.ts`

*Orchestrates agents: Parse -> L1 -> L2 -> L3 -> Score. Progressive results via callbacks. Handles 100+ resumes with Web Worker pool (4 concurrent). Status tracking per candidate.*

- [ ] Steps: Write orchestrator -> concurrent worker pool -> progress callbacks -> commit

---

## Phase 4: Employer Mode

### Task 19: JD Input + Parsing

**Files:**
- Create: `src/employer/components/JDInput.tsx`
- Create: `src/store/employerStore.ts`

*Textarea for pasting JD + file upload (.txt/.pdf). L1 agent parses JD to extract requirements (skills, education, experience level, location). Extracted requirements shown as editable tags.*

- [ ] Steps: Write JD component -> L1 JD parsing -> editable tags -> wire to employer store -> commit

---

### Task 20: Resume Uploader

**Files:**
- Create: `src/employer/components/ResumeUploader.tsx`

```bash
npm install pdfjs-dist mammoth
```

*Drag-drop zone + file picker for bulk PDF/DOCX upload. pdf.js parses PDFs, mammoth.js parses DOCX. Extracted text fed to pipeline. Progress bar per resume.*

- [ ] Steps: Write uploader -> PDF parsing -> DOCX parsing -> progress UI -> commit

---

### Task 21: Candidate Dashboard Table

**Files:**
- Create: `src/employer/components/CandidateTable.tsx`
- Create: `src/employer/components/ScoreBadge.tsx`

*Sortable table: Rank, Name, ATS Score, Skills Match, Experience, Education, Distance, Red Flags, Actions. Click column header to sort. Search bar filter. Shift+click multi-column sort. Progressive: scores update as layers complete.*

- [ ] Steps: Write table component -> sorting logic -> filtering -> progressive updates -> commit

---

### Task 22: Candidate Detail View

**Files:**
- Modify: `src/pages/CandidateDetail.tsx`
- Create: `src/employer/components/KeywordAnalysis.tsx`
- Create: `src/employer/components/RedFlagPanel.tsx`
- Create: `src/employer/components/ScoreBreakdown.tsx`
- Create: `src/employer/components/CitationTooltip.tsx`

*Three-panel layout. Keyword analysis (green/red/yellow tags). Red flags (Henle taxonomy labels). Score breakdown (weight * score per parameter, citation per row). CitationTooltip shows source on hover.*

- [ ] Steps: Write panels -> citation tooltips -> wire to candidate data -> commit

---

### Task 23: Distance Agent — Maps API

**Files:**
- Create: `src/ai/agents/DistanceAgent.ts`

*Google Maps Distance Matrix API call. Optional: only if API key configured and online. Exponential decay scoring from spec §6.6. Graceful "N/A" when unavailable.*

- [ ] Steps: Write distance agent -> decay formula -> settings for API key -> commit

---

## Phase 5: AI Coach (Student Mode)

### Task 24: AI Coach Panel

**Files:**
- Create: `src/builder/components/AICoachPanel.tsx`
- Create: `src/builder/components/SuggestionCard.tsx`

*Slide-in panel from right. Resume strength score (0-100). Prioritized suggestions (High/Medium/Tip). "Apply AI Fix" button per suggestion. Reads current store state. L1+L2+L3 pipeline for refinement.*

- [ ] Steps: Write panel -> suggestion cards -> "Apply AI Fix" writes to store -> commit

---

## Phase 6: PWA + Offline

### Task 25: Service Worker + PWA Manifest

**Files:**
- Create: `public/manifest.json`
- Modify: `vite.config.ts`

```bash
npm install -D vite-plugin-pwa
```

*Workbox via vite-plugin-pwa. Precache app shell. Runtime cache ML models in IndexedDB. PWA manifest with Shoolini branding.*

- [ ] Steps: Install plugin -> configure Workbox -> manifest.json -> verify offline works -> commit

---

## Phase 7: Pitch Deck

### Task 26: 10-Slide HTML Pitch Deck

**Files:**
- Create: `src/pitch/slides/Slide01Title.tsx` through `src/pitch/slides/Slide10ThankYou.tsx`
- Create: `src/pitch/PitchNav.tsx`
- Modify: `src/pages/PitchDeck.tsx`

*10 HTML slides, keyboard navigable (arrow keys). Shoolini branded (navy-to-red gradients). Astha Chandel + GF202214559 on title and closing. @media print: one slide per page. All content from spec §9.6.*

- [ ] Steps: Write 10 slide components -> PitchNav -> keyboard navigation -> print CSS -> commit

---

## Phase 8: Polish

### Task 27: Accessibility Audit

*Run axe-core on every page. Fix all violations. Verify keyboard navigation end-to-end. Screen reader testing. Contrast checks.*

- [ ] Steps: Install @axe-core/playwright -> write a11y e2e tests -> fix violations -> commit

---

### Task 28: E2E Tests

**Files:**
- Create: `e2e/builder.spec.ts`
- Create: `e2e/employer.spec.ts`
- Create: `e2e/offline.spec.ts`

```bash
npm install -D @playwright/test
npx playwright install
```

*Full user flows: fill form -> preview updates -> switch template -> print. Upload JD -> upload resumes -> see scores. Offline: load app -> go offline -> verify works.*

- [ ] Steps: Write builder e2e -> employer e2e -> offline e2e -> all pass -> commit

---

### Task 29: Final Build + Deploy Config

**Files:**
- Create: `netlify.toml`
- Create: `Dockerfile`

*netlify.toml with SPA redirect. Dockerfile for Cloud Run (nginx serving dist/). Final build verification.*

- [ ] Steps: Write deploy configs -> npm run build -> verify dist size -> commit
