// js/storageService.js
import { STORAGE_KEY } from './config.js';

// The key for storing all quiz progress.
const QUIZ_PROGRESS_KEY = 'quizesch_all_progress';

/**
 * Loads the entire progress object for all quizzes from localStorage.
 * @returns {object} An object where keys are quiz filenames and values are their progress states.
 */
export function loadAllProgress() {
    const raw = localStorage.getItem(QUIZ_PROGRESS_KEY);
    try {
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("Error parsing all quiz progress from storage:", e);
        return {};
    }
}

/**
 * Saves the state of a single quiz into the main progress object in localStorage.
 * @param {object} quizState - The full state object for a quiz, must include a `quizFile` property.
 */
export function saveQuizProgress(quizState) {
    if (!quizState || !quizState.quizFile) {
        console.warn("Attempted to save progress without a quiz file name.", quizState);
        return;
    }
    const allProgress = loadAllProgress();
    allProgress[quizState.quizFile] = quizState;
    localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(allProgress));
}

/**
 * Loads the saved progress for a specific quiz file.
 * @param {string} quizFile - The filename of the quiz.
 * @param {number} expectedLength - The number of questions, to validate the loaded state.
 * @returns {object|null} The saved state object or null if not found or invalid.
 */
export function loadQuizProgress(quizFile, expectedLength) {
    const allProgress = loadAllProgress();
    const state = allProgress[quizFile];

    if (!state) return null;

    // Validate the loaded state
    if (state.questionsLength === expectedLength &&
        Date.now() - (state.timestamp || 0) < (7 * 24 * 60 * 60 * 1000) // Expire after 7 days
    ) {
        // Ensure arrays have the correct length to prevent errors
        if (!Array.isArray(state.userAnswers) || state.userAnswers.length !== expectedLength) {
            state.userAnswers = new Array(expectedLength).fill(null);
        }
        if (!Array.isArray(state.evaluatedQuestions) || state.evaluatedQuestions.length !== expectedLength) {
            state.evaluatedQuestions = new Array(expectedLength).fill(false);
        }
        return state;
    }

    // If validation fails, don't return the stale state.
    // We don't clear it here, it will just be overwritten on next save.
    return null;
}

/**
 * Removes the progress for a single quiz file from localStorage.
 * @param {string} quizFile - The filename of the quiz to clear.
 */
export function clearQuizProgress(quizFile) {
    if (!quizFile) return;
    const allProgress = loadAllProgress();
    if (allProgress[quizFile]) {
        delete allProgress[quizFile];
        localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(allProgress));
    }
}

/**
 * Clears all saved quiz progress from localStorage.
 */
export function clearAllProgress() {
    localStorage.removeItem(QUIZ_PROGRESS_KEY);
}