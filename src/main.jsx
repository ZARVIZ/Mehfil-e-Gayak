import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import App from './App.jsx'
import Register from './Register.jsx'
import Admin from './Admin.jsx'
import HallOfFame from './HallOfFame.jsx'
import heroLogo from './assets/hero.png'
import './index.css'
import './App.css'

const navBarStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#5c1522',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  fontFamily: 'Playfair Display, serif'
};

const linkStyle = ({ isActive }) => ({
  color: isActive ? '#5c1522' : '#fdfbf7',
  backgroundColor: isActive ? '#fdfbf7' : 'transparent',
  textDecoration: 'none',
  padding: '6px 12px',
  borderRadius: '20px',
  fontWeight: 'bold',
  fontSize: '0.82rem',
  border: '1px solid #fdfbf7',
  transition: 'all 0.25s ease',
  whiteSpace: 'nowrap'
});

const footerStyle = {
  width: '100%',
  textAlign: 'center',
  padding: '14px 10px',
  backgroundColor: '#5c1522',
  color: '#fdfbf7',
  fontFamily: 'Playfair Display, serif',
  fontSize: '0.95rem',
  letterSpacing: '0.5px',
  borderTop: '2px solid #d4af37',
  boxShadow: '0 -4px 12px rgba(0,0,0,0.12)',
  marginTop: 'auto'
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
        {/* Top Menu Bar */}
        <nav style={navBarStyle}>
          <img src={heroLogo} alt="Mic" style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #ffd700', objectFit: 'cover' }} />
          <NavLink to="/" style={linkStyle}>🎤 Battles</NavLink>
          <NavLink to="/register" style={linkStyle}>📝 Register</NavLink>
          <NavLink to="/winners" style={linkStyle}>🏆 Sartaaj</NavLink>
          <NavLink to="/admin" style={linkStyle}>⚙️ Admin</NavLink>
        </nav>

        {/* Main Page Content */}
        <div style={{ width: '100%', flex: 1 }}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/register" element={<Register />} />
            <Route path="/winners" element={<HallOfFame />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>

        {/* Global Royal Footer */}
        <footer style={footerStyle}>
          Made with Love by <strong style={{ color: '#ffd700' }}>Paneer</strong> ❤️
        </footer>
      </div>
    </BrowserRouter>
  </React.StrictMode>,
)

// Service Worker Registration for PWA Install Prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered successfully!', reg))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}