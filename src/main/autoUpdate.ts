import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

export const configureAutoUpdates = () => {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: `Version ${info.version} downloaded. Restart to update now?`,
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  void autoUpdater.checkForUpdatesAndNotify().catch((error: unknown) => {
    console.error('Failed to check for application updates:', error);
  });
};