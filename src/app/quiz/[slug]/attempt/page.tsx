'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { submitAnswer, timeoutQuestion, getCurrentQuestion, logIntegrityEvent } from '@/app/actions/participant';
import { getTimerState } from '@/lib/utils';
import type { CurrentQuestionResponse } from '@/types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function AttemptPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [questionData, setQuestionData] = useState<CurrentQuestionResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msRemaining, setMsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptIdRef = useRef<string>('');

  // Load question data from localStorage (set by landing page)
  useEffect(() => {
    const stored = localStorage.getItem(`quiz_current_${slug}`);
    const attemptStored = localStorage.getItem(`quiz_attempt_${slug}`);

    if (stored && attemptStored) {
      try {
        const data: CurrentQuestionResponse = JSON.parse(stored);
        const { attemptId } = JSON.parse(attemptStored);
        attemptIdRef.current = attemptId;
        setQuestionData(data);
        setMsRemaining(data.msRemaining);
        setLoading(false);
      } catch {
        router.push(`/quiz/${slug}`);
      }
    } else {
      router.push(`/quiz/${slug}`);
    }
  }, [slug, router]);

  // Timer countdown
  useEffect(() => {
    if (!questionData || confirmed) return;

    timerRef.current = setInterval(() => {
      setMsRemaining(prev => {
        const next = prev - 100;
        if (next <= 0) {
          // Timeout
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionData, confirmed]);

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibility = () => {
      if (!attemptIdRef.current) return;
      if (document.hidden) {
        logIntegrityEvent(attemptIdRef.current, 'TAB_HIDDEN');
      } else {
        logIntegrityEvent(attemptIdRef.current, 'TAB_VISIBLE');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleTimeout = useCallback(async () => {
    if (!questionData || submitting) return;
    setSubmitting(true);

    const result = await timeoutQuestion(attemptIdRef.current, questionData.question.id);

    if ('error' in result) {
      setSubmitting(false);
      return;
    }

    if (result.completed) {
      localStorage.removeItem(`quiz_current_${slug}`);
      router.push(`/quiz/${slug}/complete`);
      return;
    }

    if (result.nextQuestion) {
      loadNextQuestion(result.nextQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionData, submitting]);

  const handleSelectOption = (optionId: string) => {
    if (confirmed || submitting) return;
    setSelectedOption(optionId);
  };

  const handleConfirm = async () => {
    if (!selectedOption || !questionData || confirmed || submitting) return;
    setConfirmed(true);
    setSubmitting(true);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    const result = await submitAnswer(
      attemptIdRef.current,
      questionData.question.id,
      selectedOption
    );

    if ('error' in result) {
      setSubmitting(false);
      setConfirmed(false);
      return;
    }

    if (result.completed) {
      localStorage.removeItem(`quiz_current_${slug}`);
      router.push(`/quiz/${slug}/complete`);
      return;
    }

    if (result.nextQuestion) {
      loadNextQuestion(result.nextQuestion);
    }
  };

  const loadNextQuestion = (next: CurrentQuestionResponse) => {
    // Short delay for transition feel
    setTimeout(() => {
      setQuestionData(next);
      setMsRemaining(next.msRemaining);
      setSelectedOption(null);
      setConfirmed(false);
      setSubmitting(false);
      setAnimKey(prev => prev + 1);
      localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(next));
    }, 300);
  };

  if (loading || !questionData) {
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

  const { question, options } = questionData;
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
              {questionData.question.questionNumber > 0 ? 'Quiz' : ''}
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
                  disabled={confirmed || submitting}
                >
                  <span className="option-letter">{OPTION_LETTERS[idx]}</span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="quiz-footer">
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleConfirm}
            disabled={!selectedOption || confirmed || submitting}
          >
            {submitting ? 'Submitting...' : confirmed ? 'Answer Locked ✓' : selectedOption ? 'Confirm Answer →' : 'Select an answer'}
          </button>
        </div>
      </div>
    </div>
  );
}
