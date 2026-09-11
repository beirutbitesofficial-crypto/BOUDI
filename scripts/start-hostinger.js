'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const DB_NAME = 'boudicafe.db';

function findDomainRoot(startPath) {
  let current = path.resolve(startPath);
  for (let i = 0; i < 12; i += 1) {
    if (path.basename(current) === 'hbuilds') return path.dirname(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function hasDatabase(dir) {
  try {
    return fs.statSync(path.join(dir, DB_NAME)).isFile();
  } catch {
    return false;
  }
}

function dbStat(dir) {
  try {
    return fs.statSync(path.join(dir, DB_NAME));
  } catch {
    return null;
  }
}

function addCandidate(list, dir, targetDir) {
  if (!dir) return;
  const resolved = path.resolve(dir);
  if (resolved === path.resolve(targetDir)) return;
  if (hasDatabase(resolved) && !list.includes(resolved)) list.push(resolved);
}

function findLegacyData(domainRoot, targetDir, extraCandidate) {
  const candidates = [];

  addCandidate(candidates, extraCandidate, targetDir);

  // Data restored directly into the currently deployed application.
  addCandidate(candidates, path.join(APP_ROOT, 'data'), targetDir);

  // Older Hostinger deployment versions. Hostinger keeps each Node build under
  // hbuilds/versions/<version>/nodejs, so restored backups can be recovered here.
  if (domainRoot) {
    addCandidate(candidates, path.join(domainRoot, 'nodejs', 'data'), targetDir);
    const versionsDir = path.join(domainRoot, 'hbuilds', 'versions');
    try {
      for (const version of fs.readdirSync(versionsDir)) {
        addCandidate(candidates, path.join(versionsDir, version, 'nodejs', 'data'), targetDir);
      }
    } catch {
      // The versions directory may not exist outside Hostinger.
    }
  }

  // Prefer the most substantial database first, then the newest one. This helps
  // avoid choosing an accidentally-created empty DB over a restored real backup.
  candidates.sort((a, b) => {
    const aStat = dbStat(a);
    const bStat = dbStat(b);
    const sizeDiff = (bStat?.size || 0) - (aStat?.size || 0);
    if (sizeDiff !== 0) return sizeDiff;
    return (bStat?.mtimeMs || 0) - (aStat?.mtimeMs || 0);
  });

  return candidates[0] || null;
}

function copyData(sourceDir, targetDir) {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  if (fs.existsSync(targetDir) && !hasDatabase(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
}

function prepareDataDirectory() {
  const domainRoot = findDomainRoot(APP_ROOT);
  const configuredDataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;

  // Outside Hostinger, preserve the original local-development behavior.
  if (!domainRoot) {
    process.env.DATA_DIR = configuredDataDir || path.join(APP_ROOT, 'data');
    return;
  }

  // A DATA_DIR outside Hostinger's versioned hbuilds tree is already persistent.
  // If an old configuration points inside hbuilds/versions, treat it as legacy
  // input and migrate it instead of keeping a deployment-specific path.
  const versionsRoot = path.join(domainRoot, 'hbuilds', 'versions') + path.sep;
  const configuredIsPersistent = configuredDataDir && !configuredDataDir.startsWith(versionsRoot);
  const persistentDir = configuredIsPersistent
    ? configuredDataDir
    : path.join(domainRoot, 'persistent-data');

  if (!hasDatabase(persistentDir)) {
    const legacy = findLegacyData(
      domainRoot,
      persistentDir,
      configuredIsPersistent ? null : configuredDataDir
    );
    if (legacy) {
      console.log(`[storage] Migrating existing BOUDI CAFE data to persistent storage from ${legacy}`);
      copyData(legacy, persistentDir);
    } else {
      fs.mkdirSync(persistentDir, { recursive: true });
      console.log('[storage] No existing database found; starting a fresh BOUDI CAFE database.');
    }
  }

  process.env.DATA_DIR = persistentDir;
  console.log(`[storage] Persistent data directory: ${persistentDir}`);
}

prepareDataDirectory();
require('../server.js');
