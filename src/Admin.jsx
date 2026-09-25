import { useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function Admin() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const generateMatches = async () => {
    setLoading(true);
    setStatus('Fankaaron ko ikattha kiya jaa raha hai...');

    try {
      // 1. Saare contestants ko database se lana
      const { data: contestants, error: fetchError } = await supabase
        .from('contestants')
        .select('*');

      if (fetchError) throw fetchError;

      if (contestants.length < 2) {
        setStatus('Match banane ke liye kam se kam 2 fankaar chahiye!');
        setLoading(false);
        return;
      }

      // 2. Random Shuffle (Parchi system)
      const shuffled = [...contestants].sort(() => Math.random() - 0.5);
      
      const newBattles = [];
      
      // 3. 2-2 ke jode (pairs) banana
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          // Normal Battle (A vs B)
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            singer_b: shuffled[i+1].name,
            audio_b: shuffled[i+1].audio_url
          });
        } else {
          // Odd One Out (Wildcard)
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            singer_b: "Wildcard Entry (Bina lade aage)",
            audio_b: "" 
          });
        }
      }

      setStatus('Purani mehfil ki safai ho rahi hai...');
      // 4. Purani battles ko clear karna (Naye round ke liye)
      const { error: deleteError } = await supabase
        .from('battles')
        .delete()
        .neq('id', 0); // Sab kuch delete karne ki trick

      if (deleteError) throw deleteError;

      setStatus('Naye matches set kiye jaa rahe hain...');
      // 5. Naye matches ko battles table mein dalna
      const { error: insertError } = await supabase
        .from('battles')
        .insert(newBattles);

      if (insertError) throw insertError;

      setStatus(`Mubarak ho! ${newBattles.length} battles safaltapurvak set ho gayi hain.`);
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
      </div>
    </div>
  );
}