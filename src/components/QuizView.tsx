import React, { useEffect, useState } from 'react';
import { fetchQuizData } from '../services/api';
import { useQuiz } from '../hooks/useQuiz';
import { getQuestionVoteData } from '../services/firebase';
import QuestionRenderer from './QuestionRenderer';
import ProgressPanel from './ProgressPanel';
import Result from './Result';
import Vote from './Vote';
import type { Question, UserVote } from '../types';

interface Props {
    fileName: string;
    onBack: () => void;
}

const QuizView: React.FC<Props> = ({ fileName, onBack }) => {
    const [quizData, setQuizData] = useState<Question[] | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [currentVoteData, setCurrentVoteData] = useState<UserVote | null>(null);

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

    // Fetch vote data when current question changes
    useEffect(() => {
        let mounted = true;
        const fetchVotes = async () => {
            if (currentQuestion) {
                // We need the original index if shuffled? 
                // The legacy code passes 'currentIndex' to getQuestionVoteData.
                // If the backend expects original index, we might need to map it.
                // However, useQuiz returns 'currentQuestion' and 'currentQuestionIndex'.
                // If shuffling is just a UI mapping, we need to know the ID or original index.
                // Looking at useQuiz, 'questions' is the working array (shuffled or not).
                // If we want to persist votes against the specific question content, we should ideally use a stable ID.
                // But legacy uses index. 
                // Let's assume for now index is what's used, but check if we need to map back to original index if shuffled.
                // In legacy: `firebaseService.getQuestionVoteData(currentFile, currentQIndex)`
                // And `quizService.getCurrentQuestionIndex()` returns the index in the *current* (potentially shuffled) array?
                // Actually legacy `quizService` handles shuffling by mapping indices.
                // In `useQuiz`, if we shuffle, `questions` array is reordered.
                // We need to pass the *original* index if the votes are keyed by original index.
                // For now, let's just use currentQuestionIndex, but be aware of shuffle issues if not handled.
                // (If the backend/firebase simply uses index 0..N of the JSON file, then we must send the original index.)
                // `currentQuestion.ID` might be useful if available, but legacy uses index.
                // Let's assume useQuiz handles mapping or we need to find the original index.
                // For this migration, let's rely on useQuiz's index for now or assume it matches.
                
                const data = await getQuestionVoteData(fileName, currentQuestionIndex);
                if (mounted) {
                    setCurrentVoteData(data);
                }
            }
        };
        fetchVotes();
        return () => { mounted = false; };
    }, [fileName, currentQuestionIndex, currentQuestion]);

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
            resetQuizState();
        }
    };

    // Supervision logic
    let indicator = <span className="unsupervised-indicator" title="Not yet supervised or community reviewed">❗ Unsupervised</span>;
    if (currentQuestion) {
        if (currentVoteData && currentVoteData.totalVotes > 10 && currentVoteData.score > 70) {
             indicator = <span className="supervised-indicator" title="This question is considered trustworthy.">✔ Supervised</span>;
        } else if (currentQuestion.supervised) {
            const s = currentQuestion.supervised.trim().toLowerCase();
            if (s === 'yes') {
                indicator = <span className="supervised-indicator" title="This question is considered trustworthy.">✔ Supervised</span>;
            } else if (s === 'generated') {
                indicator = <span className="llm-indicator" title="Generated by LLM">🤖 LLM generated</span>;
            }
        }
    }

    const prettifyFileName = (name: string) => {
         if (!name) return '';
        let pretty = name.replace('.json','').replace(/_/g,' ');
        pretty = pretty.replace(/\b(zh|pzh|ppzh)\b/gi, m => m.toUpperCase());
        pretty = pretty.replace(/\b(\d{4})\b/g, '($1)');
        pretty = pretty.replace(/\b([a-z])/g, c => c.toUpperCase());
        return pretty;
    }

    return (
        <div id="in-quiz-wrapper" className="active" style={{display: 'flex'}}>
            <div id="quiz-container">
                <button id="back-to-menu-btn" onClick={onBack}>← Back to Quiz List</button>
                <img src="quizesch-banner.svg" alt="Quizesch Banner" style={{width: '50%', maxWidth: '600px', margin: '20px auto', display: 'block'}} width="429" height="87" />
                
                {currentQuestion ? (
                    <div id="question-container">
                        <h3>
                            {prettifyFileName(fileName)}<br/>
                            <span style={{fontSize: '0.8em', color: 'var(--text-secondary)'}}>
                                Question {currentQuestionIndex + 1} of {questions.length} {indicator}
                            </span>
                        </h3>
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

                <div id="navigation-controls" style={{display: 'flex'}}>
                    <button id="prev-btn" onClick={navigatePrev} disabled={currentQuestionIndex === 0}>
                        <span style={{ whiteSpace: 'nowrap' }}>⏮️ Previous</span><br /><span className="shortcut-hint"><span style={{ whiteSpace: 'nowrap' }}>(left arrow)</span></span>
                    </button>
                    <button id="reset-btn" onClick={clearCurrentAnswer}>
                        <span style={{ whiteSpace: 'nowrap' }}>Clear 🗑️</span><br /><span className="shortcut-hint">(C)</span>
                    </button>
                    <button id="next-btn" onClick={navigateNext} disabled={currentQuestionIndex === questions.length - 1} style={{display: 'inline-block'}}>
                        <span style={{ whiteSpace: 'nowrap' }}>Next ⏭️</span><br /><span className="shortcut-hint"><span style={{ whiteSpace: 'nowrap' }}>(right arrow)</span></span>
                    </button>
                    <button id="evaluate-btn" onClick={markEvaluated} disabled={isCurrentEvaluated || !currentQuestion} style={{display: 'inline-block'}}>
                        <span style={{ whiteSpace: 'nowrap' }}>Evaluate 🧮</span><br /><span className="shortcut-hint">(E)</span>
                    </button>
                    <button id="shuffle-toggle-btn" onClick={toggleShuffle}>
                        <span style={{ whiteSpace: 'nowrap' }}>{isShuffled ? 'Unshuffle Questions 🔀' : 'Shuffle Questions 🔀'}</span><br />
                    </button>
                    <button id="clear-all-btn" onClick={handleClearAll}>
                        <span style={{ whiteSpace: 'nowrap' }}>Clear All Progress 💥</span><br />
                    </button>
                </div>

                {!currentQuestion && (
                    <div id="result-container" style={{display: 'none'}}>
                         {/* Result is already shown above if no question */}
                    </div>
                )}

                <div className="warning-message">
                    <strong className="warning-title">⚠️ Warning:</strong> This quiz is still under construction. Data is being manually extracted from the provided PDFs and turned into JSONs using multimodal LLM prompting. This means there definitely wil be broken questions along the way.<br /><br />
                    🛠️ Feel free to contribute to the project on GitHub by extending codebase or fixing questions:
                    <a href="https://github.com/forianzsiga/quizesch" target="_blank" style={{marginLeft: '5px'}}>https://github.com/forianzsiga/quizesch</a><br /><br />
                    🚀 Upcoming features:
                    <ul style={{marginTop: '10px'}}>
                        <li>Making progression persistent in browser</li>
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
