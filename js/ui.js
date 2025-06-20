// js/ui.js
import * as questionManager from './questionManager.js';
import { DATA_DIRECTORY } from './config.js';
import * as apiService from './apiService.js';

export let questionContainer, quizContainer, prevBtn, nextBtn, resultContainer,
           scoreElement, evaluateBtn, resetBtn, shuffleToggleBtn, quizListContainer,
           quizListElement, progressPanel, navigationControls, quizSelectionArea,
           filterPanel, filtersContainer, untaggedQuizContainer, untaggedQuizListElement,
           mainBannerContainer, backToMenuBtn, inQuizWrapper, mainViewWrapper, clearAllBtn;

// Helper to format file names for display
function _prettifyFileName(fileName) {
    if (!fileName) return '';
    let pretty = fileName.replace('.json','').replace(/_/g,' ');
    pretty = pretty.replace(/\b(zh|pzh|ppzh)\b/gi, m => m.toUpperCase());
    pretty = pretty.replace(/\b(\d{4})\b/g, '($1)');
    pretty = pretty.replace(/\b([a-z])/g, c => c.toUpperCase());
    return pretty;
}

export function initDOMReferences() {
    questionContainer = document.getElementById('question-container');
    quizContainer = document.getElementById('quiz-container');
    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');
    resultContainer = document.getElementById('result-container');
    scoreElement = document.getElementById('score');
    evaluateBtn = document.getElementById('evaluate-btn');
    resetBtn = document.getElementById('reset-btn');
    shuffleToggleBtn = document.getElementById('shuffle-toggle-btn');
    quizListContainer = document.getElementById('quiz-list-container');
    quizListElement = document.getElementById('quiz-list');
    progressPanel = document.getElementById('progress-panel');
    navigationControls = document.getElementById('navigation-controls');
    quizSelectionArea = document.getElementById('quiz-selection-area');
    filterPanel = document.getElementById('filter-panel');
    filtersContainer = document.getElementById('filters');
    untaggedQuizContainer = document.getElementById('untagged-quiz-container');
    untaggedQuizListElement = document.getElementById('untagged-quiz-list');
    mainBannerContainer = document.getElementById('main-banner-container');
    backToMenuBtn = document.getElementById('back-to-menu-btn');
    inQuizWrapper = document.getElementById('in-quiz-wrapper');
    mainViewWrapper = document.getElementById('main-view-wrapper');
    clearAllBtn = document.getElementById('clear-all-btn');
}

export function displayFilters(availableTags, onFilterChangeCallback) {
    if (!filtersContainer || !availableTags) return;

    filtersContainer.innerHTML = '';
    const filterOrder = ['subject', 'type', 'year'];

    let hasFilters = false;
    filterOrder.forEach(key => {
        const tags = availableTags[key];
        if (tags && tags.length > 0) {
            hasFilters = true;
            const group = document.createElement('div');
            group.className = 'filter-group';
            group.dataset.filterType = key;

            const title = document.createElement('h4');
            title.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            group.appendChild(title);

            tags.forEach(tag => {
                const option = document.createElement('div');
                option.className = 'filter-option';
                option.textContent = tag;
                option.dataset.tag = tag;
                option.onclick = () => {
                    option.classList.toggle('active');
                    onFilterChangeCallback();
                };
                group.appendChild(option);
            });
            filtersContainer.appendChild(group);
        }
    });

    if (!hasFilters) {
        filterPanel.style.display = 'none';
    } else {
        filterPanel.style.display = 'block';
    }
}

export function getActiveFilters() {
    const filters = { subject: [], type: [], year: [] };
    document.querySelectorAll('.filter-group').forEach(group => {
        const type = group.dataset.filterType;
        if (filters[type]) {
            group.querySelectorAll('.filter-option.active').forEach(option => {
                filters[type].push(option.dataset.tag);
            });
        }
    });
    return filters;
}

