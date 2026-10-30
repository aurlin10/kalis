// Point d'entrée de Kalis.
// Si une version plus récente a été téléchargée (mise à jour automatique depuis GitHub Releases),
// elle est chargée depuis %APPDATA%\Kalis\updates\kalis-x.y.z.asar ; sinon la version installée est utilisée.
const { app } = require('electron');
const path = require('path');
const ofs = require('original-fs');

const own = require('../package.json').version;
const cmp = (a, b) => {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
};

let target = path.join(__dirname, 'main.cjs');
try {
  const dir = path.join(app.getPath('userData'), 'updates');
  let best = own;
  for (const f of ofs.readdirSync(dir)) {
    const m = /^kalis-(\d+\.\d+\.\d+)\.asar$/.exec(f);
    if (m && cmp(m[1], best) > 0) { best = m[1]; target = path.join(dir, f, 'electron', 'main.cjs'); }
  }
} catch (e) { /* pas de dossier de mises à jour */ }

try {
  require(target);
} catch (e) {
  console.error('Échec du chargement de la mise à jour, retour à la version installée', e);
  require('./main.cjs');
}
