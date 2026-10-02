import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { runAutoPilotCheck } from './autoPilot'
import BracketCard from './BracketCard'
import heroLogo from './assets/hero.png'
import './App.css'

function App() {
  const [battles, setBattles] = useState([]);
  const [contestants, setContestants] = useState([]);
  const [settings, setSettings] = useState({ phase: 'closed', round_name: 'Round 1', phase_end_time: null, bracket_history: [] });
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBracket, setShowBracket] = useState(true);
  
  const [voterId, setVoterId] = useState('');
  const [votedMap, setVotedMap] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [popupText, setPopupText] = useState("");

  const [showChangeModal, setShowChangeModal] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [pendingReqs, setPendingReqs] = useState([]);

  const currentlyPlaying = useRef(null);

  useEffect(() => {
    let vId = localStorage.getItem('mehfil_voter_uid');
    if (!vId) {
      vId = 'voter_' + Math.random().toString(36).substring(2, 10) + Date.now();
      localStorage.setItem('mehfil_voter_uid', vId);
    }
    setVoterId(vId);
    initMehfil(vId);
  }, []);

  const initMehfil = async (vId) => {
    const sData = await runAutoPilotCheck();
    if (sData) {
      setSettings(sData);
      if (sData.phase_end_time) startTimer(new Date(sData.phase_end_time).getTime());
    }

    const { data: bData } = await supabase.from('battles').select('*').order('id', { ascending: true });
    if (bData) setBattles(bData);

    const { data: cData } = await supabase.from('contestants').select('*').order('id', { ascending: true });
    if (cData) setContestants(cData);

    const localChoices = JSON.parse(localStorage.getItem('mehfil_voted_choices') || '{}');
    const { data: reqData } = await supabase.from('vote_requests').select('*').eq('voter_id', vId);

    if (reqData) {
      const pendings = [];
      for (const r of reqData) {
        if (r.status === 'approved' && localChoices[r.battle_id]) {
          delete localChoices[r.battle_id];
          await supabase.from('vote_requests').delete().eq('id', r.id);
        } else if (r.status === 'pending') {
          pendings.push(r.battle_id);
        }
      }
      localStorage.setItem('mehfil_voted_choices', JSON.stringify(localChoices));
      setPendingReqs(pendings);
    }

    setVotedMap(localChoices);
    setLoading(false);
  };

  const startTimer = (endTime) => {
    const interval = setInterval(() => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Samay समाप्त (Voting Ended)');
        clearInterval(interval);
        initMehfil(voterId);
      } else {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hrs}h : ${mins}m : ${secs}s`);
      }
    }, 1000);
  };

  const getThemeClass = () => {
    const r = settings.round_name;
    if (r === 'Quarter-Final') return 'theme-wrapper theme-quarter';
    if (r === 'Semi-Final') return 'theme-wrapper theme-semi';
    if (r === 'Grand Finale') return 'theme-wrapper theme-final';
    return 'theme-wrapper theme-round-1';
  };

  const handlePlay = (e) => {
    if (currentlyPlaying.current && currentlyPlaying.current !== e.target) {
      currentlyPlaying.current.pause();
    }
    currentlyPlaying.current = e.target;
  };

  const handleDmRequest = (singerName, instaHandle) => {
    const cleanHandle = (instaHandle || '').replace(/^@+/, '').trim();
    if (!cleanHandle) {
      alert("Is fankaar ka Instagram handle uplabdh nahi hai.");
      return;
    }
    const msg = `Hey ${singerName}! Maine Mehfil-e-Gayak par aapki aawaz suni aur mujhe bohot pasand aayi! 🎤✨ Kya mujhe aapke gaane ki audio file mil sakti hai?`;
    navigator.clipboard.writeText(msg);
    alert(`Message copy ho gaya hai! Ab Instagram DM khul raha hai, wahan bas Paste karke Send daba dein.`);
    window.open(`https://ig.me/m/${cleanHandle}`, '_blank');
  };

  const handleVote = async (choice, displayName) => {
    const currentBattle = battles[currentIndex];
    if (votedMap[currentBattle.id]) return;

    const updatedMap = { ...votedMap, [currentBattle.id]: choice };
    setVotedMap(updatedMap);
    localStorage.setItem('mehfil_voted_choices', JSON.stringify(updatedMap));

    setPopupText(`Voted ${displayName} successfully!`);
    setShowPopup(true);

    if (currentlyPlaying.current) currentlyPlaying.current.pause();

    try {
      const { data: latest } = await supabase
        .from('battles')
        .select('votes_a, votes_b')
        .eq('id', currentBattle.id)
        .single();

      if (latest && choice !== 'NOTA') {
        let vA = latest.votes_a || 0;
        let vB = latest.votes_b || 0;
        if (choice === 'A') vA += 1;
        if (choice === 'B') vB += 1;
        if (choice === 'BOTH') { vA += 1; vB += 1; }

        await supabase.from('battles').update({ votes_a: vA, votes_b: vB }).eq('id', currentBattle.id);
        setBattles(prev => prev.map(item => item.id === currentBattle.id ? { ...item, votes_a: vA, votes_b: vB } : item));
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setShowPopup(false);
      if (currentIndex + 1 < battles.length) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 1800);
  };

  const submitVoteChangeRequest = async (e) => {
    e.preventDefault();
    const currentBattle = battles[currentIndex];
    const prevChoice = votedMap[currentBattle.id];

    const { error } = await supabase.from('vote_requests').insert([{
      battle_id: currentBattle.id,
      voter_id: voterId,
      voter_name: reqName.trim(),
      reason: reqReason.trim(),
      previous_choice: prevChoice,
      status: 'pending'
    }]);

    if (!error) {
      setPendingReqs([...pendingReqs, currentBattle.id]);
      setShowChangeModal(false);
      setReqName('');
      setReqReason('');
      alert("Aapki arzi Admin ke paas bhej di gayi hai! Approve hote hi aap is match par dobara vote kar sakenge.");
    }
  };

  if (loading) {
    return (
      <div className="mehfil-container">
        <img src={heroLogo} alt="Logo" className="brand-logo" />
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle">Parde ke peeche taiyari chal rahi hai...</p>
      </div>
    );
  }

  // 🔥 Smart Bulletproof Checks
  const isTournamentFinished = settings.phase === 'completed' || String(settings.round_name).includes('Sartaaj');
  const isTournamentActive = settings.phase !== 'closed' && !isTournamentFinished;

  return (
    <div className={getThemeClass()}>
      <div className="mehfil-container" style={{ maxWidth: (isTournamentActive && showBracket) ? '980px' : '560px', transition: 'max-width 0.3s ease' }}>
        
        <img src={heroLogo} alt="Mehfil Logo" className="brand-logo" style={{ width: '85px', height: '85px' }} />
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle">
          {isTournamentFinished 
            ? `🎉 ${settings.round_name} — Season Sampann Hua!` 
            : settings.phase === 'closed'
              ? 'Agli Mehfil Jald Sajegi!'
              : `🔥 ${settings.round_name} — Kaun Banega Sartaaj?`}
        </p>

        {isTournamentActive && timeLeft && (
          <div className="timer-pill">⏳ Samay Bacha Hai: {timeLeft}</div>
        )}

        {isTournamentActive && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <button 
                className="small-btn" 
                onClick={() => setShowBracket(!showBracket)}
                style={{ backgroundColor: showBracket ? '#5c1522' : 'transparent', color: showBracket ? '#ffd700' : 'inherit' }}
              >
                {showBracket ? '🔼 Hide Tournament Bracket' : '🗺️ Show Matchmaking Bracket Tree'}
              </button>
            </div>

            {showBracket && (
              <BracketCard 
                battles={battles} 
                contestants={contestants} 
                bracketHistory={settings.bracket_history || []}
                isVotingEnded={timeLeft === 'Samay समाप्त (Voting Ended)'}
                onSelectBattle={(idx) => {
                  if (idx >= 0 && idx < battles.length) setCurrentIndex(idx);
                }}
              />
            )}
          </>
        )}

        {battles.length === 0 ? (
          <div className="battle-arena-vertical" style={{ maxWidth: '560px', margin: '0 auto' }}>
            {isTournamentFinished ? (
              <div style={{ padding: '15px 10px' }}>
                <h3 style={{ color: '#5c1522', marginBottom: '8px' }}>🏆 Season Ka Natija Aa Chuka Hai!</h3>
                <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '16px' }}>
                  Is season ke Sartaaj (Winner) aur Runner-Up ko dekhne aur Winner ka Finale gaana sunne ke liye Sartaaj tab mein jayein!
                </p>
                <Link to="/winners" className="vote-btn" style={{ display: 'inline-block', textDecoration: 'none', width: 'auto', padding: '10px 24px', backgroundColor: '#d4af37', color: '#000' }}>
                  👑 View Winner in Sartaaj Tab
                </Link>
              </div>
            ) : (
              <p className="subtitle" style={{ margin: '15px 0' }}>
                {settings.phase === 'registration' 
                  ? 'Upar Bracket mein dekhein jaise-jaise fankaar jud rahe hain! Registration ke baad muqable shuru honge.' 
                  : settings.phase === 'next_round_upload'
                    ? 'Promoted Winners agle round ke liye apna naya gaana upload kar rahe hain!'
                    : 'Mehfil abhi saj rahi hai. Admin ke ishare ka intezaar karein!'}
              </p>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {battles.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: currentIndex === idx ? '2px solid #ffd700' : '1px solid #aaa',
                    backgroundColor: currentIndex === idx ? '#5c1522' : votedMap[b.id] ? '#27ae60' : '#fff',
                    color: currentIndex === idx || votedMap[b.id] ? '#fff' : '#2c3e50',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Match {idx + 1} {votedMap[b.id] ? '✓' : ''}
                </button>
              ))}
            </div>

            {(() => {
              const currentBattle = battles[currentIndex] || battles[0];
              const hasVotedThis = Boolean(votedMap[currentBattle.id]);
              const isVotingExpired = timeLeft === 'Samay समाप्त (Voting Ended)';
              const fallbackDpA = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentBattle.singer_a)}&background=2c3e50&color=fff&size=200`;
              const fallbackDpB = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentBattle.singer_b)}&background=6a1b29&color=fff&size=200`;

              return (
                <>
                  <div className="battle-arena-vertical" key={currentBattle.id}>
                    {/* SINGER 1 */}
                    <div className="singer-card-top">
                      <img src={currentBattle.dp_a || fallbackDpA} onError={(e) => { e.target.onerror = null; e.target.src = fallbackDpA; }} alt={currentBattle.singer_a} className="dp-box" />
                      <div className="singer-details left-align">
                        <h2 className="fankaar-name">{currentBattle.singer_a}</h2>
                        {currentBattle.insta_a && (
                          <div className="social-row">
                            <a href={`https://instagram.com/${currentBattle.insta_a.replace(/^@+/, '')}`} target="_blank" rel="noreferrer" className="insta-follow-btn">
                              📸 Follow @{currentBattle.insta_a.replace(/^@+/, '')}
                            </a>
                            <button onClick={() => handleDmRequest(currentBattle.singer_a, currentBattle.insta_a)} className="dm-request-btn">
                              📩 Request Audio in DM
                            </button>
                          </div>
                        )}
                        <audio controls controlsList="nodownload" className="audio-player compact" src={currentBattle.audio_a} onPlay={handlePlay}></audio>
                        <button className="vote-btn" disabled={hasVotedThis || isVotingExpired} onClick={() => handleVote('A', currentBattle.singer_a)}>
                          {votedMap[currentBattle.id] === 'A' ? `✓ Voted ${currentBattle.singer_a}` : `Vote ${currentBattle.singer_a}`}
                        </button>
                      </div>
                    </div>

                    <div className="vs-badge">VS</div>

                    {/* SINGER 2 */}
                    <div className="singer-card-bottom">
                      <img src={currentBattle.dp_b || fallbackDpB} onError={(e) => { e.target.onerror = null; e.target.src = fallbackDpB; }} alt={currentBattle.singer_b} className="dp-box" />
                      <div className="singer-details right-align">
                        <h2 className="fankaar-name">{currentBattle.singer_b}</h2>
                        {currentBattle.insta_b && currentBattle.audio_b && (
                          <div className="social-row">
                            <a href={`https://instagram.com/${currentBattle.insta_b.replace(/^@+/, '')}`} target="_blank" rel="noreferrer" className="insta-follow-btn">
                              📸 Follow @{currentBattle.insta_b.replace(/^@+/, '')}
                            </a>
                            <button onClick={() => handleDmRequest(currentBattle.singer_b, currentBattle.insta_b)} className="dm-request-btn">
                              📩 Request Audio in DM
                            </button>
                          </div>
                        )}
                        {currentBattle.audio_b ? (
                          <>
                            <audio controls controlsList="nodownload" className="audio-player compact" src={currentBattle.audio_b} onPlay={handlePlay}></audio>
                            <button className="vote-btn" disabled={hasVotedThis || isVotingExpired} onClick={() => handleVote('B', currentBattle.singer_b)}>
                              {votedMap[currentBattle.id] === 'B' ? `✓ Voted ${currentBattle.singer_b}` : `Vote ${currentBattle.singer_b}`}
                            </button>
                          </>
                        ) : (
                          <p style={{ fontStyle: 'italic', color: '#6a1b29' }}>Wildcard Entry (Seedha agle round mein!)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!hasVotedThis && currentBattle.audio_b && !isVotingExpired && (
  <div className="bottom-actions">
    <button className="small-btn" onClick={() => handleVote('NOTA', 'NOTA')}>NOTA</button>
    <button className="small-btn" onClick={() => handleVote('BOTH', 'Dono Fankaaron')}>Vote Both</button>
    
    {/* Naya Share Button */}
    <button 
      className="small-btn" 
      style={{ backgroundColor: '#e1306c', color: 'white', border: 'none' }}
      onClick={() => {
        const shareData = {
          title: 'Vote for Me!',
          text: `Maine Mehfil-e-Gayak me hissa liya hai! 🎤🔥 Mere gaane ko suno aur mujhe Sartaaj banne mein madad karo!\n\nVote for: ${currentBattle.singer_a} vs ${currentBattle.singer_b}`,
          url: window.location.origin
        };
        if (navigator.share) {
          navigator.share(shareData);
        } else {
          navigator.clipboard.writeText(`${shareData.text}\nLink: ${shareData.url}`);
          alert("Text aur Link copy ho gaya hai! Ab ise Instagram Story ya WhatsApp par paste kar dein.");
        }
      }}
    >
      📢 Share to get Votes
    </button>
  </div>
)}
                </>
              );
            })()}
          </div>
        )}

        {showChangeModal && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h3 style={{ color: '#5c1522', marginBottom: '10px' }}>Vote Badalne ki Arzi</h3>
              <form onSubmit={submitVoteChangeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" placeholder="Aapka Naam..." value={reqName} onChange={(e) => setReqName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} required />
                <textarea placeholder="Vote kyun badalna chahte hain? (Reason)..." value={reqReason} onChange={(e) => setReqReason(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '70px' }} required />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="small-btn" style={{ flex: 1 }} onClick={() => setShowChangeModal(false)}>Cancel</button>
                  <button type="submit" className="vote-btn" style={{ flex: 1 }}>Send Request</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPopup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h3>{popupText}</h3>
              <p>Aapka vote darj ho gaya hai!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App