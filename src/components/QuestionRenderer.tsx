import React from 'react';
import type { Question } from '../types';
import MultiChoice from './questionTypes/MultiChoice';
import DragAndDrop from './questionTypes/DragAndDrop';
import FillTheBlanks from './questionTypes/FillTheBlanks';

interface Props {
    question: Question;
    userAnswer: any;
    isEvaluated: boolean;
    onAnswerChange: (answer: any) => void;
    questionIndex: number;
}

const QuestionRenderer: React.FC<Props> = (props) => {
    const { question } = props;

    switch (question.question_type) {
        case 'multi_choice':
            return <MultiChoice {...props} question={question as any} />;
        case 'drag_n_drop':
            return <DragAndDrop {...props} question={question as any} />;
        case 'fill_the_blanks':
            return <FillTheBlanks {...props} question={question as any} />;
        default:
            return <div>Unknown question type: {(question as any).question_type}</div>;
    }
};

export default QuestionRenderer;
