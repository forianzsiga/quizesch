import { useState } from 'react';
import QuizList from './components/QuizList';
import QuizView from './components/QuizView';

function App() {
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);

  return (
    <div className="App">
      {selectedQuiz ? (
        <QuizView 
          fileName={selectedQuiz} 
          onBack={() => setSelectedQuiz(null)} 
        />
      ) : (
        <QuizList 
          onSelectQuiz={setSelectedQuiz} 
        />
      )}
    </div>
  );
}

export default App;