import { useState, type KeyboardEvent } from 'react';
import type { CustomSignal } from '../types';

interface CustomSignalEditorProps {
  signals: CustomSignal[];
  onChange: (signals: CustomSignal[]) => void;
}

export default function CustomSignalEditor({ signals, onChange }: CustomSignalEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(5);

  function addSignal() {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName || !trimmedDesc) return;

    const signal: CustomSignal = {
      name: trimmedName,
      description: trimmedDesc,
      weight: Math.min(20, Math.max(1, weight)),
    };

    onChange([...signals, signal]);
    setName('');
    setDescription('');
    setWeight(5);
  }

  function removeSignal(index: number) {
    onChange(signals.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSignal();
    }
  }

  return (
    <fieldset className="rounded-lg border border-gray-300 p-4">
      <legend className="px-2 font-semibold text-sm">Custom Signals</legend>

      {signals.length > 0 && (
        <ul className="mb-4 space-y-2" aria-label="Current custom signals">
          {signals.map((signal, i) => (
            <li
              key={`${signal.name}-${i}`}
              className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{signal.name}</span>
                <span className="text-gray-400 ml-2">w:{signal.weight}</span>
                <p className="text-xs text-gray-500">{signal.description}</p>
              </div>
              <button
                type="button"
                onClick={() => removeSignal(i)}
                aria-label={`Remove ${signal.name}`}
                className="ml-3 text-red-500 hover:text-red-700 focus:outline-2 focus:outline-red-500 text-lg leading-none"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-end" onKeyDown={handleKeyDown}>
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="signal-name" className="block text-xs font-medium mb-1">
            Name
          </label>
          <input
            id="signal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Leadership"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-2 focus:outline-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="signal-desc" className="block text-xs font-medium mb-1">
            Description
          </label>
          <input
            id="signal-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What to look for"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-2 focus:outline-blue-500"
          />
        </div>
        <div className="w-20">
          <label htmlFor="signal-weight" className="block text-xs font-medium mb-1">
            Weight
          </label>
          <input
            id="signal-weight"
            type="number"
            min={1}
            max={20}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-2 focus:outline-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={addSignal}
          disabled={!name.trim() || !description.trim()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-2 focus:outline-blue-500"
        >
          Add
        </button>
      </div>
    </fieldset>
  );
}
