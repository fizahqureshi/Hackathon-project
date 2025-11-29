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

import {
	getFirestore,
	collection,
	doc,
	setDoc,
	addDoc,
	getDocs,
	getDoc,
	query,
	orderBy,
	limit,
	serverTimestamp,
} from 'firebase/firestore';

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
} from 'firebase/database';


// ------------------------------------------------------
//  CONFIG
// ------------------------------------------------------
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


// ------------------------------------------------------
//  INIT APP ONCE
// ------------------------------------------------------
let app;
if (!getApps().length) {
	app = initializeApp(firebaseConfig);
} else {
	app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const rdb = getDatabase(app);


// ------------------------------------------------------
//  SAVE LEVEL RESULT (FIRESTORE + REALTIME DB)
// ------------------------------------------------------
/*
levelData = {
  level,
  score,
  attempts,
  reactionTimes,
  areas,
  playerName,
  playerEmail
}
*/
async function saveLevelResult(userId, levelData) {
	if (!userId) throw new Error("User ID missing");

	const userLevelsRef = collection(db, `users/${userId}/levels`);
	const payload = { ...levelData, createdAt: serverTimestamp() };

	// Save under user's levels
	const docRef = await addDoc(userLevelsRef, payload);

	// Save to leaderboard
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

	// Save to realtime leaderboard also
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
}


// ------------------------------------------------------
//  REALTIME DATABASE LEADERBOARD
// ------------------------------------------------------
async function saveLeaderboardRealtime(entry) {
	try {
		const leaderRef = rdbRef(rdb, "leaderboard");
		const newEntry = rdbPush(leaderRef);
		const payload = { ...entry, ts: Date.now() };
		await rdbSet(newEntry, payload);
		return newEntry.key;
	} catch (err) {
		console.warn("RTDB write failed:", err.message);
		return null;
	}
}

async function getRealtimeLeaderboard(limitNumber = 10) {
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
}

function subscribeRealtimeLeaderboard(onUpdate, limitNumber = 10) {
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
}


// ------------------------------------------------------
//  FIRESTORE LEADERBOARD
// ------------------------------------------------------
async function getLeaderboard(limitNumber = 10) {
	const q = query(
		collection(db, "leaderboard"),
		orderBy("score", "desc"),
		limit(limitNumber)
	);

	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}


// Cloud function aggregated leaderboard
async function getTopLeaderboard() {
	try {
		const docSnap = await getDoc(doc(db, "meta", "leaderboard_top"));
		if (!docSnap.exists()) return [];
		return docSnap.data().top || [];
	} catch (err) {
		console.warn("Top leaderboard read failed:", err.message);
		return [];
	}
}


// ------------------------------------------------------
//  USER PROFILE HELPERS
// ------------------------------------------------------
async function saveUserProfile(uid, profile = {}) {
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
}

async function getUserLastLevel(userId) {
	if (!userId) return null;

	const q = query(
		collection(db, `users/${userId}/levels`),
		orderBy("createdAt", "desc"),
		limit(1)
	);

	const snap = await getDocs(q);
	if (snap.empty) return null;

	return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function getUserLevels(userId, limitNumber = 5) {
	if (!userId) return [];

	const q = query(
		collection(db, `users/${userId}/levels`),
		orderBy("createdAt", "desc"),
		limit(limitNumber)
	);

	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getUsersByIds(uids = []) {
	const results = {};
	await Promise.all(
		uids.map(async (uid) => {
			try {
				const d = await getDoc(doc(db, "users", uid));
				results[uid] = d.exists() ? d.data() : null;
			} catch {
				results[uid] = null;
			}
		})
	);
	return results;
}


// ------------------------------------------------------
//  AUTH METHODS
// ------------------------------------------------------
async function signInWithGoogle() {
	return signInWithPopup(auth, googleProvider);
}

async function signUpWithEmail(email, password) {
	return createUserWithEmailAndPassword(auth, email, password);
}

async function signInWithEmail(email, password) {
	return signInWithEmailAndPassword(auth, email, password);
}

function createRecaptcha(containerId = "recaptcha-container", size = "invisible") {
	return new RecaptchaVerifier(containerId, { size }, auth);
}

async function sendPhoneVerification(phoneNumber, appVerifier) {
	return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}


// ------------------------------------------------------
//  EXPORTS
// ------------------------------------------------------
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
