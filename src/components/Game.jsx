import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Button, IconButton, LinearProgress, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import styles from '../styles/game.module.css';
import Balloon from './Balloon';
import { useUser } from '../context/UserContext';

const rnd = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const NEON_COLORS = ['#FF3366', '#33CCFF', '#FFCC33', '#9D33FF', '#33FF99', '#FF7AB6'];

function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateBalloons(count, level, difficulty = 1) {
  const sizeFactor = 1 + (difficulty - 1) * 0.12;
  return new Array(count).fill(0).map((_, i) => {
    const isPower = Math.random() < 0.06 + Math.min(0.12, level * 0.008); // more chance as levels grow
    const color = isPower ? '#FFD700' : choose(NEON_COLORS);
    return {
      id: `${Date.now()}_${i}_${Math.floor(Math.random()*9999)}`,
      color,
      x: rnd(6, 90),
      y: rnd(6, 78),
      size: Math.max(30, Math.round((100 - level * 4) / sizeFactor)),
      power: isPower ? 'gold' : null,
      speedSeed: rnd(0.6, 1.6),
    };
  });
}
const randomPath = (seed = 0) => ({
  x: [0, rnd(-18, 18) * (seed || 1), rnd(-10, 10) * (seed || 1), 0],
  y: [0, rnd(-8, 18) * (seed || 1), rnd(-14, 6) * (seed || 1), 0],
  rotate: [0, rnd(-10, 10), rnd(-6, 6), 0],
  rotateY: [0, rnd(0, 180), 0]
});

