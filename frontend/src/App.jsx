import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocumentView from './pages/DocumentView.jsx';

function Nav(){
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  return <div className="nav"><Link to="/" className="brand">📄 Document Signature App</Link>{token && <button onClick={()=>{localStorage.clear(); navigate('/login')}}>Logout</button>}</div>
}
function Protected({children}){return localStorage.getItem('token') ? children : <Navigate to="/login" />}
export default function App(){
  return <><Nav/><Routes><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/" element={<Protected><Dashboard/></Protected>}/><Route path="/docs/:id" element={<Protected><DocumentView/></Protected>}/></Routes></>
}
