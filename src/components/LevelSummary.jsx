import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Typography } from '@mui/material';

export default function LevelSummary() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // simple confetti on mount
    const root = document.getElementById('level-summary-root');
    if (!root) return;
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = Math.random() * 80 + '%';
      el.style.top = Math.random() * 60 + '%';
      el.style.width = '8px';
      el.style.height = '12px';
      el.style.background = ['#ff4d4d', '#ffd24d', '#4ddbff', '#a14dff', '#4dff88'][Math.floor(Math.random() * 5)];
      el.style.opacity = '0.95';
      el.style.borderRadius = '2px';
      root.appendChild(el);
      const ttl = 1200 + Math.random() * 800;
      el.animate([
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: `translateY(${200 + Math.random() * 300}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], { duration: ttl, easing: 'ease-out' });
      setTimeout(() => el.remove(), ttl + 100);
    }
  }, []);

  if (!state) return <div style={{padding:20}}>No level data</div>;

  return (
    <div id="level-summary-root" style={{minHeight:'70vh', position:'relative', padding:20}}>
      <Card sx={{maxWidth:720, margin:'0 auto', background:'rgba(255,255,255,0.04)', color:'#fff'}}>
        <CardContent>
          <Typography variant="h5">Level {state.level} Summary</Typography>
          <Typography>Your Score: {state.score}</Typography>
          <Typography>Attempts: {state.attempts}</Typography>
          <Typography>Average Reaction: {state.reactionTimes && state.reactionTimes.length ? (state.reactionTimes.reduce((a,b)=>a+b,0)/state.reactionTimes.length).toFixed(2) : '—'}s</Typography>
          <Typography>Areas clicked: {JSON.stringify(state.areas)}</Typography>
          <Typography sx={{mt:2}}>AI Suggestion: {state.suggestion}</Typography>

          <div style={{display:'flex', gap:8, marginTop:12}}>
            <Button variant="contained" onClick={() => navigate('/game')}>Replay Level</Button>
            <Button variant="outlined" onClick={() => navigate('/')}>Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

