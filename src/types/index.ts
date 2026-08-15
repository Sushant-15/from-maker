// ─── Quiz Types ─────────────────────────────────────────────

export type QuizState = 'UPCOMING' | 'ACTIVE' | 'ENDED';
export type AttemptStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  public_slug: string;
  start_time: string;
  end_time: string;
  show_results: boolean;
  question_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_order: number;
  question_text: string;
  time_limit_seconds: number;
  created_at: string;
}

export interface Option {
  id: string;
  question_id: string;
  option_order: number;
  option_text: string;
  is_correct: boolean; // Only available server-side / admin
}

export interface Attempt {
  id: string;
  quiz_id: string;
  participant_name: string;
  status: AttemptStatus;
  current_question_index: number;
  started_at: string;
  completed_at: string | null;
  total_time_ms: number | null;
  score: number | null;
  percentage: number | null;
  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  question_started_at: string;
  answered_at: string | null;
  time_taken_ms: number | null;
  is_correct: boolean | null;
  timed_out: boolean;
  created_at: string;
}

export interface IntegrityEvent {
  id: string;
  attempt_id: string;
  event_type: string;
  event_timestamp: string;
  metadata: Record<string, unknown> | null;
}

// ─── Public API Types (no is_correct leaked) ────────────────

export interface PublicQuizInfo {
  id: string;
  title: string;
  description: string | null;
  public_slug: string;
  start_time: string;
  end_time: string;
  show_results: boolean;
  question_count: number;
  state: QuizState;
}

export interface PublicQuestion {
  id: string;
  text: string;
  questionNumber: number;
  totalQuestions: number;
  timeLimitSeconds: number;
}

export interface PublicOption {
  id: string;
  text: string;
  order: number;
}

export interface CurrentQuestionResponse {
  attemptId: string;
  question: PublicQuestion;
  options: PublicOption[];
  msRemaining: number;
  isLastQuestion: boolean;
}

export interface AttemptResult {
  participantName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  totalTimeMs: number;
  startedAt: string;
  completedAt: string;
}

export interface CompletionResponse {
  showResults: boolean;
  result?: AttemptResult;
}

// ─── Admin Types ────────────────────────────────────────────

export interface QuizFormQuestion {
  id?: string;
  questionText: string;
  timeLimitSeconds: number;
  options: QuizFormOption[];
  isCollapsed?: boolean;
}

export interface QuizFormOption {
  id?: string;
  optionText: string;
  isCorrect: boolean;
}

export interface QuizFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  showResults: boolean;
  questions: QuizFormQuestion[];
}

export interface LeaderboardEntry {
  rank: number;
  attemptId: string;
  participantName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  totalTimeMs: number;
  completedAt: string;
}

export interface QuestionAnalytics {
  questionId: string;
  questionOrder: number;
  questionText: string;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  timeoutCount: number;
  correctPercentage: number;
  avgTimeTakenMs: number;
}

export interface QuizAnalytics {
  totalParticipants: number;
  completedParticipants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeMs: number;
  questions: QuestionAnalytics[];
}

export interface ParticipantDetail {
  attempt: Attempt;
  answers: (Answer & {
    questionText: string;
    questionOrder: number;
    selectedOptionText: string | null;
    correctOptionText: string;
    timeLimitSeconds: number;
  })[];
  integrityEvents: IntegrityEvent[];
}

// ─── Dashboard Types ────────────────────────────────────────

export interface DashboardStats {
  totalQuizzes: number;
  activeQuizzes: number;
  upcomingQuizzes: number;
  completedQuizzes: number;
  totalParticipants: number;
}
