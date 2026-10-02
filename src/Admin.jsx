import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { runAutoPilotCheck, getRoundNameByCount } from './autoPilot';
import './App.css';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const SECRET_PASS = "mehfil2026";

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [battles, setBattles] = useState([]);
  const [voteRequests, setVoteRequests] = useState([]);

  // Ek waqt par ek hi audio bajane ke liye Ref
  const currentlyPlayingAudio = useRef(null);

  const handleAudioPlay = (e) => {
    if (currentlyPlayingAudio.current && currentlyPlayingAudio.current !== e.target) {
      currentlyPlayingAudio.current.pause();
    }
    currentlyPlayingAudio.current = e.target;
  };

  useEffect(() => {
    if (sessionStorage.getItem('mehfil_admin_auth') === 'true') {
      setIsAuthenticated(true);
      fetchAllData();
    }
  }, []);

  const fetchAllData = async () => {
    const sData = await runAutoPilotCheck();
    if (sData) setSettings(sData);

    const { data: cData } = await supabase
      .from('contestants')
      .select('*')
      .order('id', { ascending: true });
    if (cData) setContestants(cData);

    const { data: bData } = await supabase
      .from('battles')
      .select('*')
      .order('id', { ascending: true });
    if (bData) setBattles(bData);

    const { data: rData } = await supabase
      .from('vote_requests')
      .select('*')
      .eq('status', 'pending')
      .order('id', { ascending: false });
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

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mehfil_admin_auth');
  };

  const startNewSeasonRegistration = async () => {
    if (!window.confirm("Naya Season shuru karein? Purane contestants, battles aur bracket history saaf ho jayenge aur 24h ke liye Registration khul jayega!")) return;

    await supabase.from('battles').delete().neq('id', 0);
    await supabase.from('contestants').delete().neq('id', 0);
    await supabase.from('vote_requests').delete().neq('id', 0);

    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('mehfil_settings').update({
      phase: 'registration',
      round_name: 'Round 1',
      phase_end_time: endTime,
      bracket_history: []
    }).eq('id', 1);

    setStatus('✅ Naya Season shuru! Agle 24 ghante ke liye Registration khul gaya hai.');
    fetchAllData();
  };

  const startVerifiedRoundBattles = async () => {
    if (contestants.length < 2) {
      alert('Battle shuru karne ke liye kam se kam 2 valid fankaar hone chahiye!');
      return;
    }

    const pendingSongs = contestants.filter(c => !c.song_updated);
    if (pendingSongs.length > 0) {
      const proceed = window.confirm(
        `Abhi ${pendingSongs.length} promoted fankaar ne naya gaana upload nahi kiya hai. Kya aap fir bhi Battle shuru karna chahte hain?`
      );
      if (!proceed) return;
    }

    setLoading(true);
    try {
      const shuffled = [...contestants].sort(() => Math.random() - 0.5);
      const newBattles = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            dp_a: shuffled[i].dp_url,
            insta_a: shuffled[i].insta_handle,
            pin_a: shuffled[i].secret_pin,
            singer_b: shuffled[i + 1].name,
            audio_b: shuffled[i + 1].audio_url,
            dp_b: shuffled[i + 1].dp_url,
            insta_b: shuffled[i + 1].insta_handle,
            pin_b: shuffled[i + 1].secret_pin,
            votes_a: 0,
            votes_b: 0
          });
        } else {
          newBattles.push({
            singer_a: shuffled[i].name,
            audio_a: shuffled[i].audio_url,
            dp_a: shuffled[i].dp_url,
            insta_a: shuffled[i].insta_handle,
            pin_a: shuffled[i].secret_pin,
            singer_b: "Wildcard Entry",
            audio_b: "",
            dp_b: "",
            insta_b: "",
            pin_b: "",
            votes_a: 1,
            votes_b: 0
          });
        }
      }

      // Cleaned up redundant logic
      const autoRoundName = getRoundNameByCount(contestants.length);

      await supabase.from('battles').delete().neq('id', 0);
      await supabase.from('vote_requests').delete().neq('id', 0);
      await supabase.from('battles').insert(newBattles);

      const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('mehfil_settings').update({
        phase: 'voting',
        round_name: autoRoundName,
        phase_end_time: endTime
      }).eq('id', 1);

      setStatus(`🔥 ${autoRoundName} Battles Shuru! 24 ghante baad iske winners apne aap agle round mein promote ho jayenge!`);
      fetchAllData();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const forceEndCurrentVotingRound = async () => {
    if (!window.confirm("Kya aap abhi turant voting khatam karke Winners ko agle round mein Auto-Promote (ya Finale ho toh Sartaaj declare) karna chahte hain?")) return;
    const pastTime = new Date(Date.now() - 1000).toISOString();
    await supabase.from('mehfil_settings').update({ phase_end_time: pastTime }).eq('id', 1);
    await fetchAllData();
    setStatus('⚡ Round समाप्त! Winners automatically promote ho gaye hain (ya Finale tha toh Sartaaj declare ho gaya hai)!');
  };

  const handleDisqualify = async (id, name) => {
    if (!window.confirm(`Kya aap "${name}" ko Disqualify / Remove karna chahte hain?`)) return;
    await supabase.from('contestants').delete().eq('id', id);
    fetchAllData();
  };

  const handleUnlockReupload = async (id, name) => {
    await supabase.from('contestants').update({ song_updated: false }).eq('id', id);
    alert(`${name} ka upload lock khol diya gaya hai. Ab wo apna Secret PIN daal kar dobara naya gaana upload kar sakta hai.`);
    fetchAllData();
  };

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

  if (!isAuthenticated) {
    return (
      <div className="mehfil-container">
        <h1>Khufiya Darwaza</h1>
        <p className="subtitle">Control Room mein jane ke liye password darj karein</p>
        <div className="battle-arena-vertical" style={{ maxWidth: '380px', margin: '20px auto' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="password" 
              placeholder="Admin Password..." 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', textAlign: 'center', fontSize: '1rem' }} 
              required 
            />
            <button type="submit" className="vote-btn">Unlock 🔓</button>
          </form>
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

      <h1>Admin Control Room</h1>
      <p className="subtitle">PIN Security, Song Verification & Disqualification</p>

      <div className="battle-arena-vertical" style={{ textAlign: 'left' }}>
        
        {/* 1. SEASON & ROUND CONTROLS */}
        <div style={{ background: '#fdfbf7', padding: '15px', borderRadius: '12px', border: '1px solid #e2d5be', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.9rem', color: '#5c1522' }}>
            <strong>Current Phase:</strong> {settings?.phase?.toUpperCase()} | <strong>Round:</strong> {settings?.round_name}
          </div>

          <button className="vote-btn" style={{ backgroundColor: '#27ae60' }} onClick={startNewSeasonRegistration}>
            🟢 1. Start New Season (Open 24h Registration)
          </button>

          <button className="vote-btn" style={{ backgroundColor: '#2c3e50' }} onClick={startVerifiedRoundBattles} disabled={loading}>
            🎲 2. Songs Verified ➔ Start 24h Battles Now ({contestants.length} Fankaar)
          </button>

          {settings?.phase === 'voting' && (
            <button className="small-btn" style={{ fontSize: '0.8rem' }} onClick={forceEndCurrentVotingRound}>
              ⏩ End 24h Voting Early & Auto-Promote Winners (For Testing)
            </button>
          )}

          {status && <p style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>{status}</p>}
        </div>

        <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #e2d5be' }} />

        {/* 2. VERIFY SONGS & DISQUALIFY INVALID ENTRIES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#5c1522' }}>
            🎧 Verify Songs / Disqualify ({contestants.length})
          </h3>
          <button className="small-btn" onClick={fetchAllData}>Refresh 🔄</button>
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {contestants.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Abhi koi fankaar list mein nahi hai.</p>
          ) : (
            contestants.map(c => (
              <div key={c.id} style={{ padding: '12px', background: '#fdfbf7', border: '1px solid #e2d5be', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>{c.name}</strong> <span style={{ fontSize: '0.8rem', color: '#888' }}>({c.contact})</span>
                  <span style={{ marginLeft: '8px', background: '#efe8d8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#5c1522' }}>
                    🔑 PIN: {c.secret_pin || 'N/A'}
                  </span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: c.song_updated ? '#27ae60' : '#e67e22', marginTop: '4px' }}>
                    {c.song_updated ? '🔒 Song Uploaded & Ready' : '⏳ Waiting for New Round Song...'}
                  </div>
                </div>

                <audio 
                  controls 
                  controlsList="nodownload"
                  src={c.audio_url} 
                  onPlay={handleAudioPlay}
                  style={{ height: '32px', maxWidth: '190px' }}
                ></audio>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {c.song_updated && settings?.phase === 'next_round_upload' && (
                    <button 
                      onClick={() => handleUnlockReupload(c.id, c.name)} 
                      style={{ background: '#f39c12', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                    >
                      Unlock 🔓
                    </button>
                  )}
                  <button 
                    onClick={() => handleDisqualify(c.id, c.name)} 
                    style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                  >
                    Disqualify ❌
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #e2d5be' }} />

        {/* 3. VOTE CHANGE REQUESTS */}
        <h3 style={{ color: '#5c1522' }}>🔄 Vote Change Requests ({voteRequests.length})</h3>
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

        <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #e2d5be' }} />

        {/* 4. LIVE SCOREBOARD */}
        <h3 style={{ color: '#5c1522' }}>📊 Live Battle Scoreboard</h3>
        {battles.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#777' }}>Abhi koi battle chalu nahi hai.</p>
        ) : (
          battles.map((b, idx) => (
            <div key={b.id} style={{ padding: '12px', background: '#fdfbf7', border: '1px solid #e2d5be', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>#{idx + 1}: <strong>{b.singer_a}</strong> vs <strong>{b.singer_b}</strong></span>
              <strong>{b.votes_a || 0} - {b.votes_b || 0}</strong>
            </div>
          ))
        )}

      </div>
    </div>
  );
}