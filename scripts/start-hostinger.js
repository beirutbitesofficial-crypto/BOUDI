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

function findLegacyData(domainRoot, targetDir, extraCandidate, appRoot = APP_ROOT) {
  const candidates = [];

  addCandidate(candidates, extraCandidate, targetDir);

  // Data restored directly into the currently deployed application.
  addCandidate(candidates, path.join(appRoot, 'data'), targetDir);

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

  // Never guess which of several sales databases contains the correct records.
  if (candidates.length > 1) {
    throw new Error('[storage] Multiple legacy databases found. Back them up and set DATA_MIGRATION_SOURCE to the verified data directory: ' + candidates.join(', '));
  }

  return candidates[0] || null;
}

function copyData(sourceDir, targetDir) {
  // Read SQLite through its engine so committed WAL transactions are included.
  // Copy into staging first; never delete or overwrite existing data/uploads.
  const Database = require('better-sqlite3');
  fs.mkdirSync(targetDir, { recursive: true });
  const staging = fs.mkdtempSync(path.join(targetDir, '.migration-'));
  const source = new Database(path.join(sourceDir, DB_NAME), { readonly: true, fileMustExist: true });
  try {
    const snapshot = path.join(staging, DB_NAME).replace(/'/g, "''");
    source.exec(`VACUUM INTO '${snapshot}'`);
  } finally { source.close(); }
  for (const name of ['uploads', 'supplier-invoices']) {
    const from = path.join(sourceDir, name);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(targetDir, name), {
      recursive: true, force: false, errorOnExist: false, preserveTimestamps: true
    });
  }
  fs.copyFileSync(path.join(staging, DB_NAME), path.join(targetDir, DB_NAME), fs.constants.COPYFILE_EXCL);
}

function prepareDataDirectory(appRoot = APP_ROOT) {
  const domainRoot = findDomainRoot(appRoot);
  if (process.env.DATA_DIR && !path.isAbsolute(process.env.DATA_DIR)) throw new Error('[storage] DATA_DIR must be an absolute persistent path.');
  const configuredDataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;

  // Outside Hostinger, preserve the original local-development behavior.
  if (!domainRoot) {
    if(process.env.NODE_ENV==='production' && !configuredDataDir) throw new Error('[storage] Cannot detect persistent hosting storage. Set DATA_DIR to an absolute persistent directory outside the deployment before starting.');
    if(process.env.NODE_ENV==='production' && configuredDataDir && (configuredDataDir===appRoot || configuredDataDir.startsWith(appRoot+path.sep))) throw new Error('[storage] Production DATA_DIR must be outside the application deployment directory.');
    process.env.DATA_DIR = configuredDataDir || path.join(appRoot, 'data');
    fs.mkdirSync(process.env.DATA_DIR,{recursive:true});
    console.log('[storage] Data directory: '+process.env.DATA_DIR);
    return;
  }

  // A DATA_DIR outside Hostinger's versioned hbuilds tree is already persistent.
  // If an old configuration points inside hbuilds/versions, treat it as legacy
  // input and migrate it instead of keeping a deployment-specific path.
  const versionsRoot = path.join(domainRoot, 'hbuilds') + path.sep;
  const configuredIsPersistent = configuredDataDir && configuredDataDir !== path.join(domainRoot,'hbuilds') && !configuredDataDir.startsWith(versionsRoot);
  const persistentDir = configuredIsPersistent
    ? configuredDataDir
    : path.join(domainRoot, 'persistent-data');

  if (!hasDatabase(persistentDir)) {
    const explicitSource = process.env.DATA_MIGRATION_SOURCE;
    if(explicitSource && (!path.isAbsolute(explicitSource)||!hasDatabase(explicitSource))) throw new Error('[storage] DATA_MIGRATION_SOURCE must contain the existing boudicafe.db.');
    const legacy = explicitSource || findLegacyData(
      domainRoot,
      persistentDir,
      configuredIsPersistent ? null : configuredDataDir, appRoot
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

module.exports = { prepareDataDirectory, findDomainRoot };
if (require.main === module) require('../server.js');
