const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
function create() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    backgroundColor: '#F6F7F9', title: 'Kalis', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.commandLine.appendSwitch('lang', 'fr-FR');
app.setAppUserModelId('com.paul.kalis');
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
