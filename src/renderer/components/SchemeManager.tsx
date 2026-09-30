import { useEffect, useState } from 'react';
import type { Scheme } from '../types';

interface SchemeManagerProps {
  schemes: Scheme[];
  selectedScheme: Scheme | null;
  onSave: (scheme: Scheme) => Promise<void>;
  onDelete: (schemeId: string) => Promise<void>;
}

export default function SchemeManager({
  schemes,
  selectedScheme,
  onSave,
  onDelete,
}: SchemeManagerProps) {
  const [name, setName] = useState(selectedScheme?.name ?? '');

  useEffect(() => {
    setName(selectedScheme?.name ?? '');
  }, [selectedScheme?.id, selectedScheme?.name]);

  const saveName = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const scheme = selectedScheme
      ? { ...selectedScheme, name: trimmedName }
      : {
        id: crypto.randomUUID(),
        name: trimmedName,
        blocks: [],
      };
    void onSave(scheme).then(() => setName(trimmedName));
  };

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Timer schemes</h2>
        <span className="text-sm text-[#728078]">{schemes.length}</span>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveName();
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Scheme name"
          placeholder="Scheme name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="rounded bg-[#225d4b] px-3 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          {selectedScheme ? 'Rename' : 'Add'}
        </button>
      </form>
      <ul className="divide-y divide-[#e2e7e2]">
        {schemes.map((scheme) => (
          <li
            className="flex items-center justify-between gap-3 py-3 text-sm"
            key={scheme.id}
          >
            <span className="truncate">{scheme.name}</span>
            <button
              className="shrink-0 text-[#9a5146] hover:underline"
              type="button"
              onClick={() => void onDelete(scheme.id)}
              aria-label={`Delete ${scheme.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}