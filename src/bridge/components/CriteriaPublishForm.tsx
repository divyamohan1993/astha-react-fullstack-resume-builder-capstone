import { useState, type KeyboardEvent } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initFirebase, isFirebaseConfigured } from '../../firebase/config';
import { getCurrentUser } from '../../firebase/auth';
import { DEFAULT_WEIGHTS, type CustomSignal, type TestConfig } from '../types';
import WeightEditor from './WeightEditor';
import CustomSignalEditor from './CustomSignalEditor';
import SharePanel from './SharePanel';

function extractSkillsFromJD(text: string): { required: string[]; preferred: string[] } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const required: string[] = [];
  const preferred: string[] = [];
  let section: 'none' | 'required' | 'preferred' = 'none';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/required|must have|minimum|essential/i.test(lower) && !/^\s*[-*]/.test(line)) {
      section = 'required';
      continue;
    }
    if (/preferred|nice to have|desired|bonus|optional/i.test(lower) && !/^\s*[-*]/.test(line)) {
      section = 'preferred';
      continue;
    }
    if (section !== 'none' && /^[-*\u2022]\s+/.test(line)) {
      const skill = line.replace(/^[-*\u2022]\s+/, '').replace(/[.;,]+$/, '').trim();
      if (skill.length > 1 && skill.length < 100) {
        (section === 'required' ? required : preferred).push(skill);
      }
    }
  }

  return { required, preferred };
}

