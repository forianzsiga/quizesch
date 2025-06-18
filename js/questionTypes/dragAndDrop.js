// js/questionTypes/dragAndDrop.js

let currentDragData = null;

export function render(question, userAnswer, questionIndex, isEvaluated) {
    let dragDropText = question.text || "";
    const choices = question.choices || [];

    choices.forEach(choice => {
        if (choice && choice.identifier) {
            const placeholder = `[${choice.identifier}]`;
            const escapedIdentifier = choice.identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const placeholderRegex = new RegExp(`\\[${escapedIdentifier}\\]`, 'g');

            if (dragDropText.includes(placeholder)) {
                dragDropText = dragDropText.replace(placeholderRegex,
                    `<span class="drop-target" data-identifier="${choice.identifier}">
                         <span class="inline-feedback"></span>
                     </span>`
                );
            }
        }
    });

    let html = `<p>${dragDropText.replace(/\n/g, '<br>')}</p>`;
    html += '<div class="drag-options-container"><strong>Drag options:</strong><br><div id="drag-options">'; // Added container class
    choices.forEach(choice => {
        if (choice && choice.identifier && choice.label) {
            // Make ID unique per question instance if multiple D&D questions could somehow be on page (unlikely here)
            html += `<span class="draggable" draggable="${!isEvaluated}" id="drag-${questionIndex}-${choice.identifier}" data-identifier="${choice.identifier}">${choice.label}</span> `;
        }
    });
    html += '</div></div>';
    return html;
}

export function addInputListeners(questionContainer, questionIndex, onAnswerChangeCallback) {
    const draggables = questionContainer.querySelectorAll('.draggable[draggable="true"]'); // Only attach to active ones
    const dropTargets = questionContainer.querySelectorAll('.drop-target');

    draggables.forEach(el => {
        el.ondragstart = (ev) => dragStartHandler(ev);
    });

    dropTargets.forEach(el => {
        el.ondragover = dragOverHandler;
        el.ondragleave = dragLeaveHandler;
        el.ondrop = (ev) => dropHandler(ev, questionContainer, questionIndex, onAnswerChangeCallback);
    });

    // HACK: Accessing global quizService instance to get necessary data for initial population
    if (window.quizServiceInstance) {
        const questionData = window.quizServiceInstance.getCurrentQuestion();
        const userAnswer = window.quizServiceInstance.getUserAnswerForCurrentQuestion();
        if (questionData && questionData.question_type === 'drag_n_drop') { // Ensure it's for D&D
             populateDropTargets(questionContainer, questionData, userAnswer);
             // updateDraggableVisibility(questionContainer); // Make unconsumable
        }
    } else {
        console.warn("D&D: quizServiceInstance not found on window for initial population.");
    }
}

function dragStartHandler(ev) {
    const draggableElement = ev.target.closest('.draggable[data-identifier]');
    if (!draggableElement || draggableElement.getAttribute('draggable') === 'false') {
        ev.preventDefault(); return;
    }
    currentDragData = {
        id: draggableElement.id,
        identifier: draggableElement.dataset.identifier
    };
    ev.dataTransfer.setData("text/plain", draggableElement.id);
    ev.dataTransfer.effectAllowed = "move";
}

function dragOverHandler(ev) {
    ev.preventDefault();
    const target = ev.target.closest('.drop-target');
    if (target) target.classList.add('highlight-drop');
}

function dragLeaveHandler(ev) {
    const target = ev.target.closest('.drop-target');
    if (target) target.classList.remove('highlight-drop');
}

function dropHandler(ev, questionContainer, questionIndex, onAnswerChangeCallback) {
    ev.preventDefault();
    const targetElement = ev.target.closest('.drop-target[data-identifier]');
    if (!targetElement || !currentDragData) {
        if (currentDragData) currentDragData = null;
        return;
    }

    targetElement.classList.remove('highlight-drop');
    const draggedChoiceIdentifier = currentDragData.identifier;
    // Find the original draggable element *within the current questionContainer* to get its text
    const draggedElementOriginal = questionContainer.querySelector(`#${currentDragData.id}`);


    const previouslyDroppedItemIdentifier = targetElement.getAttribute('data-dropped-item');
    if (previouslyDroppedItemIdentifier) {
        const existingDraggableInOptions = questionContainer.querySelector(`#drag-options .draggable[data-identifier="${previouslyDroppedItemIdentifier}"]`);
        if (existingDraggableInOptions) {
            existingDraggableInOptions.style.display = 'inline-block';
        }
        targetElement.textContent = '';
        const feedbackSpan = document.createElement('span');
        feedbackSpan.className = 'inline-feedback';
        targetElement.appendChild(feedbackSpan);
    }

    if (draggedElementOriginal) { // Ensure original draggable was found
        const labelTextNode = document.createTextNode(draggedElementOriginal.textContent);
        let feedbackSpan = targetElement.querySelector('.inline-feedback');
        if (!feedbackSpan) {
            feedbackSpan = document.createElement('span');
            feedbackSpan.className = 'inline-feedback';
            targetElement.appendChild(feedbackSpan);
        }
        targetElement.insertBefore(labelTextNode, feedbackSpan);
        targetElement.setAttribute('data-dropped-item', draggedChoiceIdentifier);
        // draggedElementOriginal.style.display = 'none'; // Make unconsumable
    } else {
        console.warn("D&D: Original draggable element not found for drop:", currentDragData.id);
    }


    currentDragData = null;

    const newAnswerMap = getAnswer(questionContainer, questionIndex);
    onAnswerChangeCallback(newAnswerMap); // This will trigger 'answerChanged' event in questionManager

    // updateDraggableVisibility(questionContainer); // Make unconsumable
}

