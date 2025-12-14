import type { QuizManifest, QuizData } from '../types';

let dataDir = '';
if (window.location.hostname.includes("github.io")) {
    dataDir = "/quizesch" + dataDir;
    console.log("github pages detected");
}
export const DATA_DIRECTORY = dataDir.replace(/\/+$/, ''); // Normalize
export const QUIZ_MANIFEST_ENDPOINT = `${DATA_DIRECTORY}/quiz-manifest.json`;

export async function fetchQuizList(): Promise<QuizManifest> {
    const response = await fetch(QUIZ_MANIFEST_ENDPOINT);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} fetching manifest.`);
    }
    return await response.json();
}

export async function fetchQuizData(fileName: string): Promise<QuizData | any[]> {
    const filePath = `${DATA_DIRECTORY}/data/${fileName}`;
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} loading ${filePath}`);
    }
    return await response.json();
}
