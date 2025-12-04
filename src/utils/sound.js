export function playPopSound(success = true, volume = 0.18) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = success ? "sine" : "triangle";
    o.frequency.setValueAtTime(success ? 880 : 180, ctx.currentTime);

    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);

    o.connect(g);
    g.connect(ctx.destination);
    o.start();

    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    o.stop(ctx.currentTime + 0.25);
  } catch {}
}
