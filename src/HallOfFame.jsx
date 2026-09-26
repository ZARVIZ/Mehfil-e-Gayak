import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import heroLogo from './assets/hero.png';
import './App.css';

export default function HallOfFame() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="mehfil-container">
      <img src={heroLogo} alt="Mehfil Logo" className="brand-logo" />
      <h1>Dastaan-e-Sartaaj</h1>
      <p className="subtitle">Mehfil-e-Gayak ke Purane Vijeta aur Runner-Ups</p>

      {loading ? (
        <p>Itihaas ke panne palte jaa rahe hain...</p>
      ) : records.length === 0 ? (
        <div className="battle-arena-vertical">
          <p style={{ color: '#777', fontStyle: 'italic' }}>
            Pehli mehfil ka natija aana abhi baaki hai!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {records.map((item) => (
            <div className="battle-arena-vertical" key={item.id} style={{ border: '2px solid #d4af37' }}>
              <span style={{ backgroundColor: '#5c1522', color: '#ffd700', padding: '4px 12px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold', alignSelf: 'center' }}>
                🏆 {item.season_title}
              </span>

              {/* WINNER */}
              <div style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #fffdf5 0%, #faecc8 100%)', border: '1px solid #d4af37', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#b8860b' }}>👑 SARTAAJ (WINNER)</span>
                  <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.4rem', color: '#2c3e50', margin: '2px 0' }}>{item.winner_name}</h3>
                </div>
                {item.winner_insta && (
                  <a href={`https://instagram.com/${item.winner_insta.replace('@', '')}`} target="_blank" rel="noreferrer" className="insta-follow-btn">
                    📸 Follow @{item.winner_insta.replace('@', '')}
                  </a>
                )}
              </div>

              {/* RUNNER UP */}
              {item.runner_up_name && (
                <div style={{ padding: '12px', borderRadius: '12px', background: '#f8f9fa', border: '1px solid #dcdde1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7f8c8d' }}>🥈 RUNNER-UP</span>
                    <h4 style={{ fontFamily: 'Playfair Display', fontSize: '1.2rem', color: '#2c3e50', margin: '2px 0' }}>{item.runner_up_name}</h4>
                  </div>
                  {item.runner_up_insta && (
                    <a href={`https://instagram.com/${item.runner_up_insta.replace('@', '')}`} target="_blank" rel="noreferrer" className="insta-follow-btn">
                      📸 Follow @{item.runner_up_insta.replace('@', '')}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}