import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, updateProfile as fbUpdateProfile } from 'firebase/auth';
import { auth, saveLevelResult, getUserLastLevel, getLeaderboard, saveLeaderboardRealtime, getRealtimeLeaderboard, subscribeRealtimeLeaderboard, saveUserProfile } from '../firebase/firebaseConfig';
import { getUserLevels } from '../firebase/firebaseConfig';

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // persist basic profile info to Firestore for richer leaderboard/user data
      if (u && u.uid) {
        try { saveUserProfile(u.uid, { displayName: u.displayName || null, email: u.email || null, photoURL: u.photoURL || null }); } catch (e) { /* ignore */ }
      }
    });
    return () => unsubscribe();
  }, []);

  async function logout() {
    await firebaseSignOut(auth);
    setUser(null);
  }

  async function updateProfile(uid, profile = {}) {
    if (!uid && !user) throw new Error('No user to update');
    const theUid = uid || user.uid;
    try {
      // persist into Firestore
      await saveUserProfile(theUid, profile);
      // also update Firebase Auth profile when available
      try {
        if (auth && auth.currentUser) {
          await fbUpdateProfile(auth.currentUser, { displayName: profile.displayName || auth.currentUser.displayName || null, photoURL: profile.photoURL || auth.currentUser.photoURL || null });
          // refresh local user state
          setUser({ ...auth.currentUser });
        }
      } catch (e) {
        // non-fatal
        console.warn('fb updateProfile failed', e?.message || e);
      }
      return true;
    } catch (e) {
      console.warn('updateProfile failed', e?.message || e);
      return false;
    }
  }

  async function saveLevel(uid, levelData) {
    if (!user && !uid) throw new Error('No authenticated user');
    const id = await saveLevelResult(uid || user.uid, levelData);
    // NOTE: saveLevelResult already writes to the realtime leaderboard (if available),
    // so we avoid duplicating writes here.
    return id;
  }

  async function getLastLevel(uid) {
    return getUserLastLevel(uid || (user && user.uid));
  }

  async function getLevels(uid, limitNumber = 5) {
    return getUserLevels(uid || (user && user.uid), limitNumber);
  }

  async function leaderboard(limitNumber = 10) {
    // prefer realtime leaderboard (more real-time) but fall back to Firestore
    try {
      const r = await getRealtimeLeaderboard(limitNumber);
      if (r && r.length) return r;
    } catch (e) {}
    return getLeaderboard(limitNumber);
  }

  function subscribeLeaderboard(onUpdate, limitNumber = 10) {
    try {
      return subscribeRealtimeLeaderboard(onUpdate, limitNumber);
    } catch (e) {
      console.warn('subscribeLeaderboard failed', e?.message || e);
      return () => {};
    }
  }

  const value = {
    user,
    loading,
    logout,
    saveLevel,
    getLastLevel,
    getLevels,
    leaderboard,
    subscribeLeaderboard,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserContext;
