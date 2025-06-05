// js/questionTypes/dragAndDrop.js

let currentDragData = null; // Module-level store for the item being dragged

/**
 * Generates the HTML for a drag-and-drop question.
 */
export function render(question, userAnswer, questionIndex, isEvaluated) {
    let dragDropText = question.text || "";
    const choices = question.choices || [];
    // Note: isEvaluated doesn't directly disable D&D elements here;
    // behavior is controlled by disabling event listeners or by how populateDropTargets works.

    // Create placeholders for drop targets
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
    html += '<div class="drag-options-container"><strong>Drag options:</strong><br><div id="drag-options">';
    choices.forEach(choice => {
        if (choice && choice.identifier && choice.label) {
            html += `<span class="draggable" draggable="true" id="drag-${questionIndex}-${choice.identifier}" data-identifier="${choice.identifier}">${choice.label}</span> `;
        }
    });
    html += '</div></div>';
    return html;
}

/**
 * Attaches drag and drop event listeners.
 */
export function addInputListeners(questionContainer, questionIndex, onAnswerChangeCallback) {
    const draggables = questionContainer.querySelectorAll('.draggable');
    const dropTargets = questionContainer.querySelectorAll('.drop-target');

    draggables.forEach(el => {
        el.ondragstart = (ev) => dragStartHandler(ev);
    });

    dropTargets.forEach(el => {
        el.ondragover = dragOverHandler;
        el.ondragleave = dragLeaveHandler;
        el.ondrop = (ev) => dropHandler(ev, questionContainer, questionIndex, onAnswerChangeCallback);
    });

    // Initial population and visibility update
    const questionData = window.quizServiceRefForDnD.getCurrentQuestion(); // HACK: Need a clean way to get question data here
    const userAnswer = window.quizServiceRefForDnD.getUserAnswerForCurrentQuestion(); // HACK for current answer
    populateDropTargets(questionContainer, questionData, userAnswer);
    updateDraggableVisibility(questionContainer);
}

function dragStartHandler(ev) {
    const draggableElement = ev.target.closest('.draggable[data-identifier]');
    if (!draggableElement) {
        ev.preventDefault(); return;
    }
    currentDragData = {
        id: draggableElement.id, // Full ID of the draggable element
        identifier: draggableElement.dataset.identifier // The semantic identifier of the choice
    };
    ev.dataTransfer.setData("text/plain", draggableElement.id); // Standard D&D API
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
    if (!targetElement || !currentDragData) { // No valid target or nothing being dragged
        if (currentDragData) currentDragData = null; // Clear drag data if drop is invalid
        return;
    }

    targetElement.classList.remove('highlight-drop');
    const draggedChoiceIdentifier = currentDragData.identifier;
    const draggedElementOriginal = document.getElementById(currentDragData.id); // The original draggable from options

    // --- Handle returning an item already in the target back to the options ---
    const previouslyDroppedItemIdentifier = targetElement.getAttribute('data-dropped-item');
    if (previouslyDroppedItemIdentifier) {
        const existingDraggableInOptions = questionContainer.querySelector(`#drag-options .draggable[data-identifier="${previouslyDroppedItemIdentifier}"]`);
        if (existingDraggableInOptions) {
            existingDraggableInOptions.style.display = 'inline-block';
        }
        targetElement.textContent = ''; // Clear old content
        const feedbackSpan = document.createElement('span'); // Re-add feedback span
        feedbackSpan.className = 'inline-feedback';
        targetElement.appendChild(feedbackSpan);
    }

    // --- Place the new item ---
    const labelTextNode = document.createTextNode(draggedElementOriginal.textContent);
    const feedbackSpan = targetElement.querySelector('.inline-feedback') || document.createElement('span');
    if (!targetElement.querySelector('.inline-feedback')) { // Ensure feedback span exists
        feedbackSpan.className = 'inline-feedback';
        targetElement.appendChild(feedbackSpan);
    }
    targetElement.insertBefore(labelTextNode, feedbackSpan); // Insert text before feedback
    targetElement.setAttribute('data-dropped-item', draggedChoiceIdentifier);

    if (draggedElementOriginal) {
        draggedElementOriginal.style.display = 'none'; // Hide from options
    }

    currentDragData = null; // Clear drag data

    const newAnswerMap = getAnswer(questionContainer, questionIndex);
    onAnswerChangeCallback(newAnswerMap); // Notify main logic of the change

    updateDraggableVisibility(questionContainer); // Update visibility of options
    // Clear any existing top-level evaluation styles (ui.js would handle this more broadly)
    const uiModule = window.uiRefForDnD; // HACK: Access ui module
    if (uiModule && uiModule.clearEvaluationStylesForCurrentQuestion) {
        uiModule.clearEvaluationStylesForCurrentQuestion();
        uiModule.enableEvaluateButton();
    }
}


