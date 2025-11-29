import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import {
  GiPartyPopper,
  GiBullseye,
  GiSandsOfTime,
  GiRocket,
} from 'react-icons/gi';

import '../styles/home.css';
import Chatbot from './Chatbot';

export default function Home() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handlePlay() {
    setOpen(true);
  }

  function startGame() {
    if (!name || name.trim().length < 1) {
      setError('Please enter a display name');
      return;
    }
    localStorage.setItem('popmaster_playerName', name.trim());
    setOpen(false);
    navigate('/game');
  }

  return (
    <>
    <div className="home-root">
      <motion.div
        className="home-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Title */}
        <motion.h1
          className="home-title"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'backOut' }}
        >
          Pop Master 🎈
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="home-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          The ultimate fast-paced, colorful balloon popping challenge.  
          Beat levels, react fast, and climb the leaderboard!
        </motion.p>

        {/* Feature Cards */}
        <div className="home-row">
          {[
            {
              icon: <GiPartyPopper size={48} />,
              title: 'Fun',
              desc: 'Bright colors, smooth pops & cool animations.',
            },
            {
              icon: <GiBullseye size={48} />,
              title: 'Focus',
              desc: 'Pop only the target balloon — accuracy matters!',
            },
            {
              icon: <GiSandsOfTime size={48} />,
              title: 'Fast',
              desc: 'Each level gets harder. Test your reflexes!',
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              className="home-card"
              whileHover={{
                scale: 1.08,
                rotateX: 8,
                rotateY: -8,
                boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <div className="home-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Rules */}
        <motion.div
          className="home-rules"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h4>How to Play</h4>
          <ol>
            <li>Pop the balloon that matches the shown target color.</li>
            <li>You get <b>3 chances</b> per level.</li>
            <li>Balloon speed & movement increase every level.</li>
            <li>Your score & level get saved to Firestore automatically.</li>
          </ol>
        </motion.div>

        {/* Play Button */}
        <motion.div
          style={{ marginTop: 26 }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <motion.div whileHover={{ scale: 1.09 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="contained"
              endIcon={<GiRocket />}
              size="large"
              onClick={handlePlay}
              className="play-btn"
            >
              Play Now
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Name Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Enter your player name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Player name"
            fullWidth
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            helperText={error}
            error={Boolean(error)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={startGame}>
            Start
          </Button>
        </DialogActions>
      </Dialog>
    </div>

      {/* Chatbot assistant (rule-based, no external API) */}
      <Chatbot />
    </>
  );
}
