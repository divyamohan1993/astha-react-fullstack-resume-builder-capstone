import { useResumeStore } from '@/store/resumeStore';
import type { PersonalInfo } from '@/store/types';

const FIELDS: { key: keyof PersonalInfo; label: string; type: string; required: boolean; placeholder: string }[] = [
  { key: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Astha Chandel' },
  { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'astha@example.com' },
  { key: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91 98765 43210' },
  { key: 'location', label: 'Location', type: 'text', required: false, placeholder: 'Solan, Himachal Pradesh' },
  { key: 'linkedin', label: 'LinkedIn', type: 'url', required: false, placeholder: 'https://linkedin.com/in/username' },
  { key: 'github', label: 'GitHub / Portfolio', type: 'url', required: false, placeholder: 'https://github.com/username' },
];

export function PersonalInfoForm() {
  const personal = useResumeStore((s) => s.resume.personal);
  const setPersonal = useResumeStore((s) => s.setPersonal);

  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-bold" style={{ color: 'var(--accent-navy)' }}>
        Personal Information
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type, required, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label
              htmlFor={`personal-${key}`}
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
              {required && <span className="ml-0.5" style={{ color: 'var(--accent-red)' }} aria-hidden="true">*</span>}
            </label>
            <input
              id={`personal-${key}`}
              type={type}
              required={required}
              aria-required={required}
              placeholder={placeholder}
              value={personal[key]}
              onChange={(e) => setPersonal({ [key]: e.target.value })}
              className="min-h-[44px] rounded-md border px-3 py-2 text-sm transition-colors"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
