import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function Admin() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [battles, setBattles] = useState([]);

  const fetchResults = async () => {
    const { data, error } = await supabase
      .from('battles')
      .select('*')
      .order('id', { ascending: true });
    if (!error && data) {
      setBattles(data);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const generateMatches = async () => {
    setLoading(true);
    setStatus('Fankaaron ko ikattha kiya jaa raha hai...');

    try {
      const { data: contestants, error: fetchError } = await supabase
        .from('contestants')
        .select('*');

      if (fetchError) throw fetchError;

      if (contestants.length < 2) {
        setStatus('Match banane ke liye kam se kam 2 fankaar chahiye!');
        setLoading(false);
        return;
      }

      const shuffled = [...contestants].sort(() => Math.random() - 0.5);
      const newBattles = [];
      
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            singer_b: shuffled[i+1].name,
            audio_b: shuffled[i+1].audio_url,
            votes_a: 0,
            votes_b: 0
          });
        } else {
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            singer_b: "Wildcard Entry",
            audio_b: "",
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
      fetchResults();
    } catch (error) {
      setStatus(`Kuch gadbad hui: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mehfil-container">
      <h1>Control Room</h1>
      <p className="subtitle">Sirf Admin Ke Liye</p>

      <div className="battle-arena-vertical" style={{ padding: '30px' }}>
        <button 
          className="vote-btn" 
          onClick={generateMatches} 
          disabled={loading}
          style={{ backgroundColor: '#2c3e50', padding: '15px', fontSize: '1.1rem' }}
        >
          {loading ? 'Match Ban Rahe Hain...' : 'Generate Matches (Random Shuffle)'}
        </button>
        
        {status && (
          <p style={{ marginTop: '20px', color: '#6a1b29', fontWeight: 'bold', fontStyle: 'italic' }}>
            {status}
          </p>
        )}

        <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #d4c4a8' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontFamily: 'Playfair Display', color: '#5c1522', margin: 0 }}>Live Natije (Scoreboard)</h2>
          <button className="small-btn" onClick={fetchResults}>Refresh Votes 🔄</button>
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