// Private helper to create a single quiz card element
function _createQuizCard(quiz, onQuizSelectCallback, allProgress) {
    const fileName = quiz.fileName;
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.dataset.fileName = fileName;
    link.addEventListener('click', (event) => {
        event.preventDefault();
        let target = event.target;
        while (target && !target.dataset.fileName && target !== document) {
            target = target.parentElement;
        }
        if (target && target.dataset.fileName) {
            onQuizSelectCallback(target.dataset.fileName);
        }
    });

    const card = document.createElement('div');
    card.className = 'quiz-card';

    // Supervision status indicator
    const supervisionWrapper = document.createElement('div');
    apiService.fetchQuizSupervisionInfo(`${DATA_DIRECTORY}/data/${fileName}`)
        .then(supInfo => {
            let indicator = '';
            let indicatorContainer = card.querySelector('.indicator-container');
            if(!indicatorContainer) {
                 indicatorContainer = document.createElement('div');
                 indicatorContainer.style.textAlign = 'center';
                 card.querySelector('.quiz-filename').after(indicatorContainer);
            }

            if (supInfo.generated === supInfo.total && supInfo.total > 0) {
                indicator = '<span class="llm-indicator" title="This quiz set is entirely generated by an LLM">🤖 Generated</span>';
            } else if (supInfo.supervised === supInfo.total && supInfo.total > 0) {
                indicator = '<span class="supervised-indicator" title="This quiz set is fully human supervised">✔ Fully Supervised</span>';
            } else if (supInfo.supervised > 0) {
                indicator = '<span class="partial-indicator" title="This quiz set already contains human supervised questions">⚠️ Partially Supervised</span>';
            } else if (supInfo.total > 0) {
                indicator = '<span class="unsupervised-indicator" title="This quiz set generated from existing sources interpreted by an LLM and it was not yet supervised by a human">❗ Unsupervised</span>';
            }
            if (indicator) {
                 indicatorContainer.innerHTML = indicator;
            }
        }).catch(err => console.warn(`Could not fetch supervision info for ${fileName}: ${err.message}`));

    const pretty = _prettifyFileName(fileName);

    const icon = document.createElement('div');
    icon.className = 'quiz-icon';
    icon.textContent = '📚';
    card.appendChild(icon);
    const title = document.createElement('div');
    title.className = 'quiz-title';
    title.textContent = pretty;
    card.appendChild(title);
    const fname = document.createElement('div');
    fname.className = 'quiz-filename';
    fname.textContent = fileName;
    card.appendChild(fname);
    
    // Progress Bar and Completion status
    const progressState = allProgress ? allProgress[fileName] : null;
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';

    let correctWidth = 0;
    let incorrectWidth = 0;

    if (progressState && progressState.progress && progressState.progress.totalQuestions > 0) {
        const { correct, incorrect, totalQuestions } = progressState.progress;
        correctWidth = (correct / totalQuestions) * 100;
        incorrectWidth = (incorrect / totalQuestions) * 100;
    }

    if (correctWidth > 0) {
        const correctBar = document.createElement('div');
        correctBar.className = 'progress-bar progress-bar-correct';
        correctBar.style.width = `${correctWidth}%`;
        progressBarContainer.appendChild(correctBar);
    }
    if (incorrectWidth > 0) {
        const incorrectBar = document.createElement('div');
        incorrectBar.className = 'progress-bar progress-bar-incorrect';
        incorrectBar.style.width = `${incorrectWidth}%`;
        progressBarContainer.appendChild(incorrectBar);
    }
    
    const neutralWidth = 100 - correctWidth - incorrectWidth;
    if (neutralWidth > 0.1) { // floating point safety
        const neutralBar = document.createElement('div');
        neutralBar.className = 'progress-bar progress-bar-neutral';
        neutralBar.style.width = `${neutralWidth}%`;
        progressBarContainer.appendChild(neutralBar);
    }
    card.appendChild(progressBarContainer);

    if (progressState && progressState.progress) {
        const { totalEvaluated, totalQuestions, incorrect } = progressState.progress;
        if (totalEvaluated === totalQuestions && totalQuestions > 0 && incorrect === 0) {
            card.classList.add('fully-correct');
            const checkmark = document.createElement('div');
            checkmark.className = 'completion-checkmark';
            card.appendChild(checkmark);
        }
    }


    link.appendChild(card);
    listItem.appendChild(link);
    return listItem;
}


