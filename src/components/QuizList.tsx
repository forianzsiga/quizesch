import React, { useEffect, useState } from 'react';
import { fetchQuizList } from '../services/api';
import { loadAllProgress } from '../services/storage';
import type { QuizManifestEntry } from '../types';

interface Props {
    onSelectQuiz: (fileName: string) => void;
}

const QuizList: React.FC<Props> = ({ onSelectQuiz }) => {
    const [taggedQuizzes, setTaggedQuizzes] = useState<QuizManifestEntry[]>([]);
    const [untaggedQuizzes, setUntaggedQuizzes] = useState<QuizManifestEntry[]>([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState<QuizManifestEntry[]>([]);
    const [availableTags, setAvailableTags] = useState<{ subject: string[], type: string[], year: string[] }>({ subject: [], type: [], year: [] });
    const [activeFilters, setActiveFilters] = useState<{ subject: string[], type: string[], year: string[] }>({ subject: [], type: [], year: [] });
    const [progress, setProgress] = useState<Record<string, any>>({});
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
        const quizProgress = progress[quiz.filename];
        let statusClass = "status-new";
        let statusText = "New";

        if (quizProgress) {
            const p = quizProgress.progress;
            if (p && p.totalEvaluated > 0) {
                 if (p.totalEvaluated === p.totalQuestions) {
                     statusClass = "status-completed";
                     statusText = `Completed (${p.correct}/${p.totalQuestions})`;
                 } else {
                     statusClass = "status-in-progress";
                     statusText = `In Progress (${p.totalEvaluated}/${p.totalQuestions})`;
                 }
            }
        }

        return (
            <li key={quiz.filename} className="quiz-list-item" onClick={() => onSelectQuiz(quiz.filename)}>
                <div className="quiz-info">
                    <span className="quiz-title">
                        {quiz.tags.subject} - {quiz.tags.type} ({quiz.tags.year})
                    </span>
                    <span className="quiz-meta">{quiz.filename}</span>
                </div>
                <span className={`quiz-status ${statusClass}`}>{statusText}</span>
            </li>
        );
    };

    if (error) return <div style={{color: 'red'}}>Error: {error}</div>;

    return (
        <div id="main-view-wrapper" className="active" style={{display: 'flex'}}>
            <div id="main-banner-container">
                <img src="quizesch-banner.svg" alt="Quizesch Banner" />
            </div>

            <div id="quiz-selection-area">
                <div id="quiz-list-wrapper">
                    <div id="quiz-list-container">
                        <h2>Available Quizzes</h2>
                        <ul id="quiz-list">
                            {filteredQuizzes.map(renderQuizItem)}
                        </ul>
                    </div>
                    {untaggedQuizzes.length > 0 && (
                        <div id="untagged-quiz-container">
                            <h2>Legacy Quizzes</h2>
                            <p>These quizzes have not yet been tagged and will not be affected by the filters.</p>
                            <ul id="untagged-quiz-list">
                                {untaggedQuizzes.map(renderQuizItem)}
                            </ul>
                        </div>
                    )}
                </div>
                <aside id="filter-panel">
                    <h3>Filter Quizzes</h3>
                    <div id="filters">
                        {Object.entries(availableTags).map(([category, values]) => (
                            <div key={category} className="filter-group">
                                <h4 style={{textTransform: 'capitalize'}}>{category}</h4>
                                {values.map(val => (
                                    <label key={val} className="filter-option">
                                        <input
                                            type="checkbox"
                                            value={val}
                                            checked={activeFilters[category as keyof typeof activeFilters].includes(val)}
                                            onChange={(e) => handleFilterChange(category as any, val, e.target.checked)}
                                        />
                                        {val}
                                    </label>
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
