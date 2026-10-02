import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { Block, StudyTimerState } from '../types';

interface TimerDisplayProps {
  state: StudyTimerState;
  activeBlock: Block | null;
  activeBlockIndex: number;
  totalBlocks: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function TimerDisplay({
  state,
  activeBlock,
  activeBlockIndex,
  totalBlocks,
  onStart,
  onPause,
  onReset,
}: TimerDisplayProps) {
  const remainingSeconds = Math.max(0, state.remainingSeconds);
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  const canSkipRest =
    state.phase !== 'idle' &&
    activeBlock?.type === 'REST' &&
    activeBlock.allow_skip;
  const isWork = activeBlock?.type === 'WORK';

  return (
    <section
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md max-w-md mx-auto text-center"
      aria-label="Timer"
    >
      {activeBlock ? (
        <p
          className={`inline-block mb-4 rounded-full border px-4 py-1 text-sm font-medium ${
            isWork
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}
        >
          Block {activeBlockIndex + 1} of {totalBlocks}:{' '}
          {isWork ? 'Work' : 'Rest'} - {activeBlock.duration_minutes} min
        </p>
      ) : (
        <p className="inline-block mb-4 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1 text-sm font-medium text-slate-300">
          Choose a scheme to begin
        </p>
      )}
      <p
        className="my-5 text-7xl font-mono font-extrabold tracking-tight text-white drop-shadow-[0_0_25px_rgba(99,102,241,0.25)] tabular-nums"
        aria-live="polite"
      >
        {minutes}:{seconds}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {state.phase === 'running' ? (
          <button
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-amber-600/30 transition-all"
            onClick={onPause}
          >
            <Pause size={16} aria-hidden="true" />
            Pause
          </button>
        ) : state.awaitingAdvance ? (
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500"
            onClick={onStart}
          >
            <SkipForward size={16} aria-hidden="true" />
            Advance to next phase
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-indigo-600/30 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onStart}
            disabled={!activeBlock}
          >
            <Play size={16} aria-hidden="true" />
            {state.phase === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl px-4 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onReset}
          disabled={!activeBlock}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
        {canSkipRest && (
          <button
            className="inline-flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl px-4 py-3 font-semibold transition-all"
            onClick={() => window.electronAPI.controlTimer('SKIP_BLOCK')}
            title="Skip this rest block"
          >
            <SkipForward size={15} aria-hidden="true" />
            Skip Rest
          </button>
        )}
      </div>
    </section>
  );
}