export default function Game() {
  const navigate = useNavigate();
  const { user, saveLevel, getLastLevel, getLevels } = useUser();
  const [params] = useSearchParams();
  const startLevel = Number(params.get('level')) || 1;

  const [level, setLevel] = useState(startLevel);
  const [difficulty, setDifficulty] = useState(0.85);
  const [balloons, setBalloons] = useState(() => generateBalloons(6, startLevel, difficulty));
  const [targetColor, setTargetColor] = useState('');
  const [score, setScore] = useState(0);
  const [chances, setChances] = useState(3);
  const [timeLeft, setTimeLeft] = useState(null);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const [reactionTimes, setReactionTimes] = useState([]);
  const [areas, setAreas] = useState({ top:0, bottom:0, left:0, right:0, center:0 });
  const statsRef = useRef({ rts: [], misses: 0, hits: 0, pops: 0 });
  const prevAvgRef = useRef(null);
  const levelStartRef = useRef(Date.now());
  const colorTimerRef = useRef(null);
  const finishingRef = useRef(false);
  const timedOutRef = useRef(false);

  const playerName = (typeof window !== 'undefined') ? (localStorage.getItem('popmaster_playerName') || (user && user.displayName) || 'Player') : 'Player';

  useEffect(() => {
    if (balloons.length) setTargetColor(choose(balloons.map(b=>b.color)));
    levelStartRef.current = Date.now();
  }, [balloons, level]);

  useEffect(() => {
    setBalloons(generateBalloons(6 + Math.floor(level/2), level, difficulty));
    setScore(0);
    setChances(3);
    setReactionTimes([]);
    setAreas({ top:0, bottom:0, left:0, right:0, center:0 });
    setCombo(0); setMaxCombo(0);
    finishingRef.current = false;
    timedOutRef.current = false;
    levelStartRef.current = Date.now();
    setTimeLeft(Math.max(18, Math.round(36 - (level - 1) * 1)));
  }, [level]);

  useEffect(() => {
    if (colorTimerRef.current) { clearInterval(colorTimerRef.current); colorTimerRef.current = null; }
    const baseMs = 8500;
    const intervalMs = Math.max(2800, Math.round(baseMs / (1 + (difficulty - 1) * 0.2)));
    colorTimerRef.current = setInterval(() => {
      setTargetColor(curr => {
        const pool = balloons.map(x=>x.color).filter(Boolean);
        if (!pool.length) return curr;
        return pool[Math.floor(Math.random() * pool.length)];
      });
    }, intervalMs);
    return () => { if (colorTimerRef.current) { clearInterval(colorTimerRef.current); colorTimerRef.current = null; } };
  }, [difficulty, balloons]);


  useEffect(() => {
    if (paused) return;
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      timedOutRef.current = true;
      setChances(0);
      return;
    }
    const t = setInterval(() => setTimeLeft(tl => Math.max(0, tl - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, timeLeft]);

  function adjustDifficulty() {
    const st = statsRef.current;
    if (!st || (!st.rts.length && !st.misses)) return;
    const recentRts = st.rts.slice(0, 10);
    const avgRT = recentRts.length ? recentRts.reduce((a,b)=>a+b,0)/recentRts.length : null;
    const hitRate = st.pops ? (st.hits / st.pops) : 0.5;
    let newDiff = difficulty;
    const targetRT = 0.6;
    if (avgRT) {
      const factor = targetRT / avgRT;
      newDiff = newDiff * clamp(factor, 0.97, 1.03);
    }
    if (st.misses >= 3 && hitRate < 0.6) newDiff = newDiff * 0.95;
    if (avgRT && prevAvgRef.current && avgRT < prevAvgRef.current * 0.92) newDiff = newDiff * 1.02;
    newDiff = clamp(newDiff, 0.75, 1.08);
    prevAvgRef.current = avgRT || prevAvgRef.current;
    const smoothed = difficulty + (newDiff - difficulty) * 0.045;
    if (Math.abs(smoothed - difficulty) > 0.002) setDifficulty(parseFloat(smoothed.toFixed(2)));
  }

  function recordArea(xPercent, yPercent) {
    if (yPercent < 33) setAreas(a => ({...a, top: a.top+1}));
    else if (yPercent > 66) setAreas(a => ({...a, bottom: a.bottom+1}));
    if (xPercent < 33) setAreas(a => ({...a, left: a.left+1}));
    else if (xPercent > 66) setAreas(a => ({...a, right: a.right+1}));
    if (xPercent >=33 && xPercent <=66 && yPercent >=33 && yPercent <=66) setAreas(a => ({...a, center: a.center+1}));
  }

  function recordStat(success, rt) {
    const st = statsRef.current;
    st.pops = (st.pops || 0) + 1;
    if (success) {
      st.hits = (st.hits || 0) + 1;
      if (rt != null) st.rts = [rt].concat(st.rts).slice(0, 20);
    } else {
      st.misses = (st.misses || 0) + 1;
    }
    if (st.pops % 4 === 0) adjustDifficulty();
  }


  function playTone(success) {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = success ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(success ? 880 : 160, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      o.stop(ctx.currentTime + 0.26);
    } catch(e){ /* ignore */ }
  }

  function spawnConfettiAt(xPercent, yPercent) {
    const root = document.getElementById('game-root');
    if (!root) return;
    for (let i=0;i<14;i++){
      const el = document.createElement('div');
      el.style.position='absolute';
      el.style.left = `${rnd(xPercent-6, xPercent+6)}%`;
      el.style.top = `${rnd(yPercent-6, yPercent+6)}%`;
      el.style.width='7px'; el.style.height='10px';
      el.style.background = choose(NEON_COLORS);
      el.style.opacity='0.95'; el.style.borderRadius='2px'; el.style.zIndex='9999';
      root.appendChild(el);
      const ttl = rnd(700,1200);
      el.animate([{transform:'translateY(0) rotate(0deg)', opacity:1},{transform:`translateY(${rnd(-120,240)}px) rotate(${rnd(-720,720)}deg)`, opacity:0}],{duration:ttl, easing:'cubic-bezier(.2,.9,.2,1)'});
      setTimeout(()=>el.remove(), ttl+50);
    }
  }

  function handlePop(b) {
    if (paused) return;
    const now = Date.now();
    const rt = (now - (levelStartRef.current || now)) / 1000;
    setReactionTimes(rts => [...rts, rt]);
    recordArea(b.x, b.y);
    if (navigator.vibrate) navigator.vibrate(28);

    if (b.power === 'gold') {
  
      setScore(s => s + 3 + (combo));
      setCombo(c => c + 1);
      setMaxCombo(m => Math.max(m, combo + 1));
      playTone(true);
      spawnConfettiAt(b.x, b.y);
      // remove and slightly slow down for 2s
      setBalloons(bs => bs.filter(x => x.id !== b.id));
      const old = difficulty;
      setDifficulty(d => Math.max(0.78, d - 0.06));
      setTimeout(()=> setDifficulty(old), 2000);
      // set new target quickly
      setTimeout(()=> setTargetColor(choose(balloons.filter(x=>x.id!==b.id).map(x=>x.color))), 220);
      recordStat(true, rt);
      return;
    }

    // normal balloon
    if (b.color === targetColor) {
      const points = 1 + Math.floor(Math.min(8, combo / 3)); // combo scales
      setScore(s => s + points);
      setCombo(c => c + 1);
      setMaxCombo(m => Math.max(m, combo + 1));
      recordStat(true, rt);
      playTone(true);
      spawnConfettiAt(b.x, b.y);
      setBalloons(bs => bs.filter(x => x.id !== b.id));
      setTimeout(()=> setTargetColor(choose(balloons.filter(x=>x.id!==b.id).map(x=>x.color))), 200);
    } else {
      setChances(c => c - 1);
      setCombo(0);
      recordStat(false, rt);
      playTone(false);
    }
  }

  // finish level flow
  useEffect(()=> {
    if (chances <= 0) finishLevel();
  }, [chances]);

  async function finishLevel() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const correct = score;
    const avgReaction = reactionTimes.length ? (reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 0;
    const analytics = { correct, avgReaction, areas, combo: maxCombo };
    let previous = null, history = [];
    try { previous = await getLastLevel(); } catch(e){}
    try { history = await getLevels(); } catch(e){}

    const suggestion = generateSuggestion(analytics, history, previous);
    const payload = {
      level, score: correct, attempts: 3 - chances, reactionTimes, areas, suggestion, playerName, timedOut: !!timedOutRef.current
    };
    timedOutRef.current = false;
    try { await saveLevel(user.uid, payload); } catch(e){ console.warn('save failed', e?.message || e); }
    navigate('/level-summary', { state: { ...payload } });
  }

  function generateSuggestion(analytics, history = [], previous) {
    const { areas, avgReaction, correct, combo } = analytics;
    const totalHits = Object.values(areas).reduce((a,b)=>a+b,0) || 1;
    const areaPercents = Object.keys(areas).reduce((acc,k)=>{ acc[k] = Math.round((areas[k]/totalHits)*100); return acc; },{});
    let maxArea = 'center';
    try { maxArea = Object.keys(areaPercents).reduce((a,b)=> areaPercents[a] > areaPercents[b] ? a : b); } catch {}
    let suggestion = `You focused ${maxArea} most (${areaPercents[maxArea] || 0}%). Try scanning edges to catch moving targets.`;
    if (history && history.length >= 2) {
      const reactions = history.map(h => (h.avgReaction || (h.reactionTimes?.length ? h.reactionTimes.reduce((a,b)=>a+b,0)/h.reactionTimes.length : null))).filter(x=>x!=null);
      if (reactions.length >= 2) {
        const diff = reactions[0] - reactions[reactions.length-1];
        suggestion += diff < 0 ? ' Reaction trend: getting faster.' : ' Reaction trend: slightly slower.';
      }
    }
    if (previous && previous.score !== undefined) {
      suggestion = (correct > previous.score ? 'Nice improvement! ' : 'Keep practicing — ') + suggestion;
    }
    suggestion += ' Tip: hitting streaks (combos) grant bonus points.';
    return suggestion;
  }

  // per-balloon motion props (duration scales with level+difficulty+seed)
  const motionPropsFor = (b) => {
    const base = 3.8;
    const dur = Math.max(1.1, base / (1 + (difficulty - 0.85) * 0.4) / b.speedSeed * (1 + level * 0.02));
    return {
      animate: randomPath(b.speedSeed),
      transition: { duration: dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
    };
  };

  // helpers
  function restartLevel() {
    setBalloons(generateBalloons(6 + Math.floor(level/2), level, difficulty));
    setScore(0); setChances(3); setReactionTimes([]); setAreas({ top:0, bottom:0, left:0, right:0, center:0 });
    setCombo(0); setMaxCombo(0); finishingRef.current = false; timedOutRef.current = false;
    levelStartRef.current = Date.now(); setTimeLeft(Math.max(12, 28 - (level - 1) * 2));
  }

  // responsive UI render
  return (
    <div id="game-root" className={styles.gameRoot}>
      <Box className={styles.header} sx={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:2}}>
        <div className={styles.brand}>
          <div className={styles.logo}>ColorPop</div>
          <div className={styles.meta}>
            <div className={styles.player}>{playerName}</div>
            <div className={styles.levelTag}>Level {level} • Difficulty {difficulty.toFixed(2)}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.statusRow}>
            <div className={styles.statusItem}><strong style={{color: targetColor}}>{targetColor ? `Target: ${targetColor}` : ''}</strong></div>
            <div className={styles.statusItem}>Score: {score}</div>
            <div className={styles.statusItem}>Combo: x{combo}</div>
            <div className={styles.statusItem}>Chances: {chances}</div>
            <div className={styles.statusItem}>Time: {timeLeft !== null ? `${timeLeft}s` : '--'}</div>
          </div>

          <div className={styles.buttonsRow}>
            <Tooltip title={paused ? "Resume" : "Pause"}>
              <IconButton onClick={()=>setPaused(p=>!p)} color="primary">{paused ? <PlayArrowIcon/> : <PauseIcon/>}</IconButton>
            </Tooltip>
            <Tooltip title={soundOn ? "Sound On" : "Sound Off"}>
              <IconButton onClick={()=>setSoundOn(s=>!s)} color="primary">{soundOn ? <VolumeUpIcon/> : <VolumeOffIcon/>}</IconButton>
            </Tooltip>
            <Tooltip title="Restart">
              <IconButton onClick={restartLevel} color="primary"><RestartAltIcon/></IconButton>
            </Tooltip>
            <Tooltip title="Next Level">
              <IconButton onClick={()=>{ if(level<10) setLevel(l=>l+1); else setLevel(1); }} color="primary"><SkipNextIcon/></IconButton>
            </Tooltip>
          </div>
        </div>
      </Box>

      <div className={styles.stage} role="application" aria-label="Game stage">
        {balloons.map((b) => (
          <motion.div
            key={b.id}
            className={styles.balloonWrap}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            {...motionPropsFor(b)}
          >
            <Balloon
              id={b.id}
              color={b.color}
              size={b.size}
              power={b.power}
              onPop={() => handlePop(b)}
            />
          </motion.div>
        ))}

        <div className={styles.hudGlow} aria-hidden />
      </div>

      <div className={styles.footerRow}>
        <LinearProgress variant="determinate" value={(level/10)*100} sx={{height:8, borderRadius:6, width:'60%'}} />
        <div className={styles.footerButtons}>
          <Button variant="outlined" onClick={restartLevel}>Restart</Button>
          <Button variant="contained" onClick={()=>{ if(level<10) setLevel(l=>l+1); }}>Next Level</Button>
        </div>
      </div>
    </div>
  );
}
