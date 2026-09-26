import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [votedName, setVotedName] = useState("");
  
  const currentlyPlaying = useRef(null);

  useEffect(() => {
    const fetchBattles = async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) {
        setBattles(data);
      }
      setLoading(false);
    };
    fetchBattles();
  }, []);

  const handlePlay = (e) => {
    if (currentlyPlaying.current && currentlyPlaying.current !== e.target) {
      currentlyPlaying.current.pause();
    }
    currentlyPlaying.current = e.target;
  };

  const handleVote = async (choice, displayName) => {
    setVotedName(displayName);
    setShowPopup(true); 

    if (currentlyPlaying.current) {
      currentlyPlaying.current.pause();
    }

    const currentBattle = battles[currentIndex];

    // Database se taja votes laakar +1 karna
    try {
      const { data: latestBattle } = await supabase
        .from('battles')
        .select('votes_a, votes_b')
        .eq('id', currentBattle.id)
        .single();

      if (latestBattle) {
        let newVotesA = latestBattle.votes_a || 0;
        let newVotesB = latestBattle.votes_b || 0;

        if (choice === 'A') newVotesA += 1;
        if (choice === 'B') newVotesB += 1;
        if (choice === 'BOTH') {
          newVotesA += 1;
          newVotesB += 1;
        }

        if (choice !== 'NOTA') {
          await supabase
            .from('battles')
            .update({ votes_a: newVotesA, votes_b: newVotesB })
            .eq('id', currentBattle.id);
        }
      }
    } catch (err) {
      console.error("Vote save karne mein dikkat:", err);
    }

    setTimeout(() => {
      setShowPopup(false);
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="mehfil-container">
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle" style={{marginTop: '40px'}}>Parde ke peeche taiyari chal rahi hai...</p>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="mehfil-container">
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle" style={{marginTop: '40px'}}>Mehfil abhi saj rahi hai. Admin ke ishare ka intezaar karein!</p>
      </div>
    );
  }

  if (currentIndex >= battles.length) {
    return (
      <div className="mehfil-container">
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle" style={{marginTop: '40px'}}>Aaj ki mehfil muqammal hui. Result ka intezaar karein!</p>
      </div>
    );
  }

  const currentBattle = battles[currentIndex];

  return (
    <div className="mehfil-container">
      <div className={`main-content ${showPopup ? 'blur-background' : ''}`}>
        
        <p style={{fontSize: '0.8rem', color: '#777', marginBottom: '10px'}}>
          Peshkash {currentIndex + 1} / {battles.length}
        </p>

        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle">Saji Mehfil: Kaun banega sartaaj?</p>

        <div className="battle-arena-vertical">
          
          {/* Upper Half: Player 1 */}
          <div className="singer-card-top">
            <img src={`https://ui-avatars.com/api/?name=${currentBattle.singer_a}&background=2c3e50&color=fff&size=200`} alt={currentBattle.singer_a} className="dp-box" />
            <div className="singer-details left-align">
              <h2 className="fankaar-name">{currentBattle.singer_a}</h2>
              <audio 
                controls 
                controlsList="nodownload" 
                className="audio-player compact" 
                src={currentBattle.audio_a}
                onPlay={handlePlay}
              ></audio>
              <button className="vote-btn" onClick={() => handleVote('A', currentBattle.singer_a)}>Vote {currentBattle.singer_a}</button>
            </div>
          </div>

          <div className="vs-badge">VS</div>

          {/* Lower Half: Player 2 */}
          <div className="singer-card-bottom">
            <img src={`https://ui-avatars.com/api/?name=${currentBattle.singer_b}&background=6a1b29&color=fff&size=200`} alt={currentBattle.singer_b} className="dp-box" />
            <div className="singer-details right-align">
              <h2 className="fankaar-name" style={{fontSize: currentBattle.audio_b ? '1.8rem' : '1.3rem'}}>{currentBattle.singer_b}</h2>
              
              {currentBattle.audio_b ? (
                <>
                  <audio 
                    controls 
                    controlsList="nodownload" 
                    className="audio-player compact" 
                    src={currentBattle.audio_b}
                    onPlay={handlePlay}
                  ></audio>
                  <button className="vote-btn" onClick={() => handleVote('B', currentBattle.singer_b)}>Vote {currentBattle.singer_b}</button>
                </>
              ) : (
                <p style={{fontStyle: 'italic', color: '#6a1b29'}}>Wildcard Entry (Bina lade seedha agle round mein!)</p>
              )}
            </div>
          </div>

        </div>

        {currentBattle.audio_b && (
          <div className="bottom-actions">
            <button className="small-btn" onClick={() => handleVote('NOTA', 'NOTA')}>NOTA</button>
            <button className="small-btn" onClick={() => handleVote('BOTH', 'Dono fankaaron')}>Both</button>
          </div>
        )}
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <div className="audio-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <h3>Voted {votedName} successfully.</h3>
            <p>Stay tuned for more blessings to your ear...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App