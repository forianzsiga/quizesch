import React, { useEffect, useState } from 'react';
import { fetchQuizList, fetchQuizData } from '../services/api';
import { loadAllProgress } from '../services/storage';
import type { QuizManifestEntry, Question } from '../types';

interface Props {
    onSelectQuiz: (fileName: string) => void;
}

interface SupervisionInfo {
    total: number;
    supervised: number;
    generated: number;
    unsupervised: number;
}

const QuizList: React.FC<Props> = ({ onSelectQuiz }) => {
    const [taggedQuizzes, setTaggedQuizzes] = useState<QuizManifestEntry[]>([]);
    const [untaggedQuizzes, setUntaggedQuizzes] = useState<QuizManifestEntry[]>([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState<QuizManifestEntry[]>([]);
    const [availableTags, setAvailableTags] = useState<{ subject: string[], type: string[], year: string[] }>({ subject: [], type: [], year: [] });
    const [activeFilters, setActiveFilters] = useState<{ subject: string[], type: string[], year: string[] }>({ subject: [], type: [], year: [] });
    const [progress, setProgress] = useState<Record<string, any>>({});
    const [supervisionInfos, setSupervisionInfos] = useState<Record<string, SupervisionInfo>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const manifest = await fetchQuizList();
                const all = manifest.quizzes || [];
                const tagged = all.filter(q => q.tags.subject !== 'Untagged');
                const untagged = all.filter(q => q.tags.subject === 'Untagged');

                setTaggedQuizzes(tagged);
                setUntaggedQuizzes(untagged);
                setFilteredQuizzes(tagged);

                // Build tags
                const tags = { subject: new Set<string>(), type: new Set<string>(), year: new Set<string>() };
                tagged.forEach(q => {
                    tags.subject.add(q.tags.subject);
                    tags.type.add(q.tags.type);
                    tags.year.add(String(q.tags.year));
                });

                setAvailableTags({
                    subject: Array.from(tags.subject).sort(),
                    type: Array.from(tags.type).sort(),
                    year: Array.from(tags.year).sort()
                });

                setProgress(loadAllProgress());

                // Fetch supervision info for all quizzes
                const supervisionPromises = all.map(async (q) => {
                    try {
                        const data = await fetchQuizData(q.fileName);
                        const questions = Array.isArray(data) ? data : data.questions || [];
                        let total = questions.length;
                        let supervised = 0, generated = 0, unsupervised = 0;
                        questions.forEach((question: Question) => {
                            if (question.supervised) {
                                const s = question.supervised.trim().toLowerCase();
                                if (s === 'yes') supervised++;
                                else if (s === 'generated') generated++;
                                else unsupervised++;
                            } else {
                                unsupervised++;
                            }
                        });
                        return { 
                            fileName: q.fileName, 
                            info: { total, supervised, generated, unsupervised } 
                        };
                    } catch (e) {
                        console.warn(`Failed to load stats for ${q.fileName}`, e);
                        return null;
                    }
                });

                const results = await Promise.all(supervisionPromises);
                const newInfos: Record<string, SupervisionInfo> = {};
                results.forEach(res => {
                    if (res) {
                        newInfos[res.fileName] = res.info;
                    }
                });
                setSupervisionInfos(newInfos);

            } catch (e: any) {
                setError(e.message);
            }
        };
        init();
    }, []);

    useEffect(() => {
        const filtered = taggedQuizzes.filter(q => {
            const { tags } = q;
            const matchSubject = activeFilters.subject.length === 0 || activeFilters.subject.includes(tags.subject);
            const matchType = activeFilters.type.length === 0 || activeFilters.type.includes(tags.type);
            const matchYear = activeFilters.year.length === 0 || activeFilters.year.includes(String(tags.year));
            return matchSubject && matchType && matchYear;
        });
        setFilteredQuizzes(filtered);
    }, [activeFilters, taggedQuizzes]);

    const handleFilterChange = (category: 'subject' | 'type' | 'year', value: string, checked: boolean) => {
        setActiveFilters(prev => {
            const current = prev[category];
            const newValues = checked ? [...current, value] : current.filter(v => v !== value);
            return { ...prev, [category]: newValues };
        });
    };

    const renderQuizItem = (quiz: QuizManifestEntry) => {
        const quizProgress = progress[quiz.fileName];
        const supInfo = supervisionInfos[quiz.fileName];

        let correctWidth = 0;
        let incorrectWidth = 0;
        let isFullyCorrect = false;

        if (quizProgress && quizProgress.progress && quizProgress.progress.totalQuestions > 0) {
            const { correct, incorrect, totalQuestions, totalEvaluated } = quizProgress.progress;
            correctWidth = (correct / totalQuestions) * 100;
            incorrectWidth = (incorrect / totalQuestions) * 100;

            if (totalEvaluated === totalQuestions && totalQuestions > 0 && incorrect === 0) {
                isFullyCorrect = true;
            }
        }
        
        const neutralWidth = 100 - correctWidth - incorrectWidth;

        let indicator = null;
        if (supInfo) {
            if (supInfo.generated === supInfo.total && supInfo.total > 0) {
                indicator = <span className="llm-indicator" title="This quiz set is entirely generated by an LLM">🤖 Generated</span>;
            } else if (supInfo.supervised === supInfo.total && supInfo.total > 0) {
                indicator = <span className="supervised-indicator" title="This quiz set is fully human supervised">✔ Fully Supervised</span>;
            } else if (supInfo.supervised > 0) {
                indicator = <span className="partial-indicator" title="This quiz set already contains human supervised questions">⚠️ Partially Supervised</span>;
            } else if (supInfo.total > 0) {
                indicator = <span className="unsupervised-indicator" title="This quiz set generated from existing sources interpreted by an LLM and it was not yet supervised by a human">❗ Unsupervised</span>;
            }
        }

        return (
            <li key={quiz.fileName}>
                <a href="#" onClick={(e) => { e.preventDefault(); onSelectQuiz(quiz.fileName); }} data-file-name={quiz.fileName}>
                    <div className={`quiz-card ${isFullyCorrect ? 'fully-correct' : ''}`}>
                        <div className="quiz-icon">📚</div>
                        <div className="quiz-title">
                            {/* Prettify filename logic not fully replicated here but simplified title from tags is used */}
                            ({quiz.tags.year}) {quiz.tags.type}
                        </div>
                        <div className="quiz-filename">{quiz.fileName}</div>
                        
                        <div style={{textAlign: 'center'}}>
                            {indicator}
                        </div>

                        <div className="progress-bar-container">
                            {correctWidth > 0 && <div className="progress-bar progress-bar-correct" style={{width: `${correctWidth}%`}}></div>}
                            {incorrectWidth > 0 && <div className="progress-bar progress-bar-incorrect" style={{width: `${incorrectWidth}%`}}></div>}
                            {neutralWidth > 0.1 && <div className="progress-bar progress-bar-neutral" style={{width: `${neutralWidth}%`}}></div>}
                        </div>
                        {isFullyCorrect && <div className="completion-checkmark"></div>}
                    </div>
                </a>
            </li>
        );
    };

    if (error) return <div className="error-text">Error: {error}</div>;

    const subjectsToRender = activeFilters.subject.length > 0 
        ? activeFilters.subject 
        : availableTags.subject;

    return (
        <div id="main-view-wrapper" style={{display: 'flex'}}>
            <div id="main-banner-container">
                <img src="quizesch-banner.svg" alt="Quizesch Banner" width="429" height="87" />
            </div>

            <div id="quiz-selection-area">
                <div id="quiz-list-wrapper">
                    <div id="quiz-list-container">
                        <h2>Available Quizzes</h2>
                        {subjectsToRender.length === 0 && filteredQuizzes.length === 0 ? (
                             <p style={{color: 'var(--text-muted)'}}>No quizzes found matching filters.</p>
                        ) : (
                            subjectsToRender.map(subject => {
                                const quizzesInSubject = filteredQuizzes.filter(q => q.tags.subject === subject);
                                if (quizzesInSubject.length === 0) return null;

                                return (
                                    <details key={subject} className="subject-group" open>
                                        <summary>{subject}</summary>
                                        <ul className="quiz-grid">
                                            {quizzesInSubject.map(renderQuizItem)}
                                        </ul>
                                    </details>
                                );
                            })
                        )}
                    </div>
                    {untaggedQuizzes.length > 0 && (
                        <div id="untagged-quiz-container" style={{display: 'flex'}}>
                            <h2>Legacy Quizzes</h2>
                            <p>These quizzes have not yet been tagged and will not be affected by the filters.</p>
                            <ul id="untagged-quiz-list">
                                {untaggedQuizzes.map(renderQuizItem)}
                            </ul>
                        </div>
                    )}
                </div>
                <aside id="filter-panel" style={{display: 'block'}}>
                    <h3>Filter Quizzes</h3>
                    <div id="filters">
                        {Object.entries(availableTags).map(([category, values]) => (
                            <div key={category} className="filter-group" data-filter-type={category}>
                                <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                                {values.map(val => (
                                    <div 
                                        key={val} 
                                        className={`filter-option ${activeFilters[category as keyof typeof activeFilters].includes(val) ? 'active' : ''}`}
                                        data-tag={val}
                                        onClick={() => handleFilterChange(category as any, val, !activeFilters[category as keyof typeof activeFilters].includes(val))}
                                    >
                                        {val}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default QuizList;