// js/config.js
let dataDir = '';
if (window.location.hostname.includes("github.io")) {
    dataDir = "/quizesch" + dataDir;
    console.log("github pages detected");
}
export const DATA_DIRECTORY = dataDir.replace(/\/+$/, ''); // Normalize
export const QUIZ_MANIFEST_ENDPOINT = `${DATA_DIRECTORY}/quiz-manifest.json`;
export const STORAGE_KEY = 'quizesch_state_v2'; // Increment version if structure changes
