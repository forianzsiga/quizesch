import React from 'react';
import type { Question } from '../types';
import { isAnswerCorrect } from '../hooks/useQuiz'; // Or utils if I moved it

interface Props {
    questions: Question[];
    currentQuestionIndex: number;
    userAnswers: any[];
    evaluatedQuestions: boolean[];
    onNavigate: (index: number) => void;
}

const ProgressPanel: React.FC<Props> = ({ questions, currentQuestionIndex, userAnswers, evaluatedQuestions, onNavigate }) => {
    
    // Calculate stats for display
    let answered = 0;
    let correct = 0;
    let incorrect = 0;

    evaluatedQuestions.forEach((isEval, idx) => {
        if (isEval) {
            if (isAnswerCorrect(questions[idx], userAnswers[idx])) {
                correct++;
            } else {
                incorrect++;
            }
        }
        // Count answered roughly? Or strictly? Original: "userAnswers[i] !== null" logic
        // But userAnswers can be empty obj for DnD/Fill.
        // Simplified:
        const ans = userAnswers[idx];
        if (ans && (Array.isArray(ans) ? ans.length > 0 : Object.keys(ans).length > 0)) {
            answered++;
        }
    });

    return (
        <div id="progress-panel">
            <h3>Progress</h3>
            <div className="progress-stats">
                <div>Answered: {answered} / {questions.length}</div>
                <div>Correct: <span style={{color: 'var(--success-color)'}}>{correct}</span></div>
                <div>Incorrect: <span style={{color: 'var(--error-color)'}}>{incorrect}</span></div>
            </div>
            <div id="progress-grid">
                {questions.map((q, idx) => {
                    let className = 'progress-item';
                    if (idx === currentQuestionIndex) className += ' active';
                    
                    const isEval = evaluatedQuestions[idx];
                    const ans = userAnswers[idx];
                    const hasAnswer = ans && (Array.isArray(ans) ? ans.length > 0 : Object.keys(ans).length > 0);

                    if (isEval) {
                         if (isAnswerCorrect(q, ans)) {
                             className += ' correct';
                         } else {
                             className += ' incorrect';
                         }
                    } else if (hasAnswer) {
                        className += ' answered';
                    }

                    return (
                        <div 
                            key={idx} 
                            className={className} 
                            onClick={() => onNavigate(idx)}
                        >
                            {idx + 1}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressPanel;
