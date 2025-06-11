// updateSupervisionStatus.js (run this locally with Node.js)
// Make sure to `npm install firebase-admin` in your project root
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// IMPORTANT: Download your service account key from Firebase Console
// Project Settings -> Service accounts -> Generate new private key
// Save it as 'serviceAccountKey.json' in your project root (add to .gitignore!)
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.error("Failed to initialize Firebase Admin SDK. Make sure 'serviceAccountKey.json' exists in the project root and is configured correctly.", e);
    process.exit(1);
}


const db = admin.firestore();
const DATA_DIR = path.join(__dirname, 'data');

async function updateLocalJsonFiles() {
    console.log("Fetching vote data from Firestore...");
    const snapshot = await db.collection('questionTrustVotes').get();

    if (snapshot.empty) {
        console.log('No vote data found in Firestore.');
        return;
    }

    const updatesByFile = {};

    snapshot.forEach(doc => {
        const voteData = doc.data();
        const { quizFile, qIndex, positiveVotes, totalVotes } = voteData;

        if (!quizFile || typeof qIndex !== 'number' || typeof totalVotes !== 'number' || typeof positiveVotes !== 'number') {
            console.warn(`Skipping invalid vote record (ID: ${doc.id}):`, voteData);
            return;
        }

        const score = totalVotes > 0 ? (positiveVotes / totalVotes) * 100 : 0;

        // Condition for marking as supervised
        if (score > 70 && totalVotes > 10) {
            if (!updatesByFile[quizFile]) {
                updatesByFile[quizFile] = [];
            }
            updatesByFile[quizFile].push({ index: qIndex, newStatus: "yes" });
            console.log(`Marking ${quizFile} - Question ${qIndex} as supervised (Score: ${score.toFixed(1)}%, Votes: ${totalVotes}).`);
        }
    });

    let filesUpdated = 0;
    for (const quizFileName in updatesByFile) {
        const filePath = path.join(DATA_DIR, quizFileName); // quizFileName should include .json
        try {
            // Check if file exists before trying to read
            await fs.access(filePath); // Throws error if not accessible
            let fileContent = await fs.readFile(filePath, 'utf8');
            let quizData = JSON.parse(fileContent);

            if (!quizData || !Array.isArray(quizData.questions)) {
                console.error(`Error: Content of ${quizFileName} is not valid. Missing 'questions' array.`);
                continue;
            }

            let fileModified = false;
            updatesByFile[quizFileName].forEach(update => {
                if (quizData.questions[update.index]) {
                    // Only update if the current status isn't already "yes"
                    if (quizData.questions[update.index].supervised !== update.newStatus) {
                        quizData.questions[update.index].supervised = update.newStatus;
                        fileModified = true;
                    }
                } else {
                    console.warn(`Question index ${update.index} not found in ${quizFileName}`);
                }
            });

            if (fileModified) {
                await fs.writeFile(filePath, JSON.stringify(quizData, null, 2));
                console.log(`Updated ${quizFileName}`);
                filesUpdated++;
            } else {
                console.log(`No changes needed for ${quizFileName}.`);
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`Error: File not found ${filePath}. Make sure quizFile names in Firestore match local data files.`);
            } else {
                console.error(`Error processing file ${quizFileName}:`, error);
            }
        }
    }
    if (filesUpdated > 0) {
        console.log(`${filesUpdated} quiz file(s) updated. Please review, commit, and push the changes.`);
    } else {
        console.log("No quiz files required updates based on current vote data.");
    }
    console.log("Supervision status update process complete.");
}

updateLocalJsonFiles().catch(error => {
    console.error("Unhandled error in updateLocalJsonFiles:", error);
});