import { initializeApp } from 'firebase/app';
import { getFirestore, doc, runTransaction, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB90aBQyZNgzy6unaosThIC7SUom4wnkXw", // Ensure this is your actual, correct API key
  authDomain: "quizesch.firebaseapp.com",
  projectId: "quizesch",
  storageBucket: "quizesch.firebasestorage.app",
  messagingSenderId: "915027658046",
  appId: "1:915027658046:web:26652b9fd0cc19e219586f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentFirebaseUser: any = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentFirebaseUser = user;
        console.log("Firebase: Anonymous user signed in:", user.uid);
    } else {
        currentFirebaseUser = null;
        signInAnonymously(auth).catch((error) => {
            console.error("Firebase: Anonymous sign-in error", error);
        });
    }
});

function getFirestoreQuestionId(quizFileName: string, questionIndex: number) {
    const safeQuizFileName = quizFileName.replace('.json', '').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safeQuizFileName}_q_${questionIndex}`;
}

export async function recordVote(quizFileName: string, questionIndex: number, voteType: 'trust' | 'distrust') {
    if (!currentFirebaseUser) {
        alert("Authentication pending. Please try again in a moment.");
        console.warn("Attempted to vote without firebase user.");
        return null;
    }

    const firestoreQuestionId = getFirestoreQuestionId(quizFileName, questionIndex);
    const questionVoteRef = doc(db, "questionTrustVotes", firestoreQuestionId);
    const userVoteRecordRef = doc(db, `userVotes/${currentFirebaseUser.uid}/questionVotes`, firestoreQuestionId);

    try {
        return await runTransaction(db, async (transaction) => {
            const questionVoteSnap = await transaction.get(questionVoteRef);
            const userVoteSnap = await transaction.get(userVoteRecordRef);

            let positiveVotes = 0;
            let totalVotes = 0;
            let previousUserVoteType = null;

            if (questionVoteSnap.exists()) {
                const data = questionVoteSnap.data();
                positiveVotes = data.positiveVotes || 0;
                totalVotes = data.totalVotes || 0;
            }

            if (userVoteSnap.exists()) {
                previousUserVoteType = userVoteSnap.data().voteType;
            }

            if (previousUserVoteType === voteType) {
                console.log("User clicked the same vote button again. No change.");
                return {
                    positiveVotes,
                    totalVotes,
                    userVote: previousUserVoteType,
                    score: totalVotes > 0 ? parseFloat(((positiveVotes / totalVotes) * 100).toFixed(1)) : 0
                };
            }

            // Adjust votes based on previous vote
            if (previousUserVoteType) { // User is changing their vote
                if (previousUserVoteType === 'trust') positiveVotes--;
                // totalVotes remains the same as it's a change, not a new vote
            } else { // User is casting a new vote
                totalVotes++;
            }

            // Apply current vote
            if (voteType === 'trust') {
                positiveVotes++;
            }
            // If voteType is 'distrust', positiveVotes isn't incremented.

            transaction.set(questionVoteRef, {
                positiveVotes: Math.max(0, positiveVotes), // Ensure non-negative
                totalVotes: Math.max(0, totalVotes),     // Ensure non-negative
                quizFile: quizFileName,
                qIndex: questionIndex,
                lastVoteAt: serverTimestamp()
            }, { merge: true });

            transaction.set(userVoteRecordRef, {
                voteType: voteType,
                votedAt: serverTimestamp()
            });
            
            const newScore = totalVotes > 0 ? parseFloat(((positiveVotes / totalVotes) * 100).toFixed(1)) : 0;

            return {
                positiveVotes,
                totalVotes,
                userVote: voteType,
                score: newScore
            };
        });
    } catch (error) {
        console.error("Firebase: Vote transaction failed: ", error);
        alert("Failed to record vote. Please check your connection and try again.");
        return null;
    }
}

export async function getQuestionVoteData(quizFileName: string, questionIndex: number) {
    const firestoreQuestionId = getFirestoreQuestionId(quizFileName, questionIndex);
    const questionVoteRef = doc(db, "questionTrustVotes", firestoreQuestionId);
    let userVoteType = null;

    if (currentFirebaseUser) {
        const userVoteRecordRef = doc(db, `userVotes/${currentFirebaseUser.uid}/questionVotes`, firestoreQuestionId);
        try {
            const userVoteSnap = await getDoc(userVoteRecordRef);
            if (userVoteSnap.exists()) {
                userVoteType = userVoteSnap.data().voteType;
            }
        } catch (e) {
            console.warn("Firebase: Could not get user's vote record", e);
            // Continue, userVoteType will remain null
        }
    }

    try {
        const docSnap = await getDoc(questionVoteRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const score = data.totalVotes > 0 ? (data.positiveVotes / data.totalVotes) * 100 : 0;
            return {
                positiveVotes: data.positiveVotes || 0,
                totalVotes: data.totalVotes || 0,
                score: parseFloat(score.toFixed(1)),
                userVote: userVoteType // This will be null if no user or user hasn't voted
            };
        } else {
            // No global votes yet for this question
            return { positiveVotes: 0, totalVotes: 0, score: 0, userVote: userVoteType };
        }
    } catch (error) {
        console.error("Firebase: Error getting question vote data:", error);
        // Return a default structure on error, including any userVote found
        return { positiveVotes: 0, totalVotes: 0, score: 0, userVote: userVoteType };
    }
}
