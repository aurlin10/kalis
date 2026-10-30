const { app, BrowserWindow, Menu, shell, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const ofs = require('original-fs');

const ROOT = path.join(__dirname, '..');
const VERSION = require('../package.json').version;
const REPO = 'aurlin10/kalis';

const cmp = (a, b) => {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
};
const defaultBackupDir = () => path.join(app.getPath('documents'), 'Kalis', 'Sauvegardes');
const updatesDir = () => path.join(app.getPath('userData'), 'updates');

let win;
function create() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    backgroundColor: '#F5F6FB', title: 'Kalis', autoHideMenuBar: true, show: false,
    icon: path.join(ROOT, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(ROOT, 'dist', 'index.html'));
  win.once('ready-to-show', () => {
    if (process.argv.includes('--minimized')) win.minimize(); else win.maximize();
    win.show();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

// ---------- IPC ----------
ipcMain.handle('app:version', () => VERSION);
ipcMain.handle('app:relaunch', () => { app.relaunch(); app.exit(0); });

ipcMain.handle('backup:defaultDir', () => defaultBackupDir());
ipcMain.handle('backup:write', (e, json, dir) => {
  const d = dir || defaultBackupDir();
  fs.mkdirSync(d, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(d, `kalis-${day}.json`);
  fs.writeFileSync(file, json, 'utf8');
  // On garde les 30 sauvegardes les plus récentes
  const all = fs.readdirSync(d).filter((f) => /^kalis-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of all.slice(0, Math.max(0, all.length - 30))) { try { fs.unlinkSync(path.join(d, f)); } catch (err) {} }
  return file;
});
ipcMain.handle('dialog:chooseDir', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], title: 'Dossier de sauvegarde' });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:openPath', (e, p) => shell.openPath(p));

ipcMain.handle('file:save', async (e, name, base64, filters) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: filters || [] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, Buffer.from(base64, 'base64'));
  shell.showItemInFolder(r.filePath);
  return r.filePath;
});
ipcMain.handle('pdf:export', async (e, name) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePath) return null;
  const data = await e.sender.printToPDF({ printBackground: true, pageSize: 'A4', landscape: true, margins: { marginType: 'default' } });
  fs.writeFileSync(r.filePath, data);
  shell.openPath(r.filePath);
  return r.filePath;
});

ipcMain.handle('autolaunch:get', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('autolaunch:set', (e, on) => {
  app.setLoginItemSettings({ openAtLogin: !!on, args: ['--minimized'] });
  return app.getLoginItemSettings().openAtLogin;
});

// Mise à jour : la dernière release GitHub contient un fichier app.asar.
// Il est téléchargé dans %APPDATA%\Kalis\updates et chargé au prochain démarrage (voir boot.cjs).
ipcMain.handle('update:check', async () => {
  try {
    const r = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'Kalis', Accept: 'application/vnd.github+json' } });
    if (r.status === 404) return { status: 'latest', version: VERSION }; // aucune release publiée pour l'instant
    if (!r.ok) return { status: 'error', message: `GitHub a répondu ${r.status}` };
    const j = await r.json();
    const v = String(j.tag_name || '').replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(v) || cmp(v, VERSION) <= 0) return { status: 'latest', version: VERSION };
    const asset = (j.assets || []).find((a) => a.name === 'app.asar');
    if (!asset) return { status: 'error', message: 'Release sans fichier app.asar' };
    const dir = updatesDir();
    ofs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `kalis-${v}.asar`);
    if (!ofs.existsSync(dest)) {
      const b = await net.fetch(asset.browser_download_url, { headers: { 'User-Agent': 'Kalis' } });
      if (!b.ok) return { status: 'error', message: `Téléchargement impossible (${b.status})` };
      const buf = Buffer.from(await b.arrayBuffer());
      ofs.writeFileSync(dest + '.part', buf);
      ofs.renameSync(dest + '.part', dest);
    }
    // Nettoyage : on ne garde que la version téléchargée la plus récente
    for (const f of ofs.readdirSync(dir)) {
      const m = /^kalis-(\d+\.\d+\.\d+)\.asar$/.exec(f);
      if (m && cmp(m[1], v) < 0) { try { ofs.unlinkSync(path.join(dir, f)); } catch (err) {} }
    }
    return { status: 'ready', version: v, notes: j.body || '' };
  } catch (err) {
    return { status: 'error', message: String(err.message || err) };
  }
});

app.commandLine.appendSwitch('lang', 'fr-FR');
app.setAppUserModelId('com.paul.kalis');
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
