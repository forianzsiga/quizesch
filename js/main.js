// js/main.js
import * as ui from './ui.js';
import * as apiService from './apiService.js';
import * as quizService from './quizService.js';
import * as storageService from './storageService.js';
import * as firebaseService from './firebaseService.js'; // Import Firebase service
import { DATA_DIRECTORY, QUIZ_MANIFEST_ENDPOINT } from './config.js';

// HACK: Make quizService globally available for ui.js and dragAndDrop.js
// This should ideally be refactored with better dependency injection or event system.
window.quizServiceInstance = quizService;

document.addEventListener('DOMContentLoaded', () => {
    ui.initDOMReferences();

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
            ui.showLoadingState();
            const quizData = await apiService.fetchQuizData(`${DATA_DIRECTORY}/data/${fileName}`);
            quizService.loadQuiz(quizData, fileName);

            const persistedState = storageService.loadQuizState(quizService.getCurrentQuizFile(), quizData.length);
            if (persistedState) {
                quizService.applyPersistedState(persistedState);
            }

            await renderCurrentQuizView(); // Make it async to await vote data
            ui.hideQuizList();
            ui.showQuizContainer();
        } catch (error) {
            console.error('Error loading quiz:', error);
            ui.displayQuizLoadError(error.message, fileName);
        }
    }

    async function renderCurrentQuizView() {
    const question = quizService.getCurrentQuestion();
    if (question) {
        const currentQIndex = quizService.getCurrentQuestionIndex();
        const currentFile = quizService.getCurrentQuizFile();

        // 1. Display question structure immediately without vote data (decoupled from vote fetching)
        ui.displayQuestion(
            question,
            currentQIndex,
            quizService.getTotalQuestions(),
            quizService.getUserAnswerForCurrentQuestion(),
            quizService.isCurrentQuestionEvaluated(),
            null // Pass null or a default loading state for voteData initially
        );
        if (quizService.isCurrentQuestionEvaluated()) {
            ui.evaluateQuestionDisplay(question, quizService.getUserAnswerForCurrentQuestion());
        }

        // 2. Fetch vote data asynchronously and update vote UI part separately
        if (currentFile && currentQIndex !== undefined) {
            firebaseService.getQuestionVoteData(currentFile, currentQIndex)
                .then(voteData => {
                    // Ensure this update is for the *still current* question
                    if (currentFile === quizService.getCurrentQuizFile() && currentQIndex === quizService.getCurrentQuestionIndex()) {
                        ui.updateVoteUIDisplay(voteData); // NEW ui.js function
                    }
                })
                .catch(error => {
                    console.error("Error fetching vote data for UI update:", error);
                    // Optionally update UI to show error fetching votes
                });
        }
    } else {
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
            async (index) => { // Make this async for re-render
                quizService.setCurrentQuestionIndex(index);
                await renderCurrentQuizView();
            }
        );
    }

    ui.prevBtn.addEventListener('click', async () => {
        if (quizService.goToPreviousQuestion()) {
            await renderCurrentQuizView();
            storageService.saveQuizState(quizService.getFullState());
        }
    });

    ui.nextBtn.addEventListener('click', async () => {
        if (quizService.goToNextQuestion()) {
            await renderCurrentQuizView();
            storageService.saveQuizState(quizService.getFullState());
        }
    });

    ui.evaluateBtn.addEventListener('click', () => {
        if (!quizService.areQuestionsLoaded()) return;
        const question = quizService.getCurrentQuestion();
        const userAnswer = quizService.getUserAnswerForCurrentQuestion();
        quizService.markCurrentQuestionEvaluated();
        ui.evaluateQuestionDisplay(question, userAnswer);
        ui.disableEvaluateButton();
        ui.updateProgressPanel( // Re-call with current args to update progress panel
            quizService.getQuestions(),
            quizService.getCurrentQuestionIndex(),
            quizService.getUserAnswers(),
            quizService.getEvaluatedQuestions(),
            async (index) => { quizService.setCurrentQuestionIndex(index); await renderCurrentQuizView(); }
        );
        storageService.saveQuizState(quizService.getFullState());
    });

    ui.submitBtn.addEventListener('click', () => {
        quizService.calculateFinalScore();
        ui.displayResults(quizService.getScore(), quizService.getTotalQuestions());
        storageService.clearQuizState();
    });

    ui.resetBtn.addEventListener('click', async () => {
        quizService.resetCurrentQuestionAnswer();
        await renderCurrentQuizView();
        storageService.saveQuizState(quizService.getFullState());
    });

    ui.shuffleToggleBtn.addEventListener('click', async () => {
        const isShuffled = quizService.toggleShuffle();
        ui.updateShuffleButtonText(isShuffled);
        await renderCurrentQuizView();
        storageService.saveQuizState(quizService.getFullState());
    });

    document.addEventListener('answerChanged', (event) => {
        const { questionType, answer, questionIndex } = event.detail;
        quizService.saveAnswer(questionIndex, answer); // Removed questionType, saveAnswer doesn't use it
        ui.enableEvaluateButton();
        ui.clearEvaluationStylesForCurrentQuestion(); // Clear styles for the current question
        storageService.saveQuizState(quizService.getFullState());
        ui.updateProgressPanel( // Re-call with current args
            quizService.getQuestions(),
            quizService.getCurrentQuestionIndex(),
            quizService.getUserAnswers(),
            quizService.getEvaluatedQuestions(),
            async (index) => { quizService.setCurrentQuestionIndex(index); await renderCurrentQuizView(); }
        );
    });

    // Listen for vote events
    document.addEventListener('questionVoted', async (event) => {
        const { quizFile, questionIndex, voteType } = event.detail;
        if (!quizFile || questionIndex === undefined || !voteType) {
            console.error("Missing details in questionVoted event", event.detail);
            return;
        }
        const updatedVoteData = await firebaseService.recordVote(quizFile, questionIndex, voteType);
        if (updatedVoteData) {
            // Re-render the current question to display updated vote info
            // Ensure this only re-renders if the vote was for the *currently displayed* question
            if (quizFile === quizService.getCurrentQuizFile() && questionIndex === quizService.getCurrentQuestionIndex()) {
                 await renderCurrentQuizView(); // Only re-render if it's the current view
            }
        }
    });

    initializeApp();
});