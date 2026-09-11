import {el,modal,toast} from './ui.js';

export function normalizeBarcode(value){return String(value||'').trim().replace(/\s+/g,'');}

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
function loadHtml5Qrcode(){
  if(window.Html5Qrcode)return Promise.resolve();
  if(html5Loader)return html5Loader;
  html5Loader=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async=true;
    script.onload=()=>window.Html5Qrcode?resolve():reject(new Error('Scanner library did not load'));
    script.onerror=()=>reject(new Error('Could not load phone scanner library'));
    document.head.appendChild(script);
  });
  return html5Loader;
}

async function openHtml5BarcodeCamera({title,onScan,continuous}){
  try{await loadHtml5Qrcode();}catch(e){toast(e.message,'error');return null;}
  const id=`barcode-reader-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const reader=el('div',{id,style:'width:100%;min-height:260px;background:#05070b;border-radius:14px;overflow:hidden'}),status=el('div',{text:'Point the camera at the barcode',style:'margin-top:10px;color:var(--muted);font-weight:700'}),closeBtn=el('button.btn.btn-ghost',{text:'Close'});
  const m=modal({title,wide:true,body:el('div',{},[reader,status]),footer:closeBtn});
  const formats=window.Html5QrcodeSupportedFormats?[window.Html5QrcodeSupportedFormats.EAN_13,window.Html5QrcodeSupportedFormats.EAN_8,window.Html5QrcodeSupportedFormats.UPC_A,window.Html5QrcodeSupportedFormats.UPC_E,window.Html5QrcodeSupportedFormats.CODE_128,window.Html5QrcodeSupportedFormats.CODE_39,window.Html5QrcodeSupportedFormats.QR_CODE]:undefined;
  const scanner=new window.Html5Qrcode(id,formats?{formatsToSupport:formats,verbose:false}:{verbose:false});
  let stopped=false,lastCode='',lastAt=0;
  const halt=async(remove=true)=>{if(stopped)return;stopped=true;try{await scanner.stop();}catch{}try{await scanner.clear();}catch{}if(remove)m.close();};
  closeBtn.onclick=()=>void halt(true);
  m.overlay.querySelector('.modal-close')?.addEventListener('click',()=>void halt(false));
  m.overlay.addEventListener('click',e=>{if(e.target===m.overlay)void halt(false);});
  try{
    await scanner.start({facingMode:'environment'},{fps:12,qrbox:{width:280,height:160},aspectRatio:1.777},async decoded=>{
      const code=normalizeBarcode(decoded),now=Date.now();
      if(!code||(code===lastCode&&now-lastAt<1200))return;
      lastCode=code;lastAt=now;status.textContent=`Scanned: ${code}`;navigator.vibrate?.(70);
      const keep=await onScan?.(code,'camera');
      if(!continuous||keep===false)void halt(true);
    },()=>{});
  }catch(e){await halt(true);toast('Camera permission is required to scan barcodes','error');return null;}
  return{close:()=>halt(true)};
}

export async function openBarcodeCamera({title='Scan Barcode',onScan,continuous=false}={}){
  if(!navigator.mediaDevices?.getUserMedia){toast('Camera access is not available on this device','error');return null;}
  if(!('BarcodeDetector' in window))return openHtml5BarcodeCamera({title,onScan,continuous});
  let detector;
  try{
    const supported=typeof BarcodeDetector.getSupportedFormats==='function'?await BarcodeDetector.getSupportedFormats().catch(()=>[]):[];
    const wanted=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'].filter(x=>!supported.length||supported.includes(x));
    detector=new BarcodeDetector(wanted.length?{formats:wanted}:undefined);
  }catch(e){return openHtml5BarcodeCamera({title,onScan,continuous});}
  const video=el('video',{autoplay:'',playsinline:'',muted:'',style:'width:100%;max-height:58vh;background:#05070b;border-radius:14px;object-fit:cover'}),status=el('div',{text:'Point the camera at the barcode',style:'margin-top:10px;color:var(--muted);font-weight:700'}),closeBtn=el('button.btn.btn-ghost',{text:'Close'});
  const m=modal({title,wide:true,body:el('div',{},[video,status]),footer:closeBtn});
  let stream=null,stopped=false,lastCode='',lastAt=0,raf=0;
  const stop=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(t=>t.stop());m.close();};
  closeBtn.onclick=stop;
  m.overlay.querySelector('.modal-close')?.addEventListener('click',()=>{if(stream)stream.getTracks().forEach(t=>t.stop());stopped=true;cancelAnimationFrame(raf);});
  m.overlay.addEventListener('click',e=>{if(e.target===m.overlay){if(stream)stream.getTracks().forEach(t=>t.stop());stopped=true;cancelAnimationFrame(raf);}});
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=stream;
    await video.play();
  }catch(e){stop();toast('Camera permission is required to scan barcodes','error');return null;}
  const loop=async()=>{
    if(stopped)return;
    try{
      const results=await detector.detect(video);
      const hit=results.find(x=>normalizeBarcode(x.rawValue));
      if(hit){
        const code=normalizeBarcode(hit.rawValue),now=Date.now();
        if(code&&(code!==lastCode||now-lastAt>1200)){
          lastCode=code;lastAt=now;status.textContent=`Scanned: ${code}`;navigator.vibrate?.(70);
          const keep=await onScan?.(code,'camera');
          if(!continuous||keep===false){stop();return;}
        }
      }
    }catch{}
    raf=requestAnimationFrame(loop);
  };
  raf=requestAnimationFrame(loop);
  return{close:stop};
}
