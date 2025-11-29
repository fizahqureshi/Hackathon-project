
import React from 'react';
import { motion } from 'framer-motion';
import styles from '../styles/balloon.module.css';

/**
 * Balloon component
 * Props:
 *  - id, color, size, power (optional), onPop
 */
export default function Balloon({ id, color = '#FF3366', size = 64, onPop = ()=>{}, power = null }) {
  const s = Math.max(26, Math.min(size, 120)); // clamp size

  // Use a spring for scale but a tween for multi-keyframe rotate arrays.
  // Framer Motion only allows two keyframes with spring/inertia; multi-keyframes must use tween.
  const hover = {
    scale: 1.08,
    rotate: [-3, 3, 0],
    transition: {
      // spring for scale for a bouncy feel
      scale: { type: 'spring', stiffness: 380, damping: 24 },
      // rotate uses tween because it has more than two frames
      rotate: { type: 'tween', duration: 0.45, ease: 'easeInOut' },
    },
  };
  const tap = { scale: 0.88, rotate: 0, transition: { duration: 0.12 } };
  const focusStyle = { boxShadow: '0 0 0 8px rgba(255,255,255,0.04)' };

  // power styling (golden highlight)
  const isPower = power === 'gold';
  const ring = isPower ? { boxShadow: `0 10px 28px ${color}33, 0 0 0 6px #ffd70055` } : {};

  return (
    <motion.button
      className={styles.balloonButton}
      style={{
        width: s,
        height: s * 1.25,
        background: color,
        borderRadius: '999px',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        boxShadow: `0 8px 20px ${color}33, inset 0 -6px 14px rgba(0,0,0,0.18)`,
        transformOrigin: 'center bottom',
        ...ring
      }}
      whileHover={hover}
      whileTap={tap}
      onClick={onPop}
      aria-label={`Balloon ${color}`}
      whileFocus={focusStyle}
    >
      <svg className={styles.balloonSvg} viewBox="0 0 100 125" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)"/>
            <stop offset="60%" stopColor="rgba(255,255,255,0.06)"/>
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="40" rx="36" ry="30" fill={`url(#g-${id})`} />
        <ellipse cx="62" cy="30" rx="8" ry="5" fill="rgba(255,255,255,0.6)" />
        <path d="M46 86 Q50 100 54 86" stroke="rgba(0,0,0,0.06)" strokeWidth="2" fill="none" />
        {isPower && (
          <g transform="translate(6,6)">
            <circle cx="84" cy="12" r="9" fill="#FFD700" stroke="#fff3" strokeWidth="1"/>
            <text x="84" y="16" fontSize="10" textAnchor="middle" fill="#6a3e00" fontWeight="700">★</text>
          </g>
        )}
      </svg>
    </motion.button>
  );
}