export function displayQuizList(quizzes, onQuizSelectCallback, allProgress) {
    quizListElement.innerHTML = '';
    if (!quizzes || quizzes.length === 0) {
        quizListElement.innerHTML = '<li>No quizzes match the current filters.</li>';
    } else {
        quizzes.forEach(quiz => {
            const cardItem = _createQuizCard(quiz, onQuizSelectCallback, allProgress);
            quizListElement.appendChild(cardItem);
        });
    }
}

export function displayUntaggedQuizList(quizzes, onQuizSelectCallback, allProgress) {
    untaggedQuizListElement.innerHTML = '';
    if (!quizzes || quizzes.length === 0) {
        untaggedQuizContainer.style.display = 'none';
        return;
    }

    untaggedQuizContainer.style.display = 'flex';
    quizzes.forEach(quiz => {
        const cardItem = _createQuizCard(quiz, onQuizSelectCallback, allProgress);
        untaggedQuizListElement.appendChild(cardItem);
    });
}


export function displayQuestion(question, currentIndex, totalQuestions, userAnswer, isEvaluated, voteData, quizFileName) {
    if (!question) {
        questionContainer.innerHTML = '<p>No question to display.</p>';
        return;
    }
    clearEvaluationStylesForCurrentQuestion();

    let displaySupervisedIndicator = false;
    if (voteData && voteData.totalVotes > 10 && voteData.score > 70) {
        displaySupervisedIndicator = true;
    }

    let indicatorHtml = '';
    if (displaySupervisedIndicator || (question.supervised && question.supervised.trim().toLowerCase() === 'yes')) {
        indicatorHtml = `<span class="supervised-indicator" title="This question is considered trustworthy.">✔ Supervised</span>`;
    } else if (question.supervised && question.supervised.trim().toLowerCase() === 'generated') {
        indicatorHtml = `<span class="llm-indicator" title="Generated by LLM">🤖 LLM generated</span>`;
    } else {
        indicatorHtml = `<span class="unsupervised-indicator" title="Not yet supervised or community reviewed">❗ Unsupervised</span>`;
    }
    
    const prettyQuizName = _prettifyFileName(quizFileName);
    let html = `<h3>${prettyQuizName}<br><span style="font-size: 0.8em; color: #666;">Question ${currentIndex + 1} of ${totalQuestions} ${indicatorHtml}</span></h3>`;
    html += questionManager.renderQuestionContent(question, userAnswer, questionContainer, currentIndex, isEvaluated);
    questionContainer.innerHTML = html;

    const voteUiContainer = document.createElement('div');
    voteUiContainer.className = 'vote-ui-container';
    const scoreText = document.createElement('span');
    scoreText.className = 'vote-score-text';
    if (voteData && voteData.totalVotes > 0) {
        scoreText.textContent = `Trust: ${voteData.score}% (${voteData.positiveVotes}/${voteData.totalVotes} votes). `;
    } else {
        scoreText.textContent = "Trust: Be the first to rate! ";
    }
    voteUiContainer.appendChild(scoreText);

    const trustBtn = document.createElement('button');
    trustBtn.textContent = '👍 Trustworthy';
    trustBtn.className = 'vote-btn trust';
    if (voteData && voteData.userVote === 'trust') trustBtn.classList.add('selected');
    trustBtn.onclick = () => {
        document.dispatchEvent(new CustomEvent('questionVoted', {
            detail: {
                quizFile: window.quizServiceInstance.getCurrentQuizFile(), // HACK
                questionIndex: currentIndex,
                voteType: 'trust'
            }
        }));
    };
    voteUiContainer.appendChild(trustBtn);

    const distrustBtn = document.createElement('button');
    distrustBtn.textContent = '👎 Needs Review';
    distrustBtn.className = 'vote-btn distrust';
    if (voteData && voteData.userVote === 'distrust') distrustBtn.classList.add('selected');
    distrustBtn.onclick = () => {
        document.dispatchEvent(new CustomEvent('questionVoted', {
            detail: {
                quizFile: window.quizServiceInstance.getCurrentQuizFile(), // HACK
                questionIndex: currentIndex,
                voteType: 'distrust'
            }
        }));
    };
    voteUiContainer.appendChild(distrustBtn);

    const verificationInfoLabel = document.createElement('div');
    verificationInfoLabel.className = 'vote-verification-info';
    verificationInfoLabel.innerHTML = 'Questions with over 10 votes and 70% trustworthiness are considered Human Verified. Powered by Firebase 🔥';
    voteUiContainer.appendChild(verificationInfoLabel);

    questionContainer.appendChild(voteUiContainer);

    questionManager.attachInputListeners(question, questionContainer, currentIndex);

    evaluateBtn.disabled = isEvaluated;
}

