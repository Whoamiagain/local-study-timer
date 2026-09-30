import { useEffect, useState } from 'react';
import BlockBuilder from './components/BlockBuilder';
import Navbar from './components/Navbar';
import SchemeManager from './components/SchemeManager';
import TimerDisplay from './components/TimerDisplay';
import type { Scheme, StudyTimerState } from './types';

const initialTimerState: StudyTimerState = {
  phase: 'idle',
  schemeId: null,
  blockId: null,
  endsAt: null,
  remainingSeconds: 0,
};

export default function App() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [timerState, setTimerState] = useState(initialTimerState);
  const selectedScheme =
    schemes.find((scheme) => scheme.id === selectedSchemeId) ?? null;

  const refresh = async () => {
    const nextSchemes = await window.studyTimer.listSchemes();
    setSchemes(nextSchemes);
    setSelectedSchemeId((currentId) =>
      nextSchemes.some((scheme) => scheme.id === currentId)
        ? currentId
        : (nextSchemes[0]?.id ?? null),
    );
  };

  useEffect(() => {
    const unsubscribe = window.electronAPI.onTimerTick((state) => {
      const block =
        state.currentScheme?.blocks[state.currentBlockIndex] ?? null;
      setTimerState({
        phase: state.isRunning ? 'running' : state.isPaused ? 'paused' : 'idle',
        schemeId: state.currentScheme ? String(state.currentScheme.id) : null,
        blockId: block ? String(block.id) : null,
        endsAt: state.isRunning
          ? Date.now() + state.secondsRemaining * 1000
          : null,
        remainingSeconds: state.secondsRemaining,
      });
    });
    void refresh();
    void window.studyTimer.getTimerState().then(setTimerState);
    return unsubscribe;
  }, []);

  const saveScheme = async (scheme: Scheme) => {
    const nextSchemes = await window.studyTimer.saveScheme(scheme);
    setSchemes(nextSchemes);
    const savedScheme =
      nextSchemes.find((item) => item.id === scheme.id) ??
      [...nextSchemes].reverse().find((item) => item.name === scheme.name);
    setSelectedSchemeId(savedScheme?.id ?? scheme.id);
  };

  const deleteScheme = async (schemeId: string) => {
    const nextSchemes = await window.studyTimer.deleteScheme(schemeId);
    setSchemes(nextSchemes);
    if (selectedSchemeId === schemeId) {
      setSelectedSchemeId(nextSchemes[0]?.id ?? null);
    }
  };

  const updateTimerState = async (action: Promise<StudyTimerState>) => {
    setTimerState(await action);
  };

  const activeBlockIndex = Math.max(
    0,
    selectedScheme?.blocks.findIndex(
      (block) => block.id === timerState.blockId,
    ) ?? 0,
  );
  const activeBlock =
    selectedScheme?.blocks.find((block) => block.id === timerState.blockId) ??
    selectedScheme?.blocks[0] ??
    null;
  const totalBlocks = selectedScheme?.blocks.length ?? 0;
  const completedBlocks =
    timerState.phase === 'idle' ? 0 : Math.min(activeBlockIndex, totalBlocks);
  const cycleProgress =
    totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0;
  const cycleMinutes =
    selectedScheme?.blocks.reduce(
      (minutes, block) => minutes + block.duration_minutes,
      0,
    ) ?? 0;
  const cycleDuration =
    cycleMinutes >= 60
      ? `${Math.floor(cycleMinutes / 60)}h ${cycleMinutes % 60}m`
      : `${cycleMinutes} min`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <Navbar
        schemes={schemes}
        selectedSchemeId={selectedSchemeId}
        onSelect={setSelectedSchemeId}
      />
      <div className="container mx-auto p-6 max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="min-w-0 space-y-6 lg:col-span-5">
          <TimerDisplay
            state={timerState}
            activeBlock={activeBlock}
            activeBlockIndex={activeBlockIndex}
            totalBlocks={selectedScheme?.blocks.length ?? 0}
            onStart={() => {
              const block = activeBlock;
              if (block) {
                void updateTimerState(window.studyTimer.startTimer(block.id));
              }
            }}
            onPause={() =>
              void updateTimerState(window.studyTimer.pauseTimer())
            }
            onReset={() => void updateTimerState(window.studyTimer.stopTimer())}
          />
          <section className="space-y-4 px-1" aria-label="Cycle progress">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Current cycle
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-100">
                  {selectedScheme?.name ?? 'No scheme selected'}
                </h2>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-slate-400">
                {cycleDuration}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label="Cycle blocks completed"
              aria-valuemin={0}
              aria-valuemax={totalBlocks}
              aria-valuenow={completedBlocks}
            >
              <div
                className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
                style={{ width: `${cycleProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {completedBlocks} of {totalBlocks} blocks complete
              </span>
              <span className="capitalize">{timerState.phase}</span>
            </div>
          </section>
        </section>
        <section className="min-w-0 space-y-8 lg:col-span-7">
          <SchemeManager
            schemes={schemes}
            selectedScheme={selectedScheme}
            onSave={saveScheme}
            onDelete={deleteScheme}
          />
          <div className="border-t border-slate-800 pt-8">
            <BlockBuilder
              scheme={selectedScheme}
              onSave={saveScheme}
              onDelete={deleteScheme}
            />
          </div>
        </section>
      </div>
    </main>
  );
}