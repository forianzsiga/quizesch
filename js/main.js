// js/main.js
import * as ui from './ui.js';
import * as apiService from './apiService.js';
import * as quizService from './quizService.js';
import * as storageService from './storageService.js';
import { DATA_DIRECTORY, QUIZ_MANIFEST_ENDPOINT } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    ui.initDOMReferences(); // Let UI module grab its elements

    async function initializeApp() {
        try {
            const quizFiles = await apiService.fetchQuizList(QUIZ_MANIFEST_ENDPOINT);
            ui.displayQuizList(quizFiles, handleQuizSelection);
        } catch (error) {
            console.error('Error initializing app:', error);
            ui.displayQuizListError(`Error loading quiz list: ${error.message}`);
        }
    }

    async function handleQuizSelection(fileName) {
        try {
            ui.showLoadingState(); // Show loading in quiz container
            const quizData = await apiService.fetchQuizData(`${DATA_DIRECTORY}/${fileName}`);
            quizService.loadQuiz(quizData, fileName); // Pass filename for storage key

            // Try to load persisted state
            const persistedState = storageService.loadQuizState(quizService.getCurrentQuizFile(), quizData.length);
            if (persistedState) {
                quizService.applyPersistedState(persistedState);
            }

            renderCurrentQuizView();
            ui.hideQuizList();
            ui.showQuizContainer();
        } catch (error) {
            console.error('Error loading quiz:', error);
            ui.displayQuizLoadError(error.message, fileName);
        }
    }

    function renderCurrentQuizView() {
        const question = quizService.getCurrentQuestion();
        if (question) {
            ui.displayQuestion(
                question,
                quizService.getCurrentQuestionIndex(),
                quizService.getTotalQuestions(),
                quizService.getUserAnswerForCurrentQuestion(),
                quizService.isCurrentQuestionEvaluated()
            );
            if (quizService.isCurrentQuestionEvaluated()) {
                ui.evaluateQuestionDisplay(question, quizService.getUserAnswerForCurrentQuestion());
            }
        } else {
            // Handle end of quiz or no questions
            quizService.calculateFinalScore();
            ui.displayResults(quizService.getScore(), quizService.getTotalQuestions());
        }
        ui.updateButtonStates(
            quizService.getCurrentQuestionIndex(),
            quizService.getTotalQuestions(),
            quizService.areQuestionsLoaded()
        );
        ui.updateProgressPanel(
            quizService.getQuestions(),
            quizService.getCurrentQuestionIndex(),
            quizService.getUserAnswers(),
            quizService.getEvaluatedQuestions(),
            (index) => { // Navigate to question from progress panel
                quizService.setCurrentQuestionIndex(index);
                renderCurrentQuizView();
            }
        );
    }

    // --- Event Handlers for Navigation/Actions ---
    ui.prevBtn.addEventListener('click', () => {
        if (quizService.goToPreviousQuestion()) {
            renderCurrentQuizView();
            storageService.saveQuizState(quizService.getFullState());
        }
    });

    ui.nextBtn.addEventListener('click', () => {
        if (quizService.goToNextQuestion()) {
            renderCurrentQuizView();
            storageService.saveQuizState(quizService.getFullState());
        }
    });

    ui.evaluateBtn.addEventListener('click', () => {
        const question = quizService.getCurrentQuestion();
        const userAnswer = quizService.getUserAnswerForCurrentQuestion();
        quizService.markCurrentQuestionEvaluated();
        ui.evaluateQuestionDisplay(question, userAnswer); // UI shows feedback
        ui.disableEvaluateButton();
        ui.updateProgressPanel(/*...args...*/); // Update progress
        storageService.saveQuizState(quizService.getFullState());
    });

    ui.submitBtn.addEventListener('click', () => {
        quizService.calculateFinalScore(); // Recalculate score based on all answers
        ui.displayResults(quizService.getScore(), quizService.getTotalQuestions());
        storageService.clearQuizState(); // Clear state after submission
    });

    ui.resetBtn.addEventListener('click', () => {
        quizService.resetCurrentQuestionAnswer();
        renderCurrentQuizView(); // Re-render to clear inputs and evaluation
        storageService.saveQuizState(quizService.getFullState());
    });

    ui.shuffleToggleBtn.addEventListener('click', () => {
        const isShuffled = quizService.toggleShuffle();
        ui.updateShuffleButtonText(isShuffled);
        renderCurrentQuizView();
        storageService.saveQuizState(quizService.getFullState()); // Save new order and reset state
    });

    // Global event listener for saving answers (delegated from ui.js)
    document.addEventListener('answerChanged', (event) => {
        const { questionType, answer, questionIndex } = event.detail;
        quizService.saveAnswer(questionIndex, answer, questionType);
        ui.enableEvaluateButton(); // Re-enable if it was disabled
        ui.clearEvaluationStylesForCurrentQuestion();
        storageService.saveQuizState(quizService.getFullState());
         ui.updateProgressPanel( /*...args...*/); // Update progress panel if needed
    });

    initializeApp();
});