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

    const handleVote = async () => {
        setLoading(true);
        const newData = await recordVote(quizFile, questionIndex, 'trust');
        if (newData) {
            setVoteData(newData);
        }
        setLoading(false);
    };

    return (
        <div className="vote-container">
            <span>Is this answer correct?</span>
            <button 
                className={`vote-btn vote-trust ${voteData.userVote === 'trust' ? 'active' : ''}`}
                onClick={handleVote}
                title="Trust this answer"
                disabled={loading}
            >
                👍
            </button>
            <span className="vote-score">
                Trust Score: <strong>{voteData.score}%</strong> ({voteData.totalVotes} votes)
            </span>
        </div>
    );
};

export default Vote;
