import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Box, Button, IconButton, LinearProgress } from "@mui/material";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import Balloon from "./Balloon";
import Leaderboard from "./Leaderboard";

import {
  auth,
  saveLevelResult,
  getTopLeaderboard,
} from "../firebase/firebaseConfig";

import { playPopSound } from "../utils/sound";
import "../styles/styles.css";

// Utility helpers
const NEON_COLORS = ["#FF3366", "#33CCFF", "#FFCC33", "#9D33FF", "#33FF99", "#FF7AB6"];
const rnd = (a, b) => Math.random() * (b - a) + a;
const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function PopBalloonApp() {
  // AUTH
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        setUserId(u.uid);
        setUserEmail(u.email || null);
      }
    });
    return () => unsub();
  }, []);

  // GAME STATES
  const [playerName, setPlayerName] = useState("Player");
  const [level, setLevel] = useState(1);
  const [balloons, setBalloons] = useState([]);
  const [targetColor, setTargetColor] = useState("");
  const [score, setScore] = useState(0);
  const [chances, setChances] = useState(3);
  const [timeLeft, setTimeLeft] = useState(null);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const levelStartRef = useRef(Date.now());
  const finishing = useRef(false);

  const LEVELS = 10;

  // ---- Balloon Generator ----
  function generateBalloons(count, levelNum) {
    return new Array(count).fill(0).map((_, i) => {
      const isPower = Math.random() < 0.1;

      return {
        id: `${Date.now()}_${i}`,
        color: isPower ? "#FFD700" : choose(NEON_COLORS),
        x: rnd(8, 92),
        y: rnd(10, 86),
        size: rnd(40, 110),
        power: isPower ? "gold" : null,
        speedSeed: rnd(0.7, 1.6),
      };
    });
  }

  // ---- Level Setup ----
  useEffect(() => {
    setScore(0);
    setCombo(0);
    setChances(3);
    setBalloons(generateBalloons(6 + Math.floor(level / 2), level));
    levelStartRef.current = Date.now();
    setTimeLeft(Math.max(12, 30 - (level - 1) * 2));
  }, [level]);

  // Read player name from local storage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem('popmaster_playerName');
      if (stored && stored.trim()) setPlayerName(stored.trim());
    } catch (e) {
      // ignore
    }
  }, []);

  // Load top leaderboard on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const lb = await getTopLeaderboard();
        if (mounted) setLeaderboard(lb || []);
      } catch (e) {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, []);

  // ---- Target Color ----
  useEffect(() => {
    if (!balloons.length) return;
    setTargetColor(choose(balloons.map((b) => b.color)));
  }, [balloons]);

  // ---- Timer ----
  useEffect(() => {
    if (paused || timeLeft == null) return;
    if (timeLeft <= 0) {
      setChances(0);
      return;
    }

    const t = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, timeLeft]);

  // ---- Pop Handler ----
  function handlePop(b) {
    if (paused) return;

    if (b.color === targetColor || b.power === "gold") {
      soundOn && playPopSound(true);
      setScore((s) => s + (b.power === "gold" ? 4 : 1));
      setCombo((c) => c + 1);
      setMaxCombo((m) => Math.max(m, combo + 1));
      setBalloons((bs) => bs.filter((x) => x.id !== b.id));
    } else {
      soundOn && playPopSound(false);
      setChances((c) => c - 1);
      setCombo(0);
    }
  }

  // ---- End Level ----
  useEffect(() => {
    if (chances <= 0) finishLevel();
  }, [chances]);

  async function finishLevel() {
    if (finishing.current) return;
    finishing.current = true;

    if (!userId) {
      console.warn("User not logged in → score not saved.");
    } else {
      const payload = {
        level,
        score,
        combo: maxCombo,
        playerName,
        playerEmail: userEmail,
      };

        // Save to Firestore
        await saveLevelResult(userId, payload);

        // Update leaderboard
        const lb = await getTopLeaderboard();
        setLeaderboard(lb);
    }

    // Next level
    if (level < LEVELS) setLevel((l) => l + 1);
    else setLevel(1);

    finishing.current = false;
  }

  // ---- Motion ----
  function randomPath(seed) {
    return {
      x: [0, rnd(-20, 20) * seed, rnd(-12, 12), 0],
      y: [0, rnd(-20, 20), rnd(-10, 10), 0],
      rotate: [0, rnd(-10, 10), rnd(-6, 6), 0],
    };
  }

  const motionFor = (b) => ({
    animate: randomPath(b.speedSeed),
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "mirror",
    },
  });

  return (
    <div id="pop-root" className="app-root">
      {/* HEADER */}
      <header className="app-header container-fluid py-3">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h3 className="logo">PopMaster</h3>
            <div className="meta small text-muted">
              Player: <strong>{playerName}</strong> • Level {level}/{LEVELS}
            </div>
          </div>

          <div className="d-flex gap-2">
            <div className="status-chip">Target: <span style={{ color: targetColor }}>{targetColor}</span></div>
            <div className="status-chip">Score: {score}</div>
            <div className="status-chip">Combo: x{combo}</div>
            <div className="status-chip">Lives: {chances}</div>
            <div className="status-chip">Time: {timeLeft}s</div>

            <IconButton onClick={() => setPaused((p) => !p)}>
              {paused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>

            <IconButton onClick={() => setSoundOn((s) => !s)}>
              {soundOn ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>

            <IconButton onClick={() => setLevel(level)}>
              <RestartAltIcon />
            </IconButton>
          </div>
        </div>
      </header>

      {/* GAME AREA */}
      <main className="container stage-wrap">
        <div className="stage">
          {balloons.map((b) => (
            <motion.div
              key={b.id}
              className="balloon-wrap"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              {...motionFor(b)}
            >
              <Balloon {...b} onPop={() => handlePop(b)} />
            </motion.div>
          ))}
        </div>

        {/* PROGRESS + NEXT */}
        <div className="d-flex justify-content-between mt-3">
          <LinearProgress
            variant="determinate"
            value={(level / LEVELS) * 100}
            sx={{ height: 8, borderRadius: 6, flex: 1 }}
          />

          <Button
            variant="contained"
            className="ms-2"
            onClick={() => setLevel((l) => (l < LEVELS ? l + 1 : 1))}
          >
            Next
          </Button>
        </div>

        {/* LEADERBOARD */}
        <Leaderboard leaderboard={leaderboard} playerName={playerName} />
      </main>

      <footer className="app-footer small text-center py-3">
        Built with ❤️ • Responsive • MUI + Framer Motion
      </footer>
    </div>
  );
}
