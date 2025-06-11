// js/quizService.js
import { shuffleArray } from './utils.js';
import * as questionManager from './questionManager.js';

let questions = [];
let originalQuestionsOrder = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let evaluatedQuestions = [];
let score = 0;
let currentQuizFile = null;

export function loadQuiz(data, fileName) {
    // Handle both legacy (array) and new (object with `questions` key) formats
    const questionArray = Array.isArray(data) ? data : data.questions || [];
    
    originalQuestionsOrder = [...questionArray];
    questions = [...questionArray];
    currentQuizFile = fileName;
    resetQuizState(questionArray.length);
}

export function applyPersistedState(state) {
    currentQuestionIndex = state.currentQuestionIndex;
    userAnswers = state.userAnswers;
    evaluatedQuestions = state.evaluatedQuestions || new Array(questions.length).fill(false);
    if (state.shuffledQuestions && state.originalQuestionsOrder) {
         questions = state.shuffledQuestions;
         originalQuestionsOrder = state.originalQuestionsOrder;
    }
}

function resetQuizState(numQuestions) {
    currentQuestionIndex = 0;
    userAnswers = new Array(numQuestions).fill(null);
    evaluatedQuestions = new Array(numQuestions).fill(false);
    score = 0;
}

export function getCurrentQuestion() { return questions[currentQuestionIndex]; }
export function getCurrentQuestionIndex() { return currentQuestionIndex; }
export function getTotalQuestions() { return questions.length; }
export function getUserAnswers() { return userAnswers; }
export function getEvaluatedQuestions() { return evaluatedQuestions; }
export function getQuestions() { return questions; }
export function getUserAnswerForCurrentQuestion() { return userAnswers[currentQuestionIndex]; }

export function saveAnswer(index, answerData) {
    if (index >= 0 && index < userAnswers.length) {
        userAnswers[index] = answerData;
        evaluatedQuestions[index] = false;
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
    const shuffleButton = document.getElementById('shuffle-toggle-btn');
    if (shuffleButton && shuffleButton.textContent.includes('Unshuffle')) {
        questions = [...originalQuestionsOrder];
        resetQuizState(questions.length);
        return false;
    } else {
        questions = shuffleArray([...originalQuestionsOrder]);
        resetQuizState(questions.length);
        return true;
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
export function markCurrentQuestionEvaluated() { evaluatedQuestions[currentQuestionIndex] = true; }
export function isCurrentQuestionEvaluated() { return evaluatedQuestions[currentQuestionIndex]; }
export function areQuestionsLoaded() { return questions && questions.length > 0; }
export function getCurrentQuizFile() { return currentQuizFile; }

export function getFullState() {
    return {
        quizFile: currentQuizFile,
        questionsLength: questions.length,
        currentQuestionIndex,
        userAnswers,
        evaluatedQuestions,
        timestamp: Date.now(),
    };
}