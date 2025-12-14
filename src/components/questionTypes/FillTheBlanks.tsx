import React from 'react';
import type { FillTheBlanksQuestion, Blank } from '../../types';

interface Props {
    question: FillTheBlanksQuestion;
    userAnswer: Record<string, string> | null;
    isEvaluated: boolean;
    onAnswerChange: (answer: Record<string, string>) => void;
    questionIndex: number;
}

const FillTheBlanks: React.FC<Props> = ({ question, userAnswer, isEvaluated, onAnswerChange, questionIndex }) => {
    // We need to parse the text and replace [identifier] with inputs.
    // Unlike the original which used regex string replacement to generate HTML string,
    // in React we should parse the string into an array of nodes (text + components).

    const blanks = Array.isArray(question.blank) ? question.blank : [question.blank].filter(Boolean) as Blank[];
    const currentAnswers = userAnswer || {};

    const handleInputChange = (identifier: string, value: string) => {
        if (isEvaluated) return;
        onAnswerChange({
            ...currentAnswers,
            [identifier]: value
        });
    };

    // Helper to render parts
    const renderContent = () => {
        const parts: React.ReactNode[] = [];
        let text = question.text || "";
        
        // We will split the text by placeholders
        // Regex to match [identifier]
        // We need to handle special chars in identifiers for regex
        // Construct a giant regex ORing all identifiers?
        // Or simpler: iterate through text and find matches?
        
        // Let's use a regex that matches [anything] and check if it's a valid blank identifier
        const regex = /\\\[(.*?)\\\]/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Push text before the match
            if (match.index > lastIndex) {
                const subText = text.substring(lastIndex, match.index);
                parts.push(<span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: subText.replace(/\n/g, '<br>') }} />);
            }

            const placeholder = match[0];
            const identifier = match[1];
            const blankDef = blanks.find(b => b.identifier === identifier);

            if (blankDef) {
                const inputId = `q${questionIndex}_blank_${identifier}`;
                const userValue = currentAnswers[identifier] || "";
                
                let feedback = null;
                let inputClass = "";

                if (isEvaluated) {
                    const correctAnswer = blankDef.answer || "";
                    if (userValue.toLowerCase() === correctAnswer.toLowerCase()) {
                        inputClass = 'evaluation-correct';
                        feedback = <span className="inline-feedback feedback-correct">✓ Correct!</span>;
                    } else if (userValue === "") {
                        inputClass = 'evaluation-missed';
                        feedback = <span className="inline-feedback feedback-missed">✗ Correct: {correctAnswer}</span>;
                    } else {
                        inputClass = 'evaluation-incorrect';
                        feedback = <span className="inline-feedback feedback-incorrect">✗ Incorrect. Correct: {correctAnswer}</span>;
                    }
                }

                parts.push(
                    <span key={`input-${identifier}`} className="input-wrapper">
                        <input
                            type="text"
                            id={inputId}
                            data-identifier={identifier}
                            value={userValue}
                            placeholder="Fill blank..."
                            disabled={isEvaluated}
                            onChange={(e) => handleInputChange(identifier, e.target.value)}
                            className={inputClass}
                        />
                        {feedback || <span className="inline-feedback" id={`feedback-${inputId}`}></span>}
                    </span>
                );
            } else {
                // Not a valid blank, just render the text
                parts.push(<span key={`raw-${match.index}`}>{placeholder}</span>);
            }

            lastIndex = regex.lastIndex;
        }

        // Remaining text
        if (lastIndex < text.length) {
            const subText = text.substring(lastIndex);
            parts.push(<span key={`text-end`} dangerouslySetInnerHTML={{ __html: subText.replace(/\n/g, '<br>') }} />);
        }

        return parts;
    };

    return (
        <p>
            {renderContent()}
        </p>
    );
};

export default FillTheBlanks;
