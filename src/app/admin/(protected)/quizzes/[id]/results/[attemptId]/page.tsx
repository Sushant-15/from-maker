import { getAttemptDetails } from '@/app/actions/results';
import { formatDuration, formatTimeOnly } from '@/lib/utils';
import Link from 'next/link';

export default async function AttemptDetailPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const detail = await getAttemptDetails(attemptId);
  const { attempt, answers, integrityEvents } = detail;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{attempt.participant_name}</h1>
          <p className="page-subtitle">Participant Detail</p>
        </div>
        <Link href={`/admin/quizzes/${id}/results`} className="btn btn-secondary">
          ← Back to Leaderboard
        </Link>
      </div>

      {/* Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Score</span>
          <span className="kpi-value">{attempt.score || 0} / {answers.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Accuracy</span>
          <span className="kpi-value">{attempt.percentage || 0}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Time</span>
          <span className="kpi-value">{formatDuration(attempt.total_time_ms || 0)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Started</span>
          <span className="kpi-value text-lg">{formatTimeOnly(attempt.started_at)}</span>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <h3 className="section-title mt-8">Question Breakdown</h3>
      <div className="flex flex-col gap-4">
        {answers.map((answer) => (
          <div key={answer.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <span className="font-bold text-sm" style={{ color: 'var(--primary)' }}>
                Question {answer.questionOrder}
              </span>
              {answer.timed_out ? (
                <span className="badge badge-timeout">⏱ TIMED OUT</span>
              ) : answer.is_correct ? (
                <span className="badge badge-correct">✓ Correct</span>
              ) : (
                <span className="badge badge-incorrect">✕ Incorrect</span>
              )}
            </div>
            <p className="font-medium mb-3">{answer.questionText}</p>
            <div className="flex flex-col gap-2 text-sm">
              {!answer.timed_out && (
                <div>
                  <span className="text-muted">Selected: </span>
                  <span className={answer.is_correct ? '' : ''} style={{ color: answer.is_correct ? 'var(--success)' : 'var(--danger)' }}>
                    {answer.selectedOptionText || 'No answer'}
                  </span>
                </div>
              )}
              {!answer.is_correct && !answer.timed_out && (
                <div>
                  <span className="text-muted">Correct: </span>
                  <span style={{ color: 'var(--success)' }}>{answer.correctOptionText}</span>
                </div>
              )}
              <div className="text-muted">
                Time: {((answer.time_taken_ms || 0) / 1000).toFixed(1)}s / {answer.timeLimitSeconds}s
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integrity Timeline */}
      {integrityEvents.length > 0 && (
        <>
          <h3 className="section-title mt-8">Integrity Timeline</h3>
          <div className="card">
            <div className="timeline">
              {integrityEvents.map((event) => {
                const isWarning = ['TAB_HIDDEN', 'PAGE_RELOAD'].includes(event.event_type);
                return (
                  <div key={event.id} className={`timeline-item ${isWarning ? 'timeline-warning' : ''}`}>
                    <span className="timeline-time">{formatTimeOnly(event.event_timestamp)}</span>
                    <span className="timeline-event">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