/**
 * Retrieves the current answers from the DOM for a drag-and-drop question.
 */
export function getAnswer(questionContainer, questionIndex) {
    const answers = {};
    const targets = questionContainer.querySelectorAll('.drop-target[data-identifier]');
    targets.forEach(target => {
        const targetId = target.dataset.identifier;
        const droppedItemId = target.getAttribute('data-dropped-item');
        if (targetId && droppedItemId) { // Only if something is dropped
            answers[targetId] = droppedItemId;
        }
    });
    return answers;
}

/**
 * Visually evaluates the drag-and-drop question in the DOM.
 */
export function evaluateDisplay(question, userAnswer, questionContainer) {
    const correctDropMapping = getCorrectDropMapping(question);
    const userAnswersMap = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};
    const choices = question.choices || [];

    questionContainer.querySelectorAll('.drop-target[data-identifier]').forEach(target => {
        const targetId = target.dataset.identifier;
        const feedbackSpan = target.querySelector('.inline-feedback');
        target.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
        if(feedbackSpan) feedbackSpan.textContent = '';

        const droppedItemId = userAnswersMap[targetId]; // What user dropped here
        const correctItemIdForThisTarget = correctDropMapping[targetId]; // What should be here

        const correctChoiceDetails = choices.find(c => c.identifier === correctItemIdForThisTarget);
        const correctLabel = correctChoiceDetails ? correctChoiceDetails.label : '??';

        if (correctItemIdForThisTarget !== undefined) { // If this target is supposed to have something
            if (droppedItemId && droppedItemId === correctItemIdForThisTarget) {
                target.classList.add('evaluation-correct');
                if (feedbackSpan) feedbackSpan.textContent = '✓';
            } else if (droppedItemId && droppedItemId !== correctItemIdForThisTarget) {
                target.classList.add('evaluation-incorrect');
                if (feedbackSpan) feedbackSpan.textContent = `✗ (Should be: ${correctLabel})`;
            } else { // Nothing dropped, but should have been
                target.classList.add('evaluation-missed');
                if (feedbackSpan) feedbackSpan.textContent = `Needed: ${correctLabel}`;
            }
        }
        // Make targets non-interactive after evaluation by removing event handlers (or adding a class)
        // For simplicity, we assume main.js/ui.js won't re-attach listeners if 'isEvaluated' is true
    });
    // Disable further dragging
    questionContainer.querySelectorAll('.draggable').forEach(d => d.setAttribute('draggable', 'false'));
}

/**
 * Checks if the user's answer for a drag-and-drop question is correct.
 */
export function isCorrect(question, userAnswer) {
    const correctMapping = getCorrectDropMapping(question);
    const targetIdsInQuestion = Object.keys(correctMapping);

    if (typeof userAnswer !== 'object' || userAnswer === null) {
        // If there are targets to be filled, but no answer, it's incorrect.
        // If there are no targets defined in the question, it's correct.
        return targetIdsInQuestion.length === 0;
    }

    // Check if the user filled exactly the required targets
    // And if all filled targets are correct
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
    // All required targets must be correctly filled, and no extra items dropped.
    return correctCount === targetIdsInQuestion.length && userAnswerKeysCount === targetIdsInQuestion.length;
}


// --- Helper functions for Drag and Drop ---

/**
 * Populates drop targets with previously saved answers or clears them.
 */
export function populateDropTargets(questionContainer, question, userAnswer) {
    const dropTargets = questionContainer.querySelectorAll('.drop-target[data-identifier]');
    const choices = question.choices || [];
    const savedUserAnswers = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};

    dropTargets.forEach(target => {
        const targetId = target.dataset.identifier;
        // Clear existing content (text nodes), but preserve feedback span
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
        feedbackSpan.textContent = ''; // Clear feedback
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

/**
 * Updates visibility of draggable items based on whether they've been placed.
 */
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

/**
 * Derives the correct mapping from target identifiers to choice identifiers.
 * This is an internal helper.
 */
function getCorrectDropMapping(question) {
    const mapping = {};
    if (question && Array.isArray(question.choices)) {
        question.choices.forEach(choice => {
            // Assuming the target identifier is the same as the choice identifier that belongs there
            if (choice && choice.identifier && question.text.includes(`[${choice.identifier}]`)) {
                mapping[choice.identifier] = choice.identifier;
            }
        });
    }
    return mapping;
}

// HACK: For addInputListeners to access quizService and ui module.
// This is not ideal. A better solution would be to pass necessary context or use a proper event bus.
// In main.js, before calling questionManager.attachInputListeners:
// window.quizServiceRefForDnD = quizService;
// window.uiRefForDnD = ui;