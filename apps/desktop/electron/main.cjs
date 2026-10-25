const { app, BrowserWindow, session, shell } = require('electron');
const path = require('node:path');
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#0b1019',
    title: '海克斯工坊 · HexARAM',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (
        target.protocol === 'https:' &&
        ['op.gg', 'lolalytics.com', 'arammayhem.com'].includes(target.hostname)
      )
        shell.openExternal(target.href);
    } catch {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  if (!app.isPackaged && process.env.HEXARAM_DEV === '1') win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '../../../dist/index.html'));
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
