document.addEventListener('DOMContentLoaded', () => {
    // Keep existing element references
    const questionContainer = document.getElementById('question-container');
    const quizContainer = document.getElementById('quiz-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const resultContainer = document.getElementById('result-container');
    const scoreElement = document.getElementById('score');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const shuffleToggleBtn = document.getElementById('shuffle-toggle-btn');
    const quizListContainer = document.getElementById('quiz-list-container');
    const quizListElement = document.getElementById('quiz-list');

    let dataDirectory = '/data/';

    if (window.location.hostname.includes("github.io")) {
        dataDirectory = "/quizesch/" + dataDirectory;
        console.log("github pages detected");
    }

    const listQuizzesEndpoint = 'quiz-manifest.json';
    let availableQuizzes = [];

    let originalQuestionsOrder = []; // To store the original order
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let evaluatedQuestions = [];
    let score = 0;

    // Start by fetching the list of available quizzes from the manifest
    fetchQuizList();

    // --- Fetch Quiz List from Manifest ---
    function fetchQuizList() {
        quizListElement.innerHTML = '<li>Loading quizzes...</li>'; // Indicate loading

        fetch(listQuizzesEndpoint) // Fetches /data/quiz-manifest.json
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} fetching manifest.`);
                }
                return response.json(); // Parse the JSON array of filenames
            })
            .then(quizFileNames => {
                availableQuizzes = quizFileNames; // Store the fetched list
                if (availableQuizzes.length === 0) {
                    displayQuizListError("No quiz files listed in the manifest.");
                } else {
                    displayQuizList(); // Display the list of quizzes
                }
            })
            .catch(error => {
                console.error('Error fetching or parsing quiz list:', error);
                displayQuizListError(`Error loading quiz list: ${error.message}. Check manifest exists and is valid.`);
            });
    }

    // --- Display the List of Available Quizzes ---
    function displayQuizList() {
        quizListElement.innerHTML = '';
        if (!availableQuizzes || availableQuizzes.length === 0) {
            quizListElement.innerHTML = '<li>No quizzes available.</li>';
            quizContainer.style.display = 'none';
            quizListContainer.style.display = 'block';
            return;
        }

        // Sort the quiz files in alphabetical descending order
        const sortedQuizzes = [...availableQuizzes].sort((a, b) => b.localeCompare(a));

        sortedQuizzes.forEach(fileName => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.dataset.fileName = fileName;
            link.addEventListener('click', handleQuizSelection);

            // Card content
            const card = document.createElement('div');
            card.className = 'quiz-card';

            // Icon (emoji for now)
            const icon = document.createElement('div');
            icon.className = 'quiz-icon';
            icon.textContent = '📚';
            card.appendChild(icon);

            // Title (prettified from filename)
            const title = document.createElement('div');
            title.className = 'quiz-title';
            // Prettify: remove .json, replace _/pzh/zh/ppzh with spaces, capitalize
            let pretty = fileName.replace('.json','').replace(/_/g,' ');
            pretty = pretty.replace(/\b(zh|pzh|ppzh)\b/gi, m => m.toUpperCase());
            pretty = pretty.replace(/\b(\d{4})\b/g, '($1)');
            pretty = pretty.replace(/\b([a-z])/g, c => c.toUpperCase());
            title.textContent = pretty;
            card.appendChild(title);

            // Filename (small)
            const fname = document.createElement('div');
            fname.className = 'quiz-filename';
            fname.textContent = fileName;
            card.appendChild(fname);

            link.appendChild(card);
            listItem.appendChild(link);
            quizListElement.appendChild(listItem);
        });

        quizContainer.style.display = 'none';
        quizListContainer.style.display = 'block';
        document.getElementById('navigation-controls').style.display = 'none';
    }

    // --- Handle Clicking a Quiz from the List ---
    function handleQuizSelection(event) {
        event.preventDefault();
        // Find the closest element with data-fileName (could be <a> or a child)
        let target = event.target;
        while (target && !target.dataset.fileName && target !== document) {
            target = target.parentElement;
        }
        if (!target || !target.dataset.fileName) {
            alert('Could not determine quiz file.');
            return;
        }
        const selectedFileName = target.dataset.fileName;
        // Set global before fetchQuiz so it's always available
        window.currentQuizFile = selectedFileName;
        // Normalize dataDirectory to avoid double slashes
        let normalizedDataDirectory = dataDirectory.replace(/\/+$/, '');
        const filePath = `${normalizedDataDirectory}/${selectedFileName}`;
        console.log('Fetching quiz file:', filePath);
        fetchQuiz(filePath);
    }

    // --- Fetch Data for a Specific Quiz ---
    function fetchQuiz(filePath) { // Accepts the full path
        fetch(filePath) // Uses the full path provided
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} loading ${filePath}`);
                }
                return response.json();
            })
            .then(data => {
                // Reset quiz state for the newly loaded quiz
                questions = data;
                originalQuestionsOrder = [...data];
                userAnswers = new Array(questions.length).fill(null);
                currentQuestionIndex = 0;
                score = 0; // Reset score for the new quiz

                // Update UI display
                quizListContainer.style.display = 'none'; // Hide quiz list
                quizContainer.style.display = 'block'; // Show quiz container
                resultContainer.style.display = 'none'; // Hide results if previously shown
                document.getElementById('navigation-controls').style.display = 'flex'; // Show nav buttons

                displayQuestion(currentQuestionIndex); // Display the first question
                updateButtonStates();
                clearEvaluationStyles();
                evaluateBtn.disabled = false;
                // Reset shuffle button text if needed
                shuffleToggleBtn.textContent = 'Shuffle Questions';

                // --- Try to load state ---
                // Extract the filename from the filepath to use for state loading
                const quizFileName = filePath.split('/').pop();
                const loaded = loadQuizState(quizFileName, data);
                if (loaded) {
                    questions = data;
                    originalQuestionsOrder = [...data];
                    userAnswers = loaded.userAnswers;
                    currentQuestionIndex =
                        typeof loaded.currentQuestionIndex === 'number' &&
                        loaded.currentQuestionIndex >= 0 &&
                        loaded.currentQuestionIndex < data.length
                        ? loaded.currentQuestionIndex
                        : 0;
                    score = 0;
                } else {
                    questions = data;
                    originalQuestionsOrder = [...data];
                    userAnswers = new Array(questions.length).fill(null);
                    currentQuestionIndex = 0;
                    score = 0;
                    clearQuizState();
                }
                displayQuestion(currentQuestionIndex);
                updateButtonStates();
                updateProgressPanel();
                clearEvaluationStyles();
                evaluateBtn.disabled = false;
                shuffleToggleBtn.textContent = 'Shuffle Questions';
                onQuizStateChange();
            })
            .catch(error => {
                console.error('Error loading quiz data:', error);
                // Display error within the question area
                questionContainer.innerHTML = `<p>Error loading quiz questions from ${filePath}. Please check the console and ensure the file exists and is valid JSON.</p>`;
                // Still show the quiz container area, but hide list and results
                quizListContainer.style.display = 'none';
                quizContainer.style.display = 'block';
                resultContainer.style.display = 'none';
                // Hide navigation controls if quiz loading failed
                 document.getElementById('navigation-controls').style.display = 'none';
            });
    }

    // --- Helper function to display errors in the quiz list area ---
    function displayQuizListError(message) {
        quizListElement.innerHTML = ''; // Clear previous list/loading
        const listItem = document.createElement('li');
        listItem.textContent = message;
        listItem.style.color = 'red';
        quizListElement.appendChild(listItem);
        quizContainer.style.display = 'none'; // Hide quiz area
        quizListContainer.style.display = 'block'; // Show list area
         document.getElementById('navigation-controls').style.display = 'none'; // Hide nav
    }

    // --- Fisher-Yates Shuffle Algorithm ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    // --- Display Logic ---
    function displayQuestion(index) {
        // Ensure questions array is populated and index is valid
        if (!questions || questions.length === 0 || index < 0 || index >= questions.length) {
            questionContainer.innerHTML = '<p>Error: Could not display question.</p>';
            return;
        }

        clearEvaluationStyles(); // Clear styles before displaying
        const question = questions[index];
        let html = `<h3>Question ${index + 1} of ${questions.length}</h3>`;

        switch (question.question_type) {
             case 'multi_choice':
                html += `<p>${question.question_title}</p>`;
                html += '<ul style="list-style: none; padding: 0;">'; // Remove default list styling
                // Ensure options exist
                if (question.options) {
                    for (const key in question.options) {
                        // Check if userAnswer for this index exists and is an array before using includes
                        const isChecked = userAnswers[index] && Array.isArray(userAnswers[index]) && userAnswers[index].includes(key);
                        const checkedAttribute = isChecked ? 'checked' : '';
                        // Ensure question.answer is an array before checking length
                        const inputType = Array.isArray(question.answer) && question.answer.length > 1 ? 'checkbox' : 'radio';
                        html += `
                            <li data-option-key="${key}">
                                <label>
                                    <input type="${inputType}" name="q${index}_option" value="${key}" ${checkedAttribute}>
                                    ${key.toUpperCase()}: ${question.options[key]}
                                </label>
                            </li>`;
                    }
                }
                html += '</ul>';
                break;

            case 'fill_the_blanks':
                 let questionText = question.text || ""; // Default to empty string if text is missing
                 // Ensure question.blank is an array or make it one
                 const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
                 const blankAnswers = {};
                 blanks.forEach(b => {
                     if (b && b.identifier) { // Ensure blank and identifier exist
                        blankAnswers[b.identifier] = b.answer || ""; // Default answer to empty string
                     }
                 });
                 question._correctBlankAnswers = blankAnswers;

                 blanks.forEach((blank, i) => {
                     if (blank && blank.identifier) { // Process only valid blanks
                        // Check if userAnswer exists and has the identifier before accessing it
                        const savedValue = (userAnswers[index] && typeof userAnswers[index] === 'object' && userAnswers[index][blank.identifier]) ? userAnswers[index][blank.identifier] : '';
                        const inputId = `q${index}_blank_${blank.identifier}_${i}`;
                        // Use try-catch for regex just in case identifier has special chars, though unlikely for simple IDs
                        try {
                            const placeholderRegex = new RegExp(`\\[${blank.identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\]`); // Escape regex special chars
                            questionText = questionText.replace(placeholderRegex,
                               `<span class="input-wrapper">
                                   <input type="text" id="${inputId}" data-identifier="${blank.identifier}" value="${savedValue}" placeholder="Fill blank...">
                                   <span class="inline-feedback" id="feedback-${inputId}"></span>
                                </span>`
                            );
                        } catch (e) {
                            console.error(`Error creating regex for identifier: ${blank.identifier}`, e);
                        }
                     }
                 });
                 html += `<p>${questionText.replace(/\n/g, '<br>')}</p>`;
                 break;

            case 'drag_n_drop':
                 let dragDropText = question.text || "";
                 const choices = question.choices || []; // Default to empty array
                 const correctDropMapping = {};

                 choices.forEach(choice => {
                     if (choice && choice.identifier) { // Ensure choice and identifier exist
                        const placeholder = `[${choice.identifier}]`;
                        // Escape identifier for regex
                        const escapedIdentifier = choice.identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const placeholderRegex = new RegExp(`\\[${escapedIdentifier}\\]`, 'g');

                        if (dragDropText.includes(placeholder)) {
                              correctDropMapping[choice.identifier] = choice.identifier;
                              try {
                                  dragDropText = dragDropText.replace(placeholderRegex,
                                      `<span class="drop-target" data-identifier="${choice.identifier}" ondragover="allowDrop(event)" ondrop="drop(event)" ondragleave="dragLeave(event)">
                                           <span class="inline-feedback"></span>
                                       </span>`
                                  );
                              } catch (e) {
                                   console.error(`Error replacing placeholder for identifier: ${choice.identifier}`, e);
                              }
                         }
                     }
                 });
                 question._correctDropMapping = correctDropMapping;

                 html += `<p>${dragDropText.replace(/\n/g, '<br>')}</p>`;
                 html += '<div id="drag-options"><strong>Drag options:</strong><br>';
                 choices.forEach(choice => {
                     if (choice && choice.identifier && choice.label) { // Ensure valid choice object
                        html += `<span class="draggable" draggable="true" id="drag-${choice.identifier}" data-identifier="${choice.identifier}" ondragstart="drag(event)">${choice.label}</span> `;
                     }
                 });
                 html += '</div>';

                 setTimeout(() => {
                     populateDropTargets(index);
                     updateDraggableVisibility(index);
                 }, 0);
                 break;

             default:
                 html += `<p>Unsupported question type: ${question.question_type || 'Unknown'}</p>`;
        }

        questionContainer.innerHTML = html;
        addInputListeners(index);
        evaluateBtn.disabled = false; // Re-enable evaluation for the new question

        // --- update progress panel on question display ---
        updateProgressPanel();
        onQuizStateChange();
    }

    // --- Update Draggable Visibility ---
    function updateDraggableVisibility(questionIndex) {
         if (!questions || !questions[questionIndex] || questions[questionIndex].question_type !== 'drag_n_drop') return;
         const question = questions[questionIndex];

        const placedItems = new Set();
        questionContainer.querySelectorAll('.drop-target').forEach(target => {
             const droppedItemId = target.getAttribute('data-dropped-item');
             if (droppedItemId) {
                 placedItems.add(droppedItemId);
             }
        });

        questionContainer.querySelectorAll('#drag-options .draggable').forEach(draggable => {
            const draggableId = draggable.getAttribute('data-identifier');
            if (draggableId) { // Ensure ID exists
                if (placedItems.has(draggableId)) {
                    draggable.style.display = 'none'; // Hide if placed
                } else {
                    draggable.style.display = 'inline-block'; // Show if not placed
                }
            }
        });
    }

    // --- Add Input Listeners ---
    function addInputListeners(index) {
         if (!questions || !questions[index]) return;
         const question = questions[index];

        switch (question.question_type) {
            case 'multi_choice':
                const options = questionContainer.querySelectorAll(`input[name="q${index}_option"]`);
                options.forEach(option => {
                    option.addEventListener('change', () => {
                         saveMultiChoiceAnswer(index);
                         clearEvaluationStyles();
                         evaluateBtn.disabled = false;
                    });
                });
                break;
            case 'fill_the_blanks':
                const blanks = questionContainer.querySelectorAll('input[type="text"]');
                blanks.forEach(blank => {
                    blank.addEventListener('input', () => {
                         saveFillBlanksAnswer(index);
                         // Clear styles only for the specific input being changed
                         blank.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
                         const feedbackSpan = document.getElementById(`feedback-${blank.id}`);
                         if (feedbackSpan) {
                            feedbackSpan.textContent = '';
                            feedbackSpan.className = 'inline-feedback'; // Reset feedback style
                         }
                         evaluateBtn.disabled = false; // Re-enable evaluate button on input change
                    });
                });
                break;
             case 'drag_n_drop':
                // Handled by drop event, but maybe add observer later if needed
                break;
        }
    }

    // --- Save Answers ---
    function saveMultiChoiceAnswer(index) {
        if (!questions || !questions[index]) return;
        const question = questions[index];
        const selectedOptions = questionContainer.querySelectorAll(`input[name="q${index}_option"]:checked`);

        // Ensure userAnswer for the index exists as an array
        if (!Array.isArray(userAnswers[index])) {
             userAnswers[index] = [];
        }

        // Ensure question.answer is an array
        const isMultipleAnswer = Array.isArray(question.answer) && question.answer.length > 1;

        if (isMultipleAnswer) { // Checkbox
            userAnswers[index] = Array.from(selectedOptions).map(el => el.value);
        } else { // Radio
             userAnswers[index] = selectedOptions.length ? [selectedOptions[0].value] : []; // Store as array for consistency
        }

        // --- update state on answer save ---
        onQuizStateChange();
    }

    function saveFillBlanksAnswer(index) {
        if (!questions || !questions[index]) return;
        const inputs = questionContainer.querySelectorAll('input[type="text"][data-identifier]'); // Select only inputs with the identifier

        // Ensure userAnswer for the index exists as an object
        if (typeof userAnswers[index] !== 'object' || userAnswers[index] === null) {
             userAnswers[index] = {};
        }

        inputs.forEach(input => {
             const identifier = input.getAttribute('data-identifier');
             if (identifier) { // Should always be true due to selector, but double-check
                userAnswers[index][identifier] = input.value.trim();
             }
         });

         // --- update state on answer save ---
         onQuizStateChange();
    }

     function saveDragDropAnswer(index) {
        if (!questions || !questions[index] || questions[index].question_type !== 'drag_n_drop') return;
        const targets = questionContainer.querySelectorAll('.drop-target[data-identifier]'); // Select only targets with identifier

        // Ensure userAnswer exists as an object
        if (typeof userAnswers[index] !== 'object' || userAnswers[index] === null) {
             userAnswers[index] = {};
        }

        const currentAnswers = {};
        targets.forEach(target => {
            const targetId = target.getAttribute('data-identifier');
            const droppedItemId = target.getAttribute('data-dropped-item');
            // Only save if both targetId and a dropped item exist
            if (targetId && droppedItemId) {
                 currentAnswers[targetId] = droppedItemId;
            }
        });
        userAnswers[index] = currentAnswers; // Overwrite previous state for this question index
        updateDraggableVisibility(index);

        // --- update state on answer save ---
        onQuizStateChange();
    }


    // --- Navigation and Submission ---
    function updateButtonStates() {
        const quizLoaded = questions && questions.length > 0;
        const onLastQuestion = quizLoaded && currentQuestionIndex === questions.length - 1;

        prevBtn.disabled = !quizLoaded || currentQuestionIndex === 0;
        nextBtn.disabled = !quizLoaded || onLastQuestion;
        submitBtn.style.display = quizLoaded && onLastQuestion ? 'inline-block' : 'none';
        nextBtn.style.display = quizLoaded && !onLastQuestion ? 'inline-block' : 'none';
        evaluateBtn.style.display = quizLoaded && !onLastQuestion ? 'inline-block' : 'none'; // Evaluate shown except on last q
        resetBtn.disabled = !quizLoaded; // Disable reset if no quiz loaded
        shuffleToggleBtn.disabled = !quizLoaded; // Disable shuffle if no quiz loaded

        // Show/hide the whole controls container
        document.getElementById('navigation-controls').style.display = quizLoaded ? 'flex' : 'none';
    }

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion(currentQuestionIndex);
            updateButtonStates();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (questions && currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            displayQuestion(currentQuestionIndex);
            updateButtonStates();
        }
    });

    submitBtn.addEventListener('click', () => {
        if (questions && questions.length > 0) {
            calculateScore(); // Final score calculation
            displayResults();
        }
    });

    // Modified Reset Button: Only resets the current question's answer and visuals
    resetBtn.addEventListener('click', () => {
        if (!questions || questions.length === 0) return; // Do nothing if no quiz loaded

        // Reset the answer ONLY for the current question index
        const questionType = questions[currentQuestionIndex].question_type;
        if (questionType === 'fill_the_blanks' || questionType === 'drag_n_drop') {
            userAnswers[currentQuestionIndex] = {}; // Reset to empty object for these types
        } else {
            userAnswers[currentQuestionIndex] = null; // Reset to null for others (like multi_choice)
        }

        // Re-display the current question to clear inputs/draggables
        displayQuestion(currentQuestionIndex);
        // Update buttons (may re-enable next/submit if they were disabled due to being on last Q)
        updateButtonStates();
        // Clear evaluation styles specifically
        clearEvaluationStyles();
        // Re-enable the evaluate button for this question
        evaluateBtn.disabled = false;

        // Note: This no longer resets the global 'score' variable.

        // --- update state on reset ---
        onQuizStateChange();
    });


    shuffleToggleBtn.addEventListener('click', () => {
        // Ensure original order is available and questions are loaded
        if (!originalQuestionsOrder || originalQuestionsOrder.length === 0 || !questions || questions.length === 0) return;

        if (shuffleToggleBtn.textContent === 'Shuffle Questions') {
            questions = shuffleArray([...originalQuestionsOrder]); // Shuffle a copy
            shuffleToggleBtn.textContent = 'Unshuffle Questions';
        } else {
            questions = [...originalQuestionsOrder]; // Restore from the stored copy
            shuffleToggleBtn.textContent = 'Shuffle Questions';
        }

        // Reset the quiz state after shuffling/unshuffling
        currentQuestionIndex = 0;
        userAnswers = new Array(questions.length).fill(null); // Reset all answers
        score = 0; // Reset score

        resultContainer.style.display = 'none'; // Hide results
        questionContainer.style.display = 'block'; // Show question area
        document.getElementById('navigation-controls').style.display = 'flex'; // Ensure nav is visible

        displayQuestion(currentQuestionIndex); // Display first question of new order
        updateButtonStates();
        clearEvaluationStyles();
        evaluateBtn.disabled = false;

        // --- update state on shuffle ---
        onQuizStateChange();
    });

    // --- Evaluation Logic ---
    evaluateBtn.addEventListener('click', () => {
         if (!questions || questions.length === 0) return; // Don't evaluate if no quiz loaded
        evaluateCurrentQuestion();
        evaluatedQuestions[currentQuestionIndex] = true; // Mark as evaluated
        evaluateBtn.disabled = true; // Disable after evaluating once

        // --- update progress panel on evaluation ---
        updateProgressPanel();
        onQuizStateChange();
    });

    function clearEvaluationStyles() {
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
            span.className = 'inline-feedback'; // Reset class
        });

        const inputs = questionContainer.querySelectorAll('input[type="text"], .drop-target');
        inputs.forEach(input => {
            input.classList.remove('evaluation-correct', 'evaluation-incorrect', 'evaluation-missed');
        });
    }


    function evaluateCurrentQuestion() {
        if (!questions || !questions[currentQuestionIndex]) return; // Safety check

        clearEvaluationStyles(); // Clear previous evaluation first
        const question = questions[currentQuestionIndex];
        const userAnswer = userAnswers[currentQuestionIndex]; // Could be null, array, or object

        switch (question.question_type) {
            case 'multi_choice':
                // Ensure correct answer is an array
                const correctAnswerSet = new Set(Array.isArray(question.answer) ? question.answer : []);
                const options = questionContainer.querySelectorAll(`li[data-option-key]`);

                options.forEach(li => {
                    const optionInput = li.querySelector('input');
                    if (!optionInput) return; // Skip if input not found

                    const optionValue = optionInput.value;
                    const isChecked = optionInput.checked;
                    const isCorrect = correctAnswerSet.has(optionValue);

                    if (isChecked && isCorrect) {
                        li.classList.add('evaluation-correct'); // Correctly selected
                    } else if (isChecked && !isCorrect) {
                        li.classList.add('evaluation-incorrect'); // Incorrectly selected (RED)
                    } else if (!isChecked && isCorrect) {
                        li.classList.add('evaluation-missed'); // Not selected, but should be (ORANGE)
                    }
                });
                break;

            case 'fill_the_blanks':
                 const textInputs = questionContainer.querySelectorAll('input[type="text"][data-identifier]');
                 // Use cached answers if available, ensure it's an object
                 const correctAnswers = (question._correctBlankAnswers && typeof question._correctBlankAnswers === 'object') ? question._correctBlankAnswers : {};
                 // Ensure userAnswer is an object for lookup
                 const currentBlanksAnswer = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};

                 textInputs.forEach(input => {
                     const identifier = input.getAttribute('data-identifier');
                     if (!identifier) return; // Skip if no identifier

                     const feedbackSpan = document.getElementById(`feedback-${input.id}`);
                     const savedUserValue = currentBlanksAnswer[identifier] || ""; // Default to empty string if not answered
                     // Default correct answer to empty string if missing in mapping
                     const correctAnswer = correctAnswers[identifier] !== undefined ? String(correctAnswers[identifier]) : "";

                     if (savedUserValue.toLowerCase() === correctAnswer.toLowerCase()) {
                         input.classList.add('evaluation-correct');
                         if (feedbackSpan) {
                             feedbackSpan.textContent = '✓ Correct!';
                             feedbackSpan.className = 'inline-feedback feedback-correct';
                         }
                     } else {
                         input.classList.add('evaluation-incorrect'); // Mark input as incorrect (RED border)
                         if (feedbackSpan) {
                             if (savedUserValue === "") {
                                // Changed class to 'missed' for empty incorrect inputs
                                input.classList.remove('evaluation-incorrect');
                                input.classList.add('evaluation-missed');
                                feedbackSpan.textContent = `✗ Correct: ${correctAnswer}`;
                                feedbackSpan.className = 'inline-feedback feedback-missed'; // Missed (ORANGE text)
                             } else {
                                feedbackSpan.textContent = `✗ Incorrect. Correct: ${correctAnswer}`;
                                feedbackSpan.className = 'inline-feedback feedback-incorrect'; // Incorrect (RED text)
                             }
                         }
                     }
                 });
                 break;

            case 'drag_n_drop':
                 const dropTargets = questionContainer.querySelectorAll('.drop-target[data-identifier]');
                 // Ensure mappings are objects
                 const correctMapping = (question._correctDropMapping && typeof question._correctDropMapping === 'object') ? question._correctDropMapping : {};
                 const userMapping = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};

                 dropTargets.forEach(target => {
                     const targetId = target.getAttribute('data-identifier');
                     if (!targetId) return;

                     const feedbackSpan = target.querySelector('.inline-feedback');
                     const droppedItemId = target.getAttribute('data-dropped-item'); // What user dropped (might be null)
                     const correctItemId = correctMapping[targetId]; // What *should* be there (might be undefined)
                     const correctChoice = (question.choices || []).find(c => c && c.identifier === correctItemId);
                     const correctLabel = correctChoice ? correctChoice.label : '??';

                     // Only evaluate if there *should* be an item here
                     if (correctItemId !== undefined) {
                         if (droppedItemId && droppedItemId === correctItemId) {
                             target.classList.add('evaluation-correct'); // Correctly dropped (GREEN)
                             if (feedbackSpan) feedbackSpan.textContent = '✓';
                         } else if (droppedItemId && droppedItemId !== correctItemId) {
                             target.classList.add('evaluation-incorrect'); // Incorrectly dropped (RED)
                             if (feedbackSpan) feedbackSpan.textContent = `✗ (Should be: ${correctLabel})`;
                         } else { // No item dropped, but should have been
                             target.classList.add('evaluation-missed'); // Missed drop (ORANGE)
                             if (feedbackSpan) feedbackSpan.textContent = `Needed: ${correctLabel}`;
                         }
                     } else {
                          // Handle case where user dropped an item onto a target that shouldn't have one? Optional.
                          // if (droppedItemId) target.classList.add('evaluation-extra'); // Example
                     }
                 });
                 break;
        }
    }

    // --- Final Score Calculation ---
    function calculateScore() {
        score = 0;
        if (!questions || questions.length === 0) return; // No score if no questions

        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index]; // Can be null, array, or object
            let isCorrect = false;

            // If no answer submitted, it's incorrect
            if (userAnswer === null || userAnswer === undefined) {
                isCorrect = false;
            } else {
                switch (question.question_type) {
                    case 'multi_choice':
                        // Ensure both are arrays before proceeding
                        const correctAnswerMC = Array.isArray(question.answer) ? question.answer : [];
                        // User answer should already be an array from saveMultiChoiceAnswer
                        const userAnswerMC = Array.isArray(userAnswer) ? userAnswer : [];

                        if (userAnswerMC.length !== correctAnswerMC.length) {
                            isCorrect = false; // Different number of selections
                        } else if (userAnswerMC.length === 0) {
                            isCorrect = true; // Both empty means correct (e.g., no correct options to select)
                        } else {
                            // Sort copies to compare content regardless of order
                            const sortedUserAnswer = [...userAnswerMC].sort();
                            const sortedCorrectAnswer = [...correctAnswerMC].sort();
                            isCorrect = JSON.stringify(sortedUserAnswer) === JSON.stringify(sortedCorrectAnswer);
                        }
                        break;

                    case 'fill_the_blanks':
                        const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
                        // If no blanks defined in the question, consider it correct? Or maybe an error? Let's say correct.
                        if (blanks.length === 0) {
                            isCorrect = true;
                            break;
                        }
                        // User answer must be an object
                        if (typeof userAnswer !== 'object' || userAnswer === null) {
                            isCorrect = false;
                            break;
                        }

                        isCorrect = true; // Assume correct until a wrong blank is found
                        for (const blankInfo of blanks) {
                            // Ensure blankInfo is valid
                            if (!blankInfo || !blankInfo.identifier) {
                                isCorrect = false; // Invalid question data
                                console.warn(`Invalid blank data found in question index ${index}`);
                                break;
                            }
                            const identifier = blankInfo.identifier;
                            const correctAnswer = blankInfo.answer || ""; // Default to empty string
                            const userAnswerFB = userAnswer[identifier] || ""; // Default to empty string

                            if (userAnswerFB.toLowerCase() !== correctAnswer.toLowerCase()) {
                                isCorrect = false; // Found an incorrect blank
                                break;
                            }
                        }
                        // Additionally, check if user provided answers for non-existent blanks (optional, could mark as wrong)
                        // const requiredIdentifiers = new Set(blanks.map(b => b.identifier));
                        // for (const answeredId in userAnswer) {
                        //     if (!requiredIdentifiers.has(answeredId)) { isCorrect = false; break; }
                        // }
                        break;

                    case 'drag_n_drop':
                         const correctDropMapping = (question._correctDropMapping && typeof question._correctDropMapping === 'object') ? question._correctDropMapping : {};
                         const targetIds = Object.keys(correctDropMapping);
                         // If no drop targets defined in the question, consider it correct.
                         if (targetIds.length === 0) {
                             isCorrect = true;
                             break;
                         }
                         // User answer must be an object
                         if (typeof userAnswer !== 'object' || userAnswer === null) {
                             isCorrect = false;
                             break;
                         }
                         // Must have filled the exact number of required targets
                         if (Object.keys(userAnswer).length !== targetIds.length) {
                             isCorrect = false;
                             break;
                         }

                         isCorrect = true; // Assume correct
                         for(const targetId of targetIds) {
                             const correctChoiceId = correctDropMapping[targetId];
                             // Check if user provided an answer for this target AND if it matches the correct one
                             if (!userAnswer[targetId] || userAnswer[targetId] !== correctChoiceId) {
                                 isCorrect = false;
                                 break;
                             }
                         }
                         break;

                     default: isCorrect = false; break; // Unknown question type is incorrect
                 }
            }
            if (isCorrect) score++;
        });
    }

    // --- Display Results ---
    function displayResults() {
        questionContainer.style.display = 'none';
        document.getElementById('navigation-controls').style.display = 'none'; // Hide nav buttons
        resultContainer.style.display = 'block';
        const totalQuestions = (questions && questions.length) ? questions.length : 0;
        scoreElement.textContent = `${score} out of ${totalQuestions}`;

        // --- update progress panel on results display ---
        updateProgressPanel();
    }


    // --- Drag and Drop Global Functions ---
    window.allowDrop = function(ev) {
        ev.preventDefault();
        const target = ev.target.closest('.drop-target');
        // Highlight only if it's a valid target zone
        if(target && target.classList.contains('drop-target')) {
            target.classList.add('highlight-drop');
        }
    }

    window.dragLeave = function(ev) {
         const target = ev.target.closest('.drop-target');
         if(target) target.classList.remove('highlight-drop');
    }

    window.drag = function(ev) {
        const draggableElement = ev.target.closest('.draggable[data-identifier]');
        if (!draggableElement) {
            ev.preventDefault(); // Prevent dragging non-draggable elements
            return;
        }
        ev.dataTransfer.setData("text/plain", draggableElement.id); // ID of the draggable span
        ev.dataTransfer.setData("identifier", draggableElement.dataset.identifier); // The choice identifier
        ev.dataTransfer.effectAllowed = "move";
    }

    window.drop = function(ev) {
        ev.preventDefault();
        const targetElement = ev.target.closest('.drop-target[data-identifier]'); // Ensure it's a valid drop target
        if (!targetElement) return;

        targetElement.classList.remove('highlight-drop');

        // Retrieve data transferred during dragstart
        const draggedElementId = ev.dataTransfer.getData("text/plain");
        const draggedIdentifier = ev.dataTransfer.getData("identifier"); // The choice identifier being dropped
        const draggedElement = document.getElementById(draggedElementId); // The original draggable span

        // Basic validation of dragged data
        if (!draggedElementId || !draggedIdentifier || !draggedElement) {
            console.error("Drag data missing or invalid.");
            return;
        }

        // --- Handle returning an item already in the target back to the options ---
        const currentDroppedItemIdentifier = targetElement.getAttribute('data-dropped-item');
        if (currentDroppedItemIdentifier) {
            // Find the corresponding draggable span in the options area
            const existingDraggable = document.querySelector(`#drag-options .draggable[data-identifier="${currentDroppedItemIdentifier}"]`);
            if (existingDraggable) {
                existingDraggable.style.display = 'inline-block'; // Make it visible again
            } else {
                console.warn(`Could not find draggable for previously dropped item: ${currentDroppedItemIdentifier}`);
            }
            // Clear target text content, preserving feedback span
            targetElement.textContent = '';
             if (!targetElement.querySelector('.inline-feedback')) {
                 const feedbackSpan = document.createElement('span');
                 feedbackSpan.className = 'inline-feedback';
                 targetElement.appendChild(feedbackSpan);
             } else {
                // Ensure existing feedback span is cleared if item is returned
                targetElement.querySelector('.inline-feedback').textContent = '';
             }
        } else {
            // Ensure feedback span exists if target was empty
            if (!targetElement.querySelector('.inline-feedback')) {
               targetElement.innerHTML = '<span class="inline-feedback"></span>';
            }
        }


        // --- Place the new item ---
        const feedbackSpan = targetElement.querySelector('.inline-feedback'); // Find the feedback span
        const labelTextNode = document.createTextNode(draggedElement.textContent); // Get text from original draggable

        // Insert the text *before* the feedback span, or just append if span missing (shouldn't happen)
        if (feedbackSpan) {
            targetElement.insertBefore(labelTextNode, feedbackSpan);
        } else {
            targetElement.appendChild(labelTextNode);
        }

        // Set the attribute on the target to remember which item (by identifier) was dropped
        targetElement.setAttribute('data-dropped-item', draggedIdentifier);

        // Hide the original draggable span from the options list
        draggedElement.style.display = 'none';

        // Clear any visual evaluation styles (like green/red borders)
        clearEvaluationStyles();
        // Re-enable the evaluate button since the answer changed
        evaluateBtn.disabled = false;
        // Save the current state of all drop targets for this question
        saveDragDropAnswer(currentQuestionIndex);
    }

     // --- Initial Population for Drag and Drop ---
     function populateDropTargets(questionIndex) {
        if (!questions || !questions[questionIndex] || questions[questionIndex].question_type !== 'drag_n_drop') return;

        const savedAnswer = userAnswers[questionIndex]; // Saved state: { targetId: choiceId, ... } or null/undefined
        const question = questions[questionIndex];
        const dropTargets = questionContainer.querySelectorAll('.drop-target[data-identifier]');

        dropTargets.forEach(target => {
            const targetId = target.getAttribute('data-identifier');
            // Clear existing content first, but preserve feedback span structure
            target.textContent = '';
            let feedbackSpan = target.querySelector('.inline-feedback');
            if (!feedbackSpan) {
                feedbackSpan = document.createElement('span');
                feedbackSpan.className = 'inline-feedback';
                target.appendChild(feedbackSpan);
            } else {
                feedbackSpan.textContent = ''; // Clear any previous feedback text
            }
            target.removeAttribute('data-dropped-item'); // Clear dropped item attribute initially

            // Populate if there's a saved answer for this specific targetId
            if (savedAnswer && typeof savedAnswer === 'object' && savedAnswer[targetId]) {
                const choiceIdentifier = savedAnswer[targetId];
                const choice = (question.choices || []).find(c => c && c.identifier === choiceIdentifier);
                if (choice && choice.label) {
                   const labelTextNode = document.createTextNode(choice.label);
                   target.insertBefore(labelTextNode, feedbackSpan); // Insert text before span
                   target.setAttribute('data-dropped-item', choiceIdentifier); // Mark as filled
                } else {
                    console.warn(`Saved answer refers to missing choice identifier: ${choiceIdentifier} for target ${targetId}`);
                }
            }
        });
         updateDraggableVisibility(questionIndex); // Hide draggables corresponding to populated targets
    }


    // --- Persistent State Management ---
    const STORAGE_KEY = 'quizesch_state_v1';
    function saveQuizState() {
        if (!questions || questions.length === 0) return;
        const quizFile = window.currentQuizFile || null;
        const state = {
            quizFile,
            questionsLength: questions.length,
            currentQuestionIndex,
            userAnswers,
            evaluatedQuestions, // Save evaluated state
            timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    function loadQuizState(quizFile, quizData) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try {
            const state = JSON.parse(raw);
            if (state.quizFile === quizFile && state.questionsLength === quizData.length) {
                if (Array.isArray(state.evaluatedQuestions) && state.evaluatedQuestions.length === quizData.length) {
                    evaluatedQuestions = state.evaluatedQuestions;
                } else {
                    evaluatedQuestions = new Array(quizData.length).fill(false);
                }
                return state;
            }
        } catch (e) { /* ignore */ }
        return null;
    }
    function clearQuizState() {
        localStorage.removeItem(STORAGE_KEY);
        evaluatedQuestions = [];
    }

    // --- Progress Panel ---
    function updateProgressPanel() {
        const panel = document.getElementById('progress-panel');
        if (!questions || questions.length === 0) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'block';
        let html = '<h3 style="margin-top:0;">Progress</h3><ul style="padding-left:0;list-style:none;">';
        questions.forEach((q, idx) => {
            let dot = '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#bbb;margin-right:8px;vertical-align:middle;"></span>';
            let status = 'not-evaluated';
            if (evaluatedQuestions[idx]) {
                if (userAnswers[idx] !== null && userAnswers[idx] !== undefined) {
                    if (isQuestionCorrect(q, userAnswers[idx])) {
                        dot = '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#27ae60;margin-right:8px;vertical-align:middle;"></span>';
                        status = 'correct';
                    } else {
                        dot = '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#e74c3c;margin-right:8px;vertical-align:middle;"></span>';
                        status = 'incorrect';
                    }
                }
            }
            html += `<li style="margin-bottom:6px;cursor:pointer;${currentQuestionIndex===idx?'font-weight:bold;':''}" data-idx="${idx}" title="Go to question ${idx+1}">${dot}Question ${idx+1}</li>`;
        });
        html += '</ul>';
        panel.innerHTML = html;
        // Add click listeners for navigation
        panel.querySelectorAll('li[data-idx]').forEach(li => {
            li.onclick = () => {
                const idx = parseInt(li.getAttribute('data-idx'));
                if (!isNaN(idx)) {
                    currentQuestionIndex = idx;
                    displayQuestion(currentQuestionIndex);
                    updateButtonStates();
                    updateProgressPanel();
                }
            };
        });
    
        panel.style.backgroundColor = '#fff';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        panel.style.padding = '16px';
        panel.style.top = '10px';
        panel.style.margin = '16px';
    }
    function isQuestionCorrect(question, userAnswer) {
        // --- logic copied from calculateScore, but for a single question ---
        if (userAnswer === null || userAnswer === undefined) return false;
        switch (question.question_type) {
            case 'multi_choice':
                const correctAnswerMC = Array.isArray(question.answer) ? question.answer : [];
                const userAnswerMC = Array.isArray(userAnswer) ? userAnswer : [];
                if (userAnswerMC.length !== correctAnswerMC.length) return false;
                if (userAnswerMC.length === 0) return true;
                const sortedUser = [...userAnswerMC].sort();
                const sortedCorrect = [...correctAnswerMC].sort();
                return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
            case 'fill_the_blanks':
                const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
                if (blanks.length === 0) return true;
                if (typeof userAnswer !== 'object' || userAnswer === null) return false;
                for (const blankInfo of blanks) {
                    if (!blankInfo || !blankInfo.identifier) return false;
                    const identifier = blankInfo.identifier;
                    const correctAnswerFB = blankInfo.answer || "";
                    const userAnswerFB = userAnswer[identifier] || "";
                    if (userAnswerFB.toLowerCase() !== correctAnswerFB.toLowerCase()) return false;
                }
                return true;
            case 'drag_n_drop':
                const correctDropMapping = (question._correctDropMapping && typeof question._correctDropMapping === 'object') ? question._correctDropMapping : {};
                const targetIds = Object.keys(correctDropMapping);
                if (targetIds.length === 0) return true;
                if (typeof userAnswer !== 'object' || userAnswer === null) return false;
                if (Object.keys(userAnswer).length !== targetIds.length) return false;
                for(const targetId of targetIds) {
                    const correctChoiceId = correctDropMapping[targetId];
                    if (!userAnswer[targetId] || userAnswer[targetId] !== correctChoiceId) return false;
                }
                return true;
            default: return false;
        }
    }

    // --- update save state on relevant actions ---
    function onQuizStateChange() {
        saveQuizState();
        updateProgressPanel();
    }

}); // End DOMContentLoaded