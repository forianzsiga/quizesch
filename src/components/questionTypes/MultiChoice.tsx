import React from 'react';
import type { MultiChoiceQuestion } from '../../types';

interface Props {
    question: MultiChoiceQuestion;
    userAnswer: string[] | null;
    isEvaluated: boolean;
    onAnswerChange: (answer: string[]) => void;
    questionIndex: number;
}

const MultiChoice: React.FC<Props> = ({ question, userAnswer, isEvaluated, onAnswerChange, questionIndex }) => {
    const isMultiple = Array.isArray(question.answer) && question.answer.length > 1;
    const currentAnswer = userAnswer || [];

    const handleChange = (key: string, checked: boolean) => {
        if (isEvaluated) return;
        
        let newAnswer: string[];
        if (isMultiple) {
            if (checked) {
                newAnswer = [...currentAnswer, key];
            } else {
                newAnswer = currentAnswer.filter(k => k !== key);
            }
        } else {
            // Radio behavior
            newAnswer = checked ? [key] : [];
        }
        onAnswerChange(newAnswer);
    };

    const getEvaluationClass = (key: string) => {
        if (!isEvaluated) return '';
        const isChecked = currentAnswer.includes(key);
        const isCorrect = question.answer.includes(key);

        if (isChecked && isCorrect) return 'evaluation-correct';
        if (isChecked && !isCorrect) return 'evaluation-incorrect';
        if (!isChecked && isCorrect) return 'evaluation-missed';
        return '';
    };

    return (
        <div>
            <p dangerouslySetInnerHTML={{ __html: question.question_title }} />
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {Object.entries(question.options).map(([key, value]) => (
                    <li key={key} className={getEvaluationClass(key)} data-option-key={key}>
                        <label>
                            <input
                                type={isMultiple ? 'checkbox' : 'radio'}
                                name={`q${questionIndex}_option`}
                                value={key}
                                checked={currentAnswer.includes(key)}
                                disabled={isEvaluated}
                                onChange={(e) => handleChange(key, e.target.checked)}
                                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            {key.toUpperCase()}: {value}
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MultiChoice;
