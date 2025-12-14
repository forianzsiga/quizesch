import React from 'react';
import type { Question } from '../types';
import { isAnswerCorrect } from '../hooks/useQuiz';

interface Props {
    questions: Question[];
    currentQuestionIndex: number;
    userAnswers: any[];
    evaluatedQuestions: boolean[];
    onNavigate: (index: number) => void;
}

const ProgressPanel: React.FC<Props> = ({ questions, currentQuestionIndex, userAnswers, evaluatedQuestions, onNavigate }) => {
    return (
        <div id="progress-panel" style={{display: 'block', backgroundColor: 'rgb(255, 255, 255)', borderRadius: '8px', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 4px', padding: '16px', margin: '16px'}}>
            <h3 style={{marginTop: 0}}>Progress</h3>
            <ul style={{paddingLeft: 0, listStyle: 'none'}}>
                {questions.map((q, idx) => {
                    let dotClass = 'dot-neutral';
                    let statusTitle = 'Not answered / Not evaluated';
                    const isEval = evaluatedQuestions[idx];
                    const ans = userAnswers[idx];
                    // Check if there is a "meaningful" answer (not null/empty)
                    const hasAnswer = ans !== null && ans !== undefined && (typeof ans !== 'object' || (Array.isArray(ans) ? ans.length > 0 : Object.keys(ans).length > 0));

                    if (isEval) {
                         if (isAnswerCorrect(q, ans)) {
                             dotClass = 'dot-correct';
                             statusTitle = 'Correct';
                         } else {
                             dotClass = 'dot-incorrect';
                             statusTitle = 'Incorrect';
                         }
                    } else if (hasAnswer) {
                        dotClass = 'dot-answered';
                        statusTitle = 'Answered, not evaluated';
                    }

                    const isCurrent = idx === currentQuestionIndex;

                    return (
                        <li 
                            key={idx} 
                            style={{marginBottom: '6px', cursor: 'pointer', fontWeight: isCurrent ? 'bold' : 'normal'}}
                            data-idx={idx}
                            title={`${statusTitle} - Go to question ${idx + 1}`}
                            onClick={() => onNavigate(idx)}
                        >
                            <span className={`progress-dot ${dotClass}`}></span>Question {idx + 1}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ProgressPanel;