export default function CriteriaPublishForm() {
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [requiredInput, setRequiredInput] = useState('');
  const [preferredInput, setPreferredInput] = useState('');
  const [weights, setWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const [customSignals, setCustomSignals] = useState<CustomSignal[]>([]);
  const [threshold, setThreshold] = useState(70);
  const [questionCount, setQuestionCount] = useState(5);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [shortCode, setShortCode] = useState('');

  function extractSkills() {
    const { required, preferred } = extractSkillsFromJD(description);
    if (required.length) setRequiredSkills((prev) => [...new Set([...prev, ...required])]);
    if (preferred.length) setPreferredSkills((prev) => [...new Set([...prev, ...preferred])]);
  }

  function addSkill(type: 'required' | 'preferred') {
    const input = type === 'required' ? requiredInput : preferredInput;
    const trimmed = input.trim();
    if (!trimmed) return;

    if (type === 'required') {
      setRequiredSkills((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setRequiredInput('');
    } else {
      setPreferredSkills((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setPreferredInput('');
    }
  }

  function handleSkillKeyDown(type: 'required' | 'preferred', e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(type);
    }
  }

  function removeSkill(type: 'required' | 'preferred', skill: string) {
    const setter = type === 'required' ? setRequiredSkills : setPreferredSkills;
    setter((prev) => prev.filter((s) => s !== skill));
  }

  async function publish() {
    setError('');

    if (!jobTitle.trim()) { setError('Job title is required.'); return; }
    if (requiredSkills.length === 0) { setError('Add at least one required skill.'); return; }

    const weightTotal = Object.values(weights).reduce((a, b) => a + b, 0);
    if (weightTotal !== 100) { setError(`Weights must total 100% (currently ${weightTotal}%).`); return; }

    if (!isFirebaseConfigured()) { setError('Firebase is not configured. Set VITE_FIREBASE_* env vars.'); return; }

    const user = getCurrentUser();
    if (!user) { setError('You must be signed in to publish criteria.'); return; }

    setPublishing(true);
    try {
      const { app } = initFirebase();
      const functions = getFunctions(app);
      const publishCriteria = httpsCallable<unknown, { shortCode: string }>(functions, 'publishCriteria');

      const testConfig: TestConfig = {
        skillsToTest: requiredSkills,
        difficultyFloor: 1,
        questionCount: Math.min(10, Math.max(5, questionCount)),
      };

      const result = await publishCriteria({
        jobTitle: jobTitle.trim(),
        description: description.trim(),
        requiredSkills,
        preferredSkills,
        weights,
        customSignals,
        threshold,
        testConfig,
      });

      setShortCode(result.data.shortCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed. Try again.');
    } finally {
      setPublishing(false);
    }
  }

  if (shortCode) {
    return <SharePanel shortCode={shortCode} />;
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); publish(); }}
      className="space-y-6 max-w-2xl mx-auto"
      aria-label="Publish hiring criteria"
    >
      {/* Job Title */}
      <div>
        <label htmlFor="job-title" className="block text-sm font-medium mb-1">
          Job Title
        </label>
        <input
          id="job-title"
          type="text"
          required
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Frontend Engineer"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-2 focus:outline-blue-500"
        />
      </div>

      {/* Job Description */}
      <div>
        <label htmlFor="job-desc" className="block text-sm font-medium mb-1">
          Job Description
        </label>
        <textarea
          id="job-desc"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-2 focus:outline-blue-500"
        />
        <button
          type="button"
          onClick={extractSkills}
          className="mt-1 text-sm text-blue-600 underline hover:text-blue-800 focus:outline-2 focus:outline-blue-500"
        >
          Extract skills from JD
        </button>
      </div>

      {/* Required Skills */}
      <SkillsSection
        label="Required Skills"
        id="required"
        skills={requiredSkills}
        input={requiredInput}
        onInputChange={setRequiredInput}
        onKeyDown={(e) => handleSkillKeyDown('required', e)}
        onAdd={() => addSkill('required')}
        onRemove={(s) => removeSkill('required', s)}
      />

      {/* Preferred Skills */}
      <SkillsSection
        label="Preferred Skills"
        id="preferred"
        skills={preferredSkills}
        input={preferredInput}
        onInputChange={setPreferredInput}
        onKeyDown={(e) => handleSkillKeyDown('preferred', e)}
        onAdd={() => addSkill('preferred')}
        onRemove={(s) => removeSkill('preferred', s)}
      />

      {/* Weight Editor */}
      <WeightEditor weights={weights} onChange={setWeights} />

      {/* Custom Signals */}
      <CustomSignalEditor signals={customSignals} onChange={setCustomSignals} />

      {/* Threshold */}
      <div>
        <label htmlFor="threshold" className="block text-sm font-medium mb-1">
          Pass Threshold: {threshold}%
        </label>
        <input
          id="threshold"
          type="range"
          min={30}
          max={95}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full"
          aria-valuenow={threshold}
          aria-valuemin={30}
          aria-valuemax={95}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>30%</span>
          <span>95%</span>
        </div>
      </div>

      {/* Question Count */}
      <div>
        <label htmlFor="q-count" className="block text-sm font-medium mb-1">
          Questions per skill
        </label>
        <input
          id="q-count"
          type="number"
          min={5}
          max={10}
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="w-24 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-2 focus:outline-blue-500"
        />
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Publish */}
      <button
        type="submit"
        disabled={publishing}
        className="w-full rounded bg-green-600 px-4 py-2.5 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-2 focus:outline-green-500"
      >
        {publishing ? 'Publishing...' : 'Publish Criteria'}
      </button>
    </form>
  );
}

/* Reusable pill-based skill input section */
function SkillsSection({
  label,
  id,
  skills,
  input,
  onInputChange,
  onKeyDown,
  onAdd,
  onRemove,
}: {
  label: string;
  id: string;
  skills: string[];
  input: string;
  onInputChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onAdd: () => void;
  onRemove: (skill: string) => void;
}) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{label}</span>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2" role="list" aria-label={label}>
          {skills.map((skill) => (
            <span
              key={skill}
              role="listitem"
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800"
            >
              {skill}
              <button
                type="button"
                onClick={() => onRemove(skill)}
                aria-label={`Remove ${skill}`}
                className="text-blue-500 hover:text-blue-700 leading-none focus:outline-2 focus:outline-blue-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          id={`skill-${id}`}
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a skill and press Enter"
          aria-label={`Add ${label.toLowerCase()}`}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-2 focus:outline-blue-500"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!input.trim()}
          className="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50 focus:outline-2 focus:outline-blue-500"
        >
          Add
        </button>
      </div>
    </div>
  );
}
