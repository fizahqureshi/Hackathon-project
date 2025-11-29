const functions = require('firebase-functions');
const admin = require('firebase-admin');


try {
  admin.initializeApp();
} catch (e) {
}

const db = admin.firestore();


exports.recomputeTopLeaderboard = functions.firestore
  .document('leaderboard/{entryId}')
  .onCreate(async (snap, context) => {
    try {
      const TOP_N = 20;
      const q = await db.collection('leaderboard').orderBy('score', 'desc').limit(TOP_N).get();
      const top = [];
      q.forEach(doc => {
        const d = doc.data();
        top.push({ id: doc.id, name: d.name || null, userId: d.userId || null, level: d.level || null, score: d.score || 0, createdAt: d.createdAt || null });
      });
      // write the aggregated top list into a document for fast reads
      await db.collection('meta').doc('leaderboard_top').set({ top, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Recomputed top leaderboard (N=' + TOP_N + ')');
      return true;
    } catch (e) {
      console.error('recomputeTopLeaderboard failed', e);
      return null;
    }
  });


exports.recomputeTopLeaderboardHttp = functions.https.onRequest(async (req, res) => {
  try {
    const TOP_N = 20;
    const q = await db.collection('leaderboard').orderBy('score', 'desc').limit(TOP_N).get();
    const top = [];
    q.forEach(doc => {
      const d = doc.data();
      top.push({ id: doc.id, name: d.name || null, userId: d.userId || null, level: d.level || null, score: d.score || 0, createdAt: d.createdAt || null });
    });
    await db.collection('meta').doc('leaderboard_top').set({ top, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.status(200).send({ ok: true, count: top.length });
  } catch (e) {
    console.error('manual recompute failed', e);
    res.status(500).send({ ok: false, error: e.message || e });
  }
});
