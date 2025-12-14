import React, { useState, useEffect } from 'react';
import { getQuestionVoteData, recordVote } from '../services/firebase';
import type { UserVote } from '../types';

interface Props {
    quizFile: string;
    questionIndex: number;
}

const Vote: React.FC<Props> = ({ quizFile, questionIndex }) => {
    const [voteData, setVoteData] = useState<UserVote>({ positiveVotes: 0, totalVotes: 0, score: 0, userVote: null });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchVotes = async () => {
            const data = await getQuestionVoteData(quizFile, questionIndex);
            if (mounted) {
                setVoteData(data);
            }
        };
        fetchVotes();
        return () => { mounted = false; };
    }, [quizFile, questionIndex]);

    const handleVote = async (type: 'trust' | 'distrust') => {
        if (loading) return;
        setLoading(true);
        const newData = await recordVote(quizFile, questionIndex, type);
        if (newData) {
            setVoteData(newData);
        }
        setLoading(false);
    };

    const getScoreText = () => {
        if (voteData.totalVotes > 0) {
            return `Trust: ${voteData.score}% (${voteData.positiveVotes}/${voteData.totalVotes} votes). `;
        }
        return "Trust: Be the first to rate! ";
    };

    return (
        <div className="vote-ui-container">
            <span className="vote-score-text">{getScoreText()}</span>
            <button 
                className={`vote-btn trust ${voteData.userVote === 'trust' ? 'selected' : ''}`}
                onClick={() => handleVote('trust')}
                disabled={loading}
            >
                👍 Trustworthy
            </button>
            <button 
                className={`vote-btn distrust ${voteData.userVote === 'distrust' ? 'selected' : ''}`}
                onClick={() => handleVote('distrust')}
                disabled={loading}
            >
                👎 Needs Review
            </button>
            <div className="vote-verification-info">
                Questions with over 10 votes and 70% trustworthiness are considered Human Verified. Powered by Firebase 🔥
            </div>
        </div>
    );
};

export default Vote;
