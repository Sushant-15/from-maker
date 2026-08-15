'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getQuizPublicState, startAttempt, getQuizData } from '@/app/actions/participant';
import { formatCountdown, getQuizState } from '@/lib/utils';
import type { PublicQuizInfo } from '@/types';

export default function QuizLandingClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<PublicQuizInfo | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });

  const loadQuiz = useCallback(async () => {
    const data = await getQuizPublicState(slug);
    setQuiz(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Check localStorage for existing attempt
  useEffect(() => {
    if (!quiz) return;
    const stored = localStorage.getItem(`quiz_attempt_${slug}`);
    if (stored) {
      try {
        const { attemptId } = JSON.parse(stored);
        // Validate with server
        getQuizData(attemptId).then(result => {
          if (!('error' in result)) {
            // Resume: store question data and redirect
            localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(result));
            router.push(`/quiz/${slug}/attempt`);
          } else if (result.completed) {
            router.push(`/quiz/${slug}/complete`);
          } else {
            localStorage.removeItem(`quiz_attempt_${slug}`);
          }
        });
      } catch {
        localStorage.removeItem(`quiz_attempt_${slug}`);
      }
    }
  }, [quiz, slug, router]);

  // Countdown timer for upcoming state
  useEffect(() => {
    if (!quiz || quiz.state !== 'UPCOMING') return;
    const interval = setInterval(() => {
      const msLeft = new Date(quiz.start_time).getTime() - Date.now();
      if (msLeft <= 0) {
        loadQuiz(); // Refresh state
        return;
      }
      setCountdown(formatCountdown(msLeft));
    }, 1000);
    return () => clearInterval(interval);
  }, [quiz, loadQuiz]);

  const handleStart = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setStarting(true);
    setError('');

    const result = await startAttempt(slug, name.trim());
    if ('error' in result) {
      setError(result.error);
      setStarting(false);
      return;
    }

    // Store attempt in localStorage for resume
    localStorage.setItem(`quiz_attempt_${slug}`, JSON.stringify({
      attemptId: result.attemptId,
      quizSlug: slug,
    }));
    localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(result.quizData));

    router.push(`/quiz/${slug}/attempt`);
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-body text-center">
            <div className="skeleton skeleton-title" style={{ margin: '0 auto' }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', margin: '0 auto' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-body text-center" style={{ padding: 'var(--space-12)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🔍</div>
            <h2>Quiz Not Found</h2>
            <p className="text-muted mt-2">This quiz doesn&apos;t exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── UPCOMING ───
  if (quiz.state === 'UPCOMING') {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-body text-center" style={{ padding: 'var(--space-8) var(--space-6)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>🧠</div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>{quiz.title}</h2>
            {quiz.description && (
              <p className="text-muted text-sm mb-6">{quiz.description}</p>
            )}

            <p className="text-sm text-muted font-medium mb-4">Quiz starts in</p>
            <div className="countdown mb-6">
              <div className="countdown-segment">
                <span className="countdown-value">{countdown.hours}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <span className="countdown-separator">:</span>
              <div className="countdown-segment">
                <span className="countdown-value">{countdown.minutes}</span>
                <span className="countdown-label">Min</span>
              </div>
              <span className="countdown-separator">:</span>
              <div className="countdown-segment">
                <span className="countdown-value">{countdown.seconds}</span>
                <span className="countdown-label">Sec</span>
              </div>
            </div>

            <div className="divider" />
            <div className="flex justify-center gap-6 text-sm text-muted">
              <span>{quiz.question_count} Questions</span>
              <span>Timed Quiz</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ENDED ───
  if (quiz.state === 'ENDED') {
    return (
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="quiz-body text-center" style={{ padding: 'var(--space-12)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⏰</div>
            <h2>Quiz Has Ended</h2>
            <p className="text-muted mt-2">This quiz is no longer accepting participants.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE ───
  return (
    <div className="quiz-container">
      <div className="quiz-card">
        <div className="quiz-body" style={{ padding: 'var(--space-8) var(--space-6)' }}>
          <div className="text-center">
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>🧠</div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>{quiz.title}</h2>
            {quiz.description && (
              <p className="text-muted text-sm mb-6">{quiz.description}</p>
            )}
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', flex: 1 }}>
              <div className="font-bold text-lg">{quiz.question_count}</div>
              <div className="text-xs text-muted">Questions</div>
            </div>
            <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', flex: 1 }}>
              <div className="font-bold text-lg">⏱</div>
              <div className="text-xs text-muted">Timed</div>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-light)',
              color: 'var(--danger-foreground)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-4)',
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="label" htmlFor="participant-name">Your name</label>
            <input
              id="participant-name"
              className="input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              autoFocus
              autoComplete="name"
            />
          </div>

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleStart}
            disabled={starting}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {starting ? 'Starting...' : 'Start Quiz →'}
          </button>

          <p className="text-xs text-muted text-center mt-4">
            By continuing, your answers and timing will be recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
