import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { runAutoPilotCheck } from './autoPilot';
import heroLogo from './assets/hero.png';
import './App.css';

export default function Register() {
  const [settings, setSettings] = useState(null);
  const [promotedList, setPromotedList] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');
  const [verifyPinInput, setVerifyPinInput] = useState('');

  const [name, setName] = useState('');
  const [instaHandle, setInstaHandle] = useState('');
  const [secretPin, setSecretPin] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [dpOption, setDpOption] = useState('none');
  const [dpFile, setDpFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    initPage();
  }, []);

  const initPage = async () => {
    const sData = await runAutoPilotCheck();
    if (sData) {
      setSettings(sData);
      if (sData.phase_end_time) updateCountdown(new Date(sData.phase_end_time).getTime());

      if (sData.phase === 'registration') {
        if (localStorage.getItem('mehfil_device_registered') === 'true') {
          setAlreadyRegistered(true);
        }
      } else if (sData.phase === 'next_round_upload') {
        const { data: winners } = await supabase
          .from('contestants')
          .select('*')
          .order('id', { ascending: true });
        if (winners) setPromotedList(winners);
      }
    }
  };

  const updateCountdown = (endTime) => {
    const interval = setInterval(() => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Samay समाप्त');
        clearInterval(interval);
      } else {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hrs}h : ${mins}m : ${secs}s`);
      }
    }, 1000);
  };

  // 1. Round 1 Registration (With 4-Digit Secret PIN)
  const handleNewRegistration = async (e) => {
    e.preventDefault();
    if (alreadyRegistered) return;

    if (secretPin.trim().length < 4) {
      setMessage('Kripya kam se kam 4-digit ka Secret PIN banayein!');
      return;
    }

    const cleanInsta = instaHandle.replace('@', '').trim();
    setLoading(true);
    setMessage('Aapki peshkash darj ho rahi hai...');

    try {
      const { data: existing } = await supabase.from('contestants').select('id').ilike('insta_handle', cleanInsta);
      if (existing && existing.length > 0) {
        setMessage('Is Instagram ID se pehle hi registration ho chuka hai!');
        setLoading(false);
        return;
      }

      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `audio_${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('audios').upload(audioFileName, audioFile);
      if (audioErr) throw audioErr;
      const { data: audioUrlData } = supabase.storage.from('audios').getPublicUrl(audioFileName);

      let finalDpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5c1522&color=fff&size=200`;
      if (dpOption === 'upload' && dpFile) {
        const dpExt = dpFile.name.split('.').pop();
        const dpFileName = `dp_${Date.now()}.${dpExt}`;
        const { error: dpErr } = await supabase.storage.from('audios').upload(dpFileName, dpFile);
        if (dpErr) throw dpErr;
        const { data: dpUrlData } = supabase.storage.from('audios').getPublicUrl(dpFileName);
        finalDpUrl = dpUrlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('contestants').insert([{
        name: name.trim(),
        contact: `@${cleanInsta}`,
        insta_handle: cleanInsta,
        secret_pin: secretPin.trim(),
        audio_url: audioUrlData.publicUrl,
        dp_url: finalDpUrl,
        song_updated: true
      }]);

      if (dbError) throw dbError;

      localStorage.setItem('mehfil_device_registered', 'true');
      setAlreadyRegistered(true);
      setMessage('Mubarak ho! Aap Mehfil-e-Gayak mein shamil ho gaye hain. Apna Secret PIN yaad rakhein! 🎤');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Promoted Winner Uploading New Song (PROTECTED BY SECRET PIN & LOCK)
  const handleWinnerNewSongUpload = async (e) => {
    e.preventDefault();
    if (!selectedWinnerId || !audioFile) {
      setMessage('Apna naam, Secret PIN aur nayi audio file chunein!');
      return;
    }

    // Selected winner dhoondhna
    const targetWinner = promotedList.find(w => String(w.id) === String(selectedWinnerId));
    if (!targetWinner) return;

    // Check 1: Agar pehle hi naya gaana upload ho chuka hai toh lock rakho
    if (targetWinner.song_updated) {
      setMessage('🔒 Aapka naya gaana pehle hi upload hokar Lock ho chuka hai! Badalne ke liye Admin se sampark karein.');
      return;
    }

    // Check 2: Secret PIN Match Karna
    if (String(targetWinner.secret_pin).trim() !== String(verifyPinInput).trim()) {
      setMessage('❌ Galat Secret PIN! Aap kisi aur fankaar ki ID se gaana upload nahi kar sakte!');
      return;
    }

    setLoading(true);
    setMessage('PIN Verified ✅! Agle round ke liye aapka naya gaana upload ho raha hai...');

    try {
      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `round_audio_${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('audios').upload(audioFileName, audioFile);
      if (audioErr) throw audioErr;

      const { data: audioUrlData } = supabase.storage.from('audios').getPublicUrl(audioFileName);

      const { error: updateErr } = await supabase
        .from('contestants')
        .update({
          audio_url: audioUrlData.publicUrl,
          song_updated: true
        })
        .eq('id', selectedWinnerId);

      if (updateErr) throw updateErr;

      setMessage('🎉 Naya gaana safaltapurvak upload aur Lock ho gaya! Admin verification ke baad battle shuru hogi.');
      setVerifyPinInput('');
      setSelectedWinnerId('');
      initPage();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
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
      <p className="subtitle">
        {settings?.phase === 'next_round_upload' 
          ? `🔥 ${settings.round_name}: Promoted Winners Naya Gaana Upload Karein!` 
          : 'Fankaar Registration'}
      </p>

      {timeLeft && timeLeft !== 'Samay समाप्त' && (
        <div className="timer-pill">⏳ Samay Bacha Hai: {timeLeft}</div>
      )}

      <div className="battle-arena-vertical" style={{ textAlign: 'left' }}>
        
        {/* CASE 1: PROMOTED WINNERS UPLOADING NEW SONG (WITH PIN SECURITY) */}
        {settings?.phase === 'next_round_upload' ? (
          <form onSubmit={handleWinnerNewSongUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fff9e6', padding: '12px', borderRadius: '8px', border: '1px solid #f39c12', fontSize: '0.88rem' }}>
              🏆 <strong>Security Lock Enabled:</strong> Apna naya gaana upload karne ke liye wahi <strong>4-Digit Secret PIN</strong> daalein jo aapne Round 1 Registration ke waqt banaya tha.
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Promoted Winner (Apna Naam Chunein) *:</label>
              <select 
                value={selectedWinnerId} 
                onChange={(e) => setSelectedWinnerId(e.target.value)} 
                style={inputStyle} 
                required
              >
                <option value="">-- Apna Naam Select Karein --</option>
                {promotedList.map(w => (
                  <option key={w.id} value={w.id} disabled={w.song_updated}>
                    {w.name} ({w.contact}) {w.song_updated ? '🔒 [Song Uploaded & Locked]' : '⏳ [Upload Pending]'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Aapka 4-Digit Secret PIN *:</label>
              <input 
                type="password" 
                maxLength={6}
                value={verifyPinInput} 
                onChange={(e) => setVerifyPinInput(e.target.value)} 
                placeholder="Apna Secret PIN daalein..." 
                style={inputStyle} 
                required 
              />
              <small style={{ color: '#777' }}>*Agar PIN bhool gaye hain, toh Admin se poochein.</small>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>
                {settings.round_name} ka Naya Gaana (Audio File) *:
              </label>
              <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} required />
            </div>

            <button type="submit" className="vote-btn" disabled={loading} style={{ padding: '14px' }}>
              {loading ? 'Verify & Upload Ho Raha Hai...' : `Verify PIN & Submit Song 🔒`}
            </button>
          </form>
        ) : settings?.phase === 'registration' && timeLeft !== 'Samay समाप्त' ? (
          
          /* CASE 2: ROUND 1 NEW REGISTRATION */
          alreadyRegistered ? (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <h3 style={{ color: '#27ae60', marginBottom: '8px' }}>✅ Aapki Entry Darj Ho Chuki Hai!</h3>
              <p style={{ color: '#666', fontSize: '0.95rem' }}>
                Apna Secret PIN yaad rakhein—agle rounds mein naya gaana upload karne ke liye usi PIN ki zarurat padegi!
              </p>
            </div>
          ) : (
            <form onSubmit={handleNewRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Aapka Naam (Stage Name) *:</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jaise: Tansen..." style={inputStyle} required />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Instagram Username (Mandatory) *:</label>
                <input type="text" value={instaHandle} onChange={(e) => setInstaHandle(e.target.value)} placeholder="Jaise: @aakash_music" style={inputStyle} required />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Create 4-Digit Secret PIN (Agle Rounds ke liye) *:</label>
                <input 
                  type="password" 
                  maxLength={6}
                  value={secretPin} 
                  onChange={(e) => setSecretPin(e.target.value)} 
                  placeholder="Jaise: 1234" 
                  style={inputStyle} 
                  required 
                />
                <small style={{ color: '#777' }}>*Jab aap Round 1 jeet kar agle round mein jayenge, toh naya song upload karne ke liye ye PIN manga jayega.</small>
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
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <h3 style={{ color: '#5c1522', marginBottom: '8px' }}>🔒 Registration Abhi Band Hai</h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Abhi maidan mein Battles chal rahi hain! Jaise hi ye round khatam hoga, jeetne wale fankaaron ke liye naya gaana upload karne ka darwaza khulega.
            </p>
          </div>
        )}

        {message && (
          <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', color: '#5c1522' }}>{message}</p>
        )}
      </div>
    </div>
  );
}