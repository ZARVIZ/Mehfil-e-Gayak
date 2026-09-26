import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const SECRET_PASS = "mehfil2026";

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState('Round 1');
  const [contestants, setContestants] = useState([]);
  const [battles, setBattles] = useState([]);
  const [voteRequests, setVoteRequests] = useState([]);

  // Hall of Fame Inputs
  const [seasonTitle, setSeasonTitle] = useState('Mehfil Season 1');
  const [winnerName, setWinnerName] = useState('');
  const [winnerInsta, setWinnerInsta] = useState('');
  const [runnerName, setRunnerName] = useState('');
  const [runnerInsta, setRunnerInsta] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('mehfil_admin_auth') === 'true') {
      setIsAuthenticated(true);
      fetchAllData();
    }
  }, []);

  const fetchAllData = async () => {
    const { data: cData } = await supabase.from('contestants').select('*').order('id', { ascending: true });
    if (cData) setContestants(cData);

    const { data: bData } = await supabase.from('battles').select('*').order('id', { ascending: true });
    if (bData) setBattles(bData);

    const { data: rData } = await supabase.from('vote_requests').select('*').eq('status', 'pending').order('id', { ascending: false });
    if (rData) setVoteRequests(rData);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === SECRET_PASS) {
      setIsAuthenticated(true);
      sessionStorage.setItem('mehfil_admin_auth', 'true');
      fetchAllData();
    } else {
      alert('Galat Password!');
    }
  };

  // Point 4: Start 24-Hour Registration Window
  const start24hRegistration = async () => {
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('mehfil_settings').update({
      phase: 'registration',
      round_name: 'Registration Open',
      phase_end_time: endTime
    }).eq('id', 1);
    setStatus('✅ Registration agle 24 ghante ke liye khul gaya hai!');
  };

  // Start New Tournament Round (24h Timer) & Clear Old Details (Point 5, 6, 13)
  const generateMatches = async () => {
    if (!window.confirm(`${selectedRound} ke naye matches banayein? Purane battle cards hat jayenge!`)) return;
    setLoading(true);

    try {
      if (contestants.length < 2) {
        setStatus('Kam se kam 2 fankaar chahiye!');
        setLoading(false);
        return;
      }

      const shuffled = [...contestants].sort(() => Math.random() - 0.5);
      const newBattles = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newBattles.push({
            singer_a: shuffled[i].name, audio_a: shuffled[i].audio_url, dp_a: shuffled[i].dp_url, insta_a: shuffled[i].insta_handle,
            singer_b: shuffled[i+1].name, audio_b: shuffled[i+1].audio_url, dp_b: shuffled[i+1].dp_url, insta_b: shuffled[i+1].insta_handle,
            votes_a: 0, votes_b: 0
          });
        } else {
          newBattles.push({
            singer_a: shuffled[i].name, audio_a: shuffled[i].audio_url, dp_a: shuffled[i].dp_url, insta_a: shuffled[i].insta_handle,
            singer_b: "Wildcard Entry", audio_b: "", dp_b: "", insta_b: "",
            votes_a: 1, votes_b: 0
          });
        }
      }

      await supabase.from('battles').delete().neq('id', 0);
      await supabase.from('vote_requests').delete().neq('id', 0);
      await supabase.from('battles').insert(newBattles);

      const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('mehfil_settings').update({
        phase: 'voting',
        round_name: selectedRound,
        phase_end_time: endTime
      }).eq('id', 1);

      setStatus(`🔥 ${selectedRound} shuru! 24 ghante ka timer chalu ho gaya hai.`);
      fetchAllData();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Promote Current Round Winners to Next Round (Quarter -> Semi -> Final)
  const promoteWinnersToNextRound = async () => {
    if (battles.length < 2) {
      alert("Agle round mein promote karne ke liye kam se kam 2 battles honi chahiye!");
      return;
    }
    if (!window.confirm(`Winners ko ${selectedRound} mein promote karein (24h timer ke sath)?`)) return;

    const winners = battles.map(b => {
      if ((b.votes_a || 0) >= (b.votes_b || 0) || !b.audio_b) {
        return { name: b.singer_a, audio_url: b.audio_a, dp_url: b.dp_a, insta_handle: b.insta_a };
      } else {
        return { name: b.singer_b, audio_url: b.audio_b, dp_url: b.dp_b, insta_handle: b.insta_b };
      }
    });

    const nextBattles = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextBattles.push({
          singer_a: winners[i].name, audio_a: winners[i].audio_url, dp_a: winners[i].dp_url, insta_a: winners[i].insta_handle,
          singer_b: winners[i+1].name, audio_b: winners[i+1].audio_url, dp_b: winners[i+1].dp_url, insta_b: winners[i+1].insta_handle,
          votes_a: 0, votes_b: 0
        });
      } else {
        nextBattles.push({
          singer_a: winners[i].name, audio_a: winners[i].audio_url, dp_a: winners[i].dp_url, insta_a: winners[i].insta_handle,
          singer_b: "Wildcard Entry", audio_b: "", dp_b: "", insta_b: "",
          votes_a: 1, votes_b: 0
        });
      }
    }

    await supabase.from('battles').delete().neq('id', 0);
    await supabase.from('battles').insert(nextBattles);

    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('mehfil_settings').update({
      phase: 'voting',
      round_name: selectedRound,
      phase_end_time: endTime
    }).eq('id', 1);

    setStatus(`🏆 Winners ko ${selectedRound} mein promote kar diya gaya hai!`);
    fetchAllData();
  };

  // Point 15: Approve Vote Change Request
  const handleApproveVoteChange = async (req) => {
    const { data: b } = await supabase.from('battles').select('*').eq('id', req.battle_id).single();
    if (b) {
      let vA = b.votes_a || 0;
      let vB = b.votes_b || 0;
      if (req.previous_choice === 'A' && vA > 0) vA -= 1;
      if (req.previous_choice === 'B' && vB > 0) vB -= 1;
      if (req.previous_choice === 'BOTH') {
        if (vA > 0) vA -= 1;
        if (vB > 0) vB -= 1;
      }
      await supabase.from('battles').update({ votes_a: vA, votes_b: vB }).eq('id', req.battle_id);
    }

    await supabase.from('vote_requests').update({ status: 'approved' }).eq('id', req.id);
    fetchAllData();
  };

  // Point 13: Save Winner & Runner-Up to Hall of Fame & Clear Old Data
  const publishHallOfFame = async (e) => {
    e.preventDefault();
    await supabase.from('hall_of_fame').insert([{
      season_title: seasonTitle,
      winner_name: winnerName,
      winner_insta: winnerInsta,
      runner_up_name: runnerName,
      runner_up_insta: runnerInsta
    }]);

    if (window.confirm("Winner Sartaaj tab mein jud gaya! Kya ab purane contestants aur battles saaf kar dein naye season ke liye?")) {
      await supabase.from('battles').delete().neq('id', 0);
      await supabase.from('contestants').delete().neq('id', 0);
      fetchAllData();
    }
    alert("Hall of Fame Updated!");
  };

  const handleRemoveContestant = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    await supabase.from('contestants').delete().eq('id', id);
    fetchAllData();
  };

  if (!isAuthenticated) {
    return (
      <div className="mehfil-container">
        <h1>Khufiya Darwaza</h1>
        <div className="battle-arena-vertical" style={{ maxWidth: '380px', margin: '20px auto' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="password" placeholder="Admin Password..." value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', textAlign: 'center' }} required />
            <button type="submit" className="vote-btn">Unlock 🔓</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mehfil-container">
      <h1>Admin Control Room</h1>
      <p className="subtitle">24h Timers, Rounds, Requests & Hall of Fame</p>

      <div className="battle-arena-vertical" style={{ textAlign: 'left' }}>
        
        {/* 1. 24-HOUR REGISTRATION & ROUND CONTROLS */}
        <h3 style={{ color: '#5c1522' }}>⏱️ 1. 24-Hour Phase & Round Controls</h3>
        <button className="vote-btn" style={{ backgroundColor: '#27ae60' }} onClick={start24hRegistration}>
          🟢 Start Registration (Open for 24 Hours)
        </button>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}>
            <option value="Round 1">Round 1 (Classic Theme)</option>
            <option value="Quarter-Final">Quarter-Final (Midnight Blue Theme)</option>
            <option value="Semi-Final">Semi-Final (Fiery Crimson Theme)</option>
            <option value="Grand Finale">Grand Finale (Black & Gold Theme)</option>
          </select>
          <button className="vote-btn" style={{ flex: 1 }} onClick={generateMatches} disabled={loading}>
            🎲 Start Fresh {selectedRound} (24h)
          </button>
        </div>

        <button className="small-btn" style={{ width: '100%', marginTop: '6px' }} onClick={promoteWinnersToNextRound}>
          ⚡ Promote Current Winners to {selectedRound} (24h)
        </button>

        {status && <p style={{ color: '#27ae60', fontWeight: 'bold', marginTop: '8px' }}>{status}</p>}

        <hr style={{ margin: '20px 0' }} />

        {/* 2. VOTE CHANGE REQUESTS (Point 15) */}
        <h3 style={{ color: '#5c1522' }}>🔄 2. Vote Change Requests ({voteRequests.length})</h3>
        {voteRequests.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#777' }}>Koi pending request nahi hai.</p>
        ) : (
          voteRequests.map(r => (
            <div key={r.id} style={{ padding: '10px', background: '#fff9e6', border: '1px solid #f39c12', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <strong>{r.voter_name}</strong> (Match ID #{r.battle_id})
                <p style={{ fontSize: '0.8rem', color: '#555' }}>Reason: "{r.reason}"</p>
              </div>
              <button className="vote-btn" style={{ width: 'auto', backgroundColor: '#27ae60', padding: '6px 12px' }} onClick={() => handleApproveVoteChange(r)}>
                Approve ✅
              </button>
            </div>
          ))
        )}

        <hr style={{ margin: '20px 0' }} />

        {/* 3. REGISTERED CONTESTANTS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#5c1522' }}>🎤 3. Registered Fankaar ({contestants.length})</h3>
          <button className="small-btn" onClick={fetchAllData}>Refresh 🔄</button>
        </div>
        <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contestants.map(c => (
            <div key={c.id} style={{ padding: '10px', background: '#fdfbf7', border: '1px solid #e2d5be', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong>{c.name}</strong> <span style={{ fontSize: '0.8rem', color: '#888' }}>({c.contact})</span>
              </div>
              <audio controls src={c.audio_url} style={{ height: '30px', maxWidth: '180px' }}></audio>
              <button onClick={() => handleRemoveContestant(c.id, c.name)} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                🗑️
              </button>
            </div>
          ))}
        </div>

        <hr style={{ margin: '20px 0' }} />

        {/* 4. LIVE SCOREBOARD */}
        <h3 style={{ color: '#5c1522' }}>📊 4. Live Scoreboard</h3>
        {battles.map((b, idx) => (
          <div key={b.id} style={{ padding: '12px', background: '#fdfbf7', border: '1px solid #e2d5be', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>#{idx + 1}: <strong>{b.singer_a}</strong> vs <strong>{b.singer_b}</strong></span>
            <strong>{b.votes_a || 0} - {b.votes_b || 0}</strong>
          </div>
        ))}

        <hr style={{ margin: '20px 0' }} />

        {/* 5. PUBLISH WINNER TO HALL OF FAME (Point 13) */}
        <h3 style={{ color: '#5c1522' }}>🏆 5. Crown Winner & Archive Season</h3>
        <form onSubmit={publishHallOfFame} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Season Name (e.g. Season 1)" value={seasonTitle} onChange={(e) => setSeasonTitle(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} required />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Winner Name *" value={winnerName} onChange={(e) => setWinnerName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} required />
            <input type="text" placeholder="Winner @insta *" value={winnerInsta} onChange={(e) => setWinnerInsta(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} required />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Runner-Up Name" value={runnerName} onChange={(e) => setRunnerName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Runner-Up @insta" value={runnerInsta} onChange={(e) => setRunnerInsta(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" className="vote-btn" style={{ backgroundColor: '#d4af37', color: '#000' }}>
            👑 Publish to Sartaaj Tab & End Season
          </button>
        </form>

      </div>
    </div>
  );
}