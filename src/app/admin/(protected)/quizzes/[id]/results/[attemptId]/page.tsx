import { getAttemptDetails } from '@/app/actions/results';
import { formatDuration, formatTimeOnly } from '@/lib/utils';
import Link from 'next/link';

export default async function AttemptDetailPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const detail = await getAttemptDetails(attemptId);
  const { attempt, answers, integrityEvents } = detail;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{attempt.participant_name}</h1>
          <p className="text-sm text-slate-500 mt-1">Participant Detail</p>
        </div>
        <Link href={`/admin/quizzes/${id}/results`} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
          ← Back to Leaderboard
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Score</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{attempt.score || 0} <span className="text-xl text-slate-400">/ {answers.length}</span></span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Accuracy</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{attempt.percentage || 0}%</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Time</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{formatDuration(attempt.total_time_ms || 0)}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Started</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{formatTimeOnly(attempt.started_at)}</span>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Question Breakdown</h3>
      <div className="flex flex-col gap-4">
        {answers.map((answer) => (
          <div key={answer.id} className={`bg-white rounded-2xl p-6 border shadow-sm ${answer.is_correct ? 'border-emerald-100' : answer.timed_out ? 'border-orange-100' : 'border-red-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="font-bold text-sm text-fuchsia-600">
                Question {answer.questionOrder}
              </span>
              {answer.timed_out ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800">⏱ TIMED OUT</span>
              ) : answer.is_correct ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">✓ Correct</span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800">✕ Incorrect</span>
              )}
            </div>
            <p className="font-medium text-slate-900 mb-4">{answer.questionText}</p>
            <div className="flex flex-col gap-2 text-sm">
              {!answer.timed_out && (
                <div className="flex gap-2">
                  <span className="text-slate-500 font-medium w-16">Selected: </span>
                  <span className={`font-semibold ${answer.is_correct ? 'text-emerald-600' : 'text-red-600'}`}>
                    {answer.selectedOptionText || 'No answer'}
                  </span>
                </div>
              )}
              {!answer.is_correct && !answer.timed_out && (
                <div className="flex gap-2">
                  <span className="text-slate-500 font-medium w-16">Correct: </span>
                  <span className="font-semibold text-emerald-600">{answer.correctOptionText}</span>
                </div>
              )}
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Time Taken: </span>
                <span className="text-slate-700 font-medium tabular-nums">{((answer.time_taken_ms || 0) / 1000).toFixed(1)}s <span className="text-slate-400 font-normal">/ {answer.timeLimitSeconds}s</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integrity Timeline */}
      {integrityEvents.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-slate-900 mt-10 mb-4">Integrity Timeline</h3>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-4 border-l-2 border-slate-200 pl-4 py-2 ml-2">
              {integrityEvents.map((event) => {
                const isWarning = ['TAB_HIDDEN', 'PAGE_RELOAD'].includes(event.event_type);
                return (
                  <div key={event.id} className="relative flex items-center gap-4">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full ring-4 ring-white ${isWarning ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <span className="text-xs font-bold text-slate-500 w-16 tabular-nums">{formatTimeOnly(event.event_timestamp)}</span>
                    <span className={`text-sm font-medium px-2.5 py-1 rounded-md ${isWarning ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-700'}`}>
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
