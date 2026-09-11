const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

process.env.HOST = '127.0.0.1';
process.env.PORT = process.env.PORT || '5050';
process.chdir(path.join(__dirname, '..'));

require('../server');

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    const check = (left) => {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (left <= 0) reject(new Error('Server did not start'));
        else setTimeout(() => check(left - 1), 150);
      });
    };
    check(attempts);
  });
}

async function createWindow() {
  const url = `http://127.0.0.1:${process.env.PORT}/`;
  await waitForServer(url);

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'Friend Cafe POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  await win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
