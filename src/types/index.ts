export interface Tag {
  subject: string;
  type: string;
  year: string;
}

export interface QuizManifestEntry {
  fileName: string;
  tags: Tag;
}

export interface QuizManifest {
  quizzes: QuizManifestEntry[];
}

export interface Choice {
  identifier: string;
  label: string;
}

export interface Blank {
  identifier: string;
  answer: string;
}

export interface QuestionBase {
  question_type: 'multi_choice' | 'drag_n_drop' | 'fill_the_blanks';
  ID: number;
  supervised?: 'yes' | 'no';
  // Common fields that might be present or handled generically
  text?: string; 
  question_title?: string;
}

export interface MultiChoiceQuestion extends QuestionBase {
  question_type: 'multi_choice';
  question_title: string;
  options: { [key: string]: string };
  answer: string[];
}

export interface DragAndDropQuestion extends QuestionBase {
  question_type: 'drag_n_drop';
  text: string;
  choices: Choice[];
}

export interface FillTheBlanksQuestion extends QuestionBase {
  question_type: 'fill_the_blanks';
  text: string;
  blank: Blank | Blank[];
}

export type Question = MultiChoiceQuestion | DragAndDropQuestion | FillTheBlanksQuestion;

export interface QuizData {
  tags: Tag;
  questions: Question[];
}

export interface UserVote {
  positiveVotes: number;
  totalVotes: number;
  score: number;
  userVote: 'trust' | 'distrust' | null;
}

export interface QuizProgress {
  quizFile: string;
  questionsLength: number;
  currentQuestionIndex: number;
  userAnswers: any[];
  evaluatedQuestions: boolean[];
  progress: {
    correct: number;
    incorrect: number;
    totalEvaluated: number;
    totalQuestions: number;
  };
  timestamp: number;
  shuffledQuestions?: Question[]; // Store shuffled state
  originalQuestionsOrder?: Question[]; // Store original order
}
