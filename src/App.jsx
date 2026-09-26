import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [battles, setBattles] = useState([]);
  const [totalBattles, setTotalBattles] = useState(0);
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
        setTotalBattles(data.length);

        // Browser se pehle diye gaye votes ki list nikalna
        const savedVotes = JSON.parse(localStorage.getItem('mehfil_voted_ids') || '[]');

        // Har match ko uska asli number dena aur jinpe vote ho chuka hai unhe hatana
        const numberedData = data.map((b, idx) => ({ ...b, matchNumber: idx + 1 }));
        const pendingBattles = numberedData.filter(b => !savedVotes.includes(b.id));

        setBattles(pendingBattles);
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
    const currentBattle = battles[currentIndex];

    // Double click ya refresh karke dobara vote rokne ke liye LocalStorage lock
    const savedVotes = JSON.parse(localStorage.getItem('mehfil_voted_ids') || '[]');
    if (savedVotes.includes(currentBattle.id)) return;
    
    savedVotes.push(currentBattle.id);
    localStorage.setItem('mehfil_voted_ids', JSON.stringify(savedVotes));

    setVotedName(displayName);
    setShowPopup(true); 

    if (currentlyPlaying.current) {
      currentlyPlaying.current.pause();
    }

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

  // Agar Admin ne abhi tak ek bhi match nahi banaya hai
  if (totalBattles === 0) {
    return (
      <div className="mehfil-container">
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle" style={{marginTop: '40px'}}>Mehfil abhi saj rahi hai. Admin ke ishare ka intezaar karein!</p>
      </div>
    );
  }

  // Agar user saare matches par vote de chuka hai
  if (battles.length === 0 || currentIndex >= battles.length) {
    return (
      <div className="mehfil-container">
        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle" style={{marginTop: '40px'}}>
          Aap sabhi muqablon mein apna keemti vote de chuke hain! 🎉<br/>
          Ab natijon ka intezaar karein.
        </p>
      </div>
    );
  }

  const currentBattle = battles[currentIndex];

  // Default Initials URLs agar photo ya Insta DP na mile
  const fallbackDpA = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentBattle.singer_a)}&background=2c3e50&color=fff&size=200`;
  const fallbackDpB = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentBattle.singer_b)}&background=6a1b29&color=fff&size=200`;

  return (
    <div className="mehfil-container">
      <div className={`main-content ${showPopup ? 'blur-background' : ''}`}>
        
        <p style={{fontSize: '0.8rem', color: '#777', marginBottom: '10px'}}>
          Peshkash {currentBattle.matchNumber} / {totalBattles}
        </p>

        <h1>Mehfil-e-Gayak</h1>
        <p className="subtitle">Saji Mehfil: Kaun banega sartaaj?</p>

        {/* key={currentBattle.id} har naye match par slide animation trigger karega */}
        <div className="battle-arena-vertical" key={currentBattle.id}>
          
          {/* Upper Half: Player 1 */}
          <div className="singer-card-top">
            <img 
              src={currentBattle.dp_a || fallbackDpA} 
              onError={(e) => { e.target.onerror = null; e.target.src = fallbackDpA; }}
              alt={currentBattle.singer_a} 
              className="dp-box" 
              style={{ objectFit: 'cover' }}
            />
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
            <img 
              src={currentBattle.dp_b || fallbackDpB} 
              onError={(e) => { e.target.onerror = null; e.target.src = fallbackDpB; }}
              alt={currentBattle.singer_b} 
              className="dp-box" 
              style={{ objectFit: 'cover' }}
            />
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
                <div>
                  <p style={{fontStyle: 'italic', color: '#6a1b29', marginBottom: '10px'}}>Wildcard Entry (Bina lade seedha agle round mein!)</p>
                  <button className="small-btn" onClick={() => handleVote('NOTA', 'Agle Muqable')}>Aage Badhein ➔</button>
                </div>
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