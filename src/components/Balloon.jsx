import React from "react";
import { motion } from "framer-motion";

const NEON_GRADIENT = (id) => `
  <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
    <stop offset="60%" stop-color="rgba(255,255,255,0.06)" />
  </linearGradient>
`;

export default function Balloon({ id, color, size, power, onPop }) {
  const isPower = power === "gold";
  const s = Math.max(34, Math.min(size, 140));

  return (
    <motion.button
      className="balloon-btn"
      onClick={onPop}
      whileHover={{ scale: 1.06, rotate: [-4, 4, 0] }}
      whileTap={{ scale: 0.9 }}
      style={{
        width: s,
        height: s * 1.26,
        background: color,
      }}
    >
      <svg viewBox="0 0 100 125" className="balloon-svg">
        <defs dangerouslySetInnerHTML={{ __html: NEON_GRADIENT(`g-${id}`) }} />
        <ellipse cx="50" cy="40" rx="36" ry="30" fill={`url(#g-${id})`} />
        <ellipse cx="62" cy="30" rx="8" ry="5" fill="rgba(255,255,255,0.6)" />
        <path d="M46 86 Q50 100 54 86" stroke="rgba(0,0,0,0.06)" strokeWidth="2" fill="none" />

        {isPower && (
          <g transform="translate(6,6)">
            <circle cx="84" cy="12" r="9" fill="#FFD700" />
            <text
              x="84"
              y="16"
              fontSize="10"
              textAnchor="middle"
              fill="#6a3e00"
              fontWeight="700"
            >
              ★
            </text>
          </g>
        )}
      </svg>
    </motion.button>
  );
}
