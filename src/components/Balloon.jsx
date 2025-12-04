import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { playPopSound } from "../utils/sound";

export default function Balloon({
  id,
  left = 10,
  size = 110, 
  duration = 6,
  color = "#FF2D95",
  movement = "vertical",
  colorChanging = false,
  colorChangeSpeed = 700,
  palette = ["#FF2D95", "#f10d05ff", "#fff34dff", "#6A4BFF", "#00E5A8"],
  targetColor = null,
  spawnedAt = Date.now(),
  onPop,
  onMiss,
}) {
  const [currentColor, setCurrentColor] = useState(color);
  const [popped, setPopped] = useState(false);
  const missTimer = useRef(null);
  const colorInterval = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    if (colorChanging) {
      colorInterval.current = setInterval(() => {
        const next = palette[Math.floor(Math.random() * palette.length)];
        setCurrentColor((prev) => (prev === next ? palette[(palette.indexOf(next) + 1) % palette.length] : next));
      }, colorChangeSpeed);
    } else {
      setCurrentColor(color);
    }

    
    missTimer.current = setTimeout(() => {
      if (!popped && mounted.current) {
        if (onMiss) onMiss(id);
      }
    }, (duration + 0.4) * 1000);

    return () => {
      mounted.current = false;
      if (colorInterval.current) clearInterval(colorInterval.current);
      if (missTimer.current) clearTimeout(missTimer.current);
    };
  
  }, []);

  const extraAnim = (() => {
    if (movement === "lr") return { x: [0, 18, -12, 8, 0] };
    if (movement === "diagonal") return { x: [0, 12, -8, 6, 0] };
    return { x: [0] };
  })();

  async function handleClick(e) {
    e.stopPropagation();
    if (popped) return;
    setPopped(true);
    if (missTimer.current) {
      clearTimeout(missTimer.current);
      missTimer.current = null;
    }

    const isTarget = targetColor ? currentColor === targetColor : false;

    try {
      playPopSound(isTarget, 0.18);
    } catch (err) {}
    (async () => {
      try {
        const lottie = (await import("lottie-web")).default;
        const container = document.createElement("div");
        container.style.position = "fixed";
        const px = Math.max(8, Math.min(window.innerWidth - 88, e.clientX - 40));
        const py = Math.max(8, Math.min(window.innerHeight - 88, e.clientY - 40));
        container.style.left = px + "px";
        container.style.top = py + "px";
        container.style.width = "88px";
        container.style.height = "88px";
        container.style.pointerEvents = "none";
        container.style.zIndex = 9999;
        document.body.appendChild(container);
        const anim = lottie.loadAnimation({ container, renderer: "svg", loop: false, autoplay: true, path: "/pop.json" });
        setTimeout(() => {
          try { anim.destroy(); } catch {}
          if (container.parentNode) container.parentNode.removeChild(container);
        }, 900);
      } catch (err) {}
    })();

    if (onPop) onPop(isTarget, spawnedAt, id);
  }

  const svgStyle = { filter: "drop-shadow(0 12px 30px rgba(106,75,255,0.12))" };

  return (
    <motion.div
      initial={{ y: "0%", opacity: 1, scale: 1 }}
      animate={
        popped
          ? { y: ["0%", "-12vh"], scale: [1, 1.35, 0.2], opacity: [1, 0.95, 0], ...extraAnim }
          : { ...extraAnim, y: ["100vh", "-140vh"] }
      }
      transition={popped ? { duration: 0.45, ease: "easeOut" } : { duration, ease: "linear", repeat: 0 }}
      style={{
        position: "absolute",
        bottom: -size,
        left: `${left}%`,
        width: size,
        height: size * 1.25,
        cursor: popped ? "default" : "pointer",
        pointerEvents: popped ? "none" : "auto",
        zIndex: popped ? 999 : 50,
        transformOrigin: "50% 90%",
      }}
      onClick={handleClick}
      role="button"
      aria-label="balloon"
    >
      <svg viewBox="0 0 100 140" width={size} height={size * 1.25} style={svgStyle}>
        <defs>
          <radialGradient id={`rad-${id}`} cx="30%" cy="28%" r="85%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="50%" stopColor={currentColor} stopOpacity="0.98" />
            <stop offset="100%" stopColor="#000A" stopOpacity="0.06" />
          </radialGradient>
          <linearGradient id={`g-${id}`} x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="65%" stopColor={currentColor} />
          </linearGradient>
          <filter id={`glow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

    
        <ellipse cx="50" cy="48" rx="40" ry="44" fill={currentColor} opacity="0.08" />
        <ellipse cx="50" cy="44" rx="36" ry="40" fill={`url(#g-${id})`} stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" filter={`url(#glow-${id})`} />

        <ellipse cx="62" cy="30" rx="10" ry="6" fill="rgba(255,255,255,0.72)" opacity="0.9" />
        <path d="M50 88 C49 96, 55 104, 50 114" stroke={currentColor} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.95" />

      
        <path d="M46 114 L54 114 L50 122 Z" fill={currentColor} />
        {targetColor && currentColor === targetColor ? (
          <g>
            <circle cx="50" cy="42" r="38" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="50" cy="42" r="46" fill="none" stroke={currentColor} strokeOpacity="0.05" strokeWidth="6" />
          </g>
        ) : null}
      </svg>
    </motion.div>
  );
}
