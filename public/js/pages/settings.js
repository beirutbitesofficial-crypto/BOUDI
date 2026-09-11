import{api}from'../api.js';import{el,toast,setCurrency,setExchangeRate,fmtDate}from'../ui.js';import{state}from'../app.js';

function passwordControl(placeholder='Password (8+ characters)'){
  const input=el('input',{type:'password',placeholder,autocomplete:'new-password'});
  const toggle=el('button.btn.btn-ghost',{type:'button',text:'Show',onclick:()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'Hide':'Show';}});
  return{input,wrap:el('div',{style:'display:flex;gap:6px;align-items:center;min-width:220px'},[input,toggle])};
}

export async function renderSettings(root){
  if(!['admin','manager'].includes(state.user.role))throw new Error('Forbidden');const s=await api.get('/settings');
  const cafe=el('input',{value:s.cafe_name||'BOUDI CAFE'}),currency=el('select',{},['LBP','USD'].map(v=>el('option',{value:v,text:v,selected:(s.currency||'LBP')===v?'selected':null}))),usdRate=el('input',{type:'number',min:'1',step:'1',value:s.usd_exchange_rate||89500,inputmode:'numeric'}),game=el('input',{type:'number',value:s.default_game_price||100000,disabled:'disabled'}),low=el('input',{type:'number',value:s.low_stock_alert||5}),timeout=el('input',{type:'number',value:s.session_timeout_min||30});
  const save=async()=>{try{if(!(Number(usdRate.value)>0))throw new Error('Enter a valid USD exchange rate');await api.put('/settings',{cafe_name:cafe.value,currency:currency.value,usd_exchange_rate:usdRate.value,default_game_price:100000,low_stock_alert:low.value,session_timeout_min:timeout.value});setExchangeRate(usdRate.value);setCurrency(currency.value);state.settings.currency=currency.value;state.settings.usd_exchange_rate=usdRate.value;toast('Settings saved');}catch(e){toast(e.message,'error');}};
  const general=el('div.card',{},[el('h3',{text:'General Settings'}),...[["Cafe name",cafe],["Default display currency",currency],["LBP for 1 USD",usdRate],["Gaming price per player (LBP, locked)",game],["Low stock alert",low],["Session timeout",timeout]].map(([l,x])=>el('div.form-row',{},[el('label',{text:l}),x])),el('button.btn.btn-primary',{text:'Save',onclick:save})]);

  const newUsername=el('input',{placeholder:'Username',autocomplete:'off'}),newPassword=passwordControl(),newRole=el('select',{},['cashier','manager','admin'].map(v=>el('option',{value:v,text:v}))),userRows=el('tbody');
  const refreshUsers=async()=>{const list=await api.get('/auth/users');const rows=[];
    for(const u of list){
      const username=el('input',{value:u.username,autocomplete:'off',style:'min-width:140px'}),role=el('select',{},['cashier','manager','admin'].map(v=>el('option',{value:v,text:v,selected:u.role===v?'selected':null}))),resetPassword=passwordControl('New password (optional)');
      const saveUser=async()=>{try{await api.put(`/auth/users/${u.id}`,{username:username.value,role:role.value,password:resetPassword.input.value});if(u.id===state.user.id){state.user.username=username.value;state.user.role=role.value;const name=document.getElementById('user-name');if(name)name.textContent=username.value;}resetPassword.input.value='';toast('User updated');await refreshUsers();if(u.id===state.user.id&&!['admin','manager'].includes(role.value))setTimeout(()=>location.reload(),400);}catch(e){toast(e.message,'error');}};
      rows.push(el('tr',{},[
        el('td',{text:String(u.id)}),
        el('td',{},[username]),
        el('td',{},[role]),
        el('td',{},[el('div.muted',{text:'••••••••  Encrypted'}),resetPassword.wrap]),
        el('td',{text:fmtDate(u.created_at)||u.created_at||'-'}),
        el('td',{},[el('button.btn.btn-primary',{type:'button',text:'Save / Reset',onclick:saveUser})])
      ]));
    }
    userRows.replaceChildren(...(rows.length?rows:[el('tr',{},[el('td',{colspan:'6',class:'muted',text:'No users found'})])]));
  };
  const createUser=async()=>{try{await api.post('/auth/users',{username:newUsername.value,password:newPassword.input.value,role:newRole.value});newUsername.value='';newPassword.input.value='';toast('User created');await refreshUsers();}catch(e){toast(e.message,'error');}};
  const users=el('div.card',{},[
    el('h3',{text:'User Management'}),
    el('p.muted',{text:'Admin and Manager can view every user account and update username, role, or reset its password. Existing passwords cannot be displayed because they are securely hashed.'}),
    el('div',{style:'display:grid;grid-template-columns:minmax(150px,1fr) minmax(230px,1.4fr) minmax(130px,.7fr) auto;gap:10px;align-items:center;margin:14px 0'},[newUsername,newPassword.wrap,newRole,el('button.btn.btn-primary',{type:'button',text:'Create User',onclick:createUser})]),
    el('div.table-wrap',{},[el('table',{},[
      el('thead',{},[el('tr',{},['ID','Username','Role','Password / Reset','Created','Actions'].map(h=>el('th',{text:h})))]),
      userRows
    ])])
  ]);
  await refreshUsers();

  const restoreFile=el('input',{type:'file',accept:'.zip,application/zip,.json,application/json'});const restore=async()=>{const file=restoreFile.files?.[0];if(!file)return toast('Select a backup file','error');if(!confirm('Restore this backup and replace the current data and uploaded files?'))return;try{if(file.name.toLowerCase().endsWith('.zip')){const fd=new FormData();fd.append('backup',file);await api.upload('/backup/import-full',fd);}else{const data=JSON.parse(await file.text());await api.post('/backup/import',data);}toast('Full backup restored');setTimeout(()=>location.reload(),700);}catch(e){toast(e.message,'error');}};
  const backup=el('div.card',{},[el('h3',{text:'Full Backup & Restore'}),el('p',{text:'Includes all database data, product images and supplier invoice attachments.'}),el('button.btn.btn-green',{text:'Download Full ZIP Backup',onclick:async()=>{const r=await api.raw('/backup/export-full');if(!r.ok)return toast('Backup download failed','error');const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`boudi-cafe-full-backup-${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}),restoreFile,el('button.btn.btn-blue',{text:'Restore Full Backup',onclick:restore})]);
  const current=el('input',{type:'password'}),next=el('input',{type:'password'});const security=el('div.card',{},[el('h3',{text:'Security'}),current,next,el('button.btn.btn-blue',{text:'Change password',onclick:async()=>{try{await api.post('/auth/change-password',{currentPassword:current.value,newPassword:next.value});toast('Password changed');}catch(e){toast(e.message,'error');}}})]);
  const resetInput=el('input',{placeholder:'Type FACTORY RESET'}),reset=el('div.card.danger-zone',{},[el('h3',{text:'Factory Reset'}),el('p',{text:'Deletes all sales, debts, shifts, expenses, stock history and supplier invoices. Products remain with stock set to zero.'}),resetInput,el('button.btn.btn-danger',{text:'Factory Reset',onclick:async()=>{if(resetInput.value!=='FACTORY RESET')return toast('Type FACTORY RESET','error');if(!confirm('This cannot be undone. Continue?'))return;try{await api.post('/backup/factory-reset',{confirm:resetInput.value});toast('Factory reset complete');}catch(e){toast(e.message,'error');}}})]);
  root.append(general,users,security,backup,reset);
}
