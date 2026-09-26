import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // YAHAN APNA SECRET PASSWORD SET KAREIN:
  const SECRET_PASS = "mehfil2026";

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [contestants, setContestants] = useState([]);
  const [battles, setBattles] = useState([]);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('mehfil_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      fetchAllData();
    }
  }, []);

  const fetchAllData = async () => {
    // 1. Saare Contestants lana
    const { data: cData } = await supabase
      .from('contestants')
      .select('*')
      .order('id', { ascending: true });
    if (cData) setContestants(cData);

    // 2. Saare Battles lana
    const { data: bData } = await supabase
      .from('battles')
      .select('*')
      .order('id', { ascending: true });
    if (bData) setBattles(bData);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === SECRET_PASS) {
      setIsAuthenticated(true);
      sessionStorage.setItem('mehfil_admin_auth', 'true');
      setAuthError('');
      fetchAllData();
    } else {
      setAuthError('Galat Password! Sirf Admin ko ijazat hai.');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mehfil_admin_auth');
  };

  // Fake ya Invalid Contestant ko Remove karne ka function
  const handleRemoveContestant = async (id, name) => {
    const confirmDelete = window.confirm(`Kya aap sach mein "${name}" ki entry delete karna chahte hain?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('contestants')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Delete karne mein dikkat aayi: ${error.message}`);
    } else {
      setContestants(contestants.filter(c => c.id !== id));
    }
  };

  const generateMatches = async () => {
    const confirmGen = window.confirm("Kya aap sach mein naye matches banana chahte hain? Purane matches aur votes mit jayenge!");
    if (!confirmGen) return;

    setLoading(true);
    setStatus('Fankaaron ko ikattha kiya jaa raha hai...');

    try {
      const { data: currentContestants, error: fetchError } = await supabase
        .from('contestants')
        .select('*');

      if (fetchError) throw fetchError;

      if (currentContestants.length < 2) {
        setStatus('Match banane ke liye kam se kam 2 valid fankaar chahiye!');
        setLoading(false);
        return;
      }

      const shuffled = [...currentContestants].sort(() => Math.random() - 0.5);
      const newBattles = [];
      
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            dp_a: shuffled[i].dp_url,
            singer_b: shuffled[i+1].name,
            audio_b: shuffled[i+1].audio_url,
            dp_b: shuffled[i+1].dp_url,
            votes_a: 0,
            votes_b: 0
          });
        } else {
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            dp_a: shuffled[i].dp_url,
            singer_b: "Wildcard Entry",
            audio_b: "",
            dp_b: `https://ui-avatars.com/api/?name=WC&background=6a1b29&color=fff&size=200`,
            votes_a: 0,
            votes_b: 0
          });
        }
      }

      setStatus('Purani mehfil ki safai ho rahi hai...');
      const { error: deleteError } = await supabase
        .from('battles')
        .delete()
        .neq('id', 0);

      if (deleteError) throw deleteError;

      setStatus('Naye matches set kiye jaa rahe hain...');
      const { error: insertError } = await supabase
        .from('battles')
        .insert(newBattles);

      if (insertError) throw insertError;

      setStatus(`Mubarak ho! ${newBattles.length} battles safaltapurvak set ho gayi hain.`);
      fetchAllData();
    } catch (error) {
      setStatus(`Kuch gadbad hui: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mehfil-container">
        <h1>Khufiya Darwaza</h1>
        <p className="subtitle">Control Room mein jane ke liye password darj karein</p>

        <div className="battle-arena-vertical" style={{ padding: '30px', maxWidth: '400px', margin: '0 auto' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder="Secret Password..." 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{
                padding: '12px 15px',
                borderRadius: '8px',
                border: '1px solid #d4c4a8',
                fontSize: '1rem',
                textAlign: 'center',
                outline: 'none'
              }}
              required
            />
            <button type="submit" className="vote-btn" style={{ padding: '12px' }}>
              Darwaza Kholein 🔓
            </button>
          </form>

          {authError && (
            <p style={{ marginTop: '15px', color: '#a91d22', fontWeight: 'bold', fontStyle: 'italic' }}>
              {authError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mehfil-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.85rem', color: '#27ae60', fontWeight: 'bold' }}>● Admin Unlocked</span>
        <button className="small-btn" onClick={handleLogout} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
          Lock Room 🔒
        </button>
      </div>

      <h1>Control Room</h1>
      <p className="subtitle">Entries Manage Karein aur Matches Banayein</p>

      <div className="battle-arena-vertical" style={{ padding: '25px' }}>
        
        {/* SECTION 1: CONTESTANT MANAGEMENT (FAKE ENTRIES HATANE KE LIYE) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontFamily: 'Playfair Display', color: '#5c1522', margin: 0 }}>
            Registered Fankaar ({contestants.length})
          </h2>
          <button className="small-btn" onClick={fetchAllData}>Refresh 🔄</button>
        </div>

        {contestants.length === 0 ? (
          <p style={{ color: '#777', fontStyle: 'italic' }}>Abhi tak kisi ne register nahi kiya hai.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px', marginBottom: '25px' }}>
            {contestants.map((c) => {
              const fallbackDp = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=5c1522&color=fff&size=100`;
              return (
                <div key={c.id} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#fdfbf7', border: '1px solid #e2d5be', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  
                  {/* DP aur Naam */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                    <img 
                      src={c.dp_url || fallbackDp} 
                      onError={(e) => { e.target.onerror = null; e.target.src = fallbackDp; }}
                      alt={c.name} 
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #5c1522' }} 
                    />
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ color: '#2c3e50', fontSize: '1.05rem', display: 'block' }}>{c.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{c.contact}</span>
                    </div>
                  </div>

                  {/* Audio Check Karne ke liye Mini Player */}
                  <audio controls src={c.audio_url} style={{ height: '32px', maxWidth: '220px' }}></audio>

                  {/* Remove Button */}
                  <button 
                    onClick={() => handleRemoveContestant(c.id, c.name)}
                    style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    Remove 🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 2: GENERATE MATCHES BUTTON */}
        <button 
          className="vote-btn" 
          onClick={generateMatches} 
          disabled={loading}
          style={{ backgroundColor: '#2c3e50', padding: '15px', fontSize: '1.1rem', width: '100%' }}
        >
          {loading ? 'Match Ban Rahe Hain...' : 'Generate Matches (Random Shuffle)'}
        </button>
        
        {status && (
          <p style={{ marginTop: '15px', color: '#6a1b29', fontWeight: 'bold', fontStyle: 'italic' }}>
            {status}
          </p>
        )}

        <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #d4c4a8' }} />

        {/* SECTION 3: LIVE SCOREBOARD */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontFamily: 'Playfair Display', color: '#5c1522', margin: 0 }}>Live Natije (Scoreboard)</h2>
        </div>

        {battles.length === 0 ? (
          <p style={{ color: '#777', fontStyle: 'italic' }}>Abhi koi match chalu nahi hai.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {battles.map((b, index) => (
              <div key={b.id} style={{ padding: '15px', borderRadius: '10px', backgroundColor: '#fdfbf7', border: '1px solid #e2d5be', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Muqabla #{index + 1}</span>
                  <strong style={{ color: '#2c3e50', fontSize: '1.1rem' }}>{b.singer_a}</strong> 
                  <span style={{ margin: '0 10px', color: '#999', fontWeight: 'bold' }}>VS</span> 
                  <strong style={{ color: '#6a1b29', fontSize: '1.1rem' }}>{b.singer_b}</strong>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#efe8d8', padding: '8px 15px', borderRadius: '8px' }}>
                  <span style={{ color: '#2c3e50' }}>{b.votes_a || 0}</span>
                  <span style={{ margin: '0 8px', color: '#999' }}>-</span>
                  <span style={{ color: '#6a1b29' }}>{b.votes_b || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}