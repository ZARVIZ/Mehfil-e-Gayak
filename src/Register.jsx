import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import heroLogo from './assets/hero.png';
import './App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [instaHandle, setInstaHandle] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  
  // Working DP Options: 'none' (Initials) | 'upload' (Custom Pic)
  const [dpOption, setDpOption] = useState('none');
  const [dpFile, setDpFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // Point 1: Check 1-Device Registration Lock
    if (localStorage.getItem('mehfil_device_registered') === 'true') {
      setAlreadyRegistered(true);
    }

    // Point 3, 4, 5: Check if Registration 24h Window is Active
    const checkSettings = async () => {
      const { data } = await supabase.from('mehfil_settings').select('*').eq('id', 1).single();
      if (data && data.phase === 'registration' && data.phase_end_time) {
        const end = new Date(data.phase_end_time).getTime();
        const now = Date.now();
        if (end > now) {
          setRegOpen(true);
          updateCountdown(end);
        } else {
          setRegOpen(false);
        }
      } else {
        setRegOpen(false);
      }
    };
    checkSettings();
  }, []);

  const updateCountdown = (endTime) => {
    const interval = setInterval(() => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setRegOpen(false);
        clearInterval(interval);
      } else {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hrs}h : ${mins}m : ${secs}s`);
      }
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadyRegistered) return;

    const cleanInsta = instaHandle.replace('@', '').trim();
    if (!cleanInsta) {
      setMessage('Instagram handle dena zaruri hai!');
      return;
    }

    setLoading(true);
    setMessage('Aapki peshkash darj ho rahi hai...');

    try {
      // Duplicate Instagram Handle Check
      const { data: existing } = await supabase
        .from('contestants')
        .select('id')
        .ilike('insta_handle', cleanInsta);

      if (existing && existing.length > 0) {
        setMessage('Is Instagram ID se pehle hi registration ho chuka hai!');
        setLoading(false);
        return;
      }

      // 1. Audio Upload
      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `audio_${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('audios').upload(audioFileName, audioFile);
      if (audioErr) throw audioErr;
      const { data: audioUrlData } = supabase.storage.from('audios').getPublicUrl(audioFileName);

      // 2. DP Upload or Initials
      let finalDpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5c1522&color=fff&size=200`;

      if (dpOption === 'upload' && dpFile) {
        const dpExt = dpFile.name.split('.').pop();
        const dpFileName = `dp_${Date.now()}.${dpExt}`;
        const { error: dpErr } = await supabase.storage.from('audios').upload(dpFileName, dpFile);
        if (dpErr) throw dpErr;
        const { data: dpUrlData } = supabase.storage.from('audios').getPublicUrl(dpFileName);
        finalDpUrl = dpUrlData.publicUrl;
      }

      // 3. Save in Database
      const { error: dbError } = await supabase.from('contestants').insert([{
        name: name.trim(),
        contact: `@${cleanInsta}`,
        insta_handle: cleanInsta,
        audio_url: audioUrlData.publicUrl,
        dp_url: finalDpUrl
      }]);

      if (dbError) throw dbError;

      // Lock Device so they cannot register twice
      localStorage.setItem('mehfil_device_registered', 'true');
      setAlreadyRegistered(true);
      setMessage('Mubarak ho! Aap Mehfil-e-Gayak mein shamil ho gaye hain. 🎤');
    } catch (error) {
      setMessage(`Kuch gadbad hui: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid #d4c4a8', fontSize: '1rem', marginTop: '6px'
  };

  return (
    <div className="mehfil-container">
      <img src={heroLogo} alt="Mehfil Logo" className="brand-logo" />
      <h1>Mehfil-e-Gayak</h1>
      <p className="subtitle">Fankaar Registration</p>

      {regOpen && timeLeft && (
        <div className="timer-pill">⏳ Registration Band Hone Mein: {timeLeft}</div>
      )}

      <div className="battle-arena-vertical" style={{ textAlign: 'left' }}>
        {!regOpen ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <h3 style={{ color: '#5c1522', marginBottom: '8px' }}>🔒 Registration Abhi Band Hai</h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Ya toh 24 ghante ka samay poora ho chuka hai aur ab sirf Battles chal rahi hain, ya Admin ne abhi naya round shuru nahi kiya hai!
            </p>
          </div>
        ) : alreadyRegistered ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <h3 style={{ color: '#27ae60', marginBottom: '8px' }}>✅ Aapki Entry Darj Ho Chuki Hai!</h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Ek device se sirf ek hi fankaar register kar sakta hai. Ab Battles shuru hone ka intezaar karein!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Aapka Naam (Stage Name) *:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jaise: Tansen..." style={inputStyle} required />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Instagram Username (Mandatory) *:</label>
              <input type="text" value={instaHandle} onChange={(e) => setInstaHandle(e.target.value)} placeholder="Jaise: @aakash_music" style={inputStyle} required />
              <small style={{ color: '#777' }}>*Ye aapke Battle Card par Follow aur Song Request DM button ke liye zaruri hai.</small>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>Apni Tasveer (DP) Chunein:</label>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#fdfbf7', padding: '12px', borderRadius: '8px', border: '1px solid #e2d5be' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="dpOption" checked={dpOption === 'none'} onChange={() => setDpOption('none')} />
                  Naam ke Initials
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="dpOption" checked={dpOption === 'upload'} onChange={() => setDpOption('upload')} />
                  Upload Picture 🖼️
                </label>
              </div>

              {dpOption === 'upload' && (
                <div style={{ marginTop: '10px' }}>
                  <input type="file" accept="image/*" onChange={(e) => setDpFile(e.target.files[0])} required />
                </div>
              )}
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>Apni Aawaz (Audio File) *:</label>
              <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} required />
            </div>

            <button type="submit" className="vote-btn" disabled={loading} style={{ padding: '14px' }}>
              {loading ? 'Upload Ho Raha Hai...' : 'Mehfil me Shamil Hon 🎤'}
            </button>
          </form>
        )}

        {message && (
          <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', color: '#5c1522' }}>{message}</p>
        )}
      </div>
    </div>
  );
}