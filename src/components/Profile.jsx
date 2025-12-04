// src/components/Profile.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useSelector } from "react-redux";

export default function Profile() {
  const auth = useSelector(s=>s.auth);
  const [userDoc, setUserDoc] = useState(null);

  useEffect(()=>{
    if (!auth.user) return;
    (async ()=> {
      const d = doc(db, "users", auth.user.uid);
      const snap = await getDoc(d);
      if (snap.exists()) setUserDoc(snap.data());
    })();
  }, [auth.user]);

  return (
    <div>
      <h3>Welcome {auth.user?.displayName || auth.user?.email}</h3>
      <div>Last played: {userDoc?.lastPlayed ? new Date(userDoc.lastPlayed.seconds * 1000).toLocaleString() : "N/A"}</div>
    </div>
  );
}
