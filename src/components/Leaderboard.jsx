import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
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
} from '@mui/material';
import { motion } from 'framer-motion';
import { FaCrown, FaSyncAlt } from 'react-icons/fa';
import { 
  saveLeaderboardRealtime, 
  getTopLeaderboard, 
  getUsersByIds 
} from '../firebase/firebaseConfig';
import Avatar from '@mui/material/Avatar';
import ListItemAvatar from '@mui/material/ListItemAvatar';

export default function Leaderboard() {
  const { leaderboard: fallbackLeaderboard, subscribeLeaderboard, user, getLevels } = useUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRows, setUserRows] = useState([]);
  const [loadingUser, setLoadingUser] = useState(false);

  // --- Primary Leaderboard Load Logic (Realtime or Fallback) ---
  useEffect(() => {
    let mounted = true;

    // Define load function inside useEffect to satisfy dependency rules
    const load = async () => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
      
      try {
        // 1. Attempt to get the pre-aggregated top-N document for fast reads
        let data = await getTopLeaderboard();
        
        if (data && data.length) {
          // 2. Enrich with user profiles
          const uids = Array.from(new Set(data.map(d => d.userId).filter(Boolean)));
          if (uids.length) {
            try {
              const profiles = await getUsersByIds(uids);
              data = data.map(d => {
                const p = d.userId ? profiles[d.userId] : null;
                return { 
                  ...d, 
                  // Prioritize existing name, then profile display name, then user ID
                  name: d.name || (p && (p.displayName || p.name)) || d.userId, 
                  photoURL: (p && p.photoURL) || d.photoURL || null 
                };
              });
            } catch (e) {
              // Ignore profile enrich errors and use existing data
              console.warn("Failed to enrich leaderboard profiles:", e);
            }
          }
          if (mounted) setRows(data || []);

        } else {
          // 3. Fallback to querying the full leaderboard collection (slower)
          const fallback = await fallbackLeaderboard(10);
          if (mounted) setRows(fallback || []);
        }

      } catch (e) {
        console.error('Leaderboard load failed', e);
        if (mounted) {
          setError(e.message || 'Load failed');
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Use realtime subscription if available
    if (typeof subscribeLeaderboard === 'function') {
      const unsub = subscribeLeaderboard((data) => {
        if (!mounted) return;
        // The subscription handles the initial load and subsequent updates
        // We assume the subscription data is already enriched or needs no enrichment
        setRows(data || []);
        setLoading(false);
      }, 10);
      
      // Call load() as a guarantee if the subscription fails or takes too long to init
      // Note: If subscribeLeaderboard guarantees initial data, this line can be removed.
      load(); 

      return () => {
        mounted = false;
        if (typeof unsub === 'function') unsub();
      };
    }

    // Use simple async load if no realtime subscription is provided
    (async () => {
      await load();
    })();
    
    return () => (mounted = false);
  // Added all necessary function dependencies:
  }, [fallbackLeaderboard, subscribeLeaderboard]); 
  
  // --- Current User Scores Load Logic ---
  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      if (!user || !getLevels) {
        setLoadingUser(false); // Set to false if not logged in
        return setUserRows([]);
      }
      setLoadingUser(true);
      try {
        // Only load the last 6 scores for the current user
        const data = await getLevels(user.uid, 6);
        if (mounted) setUserRows(data || []);
      } catch (e) {
        console.warn('Failed to load user levels', e);
        if (mounted) setUserRows([]);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, [user, getLevels]); // Dependencies are correct

  // Using useCallback to create a stable reference for the manual refresh button
  const handleLoad = useCallback(() => {
    // Manually trigger the load function from the primary effect
    // By toggling a state, we can force the primary useEffect to run.
    // However, since `load` is internal to the effect, we redefine it here
    // for simplicity on the button click, which is less ideal.
    // For this example, we'll redefine the core logic for the button refresh:

    // This is a simplified version of the main `load` logic for manual refresh
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let data = await getTopLeaderboard();
        // Skip profile enrichment here for fast refresh display, or re-run the full logic:
        if (data && data.length) {
            setRows(data || []);
        } else {
            const fallback = await fallbackLeaderboard(10);
            setRows(fallback || []);
        }
      } catch (e) {
        setError(e.message || 'Refresh failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [fallbackLeaderboard]);


  return (
    <div
      style={{
        padding: '20px',
        minHeight: '70vh',
        background: 'linear-gradient(180deg, #eef2ff, #ffffff)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'start',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 820 }}
      >
        <motion.div
          whileHover={{
            scale: 1.02,
            rotateX: 3,
            rotateY: -3,
            transition: { type: 'spring', stiffness: 200 },
          }}
        >
          <Card
            sx={{
              background: '#ffffffdd',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              boxShadow:
                '0 10px 40px rgba(0,0,0,0.1), 0 0 12px rgba(99,102,241,0.4)',
            }}
          >
            <CardContent sx={{ color: '#000' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: '#000',
                  textShadow: 'none',
                }}
              >
                <FaCrown color="#000" /> Leaderboard
              </Typography>

              {loading && (
                <Typography sx={{ mt: 2, color: '#000', fontSize: 16 }}>
                  Loading leaderboard…
                </Typography>
              )}

              {/* Current user's recent scores */}
              {user && (
                <Box sx={{mt:2, mb:2, display:'flex', alignItems:'center', gap:1, flexWrap:'wrap'}}>
                  <Typography variant="subtitle2" sx={{color:'#000', mr:1}}>Your recent scores:</Typography>
                  {loadingUser ? (
                    <Typography variant="body2" sx={{color:'#6b7280'}}>Loading…</Typography>
                  ) : (userRows && userRows.length ? (
                    userRows.map((u,i)=>(
                      // Keying by score and level is okay for a small, non-reorderable list of the user's *own* scores
                      <Chip key={i} label={`L${u.level || '-'} • ${u.score || 0}`} size="small" sx={{bgcolor:'#eef2ff', color:'#000'}} />
                    ))
                  ) : (
                    <Typography variant="body2" sx={{color:'#6b7280'}}>No scores yet</Typography>
                  ))}
                </Box>
              )}

              {error && (
                <Typography sx={{ color: 'red', mt: 1 }}>{error}</Typography>
              )}

              {/* Empty state message */}
              {!loading && !rows.length && !error && (
                <div style={{ padding: 12 }}>
                  <Typography sx={{ color: '#000' }}>
                    No leaderboard entries yet.
                  </Typography>
                  <Typography sx={{ mt: 1, color: 'rgba(0,0,0,0.7)' }}>
                    Play the game & pop balloons, your score will appear here!
                  </Typography>
                  <div style={{display:'flex', gap:8, marginTop:12}}>
                    <Button
                      variant="contained"
                      sx={{
                        display: 'flex',
                        gap: 1,
                        bgcolor: '#fff',
                        color: '#000',
                        '&:hover': { bgcolor: '#f3f3f3' },
                      }}
                      onClick={handleLoad} // Use the stable useCallback function
                    >
                      <FaSyncAlt color="#000" /> Refresh
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={async ()=>{
                        try {
                          // Note: Using a stable, unique ID for the demo entry is better practice
                          const demoId = `demo-${Date.now()}`; 
                          await saveLeaderboardRealtime({ 
                            userId: demoId, 
                            name: 'Demo Player', 
                            level: Math.ceil(Math.random()*5), 
                            score: Math.floor(Math.random()*200), 
                            ts: Date.now() 
                          });
                          // reload using the stable load handler
                          handleLoad(); 
                        } catch (e) {
                          console.error('Demo push failed', e);
                        }
                      }}
                    >Add demo entry</Button>
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              <List>
                {rows.map((r, idx) => (
                  <motion.div
                    // Use a stable ID for the key (r.userId is preferred if unique per record)
                    key={r.id || r.userId || idx} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <ListItem
                      sx={{
                        borderBottom: '1px solid rgba(17, 16, 16, 0.06)',
                        py: 1.6,
                        // Highlight the current user's entry
                        bgcolor: (user && r.userId === user.uid) ? 'rgba(99,102,241,0.06)' : 'transparent'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={r.photoURL || ''} 
                          alt={r.name || r.userId || 'A'} 
                          sx={{width:40,height:40}} 
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 18,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <span style={{opacity:0.7}}>#{idx + 1}</span>
                            <span>{r.name || r.userId || 'Anonymous'}</span>
                          </span>
                        }
                        secondary={`🎯 Level ${r.level || '-'} • 🧨 Score ${r.score || 0}`}
                        primaryTypographyProps={{ style: { color: '#080808ff' } }}
                        secondaryTypographyProps={{ style: { color: 'rgba(231, 55, 55, 0.7)' } }}
                      />
                    </ListItem>
                  </motion.div>
                ))}
              </List>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}