export function updateButtonStates(currentIndex, totalQuestions, questionsLoaded) {
    if (!questionsLoaded) {
        if (navigationControls) navigationControls.style.display = 'none';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        evaluateBtn.style.display = 'none';
        resetBtn.disabled = true;
        clearAllBtn.disabled = true;
        shuffleToggleBtn.disabled = true;
        return;
    }

    if (navigationControls) navigationControls.style.display = 'flex';
    const onLastQuestion = currentIndex === totalQuestions - 1;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = onLastQuestion;
    nextBtn.style.display = !onLastQuestion ? 'inline-block' : 'none';
    evaluateBtn.style.display = !onLastQuestion ? 'inline-block' : 'none';
    resetBtn.disabled = false;
    clearAllBtn.disabled = false;
    shuffleToggleBtn.disabled = false;
}

export function displayResults(score, totalQuestions) {
    questionContainer.style.display = 'none';
    if (navigationControls) navigationControls.style.display = 'none';
    resultContainer.style.display = 'block';
    scoreElement.textContent = `${score} out of ${totalQuestions}`;
    updateProgressPanel([], -1, [], [], () => {});
}

export function clearEvaluationStylesForCurrentQuestion() {
    const styledElements = questionContainer.querySelectorAll('.evaluation-correct, .evaluation-incorrect, .evaluation-missed');
    styledElements.forEach(el => {
        el.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
         const label = el.querySelector('label');
        if (label) {
            label.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
        }
    });
    const feedbackSpans = questionContainer.querySelectorAll('.inline-feedback');
    feedbackSpans.forEach(span => {
        span.textContent = '';
        span.className = 'inline-feedback';
    });
    const inputs = questionContainer.querySelectorAll('input[type="text"], .drop-target');
    inputs.forEach(input => {
        input.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
    });
}

export function evaluateQuestionDisplay(question, userAnswer) {
    questionManager.evaluateQuestionDisplay(question, userAnswer, questionContainer);
}

