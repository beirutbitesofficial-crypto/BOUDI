import {t} from './i18n.js?v=20260912-mobile';
import {el,modal,toast} from './ui.js?v=20260912-mobile';

export function normalizeBarcode(value){
  return String(value||'').trim().replace(/\s+/g,'');
}

export function attachHardwareBarcodeScanner(onScan,{isActive=()=>true,minLength=3}={}){
  let buffer='',last=0;
  const handler=e=>{
    if(!isActive()||e.ctrlKey||e.metaKey||e.altKey)return;
    const active=document.activeElement;
    const tag=active?.tagName;
    const editable=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||active?.isContentEditable;
    if(editable&&active?.dataset?.barcodeInput!=='1')return;
    const now=Date.now();
    if(e.key==='Enter'){
      const code=normalizeBarcode(buffer);
      buffer='';last=0;
      if(code.length>=minLength){e.preventDefault();onScan(code,'hardware');}
      return;
    }
    if(e.key.length!==1)return;
    if(last&&now-last>120)buffer='';
    buffer+=e.key;
    last=now;
    if(buffer.length>128)buffer=buffer.slice(-128);
  };
  document.addEventListener('keydown',handler,true);
  return()=>document.removeEventListener('keydown',handler,true);
}

let html5Loader=null;

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    script.onload=()=>window.Html5Qrcode?resolve():reject(new Error(t('Scanner library did not initialize')));
    script.onerror=()=>reject(new Error(t('Scanner library could not be loaded')));
    document.head.appendChild(script);
  });
}

async function loadHtml5Qrcode(){
  if(window.Html5Qrcode)return;
  if(!html5Loader){
    html5Loader=(async()=>{
      try{
        await loadScript('/vendor/html5-qrcode.min.js?v=2.3.8-boudi2');
      }catch(localError){
        await loadScript('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js');
      }
    })().catch(error=>{html5Loader=null;throw error;});
  }
  return html5Loader;
}

function cameraErrorMessage(error){
  const name=String(error?.name||'');
  const message=String(error?.message||error||'');
  if(!window.isSecureContext)return t('Phone camera requires HTTPS. Open BOUDI CAFE using the https:// address.');
  if(name==='NotAllowedError'||/permission|denied/i.test(message))return t('Camera permission is blocked. Allow Camera for this website in your browser settings, then tap Retry Camera.');
  if(name==='NotFoundError'||/not found|no camera/i.test(message))return t('No camera was found on this device.');
  if(name==='NotReadableError'||/could not start|in use|track start/i.test(message))return t('The camera is busy in another app. Close the other camera app and try again.');
  return t('Could not start the camera. Tap Retry Camera or use Take Photo.');
}

function preferredCamera(cameras){
  if(!Array.isArray(cameras)||!cameras.length)return null;
  const rear=cameras.find(c=>/(back|rear|environment|world)/i.test(c.label||''));
  return rear||cameras[cameras.length-1];
}

