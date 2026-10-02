import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import heroLogo from './assets/hero.png';
import './App.css';

export default function HallOfFame() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentlyPlaying = useRef(null);

  useEffect(() => {
    const fetchHoF = async () => {
      const { data } = await supabase
        .from('hall_of_fame')
        .select('*')
        .order('id', { ascending: false });
      if (data) setRecords(data);
      setLoading(false);
    };
    fetchHoF();
  }, []);

  const handlePlay = (e) => {
    if (currentlyPlaying.current && currentlyPlaying.current !== e.target) {
      currentlyPlaying.current.pause();
    }
    currentlyPlaying.current = e.target;
  };

  return (
    <div className="mehfil-container">
      <img 
        src={heroLogo} 
        alt="Mehfil-e-Gayak Logo" 
        className="brand-logo" 
        style={{ width: '90px', height: '90px' }} 
      />
      <h1>Dastaan-e-Sartaaj</h1>
      <p className="subtitle">Mehfil-e-Gayak ke Purane Vijeta aur Runner-Ups</p>

      {loading ? (
        <p style={{ fontStyle: 'italic', color: '#666' }}>Itihaas ke panne palte jaa rahe hain...</p>
      ) : records.length === 0 ? (
        <div className="battle-arena-vertical">
          <p style={{ color: '#777', fontStyle: 'italic' }}>
            Pehli mehfil ka natija aana abhi baaki hai!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {records.map((item) => {
            const cleanWinnerInsta = (item.winner_insta || '').replace(/^@/, '').trim();
            const cleanRunnerInsta = (item.runner_up_insta || '').replace(/^@/, '').trim();

            const fallbackWinnerDp = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.winner_name || 'W')}&background=d4af37&color=000&size=150`;
            const fallbackRunnerDp = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.runner_up_name || 'R')}&background=7f8c8d&color=fff&size=150`;

            return (
              <div className="battle-arena-vertical" key={item.id} style={{ border: '2px solid #d4af37', padding: '16px 12px' }}>
                <span style={{ backgroundColor: '#5c1522', color: '#ffd700', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', alignSelf: 'center', marginBottom: '8px' }}>
                  🏆 {item.season_title}
                </span>

                {/* 👑 WINNER (SARTAAJ) CARD — WITH FINALE SONG & INSTA FOLLOW */}
                <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #fffdf5 0%, #faecc8 100%)', border: '1.5px solid #d4af37', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', minWidth: '200px' }}>
                      <img 
                        src={item.winner_dp || fallbackWinnerDp} 
                        onError={(e) => { e.target.onerror = null; e.target.src = fallbackWinnerDp; }}
                        alt={item.winner_name} 
                        style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #b8860b', flexShrink: 0 }}
                      />
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b8860b', display: 'block', letterSpacing: '0.5px' }}>
                          👑 SARTAAJ (WINNER)
                        </span>
                        <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.5rem', color: '#2c3e50', margin: '2px 0' }}>
                          {item.winner_name}
                        </h3>
                        {cleanWinnerInsta && (
                          <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600' }}>@{cleanWinnerInsta}</span>
                        )}
                      </div>
                    </div>

                    {/* Winner Instagram Follow Button */}
                    {cleanWinnerInsta && (
                      <a 
                        href={`https://instagram.com/${cleanWinnerInsta}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="insta-follow-btn"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                      >
                        📸 Follow @{cleanWinnerInsta}
                      </a>
                    )}
                  </div>

                  {/* SIRF WINNER KA FINALE SONG */}
                  {item.winner_audio && (
                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e6d3a3', textAlign: 'left', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>
                        🎵 Finale Winning Peshkash:
                      </span>
                      <audio 
                        controls 
                        controlsList="nodownload" 
                        src={item.winner_audio} 
                        onPlay={handlePlay}
                        style={{ width: '100%', height: '40px', borderRadius: '20px' }}
                      ></audio>
                    </div>
                  )}
                </div>

                {/* 🥈 RUNNER-UP CARD — ONLY NAME, DP & INSTA FOLLOW (NO SONG) */}
                {item.runner_up_name && (
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#f8f9fa', border: '1px solid #dcdde1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', minWidth: '200px' }}>
                      <img 
                        src={item.runner_up_dp || fallbackRunnerDp} 
                        onError={(e) => { e.target.onerror = null; e.target.src = fallbackRunnerDp; }}
                        alt={item.runner_up_name} 
                        style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #7f8c8d', flexShrink: 0 }}
                      />
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#7f8c8d', display: 'block', letterSpacing: '0.5px' }}>
                          🥈 RUNNER-UP
                        </span>
                        <h4 style={{ fontFamily: 'Playfair Display', fontSize: '1.25rem', color: '#2c3e50', margin: '2px 0' }}>
                          {item.runner_up_name}
                        </h4>
                        {cleanRunnerInsta && (
                          <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '500' }}>@{cleanRunnerInsta}</span>
                        )}
                      </div>
                    </div>

                    {/* Runner-Up Instagram Follow Button */}
                    {cleanRunnerInsta && (
                      <a 
                        href={`https://instagram.com/${cleanRunnerInsta}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="insta-follow-btn"
                        style={{ padding: '7px 14px', fontSize: '0.82rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
                      >
                        📸 Follow @{cleanRunnerInsta}
                      </a>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}