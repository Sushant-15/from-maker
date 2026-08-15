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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-fuchsia-600 mx-auto mb-6" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Calculating your score...
            </h2>
            <p className="text-slate-500 text-sm">
              Please wait while we finalize your results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
      <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-10 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            Quiz Completed!
          </h2>

          {completion?.showResults && completion.result ? (
            <>
              <p className="text-slate-500 mb-8">
                Thank you, <strong className="text-slate-900">{completion.result.participantName}</strong>.
              </p>

              <div className="h-px bg-slate-100 w-full mb-8" />

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</span>
                  <span className="text-3xl font-black text-fuchsia-600 tabular-nums">
                    {completion.result.score}<span className="text-lg text-slate-400">/{completion.result.totalQuestions}</span>
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accuracy</span>
                  <span className="text-3xl font-black text-slate-900 tabular-nums">{completion.result.percentage}%</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <span className="text-sm font-medium text-slate-500">Total Time: </span>
                <span className="font-bold text-slate-900 tabular-nums">{formatDuration(completion.result.totalTimeMs)}</span>
              </div>
            </>
          ) : (
            <p className="text-slate-500">
              Your response has been successfully submitted.<br />
              Thank you for participating.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
