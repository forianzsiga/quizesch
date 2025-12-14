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

let taggedQuizzes = [];
let untaggedQuizzes = [];
let activeFilters = { subject: [], type: [], year: [] }; // To store current filter state
let allQuizProgress = {}; // To store progress for all quizzes

document.addEventListener('DOMContentLoaded', () => {
    ui.initDOMReferences();

    async function initializeApp() {
        try {
            allQuizProgress = storageService.loadAllProgress();
            const manifest = await apiService.fetchQuizList(QUIZ_MANIFEST_ENDPOINT);
            const allQuizzes = manifest.quizzes || [];

            // Split quizzes into tagged and untagged groups
            taggedQuizzes = allQuizzes.filter(q => q.tags.subject !== 'Untagged');
            untaggedQuizzes = allQuizzes.filter(q => q.tags.subject === 'Untagged');
            
            // Build available tags ONLY from the tagged quizzes
            const availableTags = { subject: new Set(), type: new Set(), year: new Set() };
            taggedQuizzes.forEach(quiz => {
                availableTags.subject.add(quiz.tags.subject);
                availableTags.type.add(quiz.tags.type);
                availableTags.year.add(String(quiz.tags.year));
            });
            // Convert sets to sorted arrays for display
            Object.keys(availableTags).forEach(key => {
                availableTags[key] = [...availableTags[key]].sort();
            });

            ui.displayFilters(availableTags, handleFilterChange);
            ui.displayQuizList(taggedQuizzes, handleQuizSelection, allQuizProgress);
            ui.displayUntaggedQuizList(untaggedQuizzes, handleQuizSelection, allQuizProgress);
            ui.showQuizList(); // Ensure the list is shown and quiz view is hidden initially

        } catch (error) {
            console.error('Error initializing app:', error);
            ui.displayQuizListError(`Error loading quiz list: ${error.message}`);
        }
    }
    
    function handleFilterChange() {
        activeFilters = ui.getActiveFilters();
        const filteredQuizzes = taggedQuizzes.filter(quiz => {
            const tags = quiz.tags;
            return (activeFilters.subject.length === 0 || activeFilters.subject.includes(tags.subject)) &&
                   (activeFilters.type.length === 0 || activeFilters.type.includes(tags.type)) &&
                   (activeFilters.year.length === 0 || activeFilters.year.includes(String(tags.year)));
        });
        // Only re-render the filtered list
        ui.displayQuizList(filteredQuizzes, handleQuizSelection, allQuizProgress);
    }

    async function handleQuizSelection(fileName) {
        try {
            ui.showLoadingState();
            ui.hideQuizList(); // Hide list view first
            ui.showQuizContainer(); // Then show quiz view

            const quizData = await apiService.fetchQuizData(`${DATA_DIRECTORY}/data/${fileName}`);
            quizService.loadQuiz(quizData, fileName);

            const questionCount = Array.isArray(quizData) ? quizData.length : (quizData.questions || []).length;
            const persistedState = storageService.loadQuizProgress(quizService.getCurrentQuizFile(), questionCount);
            if (persistedState) {
                quizService.applyPersistedState(persistedState);
            }

            await renderCurrentQuizView();
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
            null, // Pass null or a default loading state for voteData initially
            currentFile // Pass the quiz file name
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
            storageService.saveQuizProgress(quizService.getFullState());
        }
    });

    ui.nextBtn.addEventListener('click', async () => {
        if (quizService.goToNextQuestion()) {
            await renderCurrentQuizView();
            storageService.saveQuizProgress(quizService.getFullState());
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
        storageService.saveQuizProgress(quizService.getFullState());
    });

    // "Clear Answer" button for the current question
    ui.resetBtn.addEventListener('click', async () => {
        quizService.resetCurrentQuestionAnswer();
        await renderCurrentQuizView();
        storageService.saveQuizProgress(quizService.getFullState());
    });

    // New "Clear All Progress" button for the entire quiz
    ui.clearAllBtn.addEventListener('click', async () => {
        const currentFile = quizService.getCurrentQuizFile();
        if (!currentFile) return;
    
        if (confirm('Are you sure you want to clear all your answers and progress for this quiz? This cannot be undone.')) {
            // Clear from persistent storage
            storageService.clearQuizProgress(currentFile);
            // Reset the in-memory state in the service
            quizService.resetFullQuiz();
            // Re-render the view, which will now be at the first question with no answers
            await renderCurrentQuizView();
        }
    });

    ui.shuffleToggleBtn.addEventListener('click', async () => {
        const isShuffled = quizService.toggleShuffle();
        ui.updateShuffleButtonText(isShuffled);
        await renderCurrentQuizView();
        storageService.saveQuizProgress(quizService.getFullState());
    });
    
    ui.backToMenuBtn.addEventListener('click', () => {
        if (quizService.areQuestionsLoaded()) {
            storageService.saveQuizProgress(quizService.getFullState());
        }
        quizService.unloadQuiz();
        initializeApp(); // Re-run to refresh list with latest progress
    });

    document.addEventListener('answerChanged', (event) => {
        const { questionType, answer, questionIndex } = event.detail;
        quizService.saveAnswer(questionIndex, answer); // Removed questionType, saveAnswer doesn't use it
        ui.enableEvaluateButton();
        ui.clearEvaluationStylesForCurrentQuestion(); // Clear styles for the current question
        storageService.saveQuizProgress(quizService.getFullState());
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

    // Keyboard shortcuts listener
    document.addEventListener('keydown', (event) => {
        // Only fire shortcuts if the quiz view is active
        if (ui.inQuizWrapper.style.display !== 'flex') {
            return;
        }

        // Don't fire shortcuts if user is typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key.toLowerCase()) {
            case 'arrowleft':
                event.preventDefault(); // Prevent browser scrolling
                ui.prevBtn.click();
                break;
            case 'arrowright':
                event.preventDefault(); // Prevent browser scrolling
                ui.nextBtn.click();
                break;
            case 'e':
                ui.evaluateBtn.click();
                break;
            case 'c':
                ui.resetBtn.click();
                break;
        }
    });

    initializeApp();
});