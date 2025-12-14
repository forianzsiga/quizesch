import React, { useEffect, useState } from 'react';
import { fetchQuizData } from '../services/api';
import { useQuiz } from '../hooks/useQuiz';
import QuestionRenderer from './QuestionRenderer';
import ProgressPanel from './ProgressPanel';
import Result from './Result';
import Vote from './Vote';
import type { Question } from '../types';

interface Props {
    fileName: string;
    onBack: () => void;
}

const QuizView: React.FC<Props> = ({ fileName, onBack }) => {
    const [quizData, setQuizData] = useState<Question[] | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Load data first
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchQuizData(fileName);
                const questions = Array.isArray(data) ? data : data.questions || [];
                setQuizData(questions);
            } catch (e: any) {
                setFetchError(e.message);
            }
        };
        load();
    }, [fileName]);

    const {
        currentQuestion,
        currentQuestionIndex,
        userAnswers,
        evaluatedQuestions,
        isShuffled,
        loading, // Storage loading
        handleAnswerChange,
        navigateNext,
        navigatePrev,
        jumpToQuestion,
        toggleShuffle,
        markEvaluated,
        clearCurrentAnswer,
        resetQuizState, // Reset only current run
        progress,
        questions
    } = useQuiz(fileName, quizData);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'arrowleft':
                    e.preventDefault();
                    navigatePrev();
                    break;
                case 'arrowright':
                    e.preventDefault();
                    navigateNext();
                    break;
                case 'e':
                    if (currentQuestion) markEvaluated();
                    break;
                case 'c':
                    clearCurrentAnswer();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigateNext, navigatePrev, markEvaluated, clearCurrentAnswer, currentQuestion]);

    if (fetchError) return <div>Error loading quiz: {fetchError}</div>;
    if (!quizData || loading) return <div className="loading-spinner"></div>;

    const isCurrentEvaluated = evaluatedQuestions[currentQuestionIndex];
    const currentAnswer = userAnswers[currentQuestionIndex];

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear all your answers and progress for this quiz? This cannot be undone.')) {
            // We need a way to clear storage. useQuiz handles saving state, but we need to explicitly clear it.
            // Actually useQuiz updates storage when state changes.
            // If we resetQuizState, it sets answers to null, which saves "empty" state.
            // But to "delete" from storage, we might want to call storageService.clearQuizProgress directly
            // and then reset internal state.
            // For simplicity, resetting state overwrites storage with empty state, which is effectively clearing progress.
            resetQuizState();
        }
    };

    return (
        <div id="in-quiz-wrapper" className="active" style={{display: 'flex'}}>
            <div id="quiz-container">
                <button id="back-to-menu-btn" onClick={onBack}>⬅ Back to Quiz List</button>
                <img src="quizesch-banner.svg" alt="Quizesch Banner" style={{width: '50%', maxWidth: '600px', margin: '20px auto', display: 'block'}} />
                
                {currentQuestion ? (
                    <div id="question-container">
                        <QuestionRenderer
                            question={currentQuestion}
                            userAnswer={currentAnswer}
                            isEvaluated={isCurrentEvaluated}
                            onAnswerChange={handleAnswerChange}
                            questionIndex={currentQuestionIndex}
                        />
                        <Vote quizFile={fileName} questionIndex={currentQuestionIndex} />
                    </div>
                ) : (
                    <Result score={progress.correct} total={progress.totalQuestions} />
                )}

                <div id="navigation-controls">
                    <button id="prev-btn" onClick={navigatePrev} disabled={currentQuestionIndex === 0}>
                        <span style={{ whiteSpace: 'nowrap' }}>❮ Previous</span><br /><span className="shortcut-hint"><span style={{ whiteSpace: 'nowrap' }}>(left arrow)</span></span>
                    </button>
                    <button id="reset-btn" onClick={clearCurrentAnswer}>
                        <span style={{ whiteSpace: 'nowrap' }}>Clear 🗑️</span><br /><span className="shortcut-hint">(C)</span>
                    </button>
                    <button id="next-btn" onClick={navigateNext} disabled={currentQuestionIndex === questions.length - 1}>
                        <span style={{ whiteSpace: 'nowrap' }}>Next ❯</span><br /><span className="shortcut-hint"><span style={{ whiteSpace: 'nowrap' }}>(right arrow)</span></span>
                    </button>
                    <button id="evaluate-btn" onClick={markEvaluated} disabled={isCurrentEvaluated || !currentQuestion}>
                        <span style={{ whiteSpace: 'nowrap' }}>Evaluate 📝</span><br /><span className="shortcut-hint">(E)</span>
                    </button>
                    <button id="shuffle-toggle-btn" onClick={toggleShuffle}>
                        <span style={{ whiteSpace: 'nowrap' }}>{isShuffled ? 'Unshuffle 📋' : 'Shuffle Questions 🔀'}</span><br />
                    </button>
                    <button id="clear-all-btn" onClick={handleClearAll}>
                        <span style={{ whiteSpace: 'nowrap' }}>Clear All Progress 🧨</span><br />
                    </button>
                </div>

                {!currentQuestion && (
                    <div id="result-container" style={{display: 'block'}}>
                         {/* Result is already shown above if no question, but let's ensure structure matches */}
                    </div>
                )}

                <div id="warning-message" style={{border: '2px solid #f39c12', backgroundColor: '#fff3cd', padding: '15px', marginTop: '50px', marginBottom: '20px', borderRadius: '8px', fontSize: '12px'}}>
                    <strong style={{color: '#d35400'}}>⚠️ Warning:</strong> This quiz is still under construction. Data is being manually extracted from the provided PDFs and turned into JSONs using multimodal LLM prompting. This means there definitely wil be broken questions along the way.<br /><br />
                    🚀 Feel free to contribute to the project on GitHub by extending codebase or fixing questions:
                    <a href="https://github.com/forianzsiga/quizesch" target="_blank" style={{marginLeft: '5px'}}>https://github.com/forianzsiga/quizesch</a><br /><br />
                    🔜 Upcoming features:
                    <ul style={{marginTop: '10px'}}>
                        <li>Making progression persistent in browser (Done!)</li>
                        <li>Server-side generation of new questions via OpenAI API based on past questions + merged presentation notes submitted as a PDF</li>
                    </ul>
                </div>
                <div id="attribution-notice">
                    Made with &lt;3 by Zsigmond Forian-Szabo <br /> Project is under MIT License
                </div>
            </div>

            <ProgressPanel
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                userAnswers={userAnswers}
                evaluatedQuestions={evaluatedQuestions}
                onNavigate={jumpToQuestion}
            />
        </div>
    );
};

export default QuizView;
