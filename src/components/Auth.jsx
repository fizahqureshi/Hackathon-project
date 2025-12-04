import React, { useState, useEffect } from "react";
import { auth, googleProvider, db, serverTimestamp } from "../firebase/firebaseConfig";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { setUser, clearUser, setAuthError } from "../slices/authSlice";
import { Button, TextField, Box } from "@mui/material";

export default function Auth() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
            lastPlayed: null,
          });
        }
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }));
      } else {
        dispatch(clearUser());
      }
    });
    return () => unsub();
  }, [dispatch]);

  async function handleGoogle() {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      // handled in onAuthStateChanged
    } catch (err) {
      dispatch(setAuthError(err.message));
    }
  }

  async function handleEmailSignUp() {
    try {
      const u = await createUserWithEmailAndPassword(auth, email, pass);
  
    } catch (err) {
      dispatch(setAuthError(err.message));
    }
  }

  async function handleEmailSignIn() {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      dispatch(setAuthError(err.message));
    }
  }

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <TextField size="small" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)}/>
      <TextField size="small" placeholder="password" type="password" value={pass} onChange={e=>setPass(e.target.value)}/>
      <Button onClick={handleEmailSignIn} variant="outlined">Sign in</Button>
      <Button onClick={handleEmailSignUp} variant="contained">Sign up</Button>
      <Button onClick={handleGoogle} variant="contained">Sign in with Google</Button>
    </Box>
  );
}
