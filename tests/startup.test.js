const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('Hostinger require-style entry starts server after preparing storage', () => {
  const events = [];
  const app = {
    set(){}, use(){}, get(){},
    listen(port,host){events.push('listen');assert.equal(port,5050);}
  };
  const express = Object.assign(()=>app,{json(){},urlencoded(){},static(){}});
  const serverModule = {exports:{}};
  const serverRequire = id => {
    if(id==='dotenv')return {config(){}};
    if(id==='./scripts/storage')return {prepareDataDirectory(){events.push('storage');}};
    if(id==='./db/database'){
      assert.deepEqual(events,['storage']);
      events.push('database');
      return {init(){},UPLOAD_DIR:'/tmp/boudi-test-uploads',db:{}};
    }
    if(id==='./db/barcode')return {ensureBarcodeSchema(){}};
    if(id==='path')return path;
    if(id==='express')return express;
    if(id==='express-session'||id==='cookie-parser')return ()=>{};
    if(id.startsWith('./routes/'))return {};
    throw new Error('Unexpected dependency: '+id);
  };
  const entryModule={exports:{}};
  const entryRequire = id => {
    assert.equal(id,'../server.js');
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../server.js'),'utf8'),{
      require:serverRequire,module:serverModule,process:{env:{}},__dirname:path.join(__dirname,'..'),console
    });
    return serverModule.exports;
  };
  // Hostinger imports the entry from its own launcher, rather than setting it as main.
  entryRequire.main={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scripts/start-hostinger.js'),'utf8'),{
    require:entryRequire,module:entryModule
  });
  assert.deepEqual(events,['storage','database','listen']);
  assert.equal(entryModule.exports,app);
});
