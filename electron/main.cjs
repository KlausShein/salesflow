const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log  = require('electron-log');
const path = require('path');

// ── Logging setup ─────────────────────────────────────────────
log.transports.file.level    = 'info';
autoUpdater.logger           = log;
autoUpdater.autoDownload     = true;
autoUpdater.autoInstallOnAppQuit = true;

const isDev = process.env.NODE_ENV === 'development';

// ── Create main window ────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  1024,
    minHeight: 640,
    show:      false,   // show after ready-to-show (no white flash)
    icon:      path.join(__dirname, '../src/assets/app-icon.ico'),
    title:     'Sales Flow',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
      preload:          path.join(__dirname, 'preload.cjs'),
    },
  });

  // Show only when fully loaded (no white flash on startup)
  win.once('ready-to-show', () => win.show());

  // Open external links in browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  const win = createWindow();

  // Check for updates 3s after launch (production only)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Install update when user clicks banner ───────────────
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// ── Auto-updater events ───────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  // Silent download — banner will notify when ready
});

autoUpdater.on('update-not-available', () => {
  log.info('App is up to date.');
});

autoUpdater.on('download-progress', (progress) => {
  log.info(`Download progress: ${Math.round(progress.percent)}%`);
  // Send progress to renderer for optional progress display
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    wins[0].webContents.send('update-progress', Math.round(progress.percent));
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  // Send event to renderer — shows the in-app update banner
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    wins[0].webContents.send('update-downloaded', info.version);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err.message);
});
