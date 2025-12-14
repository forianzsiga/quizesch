import React from 'react';

interface Props {
    score: number;
    total: number;
}

const Result: React.FC<Props> = ({ score, total }) => {
    return (
        <div id="result-container">
            <h2>Your Score:</h2>
            <p id="score">{score} / {total}</p>
        </div>
    );
};

export default Result;
