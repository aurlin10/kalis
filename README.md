# Kalis — gestion financière personnelle (Electron + React)

## Développement
npm install
npm run build          # build Vite -> dist/
npx electron .         # lancer l'app

## Générer le .exe Windows
npx @electron/packager . Kalis --platform=win32 --arch=x64 --out=out --overwrite --asar --ignore='^/src' --ignore='^/node_modules' --ignore='^/out'

Les données utilisateur sont stockées dans %APPDATA%\Kalis (localStorage) : elles sont conservées d'une version à l'autre.
