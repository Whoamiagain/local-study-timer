import { ipcMain, Notification, shell, type BrowserWindow } from 'electron';
import {
  createScheme,
  deleteScheme,
  getSchemes,
  updateScheme,
} from './db';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  Scheme,
  StudyTimerState,
  TimerScheme,
  TimerState,
} from '../renderer/types';

const createIdleTimerState = (): TimerState => ({
  currentScheme: null,
  currentBlockIndex: 0,
  secondsRemaining: 0,
  isRunning: false,
  isPaused: false,
  awaitingAdvance: false,
  canSkipCurrentBlock: false,
});

let timerState = createIdleTimerState();
let timerInterval: ReturnType<typeof setInterval> | null = null;

const getTimerStatus = () => {
  const currentBlock =
    timerState.currentScheme?.blocks[timerState.currentBlockIndex] ?? null;
  const currentBlockType = currentBlock?.type ?? 'REST';

  return {
    workActive: timerState.isRunning && currentBlockType === 'WORK',
    currentBlockType,
    timeRemaining: timerState.secondsRemaining,
  };
};

export const registerIpcHandlers = (
  getMainWindow: () => BrowserWindow | null,
) => {
  const statusServer = new WebSocketServer({
    host: '127.0.0.1',
    port: 45458,
  });
  statusServer.on('error', (error: Error) => {
    console.error('Timer status WebSocket server error:', error);
  });
  statusServer.on('connection', (client) => {
    client.on('error', (error: Error) => {
      console.error('Timer status WebSocket client error:', error);
    });
    client.send(JSON.stringify(getTimerStatus()));
  });

  const broadcastTimerState = () => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer-tick', timerState);
    }

    const statusMessage = JSON.stringify(getTimerStatus());
    for (const client of statusServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(statusMessage);
      }
    }
  };

  const setTimerState = (state: TimerState) => {
    const currentBlock =
      state.currentScheme?.blocks[state.currentBlockIndex] ?? null;
    timerState = {
      ...state,
      canSkipCurrentBlock:
        currentBlock?.type === 'REST' && currentBlock.allow_skip,
    };
    broadcastTimerState();
  };

  const clearTimerInterval = () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const getCurrentBlock = () =>
    timerState.currentScheme?.blocks[timerState.currentBlockIndex] ?? null;

  const getLegacyTimerState = (): StudyTimerState => {
    const block = getCurrentBlock();
    return {
      phase: timerState.isRunning
        ? 'running'
        : timerState.isPaused
          ? 'paused'
          : 'idle',
      awaitingAdvance: timerState.awaitingAdvance,
      schemeId: timerState.currentScheme
        ? String(timerState.currentScheme.id)
        : null,
      blockId: block ? String(block.id) : null,
      endsAt: timerState.isRunning
        ? Date.now() + timerState.secondsRemaining * 1000
        : null,
      remainingSeconds: timerState.secondsRemaining,
    };
  };

  const advanceBlock = (skipToWork = false) => {
    const scheme = timerState.currentScheme;
    clearTimerInterval();
    if (!scheme || scheme.blocks.length === 0) {
      setTimerState({ ...timerState, ...createIdleTimerState() });
      return;
    }

    let nextIndex = (timerState.currentBlockIndex + 1) % scheme.blocks.length;
    if (skipToWork) {
      for (let checkedBlocks = 0; checkedBlocks < scheme.blocks.length; checkedBlocks += 1) {
        if (scheme.blocks[nextIndex].type === 'WORK') break;
        nextIndex = (nextIndex + 1) % scheme.blocks.length;
      }
    }

    setTimerState({
      ...timerState,
      currentBlockIndex: nextIndex,
      secondsRemaining: scheme.blocks[nextIndex].duration_minutes * 60,
      isRunning: false,
      isPaused: true,
      awaitingAdvance: true,
    });
  };

  const notifyBlockComplete = () => {
    const completedBlock = getCurrentBlock();
    shell.beep();
    if (Notification.isSupported()) {
      new Notification({
        title: 'Study timer',
        body: `${completedBlock?.type === 'REST' ? 'Rest' : 'Work'} has ended!`,
      }).show();
    }
  };

  const tick = () => {
    if (!timerState.isRunning) {
      clearTimerInterval();
      return;
    }

    if (timerState.secondsRemaining <= 1) {
      notifyBlockComplete();
      advanceBlock();
      return;
    }

    setTimerState({
      ...timerState,
      secondsRemaining: timerState.secondsRemaining - 1,
    });
  };

  const startTimerInterval = () => {
    clearTimerInterval();
    timerInterval = setInterval(tick, 1000);
  };

  const startTimer = () => {
    const scheme = timerState.currentScheme ?? getSchemes()[0] ?? null;
    if (!scheme || scheme.blocks.length === 0) {
      clearTimerInterval();
      setTimerState({ ...createIdleTimerState(), currentScheme: scheme });
      return;
    }

    const blockIndex = Math.min(
      timerState.currentBlockIndex,
      scheme.blocks.length - 1,
    );
    const secondsRemaining =
      timerState.isPaused && timerState.secondsRemaining > 0
        ? timerState.secondsRemaining
        : timerState.secondsRemaining ||
          scheme.blocks[blockIndex].duration_minutes * 60;

    setTimerState({
      ...timerState,
      currentScheme: scheme,
      currentBlockIndex: blockIndex,
      secondsRemaining,
      isRunning: true,
      isPaused: false,
      awaitingAdvance: false,
    });
    startTimerInterval();
  };

  const pauseTimer = () => {
    clearTimerInterval();
    if (timerState.isRunning) {
      setTimerState({ ...timerState, isRunning: false, isPaused: true });
    }
  };

  const resetTimer = () => {
    clearTimerInterval();
    const firstBlock = timerState.currentScheme?.blocks[0];
    setTimerState({
      ...timerState,
      currentBlockIndex: 0,
      secondsRemaining: firstBlock ? firstBlock.duration_minutes * 60 : 0,
      isRunning: false,
      isPaused: false,
      awaitingAdvance: false,
    });
  };

  const controlTimer = (action: 'START' | 'PAUSE' | 'RESET' | 'SKIP_BLOCK') => {
    if (action === 'START') {
      startTimer();
    } else if (action === 'PAUSE') {
      pauseTimer();
    } else if (action === 'RESET') {
      resetTimer();
    } else if (timerState.canSkipCurrentBlock) {
      advanceBlock(true);
      if (timerState.isRunning) {
        startTimerInterval();
      }
    }
  };

  const getRendererSchemes = (): Scheme[] =>
    getSchemes().map((scheme) => ({
      id: String(scheme.id),
      name: scheme.name,
      blocks: scheme.blocks.map((block) => ({
        id: String(block.id),
        name: block.type === 'WORK' ? 'Work' : 'Rest',
        type: block.type,
        duration_minutes: block.duration_minutes,
        allow_skip: block.allow_skip,
      })),
    }));

  const saveRendererScheme = (scheme: Scheme): Scheme[] => {
    const currentSchemes = getSchemes();
    let schemeId = Number(scheme.id);
    let currentScheme = currentSchemes.find((item) => item.id === schemeId);

    if (!currentScheme) {
      schemeId = createScheme(scheme.name);
      currentScheme = getSchemes().find((item) => item.id === schemeId);
    }

    const updatedScheme: TimerScheme = {
      id: schemeId,
      name: scheme.name,
      created_at: currentScheme?.created_at,
      blocks: scheme.blocks.map((block, orderIndex) => {
        const type = block.type;

        return {
          id: block.id,
          scheme_id: schemeId,
          order_index: orderIndex,
          type,
          duration_minutes: Math.max(1, Math.round(block.duration_minutes)),
          allow_skip: type === 'REST' ? block.allow_skip : false,
        };
      }),
    };

    updateScheme(updatedScheme);
    if (timerState.currentScheme?.id === schemeId) {
      const activeScheme = getSchemes().find((item) => item.id === schemeId);
      if (activeScheme) {
        setTimerState({ ...timerState, currentScheme: activeScheme });
      }
    }
    return getRendererSchemes();
  };

  ipcMain.handle('get-schemes', () => {
    const schemes = getSchemes();
    if (!timerState.currentScheme && schemes.length > 0) {
      setTimerState({
        ...timerState,
        currentScheme: schemes[0],
        currentBlockIndex: 0,
      });
    }
    return schemes;
  });
  ipcMain.handle('create-scheme', (_event, name: string) => createScheme(name));
  ipcMain.handle('update-scheme', (_event, scheme: TimerScheme) => {
    updateScheme(scheme);
    if (timerState.currentScheme?.id === scheme.id) {
      setTimerState({ ...timerState, currentScheme: scheme });
    }
  });
  ipcMain.handle('delete-scheme', (_event, id: number) => {
    deleteScheme(id);
    if (timerState.currentScheme?.id === id) {
      clearTimerInterval();
      setTimerState(createIdleTimerState());
    }
  });
  ipcMain.on('control-timer', (_event, action: 'START' | 'PAUSE' | 'RESET' | 'SKIP_BLOCK') => {
    controlTimer(action);
  });

  ipcMain.handle('schemes:list', () => {
    const schemes = getSchemes();
    if (!timerState.currentScheme && schemes.length > 0) {
      setTimerState({ ...timerState, currentScheme: schemes[0] });
    }
    return getRendererSchemes();
  });
  ipcMain.handle('schemes:save', (_event, scheme: Scheme) =>
    saveRendererScheme(scheme),
  );
  ipcMain.handle('schemes:delete', (_event, schemeId: string) => {
    const id = Number(schemeId);
    deleteScheme(id);
    if (timerState.currentScheme?.id === id) {
      clearTimerInterval();
      setTimerState(createIdleTimerState());
    }
    return getRendererSchemes();
  });

  ipcMain.handle('timer:get', getLegacyTimerState);
  ipcMain.handle('timer:start', (_event, blockId: string) => {
    const target = getSchemes()
      .map((scheme) => ({
        scheme,
        blockIndex: scheme.blocks.findIndex(
          (block) => String(block.id) === blockId,
        ),
      }))
      .find((item) => item.blockIndex >= 0);
    if (!target) {
      throw new Error('Timer block was not found.');
    }

    const isResume =
      timerState.isPaused &&
      timerState.currentScheme?.id === target.scheme.id &&
      timerState.currentScheme.blocks[timerState.currentBlockIndex]?.id ===
        target.scheme.blocks[target.blockIndex].id;
    setTimerState({
      currentScheme: target.scheme,
      currentBlockIndex: target.blockIndex,
      secondsRemaining: isResume
        ? timerState.secondsRemaining
        : target.scheme.blocks[target.blockIndex].duration_minutes * 60,
      isRunning: true,
      isPaused: false,
      awaitingAdvance: false,
      canSkipCurrentBlock: false,
    });
    startTimerInterval();
    return getLegacyTimerState();
  });
  ipcMain.handle('timer:pause', () => {
    pauseTimer();
    return getLegacyTimerState();
  });
  ipcMain.handle('timer:stop', () => {
    resetTimer();
    return getLegacyTimerState();
  });
};