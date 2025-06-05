// js/questionTypes/fillTheBlanks.js

/**
 * Generates the HTML for a fill-the-blanks question.
 * @param {object} question - The question object.
 * @param {object} userAnswer - The user's current answers for this question (identifier: value).
 * @param {number} questionIndex - The index of the current question.
 * @param {boolean} isEvaluated - Whether the question has been evaluated.
 * @returns {string} HTML string for the question.
 */
export function render(question, userAnswer, questionIndex, isEvaluated) {
    let questionText = question.text || "";
    const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
    const disabledAttr = isEvaluated ? 'disabled' : '';

    blanks.forEach((blank, i) => {
        if (blank && blank.identifier) {
            const savedValue = (userAnswer && typeof userAnswer === 'object' && userAnswer[blank.identifier]) ? userAnswer[blank.identifier] : '';
            const inputId = `q${questionIndex}_blank_${blank.identifier}_${i}`;
            const placeholderRegex = new RegExp(`\\[${blank.identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\]`);

            questionText = questionText.replace(placeholderRegex,
                `<span class="input-wrapper">
                    <input type="text" id="${inputId}" data-identifier="${blank.identifier}" value="${savedValue}" placeholder="Fill blank..." ${disabledAttr}>
                    <span class="inline-feedback" id="feedback-${inputId}"></span>
                 </span>`
            );
        }
    });
    return `<p>${questionText.replace(/\n/g, '<br>')}</p>`;
}

/**
 * Attaches input event listeners to the blank fields.
 * @param {HTMLElement} questionContainer - The DOM element containing the question.
 * @param {number} questionIndex - The index of the question.
 * @param {function} onAnswerChangeCallback - Callback to fire when an answer changes.
 */
export function addInputListeners(questionContainer, questionIndex, onAnswerChangeCallback) {
    const blankInputs = questionContainer.querySelectorAll('input[type="text"][data-identifier]');
    blankInputs.forEach(blank => {
        blank.addEventListener('input', () => {
            const currentAnswers = getAnswer(questionContainer, questionIndex);
            onAnswerChangeCallback(currentAnswers);

            // Clear specific evaluation style on input
            blank.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
            const feedbackSpan = questionContainer.querySelector(`#feedback-${blank.id}`);
            if (feedbackSpan) {
                feedbackSpan.textContent = '';
                feedbackSpan.className = 'inline-feedback';
            }
        });
    });
}

/**
 * Retrieves the current answers from the DOM for a fill-the-blanks question.
 * @param {HTMLElement} questionContainer - The DOM element containing the question.
 * @param {number} questionIndex - The index of the question (unused here but good for consistency).
 * @returns {object} An object with blank identifiers as keys and their values.
 */
export function getAnswer(questionContainer, questionIndex) {
    const answers = {};
    const inputs = questionContainer.querySelectorAll('input[type="text"][data-identifier]');
    inputs.forEach(input => {
        const identifier = input.dataset.identifier;
        if (identifier) {
            answers[identifier] = input.value.trim();
        }
    });
    return answers;
}

/**
 * Visually evaluates the fill-the-blanks question in the DOM.
 * @param {object} question - The question object.
 * @param {object} userAnswer - The user's answers for this question.
 * @param {HTMLElement} questionContainer - The DOM element containing the question.
 */
export function evaluateDisplay(question, userAnswer, questionContainer) {
    const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
    const userAnswersMap = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};

    questionContainer.querySelectorAll('input[type="text"][data-identifier]').forEach(input => {
        const identifier = input.dataset.identifier;
        const blankDefinition = blanks.find(b => b.identifier === identifier);
        const correctAnswer = blankDefinition ? (blankDefinition.answer || "") : ""; // Default to empty if not found
        const userValue = userAnswersMap[identifier] || ""; // User's value for this blank

        const feedbackSpan = questionContainer.querySelector(`#feedback-${input.id}`);
        input.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed'); // Clear previous
        if (feedbackSpan) feedbackSpan.textContent = '';

        if (userValue.toLowerCase() === correctAnswer.toLowerCase()) {
            input.classList.add('evaluation-correct');
            if (feedbackSpan) {
                feedbackSpan.textContent = '✓ Correct!';
                feedbackSpan.className = 'inline-feedback feedback-correct';
            }
        } else {
            if (userValue === "") {
                input.classList.add('evaluation-missed'); // Missed
                if (feedbackSpan) {
                    feedbackSpan.textContent = `✗ Correct: ${correctAnswer}`;
                    feedbackSpan.className = 'inline-feedback feedback-missed';
                }
            } else {
                input.classList.add('evaluation-incorrect'); // Incorrect
                if (feedbackSpan) {
                    feedbackSpan.textContent = `✗ Incorrect. Correct: ${correctAnswer}`;
                    feedbackSpan.className = 'inline-feedback feedback-incorrect';
                }
            }
        }
        input.disabled = true; // Disable after evaluation
    });
}

/**
 * Checks if the user's answer for a fill-the-blanks question is correct.
 * @param {object} question - The question object.
 * @param {object} userAnswer - The user's answers (identifier: value).
 * @returns {boolean} True if correct, false otherwise.
 */
export function isCorrect(question, userAnswer) {
    const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
    if (blanks.length === 0) return true; // No blanks, so technically correct.
    if (typeof userAnswer !== 'object' || userAnswer === null) return false; // No answer provided for an object type.

    for (const blankInfo of blanks) {
        if (!blankInfo || !blankInfo.identifier) {
             console.warn("Invalid blank data in question:", question);
             return false; // Malformed question data
        }
        const correctAnswer = blankInfo.answer || "";
        const userAnswerForBlank = userAnswer[blankInfo.identifier] || "";
        if (userAnswerForBlank.toLowerCase() !== correctAnswer.toLowerCase()) {
            return false;
        }
    }
    // Optional: Check if user provided answers for non-existent blanks (could mark as wrong)
    // const definedBlankIds = new Set(blanks.map(b => b.identifier));
    // for (const idInAnswer in userAnswer) {
    //     if (!definedBlankIds.has(idInAnswer)) return false;
    // }
    return true;
}