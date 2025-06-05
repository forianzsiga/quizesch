// js/storageService.js
import { STORAGE_KEY } from './config.js';

export function saveQuizState(state) {
    if (!state || !state.quizFile) return; // Basic check
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadQuizState(quizFile, expectedLength) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const state = JSON.parse(raw);
        // Validate state
        if (state.quizFile === quizFile && state.questionsLength === expectedLength &&
            Date.now() - (state.timestamp || 0) < (24 * 60 * 60 * 1000) // e.g. expire after 1 day
        ) {
            // Ensure userAnswers and evaluatedQuestions have correct length
            if (!Array.isArray(state.userAnswers) || state.userAnswers.length !== expectedLength) {
                state.userAnswers = new Array(expectedLength).fill(null);
            }
            if (!Array.isArray(state.evaluatedQuestions) || state.evaluatedQuestions.length !== expectedLength) {
                state.evaluatedQuestions = new Array(expectedLength).fill(false);
            }
            return state;
        }
    } catch (e) {
        console.error("Error loading quiz state from storage:", e);
    }
    clearQuizState(); // Clear invalid state
    return null;
}

export function clearQuizState() {
    localStorage.removeItem(STORAGE_KEY);
}