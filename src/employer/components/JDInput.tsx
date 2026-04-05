import { useState, useCallback, useRef } from 'react';
import { useEmployerStore } from '../../store/employerStore';
import type { Job } from '../../store/types';

function extractRequirements(text: string): Job['extractedRequirements'] {
  const lines = text.split('\n');
  const skills: string[] = [];
  let inSkillsSection = false;
  let location = '';
  let experienceLevel = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (
      /^(requirements|skills|qualifications|must.have|technical skills)/i.test(
        trimmed,
      )
    ) {
      inSkillsSection = true;
      continue;
    }

    if (/^(about|description|responsibilities|benefits|salary|company)/i.test(trimmed)) {
      inSkillsSection = false;
    }

    if (inSkillsSection && /^[-*\u2022]/.test(trimmed)) {
      const skill = trimmed.replace(/^[-*\u2022]\s*/, '').trim();
      if (skill.length > 1 && skill.length < 80) {
        skills.push(skill);
      }
    }

    const locMatch = lower.match(
      /(?:location|based in|office|city)[:\s]+(.+)/i,
    );
    if (locMatch) {
      location = locMatch[1].trim().replace(/[.,;]+$/, '');
    }

    const expMatch = lower.match(
      /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/,
    );
    if (expMatch) {
      const years = parseInt(expMatch[1], 10);
      experienceLevel =
        years >= 5 ? 'senior' : years >= 2 ? 'mid' : 'entry';
    }

    if (!experienceLevel) {
      if (/\b(senior|sr\.?|lead)\b/i.test(lower)) experienceLevel = 'senior';
      else if (/\b(junior|jr\.?|entry|fresher|graduate)\b/i.test(lower))
        experienceLevel = 'entry';
      else if (/\b(mid|intermediate)\b/i.test(lower))
        experienceLevel = 'mid';
    }
  }

  return {
    requiredSkills: skills.slice(0, 20),
    preferredSkills: [],
    experienceLevel: experienceLevel || 'entry',
    educationRequirements: [],
    location,
  };
}

export function JDInput() {
  const { job, setJob, updateJobRequirements } = useEmployerStore();
  const [text, setText] = useState(job?.description ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = useCallback(
    (value: string) => {
      setText(value);
      const reqs = extractRequirements(value);
      const titleMatch = value.match(/^(.+)/);
      const title = titleMatch ? titleMatch[1].slice(0, 100) : 'Untitled';

      if (!job) {
        setJob({
          id: crypto.randomUUID(),
          title,
          description: value,
          location: reqs.location,
          extractedRequirements: reqs,
          candidates: [],
        });
      } else {
        setJob({ ...job, description: value, title, location: reqs.location });
        updateJobRequirements(reqs);
      }
    },
    [job, setJob, updateJobRequirements],
  );

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        handleParse(content);
      };
      reader.readAsText(file);
    },
    [handleParse],
  );

  const removeSkill = (skill: string) => {
    if (!job) return;
    updateJobRequirements({
      requiredSkills: job.extractedRequirements.requiredSkills.filter(
        (s) => s !== skill,
      ),
    });
  };

  return (
    <section
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      aria-labelledby="jd-heading"
    >
      <h2
        id="jd-heading"
        className="mb-3 text-lg font-bold"
        style={{ color: 'var(--accent-navy)' }}
      >
        Job Description
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <textarea
          className="min-h-[120px] flex-1 resize-y rounded-md p-3 text-sm"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          placeholder="Paste job description here..."
          value={text}
          onChange={(e) => handleParse(e.target.value)}
          aria-label="Job description text"
        />
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleFile}
            aria-label="Upload job description file"
          />
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-navy)' }}
            onClick={() => fileRef.current?.click()}
            aria-label="Upload job description as text file"
          >
            Upload .txt
          </button>
        </div>
      </div>

      {job && job.extractedRequirements.requiredSkills.length > 0 && (
        <div className="mt-3">
          <h3
            className="mb-2 text-sm font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            Extracted Requirements
          </h3>

          {job.extractedRequirements.experienceLevel && (
            <p
              className="mb-2 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Experience level:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {job.extractedRequirements.experienceLevel}
              </strong>
              {job.extractedRequirements.location && (
                <>
                  {' | Location: '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {job.extractedRequirements.location}
                  </strong>
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2" role="list" aria-label="Required skills">
            {job.extractedRequirements.requiredSkills.map((skill) => (
              <span
                key={skill}
                role="listitem"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--accent-navy)',
                  color: '#fff',
                }}
              >
                {skill}
                <button
                  type="button"
                  className="ml-1 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full text-xs hover:opacity-80"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove skill: ${skill}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
