// js/quizService.js
import { shuffleArray } from './utils.js';
import * as questionManager from './questionManager.js'; // For isAnswerCorrect

let questions = [];
let originalQuestionsOrder = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let evaluatedQuestions = []; // array of booleans
let score = 0;
let currentQuizFile = null; // To store the filename for persistence

export function loadQuiz(data, fileName) {
    originalQuestionsOrder = [...data];
    questions = [...data]; // Initially not shuffled
    currentQuizFile = fileName;
    resetQuizState(data.length);
}

export function applyPersistedState(state) {
    // Assuming state validation happened in storageService or main.js
    currentQuestionIndex = state.currentQuestionIndex;
    userAnswers = state.userAnswers;
    evaluatedQuestions = state.evaluatedQuestions || new Array(questions.length).fill(false);
    // If questions were stored in a specific order (e.g. shuffled), re-apply that
    // For simplicity now, we assume 'questions' array in state matches current quiz logic
    if (state.shuffledQuestions && state.originalQuestionsOrder) {
         questions = state.shuffledQuestions; // If you decide to store shuffled order
         originalQuestionsOrder = state.originalQuestionsOrder;
    }
    // Score will be recalculated or loaded if stored
}


function resetQuizState(numQuestions) {
    currentQuestionIndex = 0;
    userAnswers = new Array(numQuestions).fill(null);
    evaluatedQuestions = new Array(numQuestions).fill(false);
    score = 0;
}

export function getCurrentQuestion() {
    return questions[currentQuestionIndex];
}
export function getCurrentQuestionIndex() { return currentQuestionIndex; }
export function getTotalQuestions() { return questions.length; }
export function getUserAnswers() { return userAnswers; }
export function getEvaluatedQuestions() { return evaluatedQuestions; }
export function getQuestions() { return questions; } // For progress panel


export function getUserAnswerForCurrentQuestion() {
    return userAnswers[currentQuestionIndex];
}

export function saveAnswer(index, answerData) { // answerData is what specific question type returns
    if (index >= 0 && index < userAnswers.length) {
        userAnswers[index] = answerData;
        evaluatedQuestions[index] = false; // New answer, needs re-evaluation
    }
}

export function goToNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        return true;
    }
    return false;
}

export function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        return true;
    }
    return false;
}
export function setCurrentQuestionIndex(index) {
    if (index >= 0 && index < questions.length) {
        currentQuestionIndex = index;
        return true;
    }
    return false;
}

export function toggleShuffle() {
    const shuffleButtonText = document.getElementById('shuffle-toggle-btn')?.textContent; // একটু হ্যাক (a bit of a hack to check current state)
    if (shuffleButtonText && shuffleButtonText.includes('Unshuffle')) { // Currently shuffled
        questions = [...originalQuestionsOrder];
        resetQuizState(questions.length); // Reset answers and progress
        return false; // Now unshuffled
    } else {
        questions = shuffleArray([...originalQuestionsOrder]);
        resetQuizState(questions.length); // Reset answers and progress
        return true; // Now shuffled
    }
}

export function resetCurrentQuestionAnswer() {
    if (questions[currentQuestionIndex]) {
        const questionType = questions[currentQuestionIndex].question_type;
        if (questionType === 'fill_the_blanks' || questionType === 'drag_n_drop') {
            userAnswers[currentQuestionIndex] = {};
        } else {
            userAnswers[currentQuestionIndex] = null;
        }
        evaluatedQuestions[currentQuestionIndex] = false;
    }
}

export function calculateFinalScore() {
    score = 0;
    questions.forEach((question, index) => {
        if (questionManager.isAnswerCorrect(question, userAnswers[index])) {
            score++;
        }
    });
}
export function getScore() { return score; }

export function markCurrentQuestionEvaluated() {
    evaluatedQuestions[currentQuestionIndex] = true;
}
export function isCurrentQuestionEvaluated() {
    return evaluatedQuestions[currentQuestionIndex];
}
export function areQuestionsLoaded() {
    return questions && questions.length > 0;
}

export function getCurrentQuizFile() { return currentQuizFile; }

export function getFullState() {
    return {
        quizFile: currentQuizFile,
        questionsLength: questions.length, // Or actual questions array if order matters
        currentQuestionIndex,
        userAnswers,
        evaluatedQuestions,
        // originalQuestionsOrder, // If you want to persist shuffle state
        // questions, // Persist current (possibly shuffled) order
        timestamp: Date.now(),
    };
}