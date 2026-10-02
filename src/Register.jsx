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

  // Form States
  const [mode, setMode] = useState('register'); // 'register' or 'update_audio'
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
    if (secretPin.trim().length < 4) {
      setMessage('Kripya kam se kam 4-digit ka Secret PIN banayein!');
      return;
    }

    const cleanInsta = instaHandle.replace(/^@+/, '').trim();
    
    setLoading(true);
    setMessage('Aapki peshkash darj ho rahi hai...');

    try {
      const { data: existing } = await supabase.from('contestants').select('id').ilike('insta_handle', cleanInsta);
      if (existing && existing.length > 0) {
        setMessage('Is Instagram ID se pehle hi registration ho chuka hai! Agar audio badalna hai, toh niche "Audio Update Karein" wale option par click karein.');
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
        song_updated: false
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

  // 2. Self Audio Update during Registration Phase using Secret PIN
  const handleSelfAudioUpdate = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      setMessage('Kripya nayi audio file chunein!');
      return;
    }

    const cleanInsta = instaHandle.replace(/^@+/, '').trim();
    setLoading(true);
    setMessage('Aapka naya gaana upload ho raha hai...');

    try {
      const { data: contestant } = await supabase
        .from('contestants')
        .select('*')
        .ilike('insta_handle', cleanInsta)
        .single();

      if (!contestant) {
        setMessage('❌ Is Instagram handle se koi registration nahi mili!');
        setLoading(false);
        return;
      }

      if (String(contestant.secret_pin).trim() !== String(secretPin).trim()) {
        setMessage('❌ Galat Secret PIN! Aap kisi aur ki entry update nahi kar sakte.');
        setLoading(false);
        return;
      }

      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `audio_update_${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('audios').upload(audioFileName, audioFile);
      if (audioErr) throw audioErr;

      const { data: audioUrlData } = supabase.storage.from('audios').getPublicUrl(audioFileName);

      const { error: updateErr } = await supabase
        .from('contestants')
        .update({ audio_url: audioUrlData.publicUrl })
        .eq('id', contestant.id);

      if (updateErr) throw updateErr;

      setMessage('🎉 Shandar! Aapka naya gaana safaltapurvak update ho gaya hai.');
      setSecretPin('');
      setAudioFile(null);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Promoted Winner Uploading New Song for Next Rounds
  const handleWinnerNewSongUpload = async (e) => {
    e.preventDefault();
    if (!selectedWinnerId || !audioFile) {
      setMessage('Apna naam, Secret PIN aur nayi audio file chunein!');
      return;
    }

    const targetWinner = promotedList.find(w => String(w.id) === String(selectedWinnerId));
    if (!targetWinner) return;

    if (targetWinner.song_updated) {
      setMessage('🔒 Aapka naya gaana pehle hi upload hokar Lock ho chuka hai!');
      return;
    }

    if (String(targetWinner.secret_pin).trim() !== String(verifyPinInput).trim()) {
      setMessage('❌ Galat Secret PIN!');
      return;
    }

    setLoading(true);
    setMessage('PIN Verified ✅! Agle round ke liye naya gaana upload ho raha hai...');

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

      setMessage('🎉 Naya gaana safaltapurvak upload aur Lock ho gaya!');
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
    border: '1px solid #d4c4a8', fontSize: '1rem', marginTop: '6px',
    boxSizing: 'border-box'
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

      <div className="battle-arena-vertical" style={{ textAlign: 'left', padding: '20px 15px' }}>
        
        {settings?.phase === 'next_round_upload' ? (
          <form onSubmit={handleWinnerNewSongUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fff9e6', padding: '12px', borderRadius: '8px', border: '1px solid #f39c12', fontSize: '0.88rem' }}>
              🏆 <strong>Security Lock Enabled:</strong> Apna naya gaana upload karne ke liye wahi <strong>4-Digit Secret PIN</strong> daalein.
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
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>
                {settings.round_name} ka Naya Gaana (Audio File) *:
              </label>
              <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} style={{ width: '100%', boxSizing: 'border-box' }} required />
            </div>

            <button type="submit" className="vote-btn" disabled={loading} style={{ padding: '14px', width: '100%', boxSizing: 'border-box' }}>
              {loading ? 'Upload Ho Raha Hai...' : `Verify PIN & Submit Song 🔒`}
            </button>
          </form>
        ) : settings?.phase === 'registration' && timeLeft !== 'Samay समाप्त' ? (
          
          <div>
            {/* Mode Selector Tabs during Registration */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button 
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: mode === 'register' ? '#5c1522' : '#fdfbf7',
                  color: mode === 'register' ? '#ffd700' : '#5c1522',
                  border: '1px solid #5c1522'
                }}
              >
                📝 New Registration
              </button>
              <button 
                type="button"
                onClick={() => setMode('update_audio')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: mode === 'update_audio' ? '#5c1522' : '#fdfbf7',
                  color: mode === 'update_audio' ? '#ffd700' : '#5c1522',
                  border: '1px solid #5c1522'
                }}
              >
                🔄 Audio Galat Ho Gayi? Update Karein
              </button>
            </div>

            {mode === 'register' ? (
              alreadyRegistered ? (
                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                  <h3 style={{ color: '#27ae60', marginBottom: '8px' }}>✅ Aapki Entry Darj Ho Chuki Hai!</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem' }}>
                    Agar aapko apna gaana badalna hai, toh upar <strong>"Audio Galat Ho Gayi? Update Karein"</strong> wale button par click karein.
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
                    <input type="text" value={instaHandle} onChange={(e) => setInstaHandle(e.target.value)} placeholder="Jaise: @fankaar_music" style={inputStyle} required />
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Create 4-Digit Secret PIN *:</label>
                    <input 
                      type="password" 
                      maxLength={6}
                      value={secretPin} 
                      onChange={(e) => setSecretPin(e.target.value)} 
                      placeholder="Jaise: 1234" 
                      style={inputStyle} 
                      required 
                    />
                    <small style={{ color: '#777', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>*Is PIN se aap apna gaana baad mein update bhi kar sakenge.</small>
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>Apni Tasveer (DP) Chunein:</label>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#fdfbf7', padding: '12px', borderRadius: '8px', border: '1px solid #e2d5be', boxSizing: 'border-box' }}>
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
                        <input type="file" accept="image/*" onChange={(e) => setDpFile(e.target.files[0])} style={{ width: '100%', boxSizing: 'border-box' }} required />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>Apni Aawaz (Audio File) *:</label>
                    <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} style={{ width: '100%', boxSizing: 'border-box' }} required />
                  </div>

                  <button type="submit" className="vote-btn" disabled={loading} style={{ padding: '14px', width: '100%', boxSizing: 'border-box' }}>
                    {loading ? 'Upload Ho Raha Hai...' : 'Mehfil me Shamil Hon 🎤'}
                  </button>
                </form>
              )
            ) : (
              /* Self Audio Update Form */
              <form onSubmit={handleSelfAudioUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#fff9e6', padding: '12px', borderRadius: '8px', border: '1px solid #f39c12', fontSize: '0.88rem' }}>
                  🔄 <strong>Audio Update:</strong> Agar aapne pehle registration ke waqt galat gaana daal diya tha, toh apna Instagram handle aur wahi <strong>Secret PIN</strong> daalkar naya sahi gaana upload karein.
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Aapka Instagram Username *:</label>
                  <input type="text" value={instaHandle} onChange={(e) => setInstaHandle(e.target.value)} placeholder="Jaise: @fankaar_music" style={inputStyle} required />
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Aapka 4-Digit Secret PIN *:</label>
                  <input 
                    type="password" 
                    maxLength={6}
                    value={secretPin} 
                    onChange={(e) => setSecretPin(e.target.value)} 
                    placeholder="Wahi PIN jo registration mein banaya tha..." 
                    style={inputStyle} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>Nayi Sahi Audio File *:</label>
                  <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} style={{ width: '100%', boxSizing: 'border-box' }} required />
                </div>

                <button type="submit" className="vote-btn" disabled={loading} style={{ padding: '14px', width: '100%', boxSizing: 'border-box' }}>
                  {loading ? 'Update Ho Raha Hai...' : 'Sahi Gaana Update Karein 🎵'}
                </button>
              </form>
            )}
          </div>

        ) : (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <h3 style={{ color: '#5c1522', marginBottom: '8px' }}>🔒 Registration Abhi Band Hai</h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Abhi maidan mein Battles chal rahi hain!
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