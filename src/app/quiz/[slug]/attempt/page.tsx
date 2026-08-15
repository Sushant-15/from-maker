'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { submitAnswer, timeoutQuestion, logIntegrityEvent } from '@/app/actions/participant';
import { getTimerState } from '@/lib/utils';
import type { AllQuestionsResponse } from '@/types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function AttemptPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [quizData, setQuizData] = useState<AllQuestionsResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [msRemaining, setMsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Load quiz data from localStorage (set by landing page)
  useEffect(() => {
    const stored = localStorage.getItem(`quiz_current_${slug}`);

    if (stored) {
      try {
        const data: AllQuestionsResponse = JSON.parse(stored);
        setQuizData(data);
        setCurrentIndex(data.currentIndex);
        
        if (data.questions[data.currentIndex]) {
          setMsRemaining(data.questions[data.currentIndex].question.timeLimitSeconds * 1000);
          questionStartTimeRef.current = Date.now();
        }
        setLoading(false);
      } catch {
        router.push(`/quiz/${slug}`);
      }
    } else {
      router.push(`/quiz/${slug}`);
    }
  }, [slug, router]);

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibility = () => {
      if (!quizData?.attemptId) return;
      if (document.hidden) {
        logIntegrityEvent(quizData.attemptId, 'TAB_HIDDEN');
      } else {
        logIntegrityEvent(quizData.attemptId, 'TAB_VISIBLE');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [quizData?.attemptId]);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const advanceQuestion = useCallback((nextIndex: number) => {
    if (!quizData) return;
    
    if (nextIndex >= quizData.questions.length) {
      localStorage.removeItem(`quiz_current_${slug}`);
      router.push(`/quiz/${slug}/complete`);
      return;
    }

    const nextData = { ...quizData, currentIndex: nextIndex };
    setQuizData(nextData);
    setCurrentIndex(nextIndex);
    setSelectedOption(null);
    setMsRemaining(quizData.questions[nextIndex].question.timeLimitSeconds * 1000);
    setAnimKey(prev => prev + 1);
    questionStartTimeRef.current = Date.now();
    
    localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(nextData));
  }, [quizData, slug, router]);

  const handleTimeout = useCallback(() => {
    if (!quizData) return;
    
    const currentQ = quizData.questions[currentIndex];
    if (!currentQ) return;

    // Fire in background
    timeoutQuestion(quizData.attemptId, currentQ.question.id).catch(console.error);

    advanceQuestion(currentIndex + 1);
  }, [quizData, currentIndex, advanceQuestion]);

  // Timer countdown
  useEffect(() => {
    if (!quizData) return;

    timerRef.current = setInterval(() => {
      setMsRemaining(prev => {
        const next = prev - 100;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizData, currentIndex, handleTimeout]);

  const handleSelectOption = (optionId: string) => {
    if (!quizData) return;
    const currentQ = quizData.questions[currentIndex];
    if (!currentQ) return;

    // Calculate time taken
    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    setSelectedOption(optionId);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Fire in background
    submitAnswer(
      quizData.attemptId,
      currentQ.question.id,
      optionId,
      timeTakenMs
    ).catch(console.error);

    // Advance instantly (0ms delay)
    advanceQuestion(currentIndex + 1);
  };

  if (loading || !quizData || !quizData.questions[currentIndex]) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-body text-center p-8">
            <div className="skeleton skeleton-title" style={{ margin: '0 auto' }} />
            <div className="skeleton" style={{ height: 40, width: '50%', margin: '1rem auto' }} />
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quizData.questions[currentIndex];
  const { question, options } = currentQ;
  
  const timerState = getTimerState(msRemaining);
  const progress = (question.questionNumber / question.totalQuestions) * 100;
  const secondsLeft = Math.ceil(msRemaining / 1000);

  return (
    <div className="quiz-container">
      <div className="quiz-card" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="quiz-header">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted">
              Quiz
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Question {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-xs text-muted">{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Timer */}
        <div style={{ padding: 'var(--space-4) var(--space-6)', textAlign: 'center' }}>
          <div className={`timer timer-${timerState}`}>
            {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Question */}
        <div className="quiz-body" key={animKey}>
          <div className="animate-slide-question">
            <div className="card mb-6" style={{
              background: 'var(--background-alt)',
              border: 'none',
              padding: 'var(--space-5)',
            }}>
              <p className="font-semibold" style={{ fontSize: 'var(--font-size-lg)', lineHeight: 1.5 }}>
                {question.text}
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {options.map((option, idx) => (
                <button
                  key={option.id}
                  className={`option-card ${selectedOption === option.id ? 'option-card-selected' : ''}`}
                  onClick={() => handleSelectOption(option.id)}
                >
                  <span className="option-letter">{OPTION_LETTERS[idx]}</span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
