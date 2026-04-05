import { useState, useCallback, useRef } from 'react';
import { useEmployerStore } from '../../store/employerStore';
import type { Candidate } from '../../store/types';

function parseName(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length > 0) {
    const first = lines[0].trim();
    if (first.length < 60 && !/[@.]/.test(first)) return first;
  }
  return 'Unknown Candidate';
}

function createCandidate(name: string, resumeText: string): Candidate {
  return {
    id: crypto.randomUUID(),
    name,
    resumeText,
    scores: {
      overall: 0,
      skillsMatch: { matched: [], missing: [], semantic: [], score: 0 },
      experience: { level: 'low', score: 0 },
      education: { relevance: 'irrelevant', score: 0 },
      projects: { hasQuantified: false, score: 0 },
      certifications: { relevant: [], score: 0 },
      distance: null,
      extracurricular: { hasLeadership: false, score: 0 },
      gpa: null,
      parseability: false,
      completeness: { missingSections: [], score: 0 },
    },
    redFlags: [],
    analysisLayers: [],
    analysisStatus: 'pending',
  };
}

interface UploadProgress {
  name: string;
  progress: number;
}

export function ResumeUploader() {
  const { job, addCandidate } = useEmployerStore();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList) => {
      if (!job) return;

      const fileArray = Array.from(files).filter((f) =>
        f.name.endsWith('.txt'),
      );

      const progress: UploadProgress[] = fileArray.map((f) => ({
        name: f.name,
        progress: 0,
      }));
      setUploads(progress);

      fileArray.forEach((file, i) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploads((prev) =>
              prev.map((u, j) =>
                j === i ? { ...u, progress: (e.loaded / e.total) * 80 } : u,
              ),
            );
          }
        };
        reader.onload = () => {
          const text = reader.result as string;
          const name = parseName(text);
          const candidate = createCandidate(name, text);
          addCandidate(candidate);
          setUploads((prev) =>
            prev.map((u, j) => (j === i ? { ...u, progress: 100 } : u)),
          );
        };
        reader.readAsText(file);
      });
    },
    [job, addCandidate],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  if (!job) return null;

  return (
    <section
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      aria-labelledby="upload-heading"
    >
      <h2
        id="upload-heading"
        className="mb-3 text-lg font-bold"
        style={{ color: 'var(--accent-navy)' }}
      >
        Upload Resumes
      </h2>

      <div
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors"
        style={{
          borderColor: dragOver ? 'var(--accent-red)' : 'var(--border)',
          backgroundColor: dragOver
            ? 'var(--bg-secondary)'
            : 'var(--bg-primary)',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Drop resume files here or click to browse"
      >
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Drag and drop .txt resume files here, or click to browse
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Accepts .txt files
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
        }}
        aria-label="Select resume files"
      />

      {uploads.length > 0 && (
        <div className="mt-3 space-y-2" aria-label="Upload progress">
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {uploads.length} file{uploads.length !== 1 ? 's' : ''} uploaded
          </p>
          {uploads.map((u) => (
            <div key={u.name} className="flex items-center gap-3">
              <span
                className="w-32 truncate text-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                {u.name}
              </span>
              <div
                className="h-2 flex-1 overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                role="progressbar"
                aria-valuenow={Math.round(u.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${u.name} upload progress`}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${u.progress}%`,
                    backgroundColor:
                      u.progress === 100
                        ? '#2ecc40'
                        : 'var(--accent-navy)',
                  }}
                />
              </div>
              <span
                className="w-10 text-right text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {Math.round(u.progress)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
