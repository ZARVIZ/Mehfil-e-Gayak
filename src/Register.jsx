import { useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  
  // DP States: 'none' | 'upload' | 'insta'
  const [dpOption, setDpOption] = useState('none');
  const [dpFile, setDpFile] = useState(null);
  const [instaHandle, setInstaHandle] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      setMessage('Kripya apni aawaz (audio file) select karein!');
      return;
    }

    setLoading(true);
    setMessage('Aapki peshkash darj ho rahi hai...');

    try {
      // 1. Audio File Upload Karna
      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `audio_${Date.now()}.${audioExt}`;
      
      const { error: audioErr } = await supabase.storage
        .from('audios')
        .upload(audioFileName, audioFile);

      if (audioErr) throw audioErr;

      const { data: audioUrlData } = supabase.storage
        .from('audios')
        .getPublicUrl(audioFileName);

      // 2. DP Decide aur Process Karna
      let finalDpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5c1522&color=fff&size=200`;

      if (dpOption === 'upload' && dpFile) {
        const dpExt = dpFile.name.split('.').pop();
        const dpFileName = `dp_${Date.now()}.${dpExt}`;

        const { error: dpErr } = await supabase.storage
          .from('audios')
          .upload(dpFileName, dpFile);

        if (dpErr) throw dpErr;

        const { data: dpUrlData } = supabase.storage
          .from('audios')
          .getPublicUrl(dpFileName);

        finalDpUrl = dpUrlData.publicUrl;
      } else if (dpOption === 'insta' && instaHandle.trim() !== '') {
        const cleanHandle = instaHandle.replace('@', '').trim();
        const fallbackUrl = encodeURIComponent(finalDpUrl);
        finalDpUrl = `https://unavatar.io/instagram/${cleanHandle}?fallback=${fallbackUrl}`;
      }

      // 3. Contestants Table mein Save Karna (Privacy ke sath)
      const { error: dbError } = await supabase
        .from('contestants')
        .insert([
          {
            name: name,
            contact: dpOption === 'insta' ? `@${instaHandle.replace('@', '')}` : 'Private',
            audio_url: audioUrlData.publicUrl,
            dp_url: finalDpUrl
          }
        ]);

      if (dbError) throw dbError;

      setMessage('Mubarak ho! Aap Mehfil-e-Gayak mein shamil ho gaye hain. 🎤');
      setName('');
      setAudioFile(null);
      setDpFile(null);
      setInstaHandle('');
      setDpOption('none');
      e.target.reset();
    } catch (error) {
      setMessage(`Kuch gadbad hui: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d4c4a8',
    fontSize: '1rem',
    boxSizing: 'border-box',
    marginTop: '6px'
  };

  return (
    <div className="mehfil-container">
      <h1>Mehfil-e-Gayak</h1>
      <p className="subtitle">Fankaar Registration</p>

      <div className="battle-arena-vertical" style={{ padding: '30px', textAlign: 'left' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div>
            <label style={{ fontWeight: 'bold', color: '#5c1522' }}>Aapka Naam (Stage Name):</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Jaise: Tansen..." 
              style={inputStyle}
              required 
            />
          </div>

          {/* DP Selection Radio Buttons */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>
              Apni Tasveer (DP) Kaise Dikhayein?
            </label>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#fdfbf7', padding: '12px', borderRadius: '8px', border: '1px solid #e2d5be' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="radio" 
                  name="dpOption" 
                  value="none" 
                  checked={dpOption === 'none'} 
                  onChange={() => setDpOption('none')} 
                />
                No DP (Naam ke Initials)
              </label>

              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="radio" 
                  name="dpOption" 
                  value="upload" 
                  checked={dpOption === 'upload'} 
                  onChange={() => setDpOption('upload')} 
                />
                Upload Photo 🖼️
              </label>

              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="radio" 
                  name="dpOption" 
                  value="insta" 
                  checked={dpOption === 'insta'} 
                  onChange={() => setDpOption('insta')} 
                />
                Instagram DP 📸
              </label>
            </div>

            {dpOption === 'upload' && (
              <div style={{ marginTop: '12px' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setDpFile(e.target.files[0])} 
                  required 
                />
              </div>
            )}

            {dpOption === 'insta' && (
              <div style={{ marginTop: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Instagram username (jaise: @rohan_music)" 
                  value={instaHandle} 
                  onChange={(e) => setInstaHandle(e.target.value)} 
                  style={inputStyle}
                  required 
                />
                <small style={{ color: '#777', display: 'block', marginTop: '4px' }}>
                  *Agar Insta DP load na ho payi, toh automatically aapke naam ke Initials dikhenge.
                </small>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontWeight: 'bold', color: '#5c1522', display: 'block', marginBottom: '8px' }}>
              Apni Aawaz (Audio File):
            </label>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => setAudioFile(e.target.files[0])} 
              required 
            />
          </div>

          <button type="submit" className="vote-btn" disabled={loading} style={{ marginTop: '10px', padding: '14px' }}>
            {loading ? 'Upload Ho Raha Hai...' : 'Mehfil me Shamil Hon'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', color: '#5c1522' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}