// Construit release/app.asar (interface + processus Electron) pour les mises à jour automatiques.
const asar = require('@electron/asar');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const stage = path.join(root, 'release', 'app');
fs.rmSync(path.join(root, 'release'), { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'build'), { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, main: pkg.main, author: pkg.author }, null, 2));
fs.cpSync(path.join(root, 'electron'), path.join(stage, 'electron'), { recursive: true });
fs.cpSync(path.join(root, 'dist'), path.join(stage, 'dist'), { recursive: true });
fs.copyFileSync(path.join(root, 'build', 'icon.png'), path.join(stage, 'build', 'icon.png'));
asar.createPackage(stage, path.join(root, 'release', 'app.asar')).then(() => console.log('release/app.asar prêt (v' + pkg.version + ')'));
