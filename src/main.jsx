import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import App from './App.jsx'
import Register from './Register.jsx'
import Admin from './admin.jsx'

const navBarStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '15px',
  padding: '15px 20px',
  backgroundColor: '#5c1522',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  fontFamily: 'Playfair Display, serif'
};

const linkStyle = ({ isActive }) => ({
  color: isActive ? '#5c1522' : '#fdfbf7',
  backgroundColor: isActive ? '#fdfbf7' : 'transparent',
  textDecoration: 'none',
  padding: '8px 18px',
  borderRadius: '25px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
  border: '1px solid #fdfbf7',
  transition: 'all 0.3s ease'
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Top Menu Bar */}
      <nav style={navBarStyle}>
        <NavLink to="/" style={linkStyle}>🎤 Vote (Mehfil)</NavLink>
        <NavLink to="/register" style={linkStyle}>📝 Registration</NavLink>
        <NavLink to="/admin" style={linkStyle}>⚙️ Admin</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)