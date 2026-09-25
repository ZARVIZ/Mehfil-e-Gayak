import { useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !contact || !audioFile) {
      setStatus('Kripya saari details bharein aur gaana upload karein.');
      return;
    }
    
    setLoading(true);
    setStatus('Fankaar ki entry darj ho rahi hai... Kripya pratiksha karein.');

    try {
      // 1. Audio file ko Supabase Storage mein upload karna
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${Date.now()}_${name.replace(/\s+/g, '')}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audios')
        .upload(fileName, audioFile);

      if (uploadError) throw uploadError;

      // 2. Upload kiye hue gaane ka Public Link nikalna
      const { data: { publicUrl } } = supabase.storage
        .from('audios')
        .getPublicUrl(fileName);

      // 3. Fankaar ka naam aur link Database Table mein save karna
      const { error: dbError } = await supabase
        .from('contestants')
        .insert([{ name, contact, audio_url: publicUrl }]);

      if (dbError) throw dbError;

      setStatus('Mubarak ho! Aapki entry Mehfil-e-Gayak mein safalta-purvak ho gayi hai.');
      setName('');
      setContact('');
      setAudioFile(null);
    } catch (error) {
      setStatus(`Kuch gadbad hui: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mehfil-container">
      <h1>Mehfil-e-Gayak</h1>
      <p className="subtitle">Fankaar Registration</p>

      <div className="battle-arena-vertical" style={{ padding: '30px', textAlign: 'left' }}>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ fontFamily: 'Playfair Display', fontWeight: 'bold', color: '#5c1522' }}>Aapka Naam:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Aakash"
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #d4c4a8', fontFamily: 'Lora' }}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Playfair Display', fontWeight: 'bold', color: '#5c1522' }}>WhatsApp Number / Email:</label>
            <input 
              type="text" 
              value={contact} 
              onChange={(e) => setContact(e.target.value)} 
              placeholder="Aapse sampark karne ke liye"
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #d4c4a8', fontFamily: 'Lora' }}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Playfair Display', fontWeight: 'bold', color: '#5c1522' }}>Apni Aawaz (Audio File):</label>
            <input 
              type="file" 
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])} 
              style={{ width: '100%', padding: '10px', marginTop: '5px', fontFamily: 'Lora' }}
            />
          </div>

          <button type="submit" className="vote-btn" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Uploading...' : 'Mehfil me Shamil Hon'}
          </button>

          {status && (
            <p style={{ textAlign: 'center', marginTop: '15px', color: '#2c3e50', fontStyle: 'italic', fontWeight: 'bold' }}>
              {status}
            </p>
          )}

        </form>
      </div>
    </div>
  );
}