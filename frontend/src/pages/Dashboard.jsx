import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
export default function Dashboard(){
 const [docs,setDocs]=useState([]); const [file,setFile]=useState(null); const user=JSON.parse(localStorage.getItem('user')||'{}');
 async function load(){const r=await api.get('/api/docs'); setDocs(r.data)}
 useEffect(()=>{load()},[]);
 async function upload(e){e.preventDefault(); if(!file) return alert('Select a PDF'); const fd=new FormData(); fd.append('file',file); await api.post('/api/docs/upload',fd); setFile(null); load();}
 return <div className="wrap"><div className="hero"><h1>Hello {user.name || 'Jai'} 👋</h1><p>Upload PDFs, place signatures, finalize signed PDF, and view audit logs.</p></div><div className="card"><h2>Upload PDF</h2><form className="upload" onSubmit={upload}><input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])}/><button>Upload</button></form></div><div className="card"><h2>Your Documents</h2>{docs.length===0?<p>No documents uploaded yet.</p>:<table><thead><tr><th>File</th><th>Status</th><th>Action</th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td>{d.filename}</td><td><span className={d.status==='Signed'?'ok':'pending'}>{d.status}</span></td><td><Link to={`/docs/${d.id}`}>Open</Link>{d.status==='Signed' && <> | <a href={`http://127.0.0.1:8000/api/docs/${d.id}/signed`} target="_blank">Signed PDF</a></>}</td></tr>)}</tbody></table>}</div></div>
}
