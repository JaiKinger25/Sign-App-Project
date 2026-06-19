import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
export default function Login(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const nav=useNavigate();
  async function submit(e){e.preventDefault(); try{const r=await api.post('/api/auth/login',{email,password}); localStorage.setItem('token',r.data.access_token); localStorage.setItem('user',JSON.stringify(r.data.user)); nav('/');}catch(err){alert(err.response?.data?.detail || 'Login failed')}}
  return <div className="card small"><h2>Login</h2><form onSubmit={submit}><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button>Login</button></form><p>No account? <Link to="/register">Register</Link></p></div>
}
