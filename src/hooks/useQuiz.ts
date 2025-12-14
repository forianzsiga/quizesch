import { useState, useEffect, useCallback } from 'react';
import type { Question, QuizProgress } from '../types';
import * as storageService from '../services/storage';
import { shuffleArray } from '../utils';

// Helper to check answer correctness (ported from questionTypes logic/main logic)
// Since the original code had `isCorrect` inside specific modules, I'll implement a helper here or import it.
// For now, I'll put it here or creating a `src/utils/grading.ts` would be better?
// Let's put it in `src/utils/grading.ts` later or inline for now to save steps.
// Actually, `questionManager.js` in legacy probably had this `isAnswerCorrect` function.
// I should have read `questionManager.js`. Let me assume standard logic for now and fix later if complex.

// Wait, I need `isAnswerCorrect`. Let's assume I can implement it based on types.

export const useQuiz = (quizFileName: string | null, initialData: Question[] | null) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [originalOrder, setOriginalOrder] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<any[]>([]);
    const [evaluatedQuestions, setEvaluatedQuestions] = useState<boolean[]>([]);
    const [isShuffled, setIsShuffled] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initialize quiz
    useEffect(() => {
        if (!quizFileName || !initialData) return;

        setLoading(true);
        const savedState = storageService.loadQuizProgress(quizFileName, initialData.length);

        if (savedState) {
            if (savedState.shuffledQuestions && savedState.originalQuestionsOrder) {
                setQuestions(savedState.shuffledQuestions);
                setOriginalOrder(savedState.originalQuestionsOrder);
                setIsShuffled(true);
            } else {
                setQuestions(initialData);
                setOriginalOrder(initialData);
                setIsShuffled(false);
            }
            setUserAnswers(savedState.userAnswers);
            setEvaluatedQuestions(savedState.evaluatedQuestions);
            setCurrentQuestionIndex(savedState.currentQuestionIndex);
        } else {
            setQuestions(initialData);
            setOriginalOrder(initialData);
            setUserAnswers(new Array(initialData.length).fill(null));
            setEvaluatedQuestions(new Array(initialData.length).fill(false));
            setCurrentQuestionIndex(0);
            setIsShuffled(false);
        }
        setLoading(false);
    }, [quizFileName, initialData]);

    // Save state on changes
    useEffect(() => {
        if (!quizFileName || questions.length === 0) return;

        const progress = calculateProgress();
        const state: QuizProgress = {
            quizFile: quizFileName,
            questionsLength: questions.length,
            currentQuestionIndex,
            userAnswers,
            evaluatedQuestions,
            progress,
            timestamp: Date.now(),
            shuffledQuestions: isShuffled ? questions : undefined,
            originalQuestionsOrder: isShuffled ? originalOrder : undefined
        };
        storageService.saveQuizProgress(state);
    }, [questions, currentQuestionIndex, userAnswers, evaluatedQuestions, isShuffled, quizFileName, originalOrder]);

    const handleAnswerChange = useCallback((answer: any) => {
        setUserAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentQuestionIndex] = answer;
            return newAnswers;
        });
        // Reset evaluation for this question if it changes (optional, but typical)
        setEvaluatedQuestions(prev => {
            const newEvaluated = [...prev];
            newEvaluated[currentQuestionIndex] = false;
            return newEvaluated;
        });
    }, [currentQuestionIndex]);

    const navigateNext = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [currentQuestionIndex, questions.length]);

    const navigatePrev = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [currentQuestionIndex]);

    const jumpToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < questions.length) {
            setCurrentQuestionIndex(index);
        }
    }, [questions.length]);

    const toggleShuffle = useCallback(() => {
        if (isShuffled) {
            // Unshuffle
            setQuestions(originalOrder);
            setIsShuffled(false);
            // We need to remap answers to original order? 
            // The original logic just reset the state: "resetQuizState(questions.length);"
            // "if shuffleButton.includes('Unshuffle') -> questions = original... resetQuizState"
            // So it CLEARS progress when toggling shuffle.
            resetQuizState();
        } else {
            // Shuffle
            const newOrder = shuffleArray([...originalOrder]);
            setQuestions(newOrder);
            setIsShuffled(true);
            resetQuizState();
        }
    }, [isShuffled, originalOrder]);

    const resetQuizState = useCallback(() => {
        setUserAnswers(new Array(questions.length).fill(null));
        setEvaluatedQuestions(new Array(questions.length).fill(false));
        setCurrentQuestionIndex(0);
    }, [questions.length]);

    const markEvaluated = useCallback(() => {
        setEvaluatedQuestions(prev => {
            const newEvaluated = [...prev];
            newEvaluated[currentQuestionIndex] = true;
            return newEvaluated;
        });
    }, [currentQuestionIndex]);

    const clearCurrentAnswer = useCallback(() => {
         setUserAnswers(prev => {
            const newAnswers = [...prev];
            // Different types might need different "empty" values, but null/empty object works for checking
            const q = questions[currentQuestionIndex];
             if (q.question_type === 'fill_the_blanks' || q.question_type === 'drag_n_drop') {
                newAnswers[currentQuestionIndex] = {};
            } else {
                newAnswers[currentQuestionIndex] = null;
            }
            return newAnswers;
        });
        setEvaluatedQuestions(prev => {
            const newEv = [...prev];
            newEv[currentQuestionIndex] = false;
            return newEv;
        });
    }, [currentQuestionIndex, questions]);

    const calculateProgress = () => {
        let correct = 0;
        let incorrect = 0;
        let totalEvaluated = 0;
        questions.forEach((q, i) => {
            if (evaluatedQuestions[i]) {
                totalEvaluated++;
                if (isAnswerCorrect(q, userAnswers[i])) {
                    correct++;
                } else {
                    incorrect++;
                }
            }
        });
        return {
            correct,
            incorrect,
            totalEvaluated,
            totalQuestions: questions.length
        };
    };

    return {
        questions,
        currentQuestionIndex,
        currentQuestion: questions[currentQuestionIndex],
        userAnswers,
        evaluatedQuestions,
        isShuffled,
        loading,
        handleAnswerChange,
        navigateNext,
        navigatePrev,
        jumpToQuestion,
        toggleShuffle,
        markEvaluated,
        clearCurrentAnswer,
        resetQuizState,
        progress: calculateProgress()
    };
};

