// build-manifest.js (run this locally with Node.js)
const fs = require('fs').promises;
const path = require('path');

// Go one level up from the current script's directory to find the data folder
const DATA_DIR = path.join(__dirname, '..', 'data'); 
// Place the manifest in the project root, one level up from this script's directory
const MANIFEST_PATH = path.join(__dirname, '..', 'quiz-manifest.json'); 

async function buildManifest() {
    console.log(`Scanning for quiz files in ${DATA_DIR}...`);
    try {
        const files = await fs.readdir(DATA_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        const manifest = {
            quizzes: [],
            availableTags: {
                subject: new Set(),
                type: new Set(),
                year: new Set()
            }
        };

        for (const fileName of jsonFiles) {
            const filePath = path.join(DATA_DIR, fileName);
            try {
                const fileContent = await fs.readFile(filePath, 'utf8');
                const quizData = JSON.parse(fileContent);

                // Check if it's a legacy file (plain array) or new format (object with tags)
                if (Array.isArray(quizData)) {
                    // This is a legacy file
                    console.warn(`Found legacy format quiz: ${fileName}. Tagging as 'Untagged'.`);
                    const untagged = { subject: 'Untagged', type: 'Untagged', year: 'Untagged' };
                    manifest.quizzes.push({
                        fileName: fileName,
                        tags: untagged
                    });
                    manifest.availableTags.subject.add(untagged.subject);
                    manifest.availableTags.type.add(untagged.type);
                    manifest.availableTags.year.add(untagged.year);

                } else if (quizData.tags && quizData.questions) {
                    // This is a new format file
                    manifest.quizzes.push({
                        fileName: fileName,
                        tags: quizData.tags
                    });
                    manifest.availableTags.subject.add(quizData.tags.subject);
                    manifest.availableTags.type.add(quizData.tags.type);
                    manifest.availableTags.year.add(String(quizData.tags.year));

                } else {
                    console.warn(`Skipping ${fileName}: Does not match new or legacy format.`);
                }

            } catch (error) {
                console.error(`Error processing file ${fileName}:`, error);
            }
        }

        // Custom sort function to put 'Untagged' at the end
        const customSort = (a, b) => {
            if (a === 'Untagged') return 1;
            if (b === 'Untagged') return -1;
            return a.localeCompare(b);
        };

        // Convert sets to sorted arrays
        manifest.availableTags.subject = [...manifest.availableTags.subject].sort(customSort);
        manifest.availableTags.type = [...manifest.availableTags.type].sort(customSort);
        // Sort years numerically in descending order, with 'Untagged' last
        manifest.availableTags.year = [...manifest.availableTags.year].sort((a, b) => {
             if (a === 'Untagged') return 1;
             if (b === 'Untagged') return -1;
             return b - a;
        });

        // Sort quizzes by filename for consistent order
        manifest.quizzes.sort((a, b) => a.fileName.localeCompare(b.fileName));

        try {
            await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
            console.log(`Successfully created manifest at ${MANIFEST_PATH}`);
            console.log(`Found ${manifest.quizzes.length} valid quizzes.`);
            console.log('Available Tags:', manifest.availableTags);
        } catch (error) {
            console.error('Error writing manifest file:', error);
        }
    } catch (readDirError) {
        console.error(`[ERROR] Could not read the data directory at: ${DATA_DIR}`);
        console.error(`Please ensure the 'data' folder exists in the project root.`);
        process.exit(1); // Exit with an error code
    }
}

buildManifest().catch(error => {
    console.error("Unhandled error in buildManifest:", error);
});