import React, { useMemo } from "react";
import { Box, Typography, Paper, Button, Divider } from "@mui/material";

export default function PerformanceSummary({ session, prevSession, onRetryLevel, onNextLevel, onClose }) {
  const accuracy = useMemo(() => {
    const total = session.balloonsPopped || (session.balloonsCorrect || 0) + (session.missed || 0);
    return total ? Math.round(((session.balloonsCorrect || 0) / total) * 100) : 0;
  }, [session]);

  const avgReaction = session.avgReaction ? Math.round(session.avgReaction) : null;

  const compare = useMemo(() => {
    if (!prevSession) return "no-prev";
    if (session.score > prevSession.score) return "better";
    if (session.score < prevSession.score) return "worse";
    return "same";
  }, [session, prevSession]);

  const suggestions = [];
  if (avgReaction && avgReaction > 800) suggestions.push("Work on reaction time — try focusing on the top-right area to anticipate spawns.");
  if (accuracy < 40) suggestions.push("Improve target selection: prioritize popping the target-color balloons.");
  if ((session.balloonsCorrect || 0) > (session.balloonsPopped || 0) * 0.6) suggestions.push("Great targeting — try increasing speed or move to next level.");
  if (suggestions.length === 0) suggestions.push("Nice! Keep practicing to further improve speed and accuracy.");

  return (
    <Paper sx={{ maxWidth: 680, mx: "auto", p: 3, borderRadius: 2, bgcolor: "rgba(6,8,20,0.92)" }}>
      <Typography variant="h6" sx={{ mb: 1, color: "#FFB6E6" }}>Level {session.level} — Performance Summary</Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "#9FE8FF" }}>Score</Typography>
          <Typography variant="h5">{session.score ?? 0}</Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "#9FE8FF" }}>Correct target hits</Typography>
          <Typography variant="h5">{session.balloonsCorrect ?? 0}</Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "#9FE8FF" }}>Avg reaction</Typography>
          <Typography variant="h5">{avgReaction ? `${avgReaction} ms` : "N/A"}</Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1, borderColor: "rgba(255,255,255,0.04)" }} />

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: "#9FE8FF" }}>Accuracy</Typography>
        <Typography>{accuracy}%</Typography>
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" sx={{ color: "#9FE8FF" }}>Compared to last session</Typography>
        <Typography>
          {compare === "no-prev" ? "No previous session to compare." : compare === "better" ? "You performed better than last time 🎉" : compare === "worse" ? "You performed worse than last time — keep trying!" : "Performance about the same."}
        </Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ color: "#9FE8FF" }}>Suggestions</Typography>
        {suggestions.map((s, i) => (
          <Typography key={i} sx={{ ml: 1 }}>• {s}</Typography>
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={onRetryLevel}>Retry Level</Button>
        <Button variant="contained" onClick={onNextLevel}>Next Level</Button>
        <Button variant="text" onClick={onClose}>Close</Button>
      </Box>
    </Paper>
  );
}
