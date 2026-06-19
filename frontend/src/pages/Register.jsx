import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
export default function Register(){
  const [name,setName]=useState('Jai'); const [email,setEmail]=useState('jai@gmail.com'); const [password,setPassword]=useState('1234'); const nav=useNavigate();
  async function submit(e){e.preventDefault(); try{await api.post('/api/auth/register',{name,email,password}); alert('Registration successful'); nav('/login');}catch(err){alert(err.response?.data?.detail || 'Registration failed')}}
  return <div className="card small"><h2>Create Account</h2><form onSubmit={submit}><input placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button>Register</button></form><p>Already registered? <Link to="/login">Login</Link></p></div>
}
