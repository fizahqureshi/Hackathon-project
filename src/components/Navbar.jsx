import React, { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function Navbar() {
  const { user, logout, getLastLevel } = useUser();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastLevel, setLastLevel] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // load last level progress for small progress indicator
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user && getLastLevel) {
          const last = await getLastLevel();
          if (mounted) setLastLevel(last);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, [user, getLastLevel]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  function toggleDrawer(open) {
    setDrawerOpen(open);
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={3}
        sx={{
          background: 'linear-gradient(90deg, rgba(123,47,247,0.18), rgba(229,46,113,0.14))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px) saturate(120%)',
        }}
      >
        <Toolbar sx={{display:'flex', alignItems:'center', gap:2}}>
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <SportsEsportsIcon sx={{ color: 'black', fontSize: 28 }} />
          </motion.div>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'black', fontWeight:700, letterSpacing:0.6 }}>
            <span style={{marginRight:6, color:'black'}}>Pop</span>
            <span style={{marginLeft:6, color:'black', opacity:0.9}}>Master</span>
          </Typography>

          {!isMobile ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="contained" color="primary" onClick={() => navigate('/game')} sx={{bgcolor:'#7b2ff7', color:'black', boxShadow:'0 8px 24px rgba(123,47,247,0.18)'}}>Play</Button>
              <Button variant="outlined" onClick={() => navigate('/leaderboard')} sx={{color:'black', borderColor:'rgba(0,0,0,0.12)'}}>Leaderboard</Button>
              <Tooltip title={user ? user.email : 'Not signed in'}>
                <IconButton onClick={handleOpen} sx={{ p: 0, ml:1 }}>
                  <Avatar alt={user?.displayName || 'U'} src={user?.photoURL || ''} sx={{width:40, height:40, boxShadow:'0 8px 20px rgba(0,0,0,0.5)'}}/>
                </IconButton>
              </Tooltip>
              {lastLevel ? (
                <Box sx={{width:120, ml:1}}>
                  <Typography variant="caption" sx={{color:'rgba(0,0,0,0.8)'}}>Level {lastLevel.level}</Typography>
                  <LinearProgress variant="determinate" value={(lastLevel.level/10)*100} sx={{height:6, borderRadius:2, background:'rgba(0,0,0,0.04)'}} />
                </Box>
              ) : null}
            </Stack>
          ) : (
            <IconButton edge="end" onClick={()=>toggleDrawer(true)} sx={{color:'black'}}>
              <MenuIcon sx={{color:'black'}} />
            </IconButton>
          )}

          <Drawer anchor="right" open={drawerOpen} onClose={()=>toggleDrawer(false)}>
            <Box sx={{width:220, p:2, background:'linear-gradient(180deg,#10041a,#1b0033)', height:'100%'}}>
              <List>
                <ListItem button onClick={() => { navigate('/game'); toggleDrawer(false); }}>
                  <ListItemText primary="Play" />
                </ListItem>
                <ListItem button onClick={() => { navigate('/leaderboard'); toggleDrawer(false); }}>
                  <ListItemText primary="Leaderboard" />
                </ListItem>
                <ListItem button onClick={() => { navigate('/settings'); toggleDrawer(false); }}>
                  <ListItemText primary="Settings" />
                </ListItem>
                <ListItem button onClick={async ()=>{ await logout(); toggleDrawer(false); navigate('/login'); }}>
                  <ListItemText primary="Logout" />
                </ListItem>
              </List>
            </Box>
          </Drawer>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} PaperProps={{sx:{background:'rgba(25,8,40,0.95)', color:'#fff'}}}>
            <MenuItem onClick={() => { handleClose(); navigate('/settings'); }}>Settings</MenuItem>
            <MenuItem onClick={() => { handleClose(); navigate('/'); }}>Home</MenuItem>
            <MenuItem onClick={async () => { handleClose(); await logout(); navigate('/login'); }}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
