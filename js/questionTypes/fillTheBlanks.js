// js/questionTypes/fillTheBlanks.js
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

export function addInputListeners(questionContainer, questionIndex, onAnswerChangeCallback) {
    const blankInputs = questionContainer.querySelectorAll('input[type="text"][data-identifier]');
    blankInputs.forEach(blank => {
        blank.addEventListener('input', () => {
            const currentAnswers = getAnswer(questionContainer, questionIndex);
            onAnswerChangeCallback(currentAnswers);

            blank.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
            const feedbackSpan = questionContainer.querySelector(`#feedback-${blank.id}`);
            if (feedbackSpan) {
                feedbackSpan.textContent = '';
                feedbackSpan.className = 'inline-feedback';
            }
        });
    });
}

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

export function evaluateDisplay(question, userAnswer, questionContainer) {
    const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
    const userAnswersMap = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};

    questionContainer.querySelectorAll('input[type="text"][data-identifier]').forEach(input => {
        const identifier = input.dataset.identifier;
        const blankDefinition = blanks.find(b => b.identifier === identifier);
        const correctAnswer = blankDefinition ? (blankDefinition.answer || "") : "";
        const userValue = userAnswersMap[identifier] || "";

        const feedbackSpan = questionContainer.querySelector(`#feedback-${input.id}`);
        input.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
        if (feedbackSpan) feedbackSpan.textContent = '';

        if (userValue.toLowerCase() === correctAnswer.toLowerCase()) {
            input.classList.add('evaluation-correct');
            if (feedbackSpan) {
                feedbackSpan.textContent = '✓ Correct!';
                feedbackSpan.className = 'inline-feedback feedback-correct';
            }
        } else {
            if (userValue === "") {
                input.classList.add('evaluation-missed');
                if (feedbackSpan) {
                    feedbackSpan.textContent = `✗ Correct: ${correctAnswer}`;
                    feedbackSpan.className = 'inline-feedback feedback-missed';
                }
            } else {
                input.classList.add('evaluation-incorrect');
                if (feedbackSpan) {
                    feedbackSpan.textContent = `✗ Incorrect. Correct: ${correctAnswer}`;
                    feedbackSpan.className = 'inline-feedback feedback-incorrect';
                }
            }
        }
        input.disabled = true;
    });
}

export function isCorrect(question, userAnswer) {
    const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
    if (blanks.length === 0) return true;
    if (typeof userAnswer !== 'object' || userAnswer === null) return false;

    for (const blankInfo of blanks) {
        if (!blankInfo || !blankInfo.identifier) {
             console.warn("Invalid blank data in question:", question);
             return false;
        }
        const correctAnswer = blankInfo.answer || "";
        const userAnswerForBlank = userAnswer[blankInfo.identifier] || "";
        if (userAnswerForBlank.toLowerCase() !== correctAnswer.toLowerCase()) {
            return false;
        }
    }
    return true;
}