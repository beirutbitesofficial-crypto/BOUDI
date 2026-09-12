import {t} from '../i18n.js?v=20260912-i18n';
import{api}from'../api.js?v=20260912-i18n';import{el,toast,setCurrency,setExchangeRate,fmtDate}from'../ui.js?v=20260912-i18n';import{state}from'../app.js?v=20260912-i18n';

function passwordControl(placeholder=t('Password (8+ characters)')){
  const input=el('input',{type:'password',placeholder,autocomplete:'new-password'});
  const toggle=el('button.btn.btn-ghost',{type:'button',text:t('Show'),onclick:()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?t('Hide'):t('Show');}});
  return{input,wrap:el('div',{style:'display:flex;gap:6px;align-items:center;min-width:220px'},[input,toggle])};
}

export async function renderSettings(root){
  if(!['admin','manager'].includes(state.user.role))throw new Error(t('Forbidden'));const s=await api.get('/settings');
  const cafe=el('input',{value:s.cafe_name||'BOUDI CAFE'}),currency=el('select',{},['LBP','USD'].map(v=>el('option',{value:v,text:t(v),selected:(s.currency||'LBP')===v?'selected':null}))),usdRate=el('input',{type:'number',min:'1',step:'1',value:s.usd_exchange_rate||89500,inputmode:'numeric'}),game=el('input',{type:'number',value:s.default_game_price||100000,disabled:'disabled'}),low=el('input',{type:'number',value:s.low_stock_alert||5}),timeout=el('input',{type:'number',value:s.session_timeout_min||30});
  const save=async()=>{try{if(!(Number(usdRate.value)>0))throw new Error(t('Enter a valid USD exchange rate'));await api.put('/settings',{cafe_name:cafe.value,currency:currency.value,usd_exchange_rate:usdRate.value,default_game_price:100000,low_stock_alert:low.value,session_timeout_min:timeout.value});setExchangeRate(usdRate.value);setCurrency(currency.value);state.settings.currency=currency.value;state.settings.usd_exchange_rate=usdRate.value;toast(t('Settings saved'));}catch(e){toast(e.message,'error');}};
  const general=el('div.card',{},[el('h3',{text:t('General Settings')}),...[[t("Cafe name"),cafe],[t("Default display currency"),currency],[t("LBP for 1 USD"),usdRate],[t("Gaming price per player (LBP, locked)"),game],[t("Low stock alert"),low],[t("Session timeout"),timeout]].map(([l,x])=>el('div.form-row',{},[el('label',{text:l}),x])),el('button.btn.btn-primary',{text:t('Save'),onclick:save})]);

  const newUsername=el('input',{placeholder:t('Username'),autocomplete:'off'}),newPassword=passwordControl(),newRole=el('select',{},['cashier','manager','admin'].map(v=>el('option',{value:v,text:t(v)}))),userRows=el('tbody');
  const refreshUsers=async()=>{const list=await api.get('/auth/users');const rows=[];
    for(const u of list){
      const username=el('input',{value:u.username,autocomplete:'off',style:'min-width:140px'}),role=el('select',{},['cashier','manager','admin'].map(v=>el('option',{value:v,text:t(v),selected:u.role===v?'selected':null}))),resetPassword=passwordControl(t('New password (optional)'));
      const saveUser=async()=>{try{await api.put(`/auth/users/${u.id}`,{username:username.value,role:role.value,password:resetPassword.input.value});if(u.id===state.user.id){state.user.username=username.value;state.user.role=role.value;const name=document.getElementById('user-name');if(name)name.textContent=username.value;}resetPassword.input.value='';toast(t('User updated'));await refreshUsers();if(u.id===state.user.id&&!['admin','manager'].includes(role.value))setTimeout(()=>location.reload(),400);}catch(e){toast(e.message,'error');}};
      rows.push(el('tr',{},[
        el('td',{text:String(u.id)}),
        el('td',{},[username]),
        el('td',{},[role]),
        el('td',{},[el('div.muted',{text:t('••••••••  Encrypted')}),resetPassword.wrap]),
        el('td',{text:fmtDate(u.created_at)||u.created_at||'-'}),
        el('td',{},[el('button.btn.btn-primary',{type:'button',text:t('Save / Reset'),onclick:saveUser})])
      ]));
    }
    userRows.replaceChildren(...(rows.length?rows:[el('tr',{},[el('td',{colspan:'6',class:'muted',text:t('No users found')})])]));
  };
  const createUser=async()=>{try{await api.post('/auth/users',{username:newUsername.value,password:newPassword.input.value,role:newRole.value});newUsername.value='';newPassword.input.value='';toast(t('User created'));await refreshUsers();}catch(e){toast(e.message,'error');}};
  const users=el('div.card',{},[
    el('h3',{text:t('User Management')}),
    el('p.muted',{text:t('Admin and Manager can view every user account and update username, role, or reset its password. Existing passwords cannot be displayed because they are securely hashed.')}),
    el('div',{style:'display:grid;grid-template-columns:minmax(150px,1fr) minmax(230px,1.4fr) minmax(130px,.7fr) auto;gap:10px;align-items:center;margin:14px 0'},[newUsername,newPassword.wrap,newRole,el('button.btn.btn-primary',{type:'button',text:t('Create User'),onclick:createUser})]),
    el('div.table-wrap',{},[el('table',{},[
      el('thead',{},[el('tr',{},['ID',t('Username'),t('Role'),t('Password / Reset'),t('Created'),t('Actions')].map(h=>el('th',{text:h})))]),
      userRows
    ])])
  ]);
  await refreshUsers();

  const restoreFile=el('input',{type:'file',accept:'.zip,application/zip,.json,application/json'});const restore=async()=>{const file=restoreFile.files?.[0];if(!file)return toast(t('Select a backup file'),'error');if(!confirm(t('Restore this backup and replace the current data and uploaded files?')))return;try{if(file.name.toLowerCase().endsWith('.zip')){const fd=new FormData();fd.append('backup',file);await api.upload('/backup/import-full',fd);}else{const data=JSON.parse(await file.text());await api.post('/backup/import',data);}toast(t('Full backup restored'));setTimeout(()=>location.reload(),700);}catch(e){toast(e.message,'error');}};
  const backup=el('div.card',{},[el('h3',{text:t('Full Backup & Restore')}),el('p',{text:t('Includes all database data, product images and supplier invoice attachments.')}),el('button.btn.btn-green',{text:t('Download Full ZIP Backup'),onclick:async()=>{const r=await api.raw('/backup/export-full');if(!r.ok)return toast(t('Backup download failed'),'error');const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`boudi-cafe-full-backup-${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}),restoreFile,el('button.btn.btn-blue',{text:t('Restore Full Backup'),onclick:restore})]);
  const current=el('input',{type:'password',placeholder:t('Current Password'),'aria-label':t('Current Password')}),next=el('input',{type:'password',placeholder:t('New Password'),'aria-label':t('New Password')});const security=el('div.card',{},[el('h3',{text:t('Security')}),current,next,el('button.btn.btn-blue',{text:t('Change password'),onclick:async()=>{try{await api.post('/auth/change-password',{currentPassword:current.value,newPassword:next.value});toast(t('Password changed'));}catch(e){toast(e.message,'error');}}})]);
  const resetInput=el('input',{placeholder:t('Type FACTORY RESET')}),reset=el('div.card.danger-zone',{},[el('h3',{text:t('Factory Reset')}),el('p',{text:t('Deletes all sales, debts, shifts, expenses, stock history and supplier invoices. Products remain with stock set to zero.')}),resetInput,el('button.btn.btn-danger',{text:t('Factory Reset'),onclick:async()=>{if(resetInput.value!=='FACTORY RESET')return toast(t('Type FACTORY RESET'),'error');if(!confirm(t('This cannot be undone. Continue?')))return;try{await api.post('/backup/factory-reset',{confirm:resetInput.value});toast(t('Factory reset complete'));}catch(e){toast(e.message,'error');}}})]);
  root.append(general,users,security,backup,reset);
}
