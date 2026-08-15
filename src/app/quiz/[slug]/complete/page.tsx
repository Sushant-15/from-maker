'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { finishAttempt } from '@/app/actions/participant';
import { formatDuration } from '@/lib/utils';
import type { CompletionResponse } from '@/types';

export default function CompletePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [completion, setCompletion] = useState<CompletionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(`quiz_attempt_${slug}`);
    if (stored) {
      try {
        const { attemptId } = JSON.parse(stored);
        finishAttempt(attemptId).then(result => {
          if (!('error' in result)) {
            setCompletion(result);
          } else {
            setCompletion({ showResults: false });
          }
          setLoading(false);
        });
      } catch {
        setCompletion({ showResults: false });
        setLoading(false);
      }
    } else {
      setCompletion({ showResults: false });
      setLoading(false);
    }

    // Clean up localStorage
    localStorage.removeItem(`quiz_attempt_${slug}`);
    localStorage.removeItem(`quiz_current_${slug}`);
  }, [slug]);

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-card animate-slide-up">
          <div className="quiz-body text-center" style={{ padding: 'var(--space-12) var(--space-6)' }}>
            <div className="spinner" style={{ 
              margin: '0 auto var(--space-6)', 
              width: '48px', 
              height: '48px', 
              border: '4px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite' 
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
              Calculating your score...
            </h2>
            <p className="text-muted text-sm">
              Please wait while we finalize your results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-card animate-slide-up">
        <div className="quiz-body text-center" style={{ padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🎉</div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>
            Quiz Completed!
          </h2>

          {completion?.showResults && completion.result ? (
            <>
              <p className="text-muted mb-6">
                Thank you, <strong>{completion.result.participantName}</strong>.
              </p>

              <div className="divider" />

              <div className="kpi-grid" style={{ textAlign: 'center', maxWidth: 360, margin: '0 auto' }}>
                <div className="kpi-card">
                  <span className="kpi-label">Score</span>
                  <span className="kpi-value" style={{ color: 'var(--primary)' }}>
                    {completion.result.score}/{completion.result.totalQuestions}
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Accuracy</span>
                  <span className="kpi-value">{completion.result.percentage}%</span>
                </div>
              </div>

              <div className="mt-4" style={{
                background: 'var(--background-alt)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                display: 'inline-block',
              }}>
                <span className="text-sm text-muted">Time: </span>
                <span className="font-bold">{formatDuration(completion.result.totalTimeMs)}</span>
              </div>
            </>
          ) : (
            <p className="text-muted">
              Your response has been successfully submitted.<br />
              Thank you for participating.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
