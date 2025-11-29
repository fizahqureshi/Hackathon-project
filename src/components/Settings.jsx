import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, FormControlLabel, Switch, TextField, Button } from '@mui/material';
import { useUser } from '../context/UserContext';

export default function Settings(){
  const [music, setMusic] = useState(true);
  const [vibrate, setVibrate] = useState(true);
  const { user, updateProfile } = useUser();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=>{
    if (user && user.displayName) setDisplayName(user.displayName);
  },[user]);

  async function handleSave(e){
    e.preventDefault();
    setSaving(true); setMsg('');
    try{
      const ok = await updateProfile(null, { displayName: displayName || null });
      if (ok) setMsg('Saved'); else setMsg('Save failed');
    }catch(e){ setMsg('Save failed'); }
    setSaving(false);
  }

  return (
    <div style={{padding:20}}>
      <Card sx={{maxWidth:720, margin:'0 auto', background:'rgba(255,255,255,0.03)', color:'#fff'}}>
        <CardContent>
          <Typography variant="h5">Settings</Typography>
          <div style={{marginTop:12}}>
            <FormControlLabel control={<Switch checked={music} onChange={(e)=>setMusic(e.target.checked)} />} label="Enable music" />
          </div>
          <div>
            <FormControlLabel control={<Switch checked={vibrate} onChange={(e)=>setVibrate(e.target.checked)} />} label="Vibrate on pop" />
          </div>

          <form onSubmit={handleSave} style={{marginTop:18, display:'flex', flexDirection:'column', gap:12}}>
            <Typography variant="subtitle1">Display name</Typography>
            <TextField value={displayName||''} onChange={(e)=>setDisplayName(e.target.value)} placeholder="How should we call you?" />
            <div style={{display:'flex', gap:8}}>
              <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save name'}</Button>
              <Button variant="outlined" onClick={()=>{ setDisplayName(user?.displayName || ''); setMsg(''); }}>Reset</Button>
            </div>
            {msg && <div style={{color: msg === 'Saved' ? '#6ee7b7' : '#fca5a5'}}>{msg}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
