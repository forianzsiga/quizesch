import React from 'react';
import type { DragAndDropQuestion } from '../../types';

interface Props {
    question: DragAndDropQuestion;
    userAnswer: Record<string, string> | null;
    isEvaluated: boolean;
    onAnswerChange: (answer: Record<string, string>) => void;
    questionIndex: number;
}

const DragAndDrop: React.FC<Props> = ({ question, userAnswer, isEvaluated, onAnswerChange, questionIndex }) => {
    const currentAnswers = userAnswer || {};
    const choices = question.choices || [];

    const handleDragStart = (e: React.DragEvent, identifier: string) => {
        if (isEvaluated) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("text/plain", identifier);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('highlight-drop');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('highlight-drop');
    };

    const handleDrop = (e: React.DragEvent, targetIdentifier: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('highlight-drop');
        if (isEvaluated) return;

        const droppedIdentifier = e.dataTransfer.getData("text/plain");
        if (droppedIdentifier) {
            onAnswerChange({
                ...currentAnswers,
                [targetIdentifier]: droppedIdentifier
            });
        }
    };



    const renderContent = () => {
        const parts: React.ReactNode[] = [];
        let text = question.text || "";
        const regex = /\[(.*?)\]/g; 
        let lastIndex = 0;
        let match;


        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                const subText = text.substring(lastIndex, match.index);
                parts.push(<span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: subText.replace(/\n/g, '<br>') }} />);
            }

            const placeholder = match[0];
            const identifier = match[1];
            
            // Check if this identifier is a valid choice identifier that acts as a target
            // In the schema/logic, placeholders match choice identifiers (fields).
            const isTarget = choices.some(c => c.identifier === identifier);

            if (isTarget) {
                const droppedId = currentAnswers[identifier];
                const droppedChoice = choices.find(c => c.identifier === droppedId);
                
                let targetClass = "drop-target";
                let feedback = null;

                if (isEvaluated) {

                    // Correct logic: The target expects 'identifier'. 
                    // So if we dropped 'identifier' into target 'identifier', it's correct.
                    // Wait, legacy logic: `correctMapping[targetId] = choice.identifier` where text includes `[choice.identifier]`.
                    // So targetId IS the choiceIdentifier. Correct answer is when droppedId === targetId.
                    
                    if (droppedId === identifier) {
                        targetClass += " evaluation-correct";
                        feedback = <span className="inline-feedback">✓</span>;
                    } else if (droppedId && droppedId !== identifier) {
                         const correctLabel = choices.find(c => c.identifier === identifier)?.label || "??";
                        targetClass += " evaluation-incorrect";
                        feedback = <span className="inline-feedback">✗ (Should be: {correctLabel})</span>;
                    } else {
                         const correctLabel = choices.find(c => c.identifier === identifier)?.label || "??";
                        targetClass += " evaluation-missed";
                        feedback = <span className="inline-feedback">Needed: {correctLabel}</span>;
                    }
                }

                parts.push(
                    <span
                        key={`target-${identifier}`}
                        className={targetClass}
                        data-identifier={identifier}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, identifier)}
                    >
                        {droppedChoice ? droppedChoice.label : ''}
                        {feedback}
                    </span>
                );
            } else {
                parts.push(<span key={`raw-${match.index}`}>{placeholder}</span>);
            }

            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
             const subText = text.substring(lastIndex);
             parts.push(<span key={`text-end`} dangerouslySetInnerHTML={{ __html: subText.replace(/\n/g, '<br>') }} />);
        }

        return parts;
    };

    return (
        <div>
            <p>{renderContent()}</p>
            <div className="drag-options-container">
                <strong>Drag options:</strong><br />
                <div id="drag-options">
                    {choices.map(choice => (
                        <span
                            key={choice.identifier}
                            className="draggable"
                            draggable={!isEvaluated}
                            onDragStart={(e) => handleDragStart(e, choice.identifier)}
                            id={`drag-${questionIndex}-${choice.identifier}`}
                            data-identifier={choice.identifier}
                        >
                            {choice.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DragAndDrop;
