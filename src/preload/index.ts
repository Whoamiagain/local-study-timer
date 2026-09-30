import { contextBridge, ipcRenderer } from 'electron';
import type {
  ElectronAPI,
  Scheme,
  StudyTimerState,
  TimerScheme,
  TimerState,
} from '../renderer/types';

const electronAPI: ElectronAPI = {
  getSchemes: (): Promise<TimerScheme[]> => ipcRenderer.invoke('get-schemes'),
  createScheme: (name: string): Promise<number> =>
    ipcRenderer.invoke('create-scheme', name),
  updateScheme: (scheme: TimerScheme): Promise<void> =>
    ipcRenderer.invoke('update-scheme', scheme),
  deleteScheme: (id: number): Promise<void> =>
    ipcRenderer.invoke('delete-scheme', id),
  onTimerTick: (callback: (state: TimerState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: TimerState) =>
      callback(state);
    ipcRenderer.on('timer-tick', listener);
    return () => ipcRenderer.removeListener('timer-tick', listener);
  },
  controlTimer: (action) => ipcRenderer.send('control-timer', action),
};

const studyTimer = {
  listSchemes: (): Promise<Scheme[]> => ipcRenderer.invoke('schemes:list'),
  saveScheme: (scheme: Scheme): Promise<Scheme[]> =>
    ipcRenderer.invoke('schemes:save', scheme),
  deleteScheme: (schemeId: string): Promise<Scheme[]> =>
    ipcRenderer.invoke('schemes:delete', schemeId),
  getTimerState: (): Promise<StudyTimerState> => ipcRenderer.invoke('timer:get'),
  startTimer: (blockId: string): Promise<StudyTimerState> =>
    ipcRenderer.invoke('timer:start', blockId),
  pauseTimer: (): Promise<StudyTimerState> => ipcRenderer.invoke('timer:pause'),
  stopTimer: (): Promise<StudyTimerState> => ipcRenderer.invoke('timer:stop'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('studyTimer', studyTimer);