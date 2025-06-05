// js/questionManager.js
import * as multiChoice from './questionTypes/multiChoice.js';
import * as fillTheBlanks from './questionTypes/fillTheBlanks.js';
import *  as dragAndDrop from './questionTypes/dragAndDrop.js';

const questionTypeModules = {
    'multi_choice': multiChoice,
    'fill_the_blanks': fillTheBlanks,
    'drag_n_drop': dragAndDrop,
};

export function renderQuestionContent(question, userAnswer, container, questionIndex, isEvaluated) {
    const handler = questionTypeModules[question.question_type];
    if (handler && handler.render) {
        return handler.render(question, userAnswer, container, questionIndex, isEvaluated);
    }
    return '<p>Unsupported question type.</p>';
}

// This function is called by UI when input changes to get the current answer
export function getAnswerFromDOM(questionType, questionContainer, questionIndex) {
    const handler = questionTypeModules[questionType];
    if (handler && handler.getAnswer) {
        return handler.getAnswer(questionContainer, questionIndex);
    }
    return null;
}

export function evaluateQuestionDisplay(question, userAnswer, questionContainer) {
    const handler = questionTypeModules[question.question_type];
    if (handler && handler.evaluateDisplay) {
        handler.evaluateDisplay(question, userAnswer, questionContainer);
    }
}

export function isAnswerCorrect(question, userAnswer) {
    const handler = questionTypeModules[question.question_type];
    if (handler && handler.isCorrect) {
        return handler.isCorrect(question, userAnswer);
    }
    return false;
}

// Attaches specific listeners for inputs within a question
// The callback will typically be a function in main.js that calls quizService.saveAnswer
export function attachInputListeners(question, questionContainer, questionIndex, answerChangedCallback) {
    const handler = questionTypeModules[question.question_type];
    if (handler && handler.addInputListeners) {
        handler.addInputListeners(questionContainer, questionIndex, (answerData) => {
            // The callback provided by main.js will save the answer via quizService
            // And also emit the 'answerChanged' event
            const event = new CustomEvent('answerChanged', {
                detail: {
                    questionType: question.question_type,
                    answer: answerData,
                    questionIndex: questionIndex
                }
            });
            document.dispatchEvent(event);
        });
    }
}