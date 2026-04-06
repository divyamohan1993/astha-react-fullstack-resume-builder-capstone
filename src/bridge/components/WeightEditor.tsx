import { useState } from 'react';
import { DEFAULT_WEIGHTS } from '../types';

interface WeightEditorProps {
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
}

const PARAMETER_META: Record<string, { label: string; citation: string }> = {
  skillsMatch: { label: 'Skills Match', citation: 'NACE Job Outlook 2024' },
  experience: { label: 'Experience', citation: 'NACE Internship Survey 2024' },
  education: { label: 'Education', citation: 'NACE 2024, 73.4% screen by major' },
  projects: { label: 'Projects', citation: 'AAC&U/Hart Research 2018' },
  certifications: { label: 'Certifications', citation: 'SHRM Credentials 2021' },
  distance: { label: 'Distance', citation: 'Marinescu & Rathelot 2018' },
  extracurricular: { label: 'Extracurricular', citation: 'Roulin & Bangerter 2013' },
  gpa: { label: 'GPA', citation: 'NACE 2024, 38.3% cutoff' },
  completeness: { label: 'Completeness', citation: 'Ladders Eye-Tracking 2018' },
};

const PARAM_KEYS = Object.keys(PARAMETER_META);

export default function WeightEditor({ weights, onChange }: WeightEditorProps) {
  const [citationsOpen, setCitationsOpen] = useState(false);

  const total = PARAM_KEYS.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
  const totalValid = total === 100;

  function handleSlider(key: string, value: number) {
    onChange({ ...weights, [key]: value });
  }

  function resetDefaults() {
    onChange({ ...DEFAULT_WEIGHTS });
  }

  return (
    <fieldset className="rounded-lg border border-gray-300 p-4">
      <legend className="px-2 font-semibold text-sm">Scoring Weights</legend>

      <div className="space-y-3">
        {PARAM_KEYS.map((key) => {
          const meta = PARAMETER_META[key];
          const value = weights[key] ?? 0;
          const defaultVal = DEFAULT_WEIGHTS[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <label
                htmlFor={`weight-${key}`}
                className="w-36 text-sm shrink-0"
              >
                {meta.label}
              </label>
              <input
                id={`weight-${key}`}
                type="range"
                min={0}
                max={50}
                value={value}
                onChange={(e) => handleSlider(key, Number(e.target.value))}
                className="flex-1"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={50}
              />
              <span className="w-20 text-sm text-right tabular-nums">
                {value}% <span className="text-gray-400">({defaultVal}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p
          className={`text-sm font-medium ${totalValid ? 'text-green-600' : 'text-red-600'}`}
          role="status"
          aria-live="polite"
        >
          Total: {total}%{' '}
          {!totalValid && <span>(must equal 100%)</span>}
        </p>
        <button
          type="button"
          onClick={resetDefaults}
          className="text-sm text-blue-600 underline hover:text-blue-800 focus:outline-2 focus:outline-blue-500"
        >
          Reset to research defaults
        </button>
      </div>

      <div className="mt-3 border-t pt-3">
        <button
          type="button"
          onClick={() => setCitationsOpen((o) => !o)}
          aria-expanded={citationsOpen}
          aria-controls="weight-citations"
          className="text-sm text-gray-500 hover:text-gray-700 focus:outline-2 focus:outline-blue-500"
        >
          {citationsOpen ? 'Hide' : 'Show'} research citations
        </button>
        {citationsOpen && (
          <ul
            id="weight-citations"
            className="mt-2 space-y-1 text-xs text-gray-500 list-disc pl-5"
          >
            {PARAM_KEYS.map((key) => (
              <li key={key}>
                <strong>{PARAMETER_META[key].label}</strong> ({DEFAULT_WEIGHTS[key]}%) &mdash;{' '}
                {PARAMETER_META[key].citation}
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
