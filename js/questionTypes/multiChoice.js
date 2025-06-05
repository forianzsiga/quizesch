// js/questionTypes/multiChoice.js
export function render(question, userAnswer, questionIndex, isEvaluated) {
    let html = `<p>${question.question_title}</p>`;
    html += '<ul style="list-style: none; padding: 0;">';
    if (question.options) {
        for (const key in question.options) {
            const isChecked = userAnswer && Array.isArray(userAnswer) && userAnswer.includes(key);
            const checkedAttribute = isChecked ? 'checked' : '';
            const inputType = Array.isArray(question.answer) && question.answer.length > 1 ? 'checkbox' : 'radio';
            const disabledAttr = isEvaluated ? 'disabled' : ''; // Disable if already evaluated
            html += `
                <li data-option-key="${key}">
                    <label>
                        <input type="${inputType}" name="q${questionIndex}_option" value="${key}" ${checkedAttribute} ${disabledAttr}>
                        ${key.toUpperCase()}: ${question.options[key]}
                    </label>
                </li>`;
        }
    }
    html += '</ul>';
    return html;
}

export function addInputListeners(questionContainer, questionIndex, onAnswerChangeCallback) {
    const options = questionContainer.querySelectorAll(`input[name="q${questionIndex}_option"]`);
    options.forEach(option => {
        option.addEventListener('change', () => {
            const answer = getAnswer(questionContainer, questionIndex);
            onAnswerChangeCallback(answer);
        });
    });
}

export function getAnswer(questionContainer, questionIndex) {
    const selectedOptions = questionContainer.querySelectorAll(`input[name="q${questionIndex}_option"]:checked`);
    // Logic to determine if it's single (radio) or multiple (checkbox) based on original question data
    // This needs access to the question object, or the input type attribute
    const firstInput = questionContainer.querySelector(`input[name="q${questionIndex}_option"]`);
    const isMultipleAnswer = firstInput && firstInput.type === 'checkbox';

    if (isMultipleAnswer) {
        return Array.from(selectedOptions).map(el => el.value);
    } else {
        return selectedOptions.length ? [selectedOptions[0].value] : [];
    }
}

export function evaluateDisplay(question, userAnswer, questionContainer) {
    const correctAnswerSet = new Set(Array.isArray(question.answer) ? question.answer : []);
    const optionsLi = questionContainer.querySelectorAll(`li[data-option-key]`);

    optionsLi.forEach(li => {
        li.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
        const optionInput = li.querySelector('input');
        if (!optionInput) return;

        const optionValue = optionInput.value;
        const isChecked = optionInput.checked; // User's choice at time of evaluation
        const isCorrectOption = correctAnswerSet.has(optionValue); // Is this option part of the correct answer?

        if (isChecked && isCorrectOption) {
            li.classList.add('evaluation-correct');
        } else if (isChecked && !isCorrectOption) {
            li.classList.add('evaluation-incorrect');
        } else if (!isChecked && isCorrectOption) {
            li.classList.add('evaluation-missed');
        }
        optionInput.disabled = true; // Disable inputs after evaluation
    });
}

export function isCorrect(question, userAnswer) {
    const correctAnswerMC = Array.isArray(question.answer) ? question.answer : [];
    const userAnswerMC = Array.isArray(userAnswer) ? userAnswer : [];

    if (userAnswerMC.length !== correctAnswerMC.length) return false;
    if (userAnswerMC.length === 0 && correctAnswerMC.length === 0) return true; // No selection, none correct.

    // Sort to compare content regardless of order
    const sortedUserAnswer = [...userAnswerMC].sort();
    const sortedCorrectAnswer = [...correctAnswerMC].sort();
    return JSON.stringify(sortedUserAnswer) === JSON.stringify(sortedCorrectAnswer);
}