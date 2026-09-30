import { Timer } from 'lucide-react';
import type { Scheme } from '../types';

interface NavbarProps {
  schemes: Scheme[];
  selectedSchemeId: string | null;
  onSelect: (schemeId: string) => void;
}

export default function Navbar({
  schemes,
  selectedSchemeId,
  onSelect,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-md">
      <nav className="container mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-300 shadow-lg shadow-indigo-950/40">
            <Timer size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Focus practice
            </p>
            <h1 className="truncate text-lg font-semibold text-slate-100">
              Study Timer
            </h1>
          </div>
        </div>
        <label className="flex shrink-0 items-center gap-3 text-sm text-slate-400">
          <span className="hidden sm:inline">Cycle</span>
          <select
            aria-label="Select timer scheme"
            className="max-w-[min(52vw,20rem)] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            value={selectedSchemeId ?? ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="" disabled>
              Select a scheme
            </option>
            {schemes.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.name}
              </option>
            ))}
          </select>
        </label>
      </nav>
    </header>
  );
}