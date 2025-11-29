// Firebase initialization and auth helpers
// Fill the values in your .env file (see .env.sample below) or set env vars in your hosting platform
import { initializeApp, getApps } from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	RecaptchaVerifier,
	signInWithPhoneNumber,
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { getDatabase, ref as rdbRef, push as rdbPush, set as rdbSet, get as rdbGet, query as rdbQuery, orderByChild, limitToLast, onValue } from 'firebase/database';


const firebaseConfig = {
  apiKey: "AIzaSyAzg-8-rcGURaVLZ9OIO35ge2mgtxJTTkw",
  authDomain: "hackathon-project-97f0d.firebaseapp.com",
  databaseURL: "https://hackathon-project-97f0d-default-rtdb.firebaseio.com",
  projectId: "hackathon-project-97f0d",
  storageBucket: "hackathon-project-97f0d.firebasestorage.app",
  messagingSenderId: "567081945630",
  appId: "1:567081945630:web:ebdc5b0ded5de70b273c0f",
  measurementId: "G-LX1FPVQCK7"
};

// Initialize app only once
let app;
if (!getApps() || getApps().length === 0) {
	app = initializeApp(firebaseConfig);
} else {
	app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Firestore
const db = getFirestore(app);

/*
  Save level result under users/{uid}/levels and also add/aggregate to leaderboard
 * levelData: { level, score, attempts, reactionTimes, areas, createdAt }
 */
async function saveLevelResult(userId, levelData) {
	if (!userId) throw new Error('No user id');
	const userLevelsRef = collection(db, `users/${userId}/levels`);
	const payload = { ...levelData, createdAt: serverTimestamp() };
	const docRef = await addDoc(userLevelsRef, payload);

	// also write to leaderboard collection for simple global ranking
	try {
		const leaderboardRef = collection(db, 'leaderboard');
		// include optional player name/email for richer leaderboard entries
		await addDoc(leaderboardRef, {
			userId,
			name: levelData.playerName || null,
			email: levelData.playerEmail || null,
			level: levelData.level,
			score: levelData.score,
			createdAt: serverTimestamp(),
		});
	} catch (e) {
		console.warn('Leaderboard write failed', e.message);
	}
	try {
		await saveLeaderboardRealtime({ userId, name: levelData.playerName || null, level: levelData.level, score: levelData.score });
	} catch (e) {
		// ignore
	}

	return docRef.id;
}

const rdb = getDatabase(app);

async function saveLeaderboardRealtime(entry) {
	try {
		const leaderRef = rdbRef(rdb, 'leaderboard');
		const newRef = rdbPush(leaderRef);
		const payload = { ...entry, ts: Date.now() };
		await rdbSet(newRef, payload);
		try { console.log('RTDB write succeeded', newRef.key, payload); } catch(e){}
		return newRef.key;
	} catch (e) {
		console.warn('RTDB write failed', e.message);
		return null;
	}
}

/* Save or update a user's profile document in Firestore under `users/{uid}`.
 * profile can contain displayName, email, photoURL or other metadata.
 */
async function saveUserProfile(uid, profile = {}) {
	if (!uid) throw new Error('No uid');
	try {
		const userDoc = doc(db, 'users', uid);
		// merge profile fields and set updatedAt
		await setDoc(userDoc, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
		return true;
	} catch (e) {
		console.warn('saveUserProfile failed', e?.message || e);
		return false;
	}
}

async function getRealtimeLeaderboard(limitNumber = 10) {
	try {
		const q = rdbQuery(rdbRef(rdb, 'leaderboard'), orderByChild('score'), limitToLast(limitNumber));
		const snap = await rdbGet(q);
		const out = [];
		if (!snap.exists()) return out;
		snap.forEach((child) => {
			out.push({ id: child.key, ...child.val() });
		});
		// sort descending by score
		out.sort((a, b) => (b.score || 0) - (a.score || 0));
		try { console.log('RTDB fetched', out.length, 'leaderboard entries'); } catch(e){}
		return out;
	} catch (e) {
		console.warn('RTDB read failed', e.message);
		return [];
	}
}

// Read aggregated top-N leaderboard doc written by Cloud Function
async function getTopLeaderboard() {
	try {
		const metaDoc = await getDoc(doc(db, 'meta', 'leaderboard_top'));
		if (!metaDoc.exists()) return [];
		const data = metaDoc.data();
		return data.top || [];
	} catch (e) {
		console.warn('getTopLeaderboard failed', e?.message || e);
		return [];
	}
}

// Fetch multiple user profiles by uid and return a map { uid: profile }
async function getUsersByIds(uids = []) {
	try {
		const pairs = await Promise.all(uids.map(async (uid) => {
			try {
				const d = await getDoc(doc(db, 'users', uid));
				return [uid, d.exists() ? d.data() : null];
			} catch (e) {
				return [uid, null];
			}
		}));
		const out = {};
		pairs.forEach(([uid, profile]) => { out[uid] = profile; });
		return out;
	} catch (e) {
		console.warn('getUsersByIds failed', e?.message || e);
		return {};
	}
}

/*
 * Subscribe to realtime leaderboard changes. Calls `onUpdate` with an array of entries
 * whenever the leaderboard data changes. Returns an unsubscribe function.
 */
function subscribeRealtimeLeaderboard(onUpdate, limitNumber = 10) {
	try {
		const q = rdbQuery(rdbRef(rdb, 'leaderboard'), orderByChild('score'), limitToLast(limitNumber));
		const handler = (snapshot) => {
			const out = [];
			if (!snapshot.exists()) {
				onUpdate(out);
				return;
			}
			snapshot.forEach((child) => {
				out.push({ id: child.key, ...child.val() });
			});
			out.sort((a, b) => (b.score || 0) - (a.score || 0));
			onUpdate(out);
		};
		const unsubscribe = onValue(q, handler);
		return unsubscribe;
	} catch (e) {
		console.warn('subscribeRealtimeLeaderboard failed', e.message || e);
		return () => {};
	}
}

async function getUserLastLevel(userId) {
	if (!userId) return null;
	const userLevelsRef = collection(db, `users/${userId}/levels`);
	const q = query(userLevelsRef, orderBy('createdAt', 'desc'), limit(1));
	const snap = await getDocs(q);
	if (snap.empty) return null;
	const d = snap.docs[0];
	return { id: d.id, ...d.data() };
}

// fetch the last N levels for a user (default 5)
async function getUserLevels(userId, limitNumber = 5) {
	if (!userId) return [];
	const userLevelsRef = collection(db, `users/${userId}/levels`);
	const q = query(userLevelsRef, orderBy('createdAt', 'desc'), limit(limitNumber));
	const snap = await getDocs(q);
	if (snap.empty) return [];
	return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getLeaderboard(limitNumber = 10) {
	const leaderboardRef = collection(db, 'leaderboard');
	const q = query(leaderboardRef, orderBy('score', 'desc'), limit(limitNumber));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// export RTDB helpers too

async function signInWithGoogle() {
	return signInWithPopup(auth, googleProvider);
}

async function signUpWithEmail(email, password) {
	return createUserWithEmailAndPassword(auth, email, password);
}

async function signInWithEmail(email, password) {
	return signInWithEmailAndPassword(auth, email, password);
}

function createRecaptcha(containerId = 'recaptcha-container', size = 'invisible') {
	return new RecaptchaVerifier(containerId, { size }, auth);
}

async function sendPhoneVerification(phoneNumber, appVerifier) {
	// returns confirmationResult
	return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

export {
	app,
	auth,
	googleProvider,
	signInWithGoogle,
	signUpWithEmail,
	signInWithEmail,
	createRecaptcha,
	sendPhoneVerification,
	db,
	saveLevelResult,
	getUserLastLevel,
	getUserLevels,
	getLeaderboard,
	saveLeaderboardRealtime,
	getRealtimeLeaderboard,
	subscribeRealtimeLeaderboard,
	saveUserProfile,
	getTopLeaderboard,
	getUsersByIds,
};


