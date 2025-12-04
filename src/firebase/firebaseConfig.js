import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  getDatabase,
  ref as rdbRef,
  push as rdbPush,
  set as rdbSet,
  get as rdbGet,
  query as rdbQuery,
  orderByChild,
  limitToLast,
  onValue,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBJk-sivrx2rGNKUi3n2COrjaVtKg9tfHE",
  authDomain: "pop-master-221e9.firebaseapp.com",
  projectId: "pop-master-221e9",
  storageBucket: "pop-master-221e9.firebasestorage.app",
  messagingSenderId: "478224706445",
  appId: "1:478224706445:web:25b4564465c7e485e84d5f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rdb = getDatabase(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const saveScore = async (uid, displayName, score, level) => {
  await setDoc(
    doc(db, "leaderboard", uid),
    {
      uid,
      displayName,
      score,
      level,
      updatedAt: new Date(),
    },
    { merge: true }
  );
};

export const fetchLeaderboard = async () => {
  const q = query(
    collection(db, "leaderboard"),
    orderBy("score", "desc"),
    limit(20)
  );

  const snap = await getDocs(q);

  const list = [];

  snap.forEach((doc) => list.push(doc.data()));

  return list;
};

export const signInWithGoogle = async () => {
  return signInWithPopup(auth, provider);
};

export const signUpWithEmail = async (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const createRecaptcha = (containerId = "recaptcha-container", size = "invisible") => {
  return new RecaptchaVerifier(containerId, { size }, auth);
};

export const sendPhoneVerification = async (phoneNumber, appVerifier) => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};
export const saveLevelResult = async (userId, levelData) => {
  if (!userId) throw new Error("User ID missing");

  const userLevelsRef = collection(db, `users/${userId}/levels`);
  const payload = { ...levelData, createdAt: serverTimestamp() };
  const docRef = await addDoc(userLevelsRef, payload);
  try {
    const leaderboardRef = collection(db, "leaderboard");
    await addDoc(leaderboardRef, {
      userId,
      name: levelData.playerName || null,
      email: levelData.playerEmail || null,
      level: levelData.level,
      score: levelData.score,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore leaderboard write failed:", err.message);
  }
  try {
    await saveLeaderboardRealtime({
      userId,
      name: levelData.playerName || null,
      level: levelData.level,
      score: levelData.score,
    });
  } catch (err) {
    console.warn("RTDB leaderboard write failed:", err.message);
  }

  return docRef.id;
};
export const saveSession = async (sessionData) => {
  try {
    const sessionsRef = collection(db, "sessions");
    const payload = { ...sessionData, createdAt: serverTimestamp() };
    const docRef = await addDoc(sessionsRef, payload);
    return docRef.id;
  } catch (err) {
    console.warn("saveSession failed:", err.message);
    return null;
  }
};

export const saveUserProfile = async (uid, profile = {}) => {
  if (!uid) return false;

  try {
    const userDoc = doc(db, "users", uid);
    await setDoc(
      userDoc,
      { ...profile, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("saveUserProfile failed:", err.message);
    return false;
  }
};

export const getUserLastLevel = async (userId) => {
  if (!userId) return null;

  const q = query(
    collection(db, `users/${userId}/levels`),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getUserLevels = async (userId, limitNumber = 5) => {
  if (!userId) return [];

  const q = query(
    collection(db, `users/${userId}/levels`),
    orderBy("createdAt", "desc"),
    limit(limitNumber)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
export const getLeaderboard = async (limitNumber = 10) => {
  const q = query(
    collection(db, "leaderboard"),
    orderBy("score", "desc"),
    limit(limitNumber)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getRealtimeLeaderboard = async (limitNumber = 10) => {
  try {
    const q = rdbQuery(
      rdbRef(rdb, "leaderboard"),
      orderByChild("score"),
      limitToLast(limitNumber)
    );
    const snap = await rdbGet(q);

    if (!snap.exists()) return [];

    const result = [];
    snap.forEach((child) => {
      result.push({ id: child.key, ...child.val() });
    });

    result.sort((a, b) => (b.score || 0) - (a.score || 0));
    return result;
  } catch (err) {
    console.warn("RTDB read failed:", err.message);
    return [];
  }
};

export const subscribeRealtimeLeaderboard = (onUpdate, limitNumber = 10) => {
  const q = rdbQuery(
    rdbRef(rdb, "leaderboard"),
    orderByChild("score"),
    limitToLast(limitNumber)
  );

  return onValue(q, (snapshot) => {
    const arr = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        arr.push({ id: child.key, ...child.val() });
      });
    }
    arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    onUpdate(arr);
  });
};
