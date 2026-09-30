export type BlockType = 'WORK' | 'REST';

export interface TimerBlock {
  id: string | number;
  scheme_id: number;
  order_index: number;
  type: BlockType;
  duration_minutes: number;
  allow_skip: boolean;
}

export interface TimerScheme {
  id: number;
  name: string;
  created_at?: string;
  blocks: TimerBlock[];
}

export interface TimerState {
  currentScheme: TimerScheme | null;
  currentBlockIndex: number;
  secondsRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  canSkipCurrentBlock: boolean;
}

export interface ElectronAPI {
  getSchemes: () => Promise<TimerScheme[]>;
  createScheme: (name: string) => Promise<number>;
  updateScheme: (scheme: TimerScheme) => Promise<void>;
  deleteScheme: (id: number) => Promise<void>;
  onTimerTick: (callback: (state: TimerState) => void) => () => void;
  controlTimer: (action: 'START' | 'PAUSE' | 'RESET' | 'SKIP_BLOCK') => void;
}

export interface Block {
  id: string;
  name: string;
  type: BlockType;
  duration_minutes: number;
  allow_skip: boolean;
}

export interface Scheme {
  id: string;
  name: string;
  blocks: Block[];
}

export interface StudyTimerState {
  phase: 'idle' | 'running' | 'paused';
  schemeId: string | null;
  blockId: string | null;
  endsAt: number | null;
  remainingSeconds: number;
}

export interface StudyTimerApi {
  listSchemes: () => Promise<Scheme[]>;
  saveScheme: (scheme: Scheme) => Promise<Scheme[]>;
  deleteScheme: (schemeId: string) => Promise<Scheme[]>;
  getTimerState: () => Promise<StudyTimerState>;
  startTimer: (blockId: string) => Promise<StudyTimerState>;
  pauseTimer: () => Promise<StudyTimerState>;
  stopTimer: () => Promise<StudyTimerState>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    studyTimer: StudyTimerApi;
  }
}