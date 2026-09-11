# Build Friend Cafe POS as a Windows app

Run this on a Windows computer with Node.js 18+ installed.

```bat
npm install
npm install --save-dev electron electron-builder
npm run dist:win
```

The app will be created under:

```txt
dist\Friend Cafe POS.exe
```

Notes:

- The executable opens the POS as a desktop window.
- The database stays inside the app project `data` folder.
- Do not build on a full disk; Electron needs several hundred MB during packaging.
