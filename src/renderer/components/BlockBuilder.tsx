import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import type { Block, BlockType, Scheme } from '../types';

interface BlockBuilderProps {
  scheme: Scheme | null;
  onSave: (scheme: Scheme) => Promise<void>;
  onDelete: (schemeId: string) => Promise<void>;
}

const makeBlock = (type: BlockType): Block => ({
  id: crypto.randomUUID(),
  name: type === 'WORK' ? 'Work' : 'Rest',
  type,
  duration_minutes: type === 'WORK' ? 25 : 5,
  allow_skip: type === 'REST',
});

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export default function BlockBuilder({
  scheme,
  onSave,
  onDelete,
}: BlockBuilderProps) {
  const [draft, setDraft] = useState<Scheme | null>(scheme);
  const [schemeName, setSchemeName] = useState(scheme?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockListRef = useRef<HTMLOListElement>(null);
  const pendingScrollTop = useRef<number | null>(null);

  const preserveScrollPosition = () => {
    pendingScrollTop.current = blockListRef.current?.scrollTop ?? null;
  };

  useEffect(() => {
    setDraft(scheme);
    setSchemeName(scheme?.name ?? '');
    setError(null);
  }, [scheme]);

  useLayoutEffect(() => {
    if (pendingScrollTop.current !== null && blockListRef.current) {
      blockListRef.current.scrollTop = pendingScrollTop.current;
      pendingScrollTop.current = null;
    }
  }, [draft?.blocks]);

  const updateBlock = (index: number, changes: Partial<Block>) => {
    setDraft((current) => {
      if (!current) return current;
      const blocks = [...current.blocks];
      blocks[index] = { ...blocks[index], ...changes };
      return { ...current, blocks };
    });
  };

  const addBlock = (index: number, type: BlockType) => {
    preserveScrollPosition();
    setDraft((current) => {
      if (!current) return current;
      const blocks = [...current.blocks];
      blocks.splice(index + 1, 0, makeBlock(type));
      return { ...current, blocks };
    });
  };

  const deleteBlock = (index: number) => {
    preserveScrollPosition();
    setDraft((current) =>
      current
        ? { ...current, blocks: current.blocks.filter((_, i) => i !== index) }
        : current,
    );
  };

  const save = async (name = schemeName.trim()) => {
    if (!draft || !name) {
      setError('Enter a scheme name before saving.');
      return;
    }
    if (draft.blocks.some((block) => !Number.isFinite(block.duration_minutes) || block.duration_minutes < 1)) {
      setError('Every block must be at least one minute.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const updated = { ...draft, name };
      setDraft(updated);
      setSchemeName(name);
      await onSave(updated);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save scheme.',
      );
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = draft?.blocks.reduce(
    (total, block) => total + (Number(block.duration_minutes) || 0),
    0,
  ) ?? 0;

  return (
    <section className="space-y-5" aria-labelledby="blocks-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Sequence editor
          </p>
          <h2 id="blocks-heading" className="mt-1 text-xl font-semibold">
            Blocks
          </h2>
        </div>
        <p className="text-sm tabular-nums text-slate-300">
          {draft?.blocks.length ?? 0} blocks <span className="px-1 text-slate-600">/</span>{' '}
          {formatDuration(totalMinutes)} total
        </p>
      </div>
      {draft ? (
        <>
          <ol
            ref={blockListRef}
            className="max-h-[550px] overflow-y-auto pr-2 space-y-3"
          >
            {draft.blocks.map((block, index) => {
              const isWork = block.type === 'WORK';
              return (
                <li
                  className={`rounded-xl border p-4 shadow-lg backdrop-blur-sm transition-all ${
                    isWork
                      ? 'bg-indigo-950/40 border-indigo-800/50 hover:border-indigo-500/80'
                      : 'bg-emerald-950/40 border-emerald-800/50 hover:border-emerald-500/80'
                  }`}
                  key={block.id}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900/70 text-xs font-bold tabular-nums text-slate-200">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-xs font-bold tracking-[0.12em] ${
                        isWork ? 'text-indigo-300' : 'text-emerald-300'
                      }`}
                    >
                      {block.type}
                    </span>
                    <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
                      <span>Duration</span>
                      <input
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1 text-right tabular-nums text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number"
                        min="1"
                        step="1"
                        aria-label={`Block ${index + 1} duration in minutes`}
                        value={block.duration_minutes}
                        onChange={(event) =>
                          updateBlock(index, {
                            duration_minutes: Number(event.target.value),
                          })
                        }
                      />
                      <span className="text-xs text-slate-400">min</span>
                    </label>
                    <button
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
                      type="button"
                      aria-label={`Delete block ${index + 1}`}
                      title="Delete block"
                      onClick={() => deleteBlock(index)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {block.type === 'REST' && (
                    <label
                      className="mt-4 inline-flex cursor-pointer items-center gap-3 text-sm text-slate-300"
                      title="Allows skipping this break during active cycles"
                    >
                      <input
                        className="peer sr-only"
                        type="checkbox"
                        checked={block.allow_skip}
                        aria-label="Allow Skip"
                        onChange={(event) =>
                          updateBlock(index, { allow_skip: event.target.checked })
                        }
                      />
                      <span className="relative h-5 w-9 rounded-full bg-slate-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-slate-300 after:transition-transform peer-checked:bg-emerald-600 peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-400" />
                      <span>Allow Skip</span>
                    </label>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-indigo-500/15 hover:text-indigo-200"
                      type="button"
                      onClick={() => addBlock(index, 'WORK')}
                    >
                      <Plus size={14} aria-hidden="true" /> Add Work After
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-200"
                      type="button"
                      onClick={() => addBlock(index, 'REST')}
                    >
                      <Plus size={14} aria-hidden="true" /> Add Rest After
                    </button>
                  </div>
                </li>
              );
            })}
            {draft.blocks.length === 0 && (
              <li className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
                Add the first block below
              </li>
            )}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              type="button"
              disabled={saving}
              onClick={() => addBlock(draft.blocks.length - 1, 'WORK')}
            >
              <Plus size={16} aria-hidden="true" /> Add Work Block
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              type="button"
              disabled={saving}
              onClick={() => addBlock(draft.blocks.length - 1, 'REST')}
            >
              <Plus size={16} aria-hidden="true" /> Add Rest Block
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                <Save size={15} aria-hidden="true" /> Save Scheme
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
            <label className="sr-only" htmlFor="scheme-name">
              Scheme name
            </label>
            <input
              id="scheme-name"
              className="min-w-48 flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              value={schemeName}
              onChange={(event) => setSchemeName(event.target.value)}
              aria-label="Scheme name"
            />
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              type="button"
              disabled={saving || !schemeName.trim()}
              onClick={() => void save(schemeName.trim())}
            >
              <Pencil size={15} aria-hidden="true" /> Rename Scheme
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-rose-900/70 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-950/50"
              type="button"
              onClick={() => void onDelete(scheme.id)}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete Scheme
            </button>
          </div>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <p className="border-t border-slate-800 py-5 text-sm text-slate-400">
          Select or create a scheme to build its sequence.
        </p>
      )}
    </section>
  );
}