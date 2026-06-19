import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import api from '../services/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const PAGE_WIDTH = 800;
const SIG_WIDTH = 190;
const SIG_HEIGHT = 75;

export default function DocumentView(){
 const {id}=useParams();
 const pageWrapRef=useRef(null);
 const pdfCanvasRef=useRef(null);
 const signCanvasRef=useRef(null);
 const drawingRef=useRef(false);
 const pdfDocRef=useRef(null);
 const renderTaskRef=useRef(null);
 const [doc,setDoc]=useState(null);
 const [sigs,setSigs]=useState([]);
 const [logs,setLogs]=useState([]);
 const [pdfData,setPdfData]=useState(null);
 const [numPages,setNumPages]=useState(1);
 const [currentPage,setCurrentPage]=useState(1);
 const [pageSize,setPageSize]=useState({width:PAGE_WIDTH,height:1050});
 const [pdfError,setPdfError]=useState('');
 const [signer,setSigner]=useState(JSON.parse(localStorage.getItem('user')||'{}').name || 'Jai');
 const [pos,setPos]=useState({x:80,y:80});
 const [drag,setDrag]=useState(false);
 const [signatureImage,setSignatureImage]=useState('');
 const [signatureMode,setSignatureMode]=useState('draw');

 async function load(){
   const d=await api.get(`/api/docs/${id}`);
   setDoc(d.data);
   const s=await api.get(`/api/signatures/${id}`);
   setSigs(s.data);
   try{
     const a=await api.get(`/api/audit/${id}`);
     setLogs(a.data);
   }catch{}
 }

 async function loadPdf(){
   try{
     setPdfError('');
     const response = await api.get(`/api/docs/${id}/file`, { responseType: 'arraybuffer' });
     setPdfData(response.data);
   }catch(err){
     setPdfError(err.response?.data?.detail || 'Could not load PDF. Please login again and re-open this document.');
   }
 }

 useEffect(()=>{
   load();
   loadPdf();
 },[id]);

 useEffect(()=>{
   async function renderPdf(){
     if(!pdfData || !pdfCanvasRef.current) return;
     try{
       setPdfError('');
       if(renderTaskRef.current){
         try{ renderTaskRef.current.cancel(); }catch{}
       }
       if(!pdfDocRef.current){
         const task = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
         pdfDocRef.current = await task.promise;
         setNumPages(pdfDocRef.current.numPages);
       }
       const page = await pdfDocRef.current.getPage(currentPage);
       const baseViewport = page.getViewport({scale:1});
       const scale = PAGE_WIDTH / baseViewport.width;
       const viewport = page.getViewport({scale});
       const canvas = pdfCanvasRef.current;
       const ctx = canvas.getContext('2d');
       canvas.width = Math.floor(viewport.width);
       canvas.height = Math.floor(viewport.height);
       canvas.style.width = `${Math.floor(viewport.width)}px`;
       canvas.style.height = `${Math.floor(viewport.height)}px`;
       setPageSize({width:viewport.width,height:viewport.height});
       renderTaskRef.current = page.render({canvasContext:ctx, viewport});
       await renderTaskRef.current.promise;
     }catch(err){
       if(err?.name !== 'RenderingCancelledException'){
         setPdfError('Failed to load PDF file. Try uploading another PDF or send me the console error.');
       }
     }
   }
   renderPdf();
 },[pdfData,currentPage]);

 useEffect(()=>{
   pdfDocRef.current=null;
 },[pdfData]);

 function clamp(value, min, max){ return Math.min(Math.max(value, min), max); }
 function getPointer(e){
   const touch=e.touches?.[0];
   return { clientX: touch?touch.clientX:e.clientX, clientY: touch?touch.clientY:e.clientY };
 }
 function move(e){
   if(!drag || !pageWrapRef.current) return;
   e.preventDefault();
   const rect=pageWrapRef.current.getBoundingClientRect();
   const p=getPointer(e);
   const x=clamp(p.clientX-rect.left-SIG_WIDTH/2, 0, rect.width-SIG_WIDTH);
   const y=clamp(p.clientY-rect.top-SIG_HEIGHT/2, 0, rect.height-SIG_HEIGHT);
   setPos({x,y});
 }
 function canvasPoint(e){
   const canvas=signCanvasRef.current;
   const rect=canvas.getBoundingClientRect();
   const p=getPointer(e);
   return {x:p.clientX-rect.left, y:p.clientY-rect.top};
 }
 function startDraw(e){
   e.preventDefault();
   drawingRef.current=true;
   const canvas=signCanvasRef.current;
   const ctx=canvas.getContext('2d');
   const p=canvasPoint(e);
   ctx.beginPath();
   ctx.moveTo(p.x,p.y);
 }
 function draw(e){
   if(!drawingRef.current) return;
   e.preventDefault();
   const canvas=signCanvasRef.current;
   const ctx=canvas.getContext('2d');
   const p=canvasPoint(e);
   ctx.lineWidth=3;
   ctx.lineCap='round';
   ctx.lineJoin='round';
   ctx.lineTo(p.x,p.y);
   ctx.stroke();
 }
 function stopDraw(){
   if(!drawingRef.current) return;
   drawingRef.current=false;
   setSignatureMode('draw');
   setSignatureImage(signCanvasRef.current.toDataURL('image/png'));
 }
 function clearSignature(){
   const canvas=signCanvasRef.current;
   const ctx=canvas.getContext('2d');
   ctx.clearRect(0,0,canvas.width,canvas.height);
   setSignatureImage('');
   setSignatureMode('draw');
 }
 function useTypedSignature(){
   const canvas=signCanvasRef.current;
   const ctx=canvas.getContext('2d');
   ctx.clearRect(0,0,canvas.width,canvas.height);
   setSignatureImage('');
   setSignatureMode('typed');
   alert('Typed name selected. It will sign using only the signer name.');
 }
 async function saveSig(){
   if(!pageWrapRef.current){ alert('PDF page is still loading. Try again.'); return; }
   const rect=pageWrapRef.current.getBoundingClientRect();
   const xRatio=pos.x/rect.width;
   const yRatio=pos.y/rect.height;
   const dataUrl = signatureMode === 'draw' ? signatureImage : '';
   await api.post('/api/signatures',{doc_id:Number(id), signer_name:signer, x:xRatio, y:yRatio, page:currentPage, signature_image:dataUrl});
   alert('Signature saved at dragged position');
   load();
 }
 async function getSignedBlob(){
   const response = await api.get(`/api/docs/${id}/signed`, { responseType: 'blob' });
   return new Blob([response.data], { type: 'application/pdf' });
 }
 async function openSignedPdf(){
   try{ const blob = await getSignedBlob(); window.open(URL.createObjectURL(blob), '_blank'); }
   catch(err){ alert(err.response?.data?.detail || 'Signed PDF not found. Click Finalize first.'); }
 }
 async function downloadSignedPdf(){
   try{
     const blob = await getSignedBlob();
     const url = URL.createObjectURL(blob);
     const a=document.createElement('a');
     a.href=url; a.download=`signed_${doc?.filename || 'document.pdf'}`;
     document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
   }catch(err){ alert(err.response?.data?.detail || 'Signed PDF not found. Click Finalize first.'); }
 }
 async function finalize(){
   try{ await api.post(`/api/signatures/finalize/${id}`); alert('Signed PDF generated. Now click Download Signed PDF.'); await load(); }
   catch(err){ alert(err.response?.data?.detail || 'Finalize failed'); }
 }
 function savedStyle(s){
   const left = Number(s.x) <= 1 ? `${Number(s.x)*100}%` : `${s.x}px`;
   const top = Number(s.y) <= 1 ? `${Number(s.y)*100}%` : `${s.y}px`;
   return {left, top};
 }
 return <div className="wrap">
   <p><Link to="/">← Back</Link></p>
   <div className="card">
     <h2>{doc?.filename}</h2>
     <p>Status: <b>{doc?.status}</b></p>
     <div className="signaturePanel">
       <div>
         <h3>Draw Your Signature</h3>
         <p className="hint">Draw inside the box using mouse, touchpad, or finger.</p>
         <canvas ref={signCanvasRef} width="420" height="150" className="signatureCanvas" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
         <div className="canvasButtons"><button onClick={clearSignature}>Clear Signature</button><button onClick={useTypedSignature}>Use Typed Name</button></div>
       </div>
       <div>
         <h3>Signer Name</h3>
         <input value={signer} onChange={e=>setSigner(e.target.value)} placeholder="Signer name"/>
         <p className="hint">Select page, drag the preview on the PDF, then save and finalize.</p>
         <div className="pageButtons"><button disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}>Previous Page</button><span>Page {currentPage} / {numPages}</span><button disabled={currentPage>=numPages} onClick={()=>setCurrentPage(p=>p+1)}>Next Page</button></div>
       </div>
     </div>
     <div className="toolbar"><button onClick={saveSig}>Save Signature</button><button onClick={finalize}>Finalize Signed PDF</button><button onClick={openSignedPdf}>Open Signed PDF</button><button onClick={downloadSignedPdf}>Download Signed PDF</button></div>
     <div className="pdfStage">
       {pdfError && <p style={{color:'crimson',fontWeight:'bold'}}>{pdfError}</p>}
       <div className="pdfPageWrap" ref={pageWrapRef} style={{width:pageSize.width,height:pageSize.height}} onMouseMove={move} onMouseUp={()=>setDrag(false)} onMouseLeave={()=>setDrag(false)} onTouchMove={move} onTouchEnd={()=>setDrag(false)}>
          <canvas ref={pdfCanvasRef}/>
          <div className="sigBox" style={{left:pos.x,top:pos.y}} onMouseDown={()=>setDrag(true)} onTouchStart={()=>setDrag(true)}>
            {signatureMode === 'draw' && signatureImage ? <img src={signatureImage} alt="signature preview"/> : <>✍ Signed by<br/><b>{signer}</b></>}
          </div>
          {sigs.filter(s=>Number(s.page)===currentPage).map(s=><div key={s.id} className="savedSig" style={savedStyle(s)}>Saved: {s.signer_name}</div>)}
        </div>
     </div>
   </div>
   <div className="card"><h2>Audit Trail</h2>{logs.length===0?<p>No audit logs.</p>:<ul>{logs.map(l=><li key={l.id}><b>{l.action}</b> — {new Date(l.created_at).toLocaleString()} {l.details?`— ${l.details}`:''}</li>)}</ul>}</div>
 </div>;
}