export function updateProgressPanel(questions, currentIndex, userAnswers, evaluatedQuestions, onQuestionSelect) {
    if (!questions || questions.length === 0) {
        progressPanel.style.display = 'none';
        return;
    }
    progressPanel.style.display = 'block';
    let html = '<h3 style="margin-top:0;">Progress</h3><ul style="padding-left:0;list-style:none;">';

    questions.forEach((q, idx) => {
        let dotClass = 'dot-neutral';
        let statusTitle = 'Not answered / Not evaluated';

        if (evaluatedQuestions[idx]) {
            if (questionManager.isAnswerCorrect(q, userAnswers[idx])) {
                dotClass = 'dot-correct'; statusTitle = 'Correct';
            } else {
                dotClass = 'dot-incorrect'; statusTitle = 'Incorrect';
            }
        } else if (userAnswers[idx] !== null && userAnswers[idx] !== undefined && (typeof userAnswers[idx] !== 'object' || Object.keys(userAnswers[idx]).length > 0)) {
            dotClass = 'dot-answered'; statusTitle = 'Answered, not evaluated';
        }

        html += `<li style="margin-bottom:6px;cursor:pointer;${currentIndex === idx ? 'font-weight:bold;' : ''}" data-idx="${idx}" title="${statusTitle} - Go to question ${idx + 1}">
                    <span class="progress-dot ${dotClass}"></span>Question ${idx + 1}
                 </li>`;
    });
    html += '</ul>';
    progressPanel.innerHTML = html;

    progressPanel.querySelectorAll('li[data-idx]').forEach(li => {
        li.onclick = () => {
            const idx = parseInt(li.getAttribute('data-idx'));
            if (!isNaN(idx)) { onQuestionSelect(idx); }
        };
    });
    progressPanel.style.backgroundColor = '#fff';
    progressPanel.style.borderRadius = '8px';
    progressPanel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    progressPanel.style.padding = '16px';
    progressPanel.style.margin = '16px'; // You might want this outside #quiz-container in HTML
    // progressPanel.style.top = '10px'; // Position it if it's absolute/fixed
}

export function updateVoteUIDisplay(voteData) {
    const voteUiContainer = questionContainer.querySelector('.vote-ui-container');
    if (!voteUiContainer) return; // Should exist if displayQuestion was called

    const scoreText = voteUiContainer.querySelector('.vote-score-text');
    const trustBtn = voteUiContainer.querySelector('.vote-btn.trust');
    const distrustBtn = voteUiContainer.querySelector('.vote-btn.distrust');

    if (scoreText) {
        if (voteData && voteData.totalVotes > 0) {
            scoreText.textContent = `Trust: ${voteData.score}% (${voteData.positiveVotes}/${voteData.totalVotes} votes). `;
        } else {
            scoreText.textContent = "Trust: Be the first to rate! ";
        }
    }
    if (trustBtn) {
        trustBtn.classList.toggle('selected', voteData && voteData.userVote === 'trust');
    }
    if (distrustBtn) {
        distrustBtn.classList.toggle('selected', voteData && voteData.userVote === 'distrust');
    }
}


export function updateShuffleButtonText(isShuffled) { shuffleToggleBtn.textContent = isShuffled ? 'Unshuffle Questions' : 'Shuffle Questions'; }
export function displayQuizListError(message) { quizListElement.innerHTML = `<li style="color:red;">${message}</li>`; }
export function displayQuizLoadError(message, fileName) { questionContainer.innerHTML = `<p>Error loading quiz questions from ${fileName}. ${message}. Please check console.</p>`; }
export function showLoadingState() { questionContainer.innerHTML = '<p>Loading quiz...</p>'; }

export function hideQuizList() {
    if (mainViewWrapper) mainViewWrapper.style.display = 'none';
}
export function showQuizList() {
    if (mainViewWrapper) mainViewWrapper.style.display = 'flex';
    if (inQuizWrapper) inQuizWrapper.style.display = 'none';
}

export function showQuizContainer() {
    if (inQuizWrapper) inQuizWrapper.style.display = 'flex';
    if (progressPanel) progressPanel.style.display = 'block';
}

export function hideQuizContainer() {
    if(inQuizWrapper) inQuizWrapper.style.display = 'none';
    if(resultContainer) resultContainer.style.display = 'none';
}

export function disableEvaluateButton() { evaluateBtn.disabled = true; }
export function enableEvaluateButton() { evaluateBtn.disabled = false; }