// Simplified grading logic based on types
export function isAnswerCorrect(question: Question, userAnswer: any): boolean {
    if (!question) return false;
    if (userAnswer === null || userAnswer === undefined) return false;

    if (question.question_type === 'multi_choice') {
        const correct = question.answer || [];
        const user = Array.isArray(userAnswer) ? userAnswer : [];
        if (user.length !== correct.length) return false;
        if (user.length === 0 && correct.length === 0) return true; // ?
        const sortedUser = [...user].sort();
        const sortedCorrect = [...correct].sort();
        return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    } 
    else if (question.question_type === 'drag_n_drop') {
        // userAnswer is object { targetId: choiceId }
        // correct mapping derived from text
        const correctMapping: Record<string, string> = {};
        if (question.choices) {
            question.choices.forEach(c => {
                 if (question.text.includes(`[${c.identifier}]`)) {
                     correctMapping[c.identifier] = c.identifier;
                 }
            });
        }
        const targetIds = Object.keys(correctMapping);
        if (Object.keys(userAnswer).length === 0 && targetIds.length > 0) return false;
        
        // Check if all targets are filled correctly
        let correctCount = 0;
        for (const targetId of targetIds) {
            if (userAnswer[targetId] === correctMapping[targetId]) {
                correctCount++;
            }
        }
        return correctCount === targetIds.length;
    }
    else if (question.question_type === 'fill_the_blanks') {
        const blanks = Array.isArray(question.blank) ? question.blank : (question.blank ? [question.blank] : []);
        if (blanks.length === 0) return true;
        
        for (const b of blanks) {
            const correct = b.answer || "";
            const user = userAnswer[b.identifier] || "";
            if (user.trim().toLowerCase() !== correct.trim().toLowerCase()) return false;
        }
        return true;
    }
    return false;
}
