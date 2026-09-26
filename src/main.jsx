import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import App from './App.jsx'
import Register from './Register.jsx'
import Admin from './Admin.jsx'
import './index.css'
import './App.css'

const pageWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '100vw',
  minHeight: '100vh',
  margin: 0,
  padding: 0,
  overflowX: 'hidden'
};

const navBarStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 10px',
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
  padding: '8px 14px',
  borderRadius: '25px',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  border: '1px solid #fdfbf7',
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap'
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <div style={pageWrapperStyle}>
        {/* Top Menu Bar */}
        <nav style={navBarStyle}>
          <NavLink to="/" style={linkStyle}>🎤 Vote</NavLink>
          <NavLink to="/register" style={linkStyle}>📝 Register</NavLink>
          <NavLink to="/admin" style={linkStyle}>⚙️ Admin</NavLink>
        </nav>

        {/* Main Page Content */}
        <div style={{ width: '100%', flex: 1 }}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  </React.StrictMode>,
)