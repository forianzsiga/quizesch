// js/firebaseService.js
// Use Firebase via CDN scripts in index.html, not ES module imports
// Assumes the following scripts are included in your HTML:
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>

const firebaseConfig = {
  apiKey: "AIzaSyB90aBQyZNgzy6unaosThIC7SUom4wnkXw", // Ensure this is your actual, correct API key
  authDomain: "quizesch.firebaseapp.com",
  projectId: "quizesch",
  storageBucket: "quizesch.firebasestorage.app",
  messagingSenderId: "915027658046",
  appId: "1:915027658046:web:26652b9fd0cc19e219586f"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentFirebaseUser = null;

auth.onAuthStateChanged((user) => {
    if (user) {
        currentFirebaseUser = user;
        console.log("Firebase: Anonymous user signed in:", user.uid);
    } else {
        currentFirebaseUser = null;
        auth.signInAnonymously().catch((error) => {
            console.error("Firebase: Anonymous sign-in error", error);
        });
    }
});

function getFirestoreQuestionId(quizFileName, questionIndex) {
    const safeQuizFileName = quizFileName.replace('.json', '').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safeQuizFileName}_q_${questionIndex}`;
}

// Use export here
export async function recordVote(quizFileName, questionIndex, voteType) {
    if (!currentFirebaseUser) {
        alert("Authentication pending. Please try again in a moment.");
        console.warn("Attempted to vote without firebase user.");
        return null;
    }

    const firestoreQuestionId = getFirestoreQuestionId(quizFileName, questionIndex);
    const questionVoteRef = db.collection("questionTrustVotes").doc(firestoreQuestionId);
    const userVoteRecordRef = db.collection(`userVotes/${currentFirebaseUser.uid}/questionVotes`).doc(firestoreQuestionId);

    try {
        return await db.runTransaction(async (transaction) => {
            const questionVoteSnap = await transaction.get(questionVoteRef);
            const userVoteSnap = await transaction.get(userVoteRecordRef);

            let positiveVotes = 0;
            let totalVotes = 0;
            let previousUserVoteType = null;

            if (questionVoteSnap.exists) {
                positiveVotes = questionVoteSnap.data().positiveVotes || 0;
                totalVotes = questionVoteSnap.data().totalVotes || 0;
            }

            if (userVoteSnap.exists) {
                previousUserVoteType = userVoteSnap.data().voteType;
            }

            if (previousUserVoteType === voteType) {
                console.log("User clicked the same vote button again. No change.");
                return {
                    positiveVotes,
                    totalVotes,
                    userVoted: previousUserVoteType,
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
                lastVoteAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            transaction.set(userVoteRecordRef, {
                voteType: voteType,
                votedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const newScore = totalVotes > 0 ? parseFloat(((positiveVotes / totalVotes) * 100).toFixed(1)) : 0;

            return {
                positiveVotes,
                totalVotes,
                userVoted: voteType,
                score: newScore
            };
        });
    } catch (error) {
        console.error("Firebase: Vote transaction failed: ", error);
        alert("Failed to record vote. Please check your connection and try again.");
        return null;
    }
}

// Use export here
export async function getQuestionVoteData(quizFileName, questionIndex) {
    const firestoreQuestionId = getFirestoreQuestionId(quizFileName, questionIndex);
    const questionVoteRef = db.collection("questionTrustVotes").doc(firestoreQuestionId);
    let userVoteType = null;

    if (currentFirebaseUser) {
        const userVoteRecordRef = db.collection(`userVotes/${currentFirebaseUser.uid}/questionVotes`).doc(firestoreQuestionId);
        try {
            const userVoteSnap = await userVoteRecordRef.get();
            if (userVoteSnap.exists) {
                userVoteType = userVoteSnap.data().voteType;
            }
        } catch (e) {
            console.warn("Firebase: Could not get user's vote record", e);
            // Continue, userVoteType will remain null
        }
    } else {
        // console.log("getQuestionVoteData: No currentFirebaseUser, cannot fetch user's specific vote.");
        // This is not necessarily an error if called before auth completes, 
        // but it means user-specific vote info won't be available.
    }

    try {
        const docSnap = await questionVoteRef.get();
        if (docSnap.exists) {
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