export async function openBarcodeCamera({title=t('Scan Barcode'),onScan,continuous=false}={}){
  try{
    await loadHtml5Qrcode();
  }catch(e){
    toast(t('Phone scanner could not load. Refresh the page and try again.'),'error');
    return null;
  }

  const id=`barcode-reader-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const reader=el('div',{
    id,
    style:'width:100%;min-height:260px;background:#05070b;border-radius:14px;overflow:hidden'
  });
  const status=el('div',{
    text:t('Opening back camera…'),
    style:'margin-top:10px;color:var(--muted);font-weight:700;line-height:1.45'
  });
  const retryBtn=el('button.btn.btn-blue',{type:'button',text:t('↻ Retry Camera')});
  const photoBtn=el('button.btn.btn-ghost',{type:'button',text:t('📷 Take Photo')});
  const closeBtn=el('button.btn.btn-ghost',{type:'button',text:t('Close')});
  const fileInput=el('input',{type:'file',accept:'image/*',capture:'environment',style:'display:none'});
  const body=el('div',{},[reader,status,fileInput]);
  const m=modal({title,wide:true,body,footer:[photoBtn,retryBtn,closeBtn]});

  const formats=window.Html5QrcodeSupportedFormats?[
    window.Html5QrcodeSupportedFormats.EAN_13,
    window.Html5QrcodeSupportedFormats.EAN_8,
    window.Html5QrcodeSupportedFormats.UPC_A,
    window.Html5QrcodeSupportedFormats.UPC_E,
    window.Html5QrcodeSupportedFormats.CODE_128,
    window.Html5QrcodeSupportedFormats.CODE_39,
    window.Html5QrcodeSupportedFormats.QR_CODE
  ].filter(v=>v!==undefined):undefined;

  const scanner=new window.Html5Qrcode(
    id,
    formats?{formatsToSupport:formats,verbose:false}:{verbose:false}
  );

  let stopped=false;
  let running=false;
  let delivering=false;
  let lastCode='';
  let lastAt=0;

  const deliver=async decoded=>{
    // Camera libraries can report more than one frame before stop() completes.
    // Only let one decoded value reach the POS at a time.
    if(delivering||stopped)return false;
    const code=normalizeBarcode(decoded);
    const now=Date.now();
    if(!code||(code===lastCode&&now-lastAt<1200))return true;
    delivering=true;
    lastCode=code;lastAt=now;
    status.textContent=t('Scanned: {code}',{code});
    navigator.vibrate?.(70);
    try{
      const keep=await onScan?.(code,'camera');
      if(!continuous||keep===false){
        await halt(true);
        return false;
      }
      return true;
    }finally{
      if(!stopped)delivering=false;
    }
  };

  const halt=async(remove=true)=>{
    if(stopped)return;
    stopped=true;
    if(running){
      try{await scanner.stop();}catch{}
      running=false;
    }
    try{await scanner.clear();}catch{}
    if(remove)m.close();
  };

  const startCamera=async()=>{
    if(stopped)return;
    retryBtn.disabled=true;
    status.textContent=t('Requesting camera permission…');
    try{
      if(!window.isSecureContext)throw new Error('HTTPS secure context required');
      if(!navigator.mediaDevices?.getUserMedia)throw new Error(t('Camera API is unavailable in this browser'));

      let cameras=[];
      try{cameras=await window.Html5Qrcode.getCameras();}catch(e){throw e;}
      const preferred=preferredCamera(cameras);
      if(!preferred)throw new Error(t('No camera found'));

      if(running){
        try{await scanner.stop();}catch{}
        running=false;
      }

      status.textContent=t('Point the back camera at the barcode');
      await scanner.start(
        preferred.id,
        {fps:12,qrbox:{width:250,height:130},disableFlip:true},
        decoded=>void deliver(decoded),
        ()=>{}
      );
      running=true;
      retryBtn.textContent=t('↻ Restart Camera');
    }catch(e){
      status.textContent=cameraErrorMessage(e);
      toast(status.textContent,'error');
    }finally{
      retryBtn.disabled=false;
    }
  };

  retryBtn.onclick=()=>void startCamera();
  photoBtn.onclick=()=>fileInput.click();
  fileInput.onchange=async()=>{
    const file=fileInput.files?.[0];
    if(!file)return;
    try{
      if(running){
        try{await scanner.stop();}catch{}
        running=false;
      }
      status.textContent=t('Reading barcode from photo…');
      const decoded=await scanner.scanFile(file,true);
      await deliver(decoded);
      if(continuous&&!stopped){
        fileInput.value='';
        await startCamera();
      }
    }catch(e){
      status.textContent=t('Barcode not detected in the photo. Try again with the barcode filling most of the frame.');
      toast(status.textContent,'error');
      fileInput.value='';
    }
  };

  closeBtn.onclick=()=>void halt(true);
  m.overlay.querySelector('.modal-close')?.addEventListener('click',()=>void halt(false));
  m.overlay.addEventListener('click',e=>{if(e.target===m.overlay)void halt(false);});

  await startCamera();
  return{close:()=>halt(true)};
}
