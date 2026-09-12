const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {prepareDataDirectory} = require('../scripts/storage');

test('redeploy and rollback use the same database and images without overwriting them', () => {
  const domain = fs.mkdtempSync(path.join(os.tmpdir(), 'boudi-storage-'));
  const original = {...process.env};
  try {
    delete process.env.DATA_DIR;delete process.env.DATA_MIGRATION_SOURCE;
    process.env.NODE_ENV='production';
    prepareDataDirectory(path.join(domain,'hbuilds','versions','v1','nodejs'));
    const stable=process.env.DATA_DIR;
    fs.writeFileSync(path.join(stable,'boudicafe.db'),'existing sales');
    fs.mkdirSync(path.join(stable,'uploads'));
    fs.writeFileSync(path.join(stable,'uploads','product.jpg'),'existing image');
    for(const version of ['v2','v1']) {
      delete process.env.DATA_DIR;
      prepareDataDirectory(path.join(domain,'hbuilds','versions',version,'nodejs'));
      assert.equal(process.env.DATA_DIR,stable);
      assert.equal(fs.readFileSync(path.join(stable,'boudicafe.db'),'utf8'),'existing sales');
      assert.equal(fs.readFileSync(path.join(stable,'uploads','product.jpg'),'utf8'),'existing image');
    }
  } finally { process.env=original; }
});

test('unknown production paths fail before creating an empty database', () => {
  const original={...process.env};
  try {
    delete process.env.DATA_DIR;process.env.NODE_ENV='production';
    assert.throws(()=>prepareDataDirectory('/tmp/unrecognized-boudi-build'),/Cannot detect persistent/);
    process.env.DATA_DIR='/tmp/unrecognized-boudi-build/data';
    assert.throws(()=>prepareDataDirectory('/tmp/unrecognized-boudi-build'),/outside the application/);
  } finally { process.env=original; }
});

test('ambiguous legacy databases are preserved and require explicit selection', () => {
  const domain=fs.mkdtempSync(path.join(os.tmpdir(),'boudi-legacy-'));
  const original={...process.env};
  try {
    delete process.env.DATA_DIR;delete process.env.DATA_MIGRATION_SOURCE;
    for(const version of ['v1','v2']) {
      const dir=path.join(domain,'hbuilds','versions',version,'nodejs','data');
      fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'boudicafe.db'),version);
    }
    assert.throws(()=>prepareDataDirectory(path.join(domain,'hbuilds','versions','v3','nodejs')),/Multiple legacy databases/);
    assert.equal(fs.existsSync(path.join(domain,'persistent-data','boudicafe.db')),false);
  } finally {process.env=original;}
});
