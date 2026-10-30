# Kalis — gestion financière personnelle

Application de bureau Windows (Electron + React + Vite) : comptes Wave / Orange Money / Djamo / Mixx by Yas,
budgets, objectifs, tontines, créances, projection, scénarios, bilan mensuel.

## Où sont les choses
- `C:\Kalis\Kalis.exe` : l'application installée
- `C:\Kalis\source` : ce dépôt (code source)
- `%APPDATA%\Kalis` : tes données (jamais touchées par une mise à jour)
- `Documents\Kalis\Sauvegardes` : sauvegardes automatiques (une par jour, 30 conservées)

## Publier une mise à jour
1. Augmenter `version` dans `package.json` (ex. 1.4.0 → 1.5.0)
2. `git commit` puis `git push`
3. GitHub Actions (`.github/workflows/release.yml`) construit `app.asar` et crée la release `v1.5.0`
4. Kalis détecte la release, la télécharge dans `%APPDATA%\Kalis\updates` et propose de redémarrer

## Développement
    npm install
    npm run build        # interface -> dist/
    npm run pack:asar    # release/app.asar
    npx electron .       # lancer en local

## Icône du .exe
    node tools\set-exe-icon.cjs C:\Kalis\Kalis.exe build\icon.ico