export function getAnswer(questionContainer, questionIndex) {
    const answers = {};
    const targets = questionContainer.querySelectorAll('.drop-target[data-identifier]');
    targets.forEach(target => {
        const targetId = target.dataset.identifier;
        const droppedItemId = target.getAttribute('data-dropped-item');
        if (targetId && droppedItemId) {
            answers[targetId] = droppedItemId;
        }
    });
    return answers;
}

export function evaluateDisplay(question, userAnswer, questionContainer) {
    const correctDropMapping = getCorrectDropMapping(question);
    const userAnswersMap = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};
    const choices = question.choices || [];

    questionContainer.querySelectorAll('.drop-target[data-identifier]').forEach(target => {
        const targetId = target.dataset.identifier;
        const feedbackSpan = target.querySelector('.inline-feedback');
        target.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
        if(feedbackSpan) feedbackSpan.textContent = '';

        const droppedItemId = userAnswersMap[targetId];
        const correctItemIdForThisTarget = correctDropMapping[targetId];

        const correctChoiceDetails = choices.find(c => c.identifier === correctItemIdForThisTarget);
        const correctLabel = correctChoiceDetails ? correctChoiceDetails.label : '??';

        if (correctItemIdForThisTarget !== undefined) {
            if (droppedItemId && droppedItemId === correctItemIdForThisTarget) {
                target.classList.add('evaluation-correct');
                if (feedbackSpan) feedbackSpan.textContent = '✓';
            } else if (droppedItemId && droppedItemId !== correctItemIdForThisTarget) {
                target.classList.add('evaluation-incorrect');
                if (feedbackSpan) feedbackSpan.textContent = `✗ (Should be: ${correctLabel})`;
            } else {
                target.classList.add('evaluation-missed');
                if (feedbackSpan) feedbackSpan.textContent = `Needed: ${correctLabel}`;
            }
        }
    });
    questionContainer.querySelectorAll('.draggable').forEach(d => d.setAttribute('draggable', 'false'));
}

export function isCorrect(question, userAnswer) {
    const correctMapping = getCorrectDropMapping(question);
    const targetIdsInQuestion = Object.keys(correctMapping);

    if (typeof userAnswer !== 'object' || userAnswer === null) {
        return targetIdsInQuestion.length === 0;
    }

    let correctCount = 0;
    let userAnswerKeysCount = 0;

    for (const targetId in userAnswer) {
        if (userAnswer.hasOwnProperty(targetId)) {
            userAnswerKeysCount++;
            if (correctMapping[targetId] && userAnswer[targetId] === correctMapping[targetId]) {
                correctCount++;
            }
        }
    }
    return correctCount === targetIdsInQuestion.length && userAnswerKeysCount === targetIdsInQuestion.length;
}

export function populateDropTargets(questionContainer, question, userAnswer) {
    const dropTargets = questionContainer.querySelectorAll('.drop-target[data-identifier]');
    const choices = question.choices || [];
    const savedUserAnswers = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};

    dropTargets.forEach(target => {
        const targetId = target.dataset.identifier;
        Array.from(target.childNodes).forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                target.removeChild(child);
            }
        });
        let feedbackSpan = target.querySelector('.inline-feedback');
        if (!feedbackSpan) {
            feedbackSpan = document.createElement('span');
            feedbackSpan.className = 'inline-feedback';
            target.appendChild(feedbackSpan);
        }
        feedbackSpan.textContent = '';
        target.removeAttribute('data-dropped-item');

        const droppedChoiceIdentifier = savedUserAnswers[targetId];
        if (droppedChoiceIdentifier) {
            const choiceData = choices.find(c => c.identifier === droppedChoiceIdentifier);
            if (choiceData && choiceData.label) {
                const labelTextNode = document.createTextNode(choiceData.label);
                target.insertBefore(labelTextNode, feedbackSpan);
                target.setAttribute('data-dropped-item', droppedChoiceIdentifier);
            }
        }
    });
}

/* // Make unconsumable
export function updateDraggableVisibility(questionContainer) {
    const placedItemIdentifiers = new Set();
    questionContainer.querySelectorAll('.drop-target[data-dropped-item]').forEach(target => {
        placedItemIdentifiers.add(target.getAttribute('data-dropped-item'));
    });

    questionContainer.querySelectorAll('#drag-options .draggable[data-identifier]').forEach(draggable => {
        if (placedItemIdentifiers.has(draggable.dataset.identifier)) {
            draggable.style.display = 'none';
        } else {
            draggable.style.display = 'inline-block';
        }
    });
}
*/

function getCorrectDropMapping(question) {
    const mapping = {};
    if (question && Array.isArray(question.choices)) {
        question.choices.forEach(choice => {
            if (choice && choice.identifier && question.text && question.text.includes(`[${choice.identifier}]`)) {
                mapping[choice.identifier] = choice.identifier;
            }
        });
    }
    return mapping;
}