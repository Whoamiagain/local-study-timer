// eslint-disable-next-line import/no-unresolved
import 'dotenv/config';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { initializeDatabase } from './db';
import { registerIpcHandlers } from './ipc';
import { configureAutoUpdates } from './autoUpdate';

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let companionProcess: ChildProcess | null = null;

const startCompanion = () => {
  const companionPath = process.env.COMPANION_APP_PATH;
  if (!companionPath) {
    return;
  }

  try {
    if (!fs.existsSync(companionPath)) {
      return;
    }

    const isTypeScript = /\.(?:ts|tsx|mts|cts)$/i.test(companionPath);
    const args = isTypeScript
      ? ['--import', 'tsx', companionPath]
      : [companionPath];
    const child = spawn('node', args, {
      cwd: path.dirname(companionPath),
      detached: true,
      stdio: 'ignore',
    });
    companionProcess = child;
    child.once('error', () => {
      if (companionProcess === child) {
        companionProcess = null;
      }
    });
    child.once('exit', () => {
      if (companionProcess === child) {
        companionProcess = null;
      }
    });
    child.unref();
  } catch {
    return;
  }
};

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  if (!app.isPackaged && typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }
};

app.whenReady().then(() => {
  initializeDatabase();
  registerIpcHandlers(() => mainWindow);
  startCompanion();
  createWindow();
  configureAutoUpdates();
});

app.on('before-quit', () => {
  if (!companionProcess) {
    return;
  }

  const child = companionProcess;
  companionProcess = null;
  try {
    child.kill();
  } catch {
    return;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});