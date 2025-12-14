import type { QuizProgress } from '../types';

// The key for storing all quiz progress.
const QUIZ_PROGRESS_KEY = 'quizesch_all_progress';

export function loadAllProgress(): Record<string, QuizProgress> {
    const raw = localStorage.getItem(QUIZ_PROGRESS_KEY);
    try {
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("Error parsing all quiz progress from storage:", e);
        return {};
    }
}

export function saveQuizProgress(quizState: QuizProgress) {
    if (!quizState || !quizState.quizFile) {
        console.warn("Attempted to save progress without a quiz file name.", quizState);
        return;
    }
    const allProgress = loadAllProgress();
    allProgress[quizState.quizFile] = quizState;
    localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(allProgress));
}

export function loadQuizProgress(quizFile: string, expectedLength: number): QuizProgress | null {
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

    return null;
}

export function clearQuizProgress(quizFile: string) {
    if (!quizFile) return;
    const allProgress = loadAllProgress();
    if (allProgress[quizFile]) {
        delete allProgress[quizFile];
        localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(allProgress));
    }
}

export function clearAllProgress() {
    localStorage.removeItem(QUIZ_PROGRESS_KEY);
}
