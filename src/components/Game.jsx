import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Typography, IconButton, Paper, Modal } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import FlagIcon from "@mui/icons-material/Flag";
import { useDispatch, useSelector } from "react-redux";
import { startLevel, popBalloon as popAction, missBalloon, endLevel, setLevel } from "../slices/gameSlice";
import Balloon from "./Balloon";
import PerformanceSummary from "./PerformanceSummary";
import { v4 as uuid } from "uuid";
import { saveLevelResult, saveSession, serverTimestamp } from "../firebase/firebaseConfig";
import "../styles/game.css";


export default function Game() {
  const dispatch = useDispatch();
  const auth = useSelector((s) => s.auth);
  const game = useSelector((s) => s.game);
  const { level: reduxLevel = 1, isPlaying } = game;

  const [level, setLocalLevel] = useState(reduxLevel);
  useEffect(() => setLocalLevel(reduxLevel), [reduxLevel]);

  const [balloons, setBalloons] = useState([]);
  const spawnTimer = useRef(null);

  const THEME_PALETTE = useMemo(() => ["#FF2D95", "#FF7AB6", "#4DA6FF", "#6A4BFF", "#00E5A8"], []);
  const levelActiveCounts = [5, 7, 9, 10, 12, 14, 15, 17, 18, 20];
  const levelConfigs = useMemo(() => [
    { spawnInterval: 950, speedRange: [6.6, 7.4], movement: "vertical", colorChanging: false, colorChangeSpeed: 1400 },
    { spawnInterval: 820, speedRange: [6.0, 6.8], movement: "lr", colorChanging: false, colorChangeSpeed: 1200 },
    { spawnInterval: 760, speedRange: [5.6, 6.2], movement: "ud", colorChanging: true, colorChangeSpeed: 1000 },
    { spawnInterval: 700, speedRange: [5.2, 6.0], movement: "lr", colorChanging: true, colorChangeSpeed: 900 },
    { spawnInterval: 640, speedRange: [4.6, 5.4], movement: "diagonal", colorChanging: true, colorChangeSpeed: 820 },
    { spawnInterval: 580, speedRange: [4.0, 4.8], movement: "lr", colorChanging: true, colorChangeSpeed: 720 },
    { spawnInterval: 520, speedRange: [3.6, 4.4], movement: "diagonal", colorChanging: true, colorChangeSpeed: 640 },
    { spawnInterval: 470, speedRange: [3.0, 3.8], movement: "lr", colorChanging: true, colorChangeSpeed: 560 },
    { spawnInterval: 420, speedRange: [2.6, 3.4], movement: "diagonal", colorChanging: true, colorChangeSpeed: 460 },
    { spawnInterval: 380, speedRange: [2.2, 3.0], movement: "diagonal", colorChanging: true, colorChangeSpeed: 360 },
  ], []);

  const cfg = levelConfigs[Math.max(0, Math.min(9, level - 1))];
  const maxOnScreen = levelActiveCounts[Math.max(0, Math.min(9, level - 1))];

  const [targetColor, setTargetColor] = useState(THEME_PALETTE[(level - 1) % THEME_PALETTE.length]);
  useEffect(() => { pickNewTarget(); }, [level]);

  const pickNewTarget = useCallback((avoid = null) => {
    const others = THEME_PALETTE.filter((c) => c !== (avoid ?? targetColor));
    if (others.length === 0) return;
    const pick = others[Math.floor(Math.random() * others.length)];
    setTargetColor(pick);
  }, [THEME_PALETTE, targetColor]);

  const spawnBalloon = useCallback(() => {
    if (balloons.length >= maxOnScreen) return;
    const id = uuid();
    const left = Math.max(3, Math.min(92, Math.random() * 92));
    const size = 90 + Math.random() * 36; 
    const duration = +(cfg.speedRange[0] + Math.random() * (cfg.speedRange[1] - cfg.speedRange[0])).toFixed(2);
    const initialColor = THEME_PALETTE[Math.floor(Math.random() * THEME_PALETTE.length)];
    const balloon = {
      id,
      left: Math.round(left * 100) / 100,
      size: Math.round(size),
      duration,
      color: initialColor,
      movement: cfg.movement,
      colorChanging: cfg.colorChanging,
      colorChangeSpeed: cfg.colorChangeSpeed,
      spawnedAt: Date.now(),
    };
    setBalloons((p) => [...p, balloon]);
    setTimeout(() => {
      setBalloons((prev) => prev.filter((b) => b.id !== id));
    }, (duration + 1.6) * 1000);

  }, [cfg, THEME_PALETTE, balloons.length, maxOnScreen]);

  const startSpawning = useCallback(() => {
    stopSpawning();
    spawnBalloon();
    spawnTimer.current = setInterval(spawnBalloon, cfg.spawnInterval);
  }, [cfg.spawnInterval, spawnBalloon]);

  const stopSpawning = useCallback(() => {
    if (spawnTimer.current) {
      clearInterval(spawnTimer.current);
      spawnTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) startSpawning(); else stopSpawning();
    return () => stopSpawning();
  
  }, [isPlaying, level]);

  const targetNeeded = useMemo(() => 5 + (level - 1) * 2, [level]);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [savedSession, setSavedSession] = useState(null);
  const [prevSession, setPrevSession] = useState(null);

  const handlePop = useCallback((balloon, isTarget, spawnedAt) => {
    const reaction = Date.now() - (spawnedAt || balloon.spawnedAt || Date.now());
    dispatch(popAction({ points: isTarget ? 20 : 5, isTarget, reactionTime: reaction }));
    setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));

    if (isTarget) {
      pickNewTarget(balloon.color);
    } else {
      if (Math.random() < 0.12) pickNewTarget();
    }
  }, [dispatch, pickNewTarget]);

  const handleMiss = useCallback((balloonId) => {
    setBalloons((prev) => prev.filter((b) => b.id !== balloonId));
    dispatch(missBalloon());
    pickNewTarget();
  }, [dispatch, pickNewTarget]);

  useEffect(() => {
    if (!isPlaying) return;
    if ((game.balloonsCorrect || 0) >= targetNeeded) {
      (async () => {
        dispatch(endLevel());
        stopSpawning();
        await saveAndShowSummary();
        if (level < 10) {
          setTimeout(() => {
            const next = level + 1;
            dispatch(setLevel(next));
            dispatch(startLevel({ level: next, sessionId: uuid() }));
          }, 900);
        }
      })();
    }
  
  }, [game.balloonsCorrect, isPlaying, level]);

  const handleStart = useCallback(() => {
    setBalloons([]);
    dispatch(startLevel({ level, sessionId: uuid() }));
  }, [dispatch, level]);


  const saveToFirebase = useCallback(async () => {
    if (!auth?.user) return null;
    const uid = auth.user.uid;
    const sessionData = {
      uid,
      level,
      score: game.score || 0,
      balloonsPopped: game.balloonsPopped || 0,
      balloonsCorrect: game.balloonsCorrect || 0,
      avgReaction: game.reactionTimes && game.reactionTimes.length ? Math.round(game.reactionTimes.reduce((a, b) => a + b, 0) / game.reactionTimes.length) : null,
      missed: (3 - (game.lives || 3)) || 0,
      createdAt: serverTimestamp(),
      playerName: auth.user.displayName || auth.user.email || "Guest",
      playerEmail: auth.user.email || null,
    };

    try {
      await saveLevelResult(uid, {
        level: sessionData.level,
        score: sessionData.score,
        attempts: 1,
        reactionTimes: game.reactionTimes || [],
        areas: null,
        playerName: sessionData.playerName,
        playerEmail: sessionData.playerEmail,
      });
    } catch (err) {
      console.warn("saveLevelResult failed:", err);
    }

    try {
      await saveSession(sessionData);
    } catch (err) {
      console.warn("saveSession failed:", err);
    }

    return sessionData;
  }, [auth, game, level]);

  const fetchPrevSession = useCallback(async (uid) => {
    try {
      return null; 
    } catch (err) {
      return null;
    }
  }, []);

  const saveAndShowSummary = useCallback(async () => {
    const saved = await saveToFirebase();
    setSavedSession(saved);
    if (auth?.user?.uid) {
      const prev = await fetchPrevSession(auth.user.uid);
      setPrevSession(prev);
    } else {
      setPrevSession(null);
    }
    setSummaryOpen(true);
  }, [saveToFirebase, fetchPrevSession, auth]);

  const handleRetryLevel = useCallback(() => {
    setSummaryOpen(false);
    setBalloons([]);
    dispatch(startLevel({ level, sessionId: uuid() }));
  }, [dispatch, level]);

  const handleNextLevel = useCallback(() => {
    setSummaryOpen(false);
    const next = Math.min(10, level + 1);
    dispatch(setLevel(next));
    dispatch(startLevel({ level: next, sessionId: uuid() }));
  }, [dispatch, level]);

  const handleFinishSave = useCallback(async () => {
    dispatch(endLevel());
    stopSpawning();
    await saveAndShowSummary();
  }, [dispatch, saveAndShowSummary, stopSpawning]);

  const prevLevel = useCallback(() => {
    const next = Math.max(1, level - 1);
    setLocalLevel(next);
    dispatch(setLevel(next));
  }, [dispatch, level]);

  const nextLevel = useCallback(() => {
    const next = Math.min(10, level + 1);
    setLocalLevel(next);
    dispatch(setLevel(next));
  }, [dispatch, level]);

  return (
    <>
      <Box className="neon-game-root">
        <Paper elevation={6} className="hud-top">
          <Box className="hud-left">
            <img src="/popmaster-small.png" alt="Pop Master" className="logo-small" />
            <Typography variant="h6" className="hud-title">Pop Master</Typography>
          </Box>

          <Box className="hud-center">
            <Typography className="hud-info">Level <strong>{level}</strong></Typography>
            <Typography className="hud-info">Score <strong>{game.score || 0}</strong></Typography>
            <Typography className="hud-info">Lives <strong>{game.lives || 0}</strong></Typography>
          </Box>

          <Box className="hud-right">
            <div className="target-box">
              <Typography sx={{ fontSize: 12, color: "#E7F7FF" }}>Target</Typography>
              <div className="target-swatch" style={{ background: targetColor }} />
            </div>
            <Box sx={{ ml: 2 }}>
              {!isPlaying ? (
                <Button variant="contained" onClick={() => { setBalloons([]); dispatch(startLevel({ level, sessionId: uuid() })); }} startIcon={<PlayArrowIcon />}>Play</Button>
              ) : (
                <Button variant="outlined" onClick={() => dispatch(endLevel())} startIcon={<StopIcon />}>Stop</Button>
              )}
            </Box>
          </Box>
        </Paper>

        <Box className="arena-wrap">
          <div className="arena-bg" />
          <div className="arena" role="region" aria-label="game arena">
            {balloons.map((b) => (
              <Balloon
                key={b.id}
                id={b.id}
                left={b.left}
                size={b.size}
                duration={b.duration}
                color={b.color}
                movement={b.movement}
                colorChanging={b.colorChanging}
                colorChangeSpeed={b.colorChangeSpeed}
                palette={THEME_PALETTE}
                targetColor={targetColor}
                spawnedAt={b.spawnedAt}
                onPop={(isTarget, spawnedAt, id) => handlePop(b, isTarget, spawnedAt)}
                onMiss={(id) => handleMiss(b.id)}
              />
            ))}
          </div>
        </Box>

        <Paper elevation={6} className="hud-bottom">
          <Box className="controls-left">
            <Button startIcon={<RestartAltIcon />} variant="outlined" onClick={() => { dispatch(endLevel()); setBalloons([]); dispatch(startLevel({ level, sessionId: uuid() })); }}>
              Retry
            </Button>
            <Button variant="outlined" sx={{ ml: 1 }} onClick={prevLevel}>Prev</Button>
            <Button variant="outlined" sx={{ ml: 1 }} onClick={nextLevel}>Next</Button>
          </Box>

          <Box className="controls-right">
            <Typography sx={{ color: "#DDEFF6", mr: 2, fontSize: 13 }}>Player: <strong>{auth?.user?.displayName || auth?.user?.email || "Guest"}</strong></Typography>
            <Button variant="contained" color="secondary" onClick={handleFinishSave} startIcon={<FlagIcon />}>Finish & Save</Button>
          </Box>
        </Paper>
      </Box>

      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)}>
        <Box sx={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: "min(96%, 760px)", outline: "none" }}>
          {savedSession ? (
            <PerformanceSummary
              session={savedSession}
              prevSession={prevSession}
              onRetryLevel={handleRetryLevel}
              onNextLevel={handleNextLevel}
              onClose={() => setSummaryOpen(false)}
            />
          ) : (
            <Paper sx={{ p: 3 }}>
              <Typography>Saving...</Typography>
            </Paper>
          )}
        </Box>
      </Modal>
    </>
  );
}
