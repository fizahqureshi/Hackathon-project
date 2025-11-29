import React, { useEffect, useState } from "react";
import { FaCrown, FaSyncAlt } from "react-icons/fa";
import { useUser } from "../context/UserContext";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  Chip,
  Avatar,
  ListItemAvatar,
} from "@mui/material";

export default function Leaderboard({ leaderboard: initialLeaderboard = null, playerName: propPlayerName = "" }) {
  const { user, leaderboard: fallbackLeaderboard, getLevels } = useUser();
  const [rows, setRows] = useState(initialLeaderboard || []);
  const [loading, setLoading] = useState(false);
  const [userRows, setUserRows] = useState([]);

  const playerName = propPlayerName || user?.displayName || null;

  useEffect(() => {
    // If parent provided a leaderboard prop, use it; otherwise fetch from context
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (initialLeaderboard && initialLeaderboard.length) {
          setRows(initialLeaderboard);
        } else if (typeof fallbackLeaderboard === "function") {
          const data = await fallbackLeaderboard(10);
          if (mounted) setRows(data || []);
        } else {
          setRows([]);
        }
      } catch (e) {
        console.warn("Failed to load leaderboard", e);
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, [initialLeaderboard, fallbackLeaderboard]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || typeof getLevels !== "function") return setUserRows([]);
      try {
        const data = await getLevels(user.uid, 6);
        if (mounted) setUserRows(data || []);
      } catch (e) {
        if (mounted) setUserRows([]);
      }
    })();
    return () => (mounted = false);
  }, [user, getLevels]);

  const myBest = (userRows && userRows.length) ? Math.max(...userRows.map(r => r.score || 0)) : null;

  async function handleRefresh() {
    setLoading(true);
    try {
      if (typeof fallbackLeaderboard === "function") {
        const data = await fallbackLeaderboard(10);
        setRows(data || []);
      }
      if (user && typeof getLevels === "function") {
        const ur = await getLevels(user.uid, 6);
        setUserRows(ur || []);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ paddingTop: 18 }}>
      <Card sx={{ maxWidth: 920, margin: "0 auto", background: "rgba(255,255,255,0.03)" }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FaCrown /> Leaderboard
            </Typography>
            <Box>
              {playerName && myBest != null && (
                <Chip label={`You: ${playerName} • Best ${myBest}`} color="primary" sx={{ mr: 1 }} />
              )}
              <Button size="small" startIcon={<FaSyncAlt />} onClick={handleRefresh} disabled={loading}>
                Refresh
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}>Top players</Typography>

          {!rows || !rows.length ? (
            <Typography className="small text-muted">No leaderboard entries yet — play to create one!</Typography>
          ) : (
            <List>
              {rows.map((r, idx) => (
                <ListItem key={r.id || r.userId || idx} sx={{ background: (user && r.userId === user.uid) ? "rgba(99,102,241,0.06)" : "transparent", mb: 1, borderRadius: 1 }}>
                  <ListItemAvatar>
                    <Avatar src={r.photoURL || ""} alt={r.name || r.userId || "A"} />
                  </ListItemAvatar>
                  <ListItemText primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, minWidth: 40 }}>#{idx + 1}</Typography>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{r.name || r.playerName || r.userId || 'Anonymous'}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>L{r.level || '-'} • {r.ts ? new Date(r.ts).toLocaleDateString() : (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '')}</Typography>
                      </Box>
                    </Box>
                  } secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }} />
                  <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{r.score || 0}</Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}

          {userRows && userRows.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Your recent scores</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                {userRows.map((u, i) => (
                  <Chip key={i} label={`L${u.level || '-'} • ${u.score || 0}`} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
