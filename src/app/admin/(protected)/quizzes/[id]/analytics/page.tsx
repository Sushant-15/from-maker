'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getQuizAnalytics } from '@/app/actions/results';
import { formatDuration } from '@/lib/utils';
import type { QuizAnalytics } from '@/types';

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const [quizId, setQuizId] = useState('');
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setQuizId(p.id);
      loadAnalytics(p.id);
    });
  }, [params]);

  const loadAnalytics = async (id: string) => {
    try {
      const data = await getQuizAnalytics(id);
      setAnalytics(data);
    } catch {
      // handle error
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl h-32 w-full shadow-sm" />)}
        </div>
      </div>
    );
  }

  if (!analytics) return <div className="text-center text-slate-500 font-medium p-8">No data available</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Quiz performance breakdown</p>
        </div>
        <Link href={`/admin/quizzes/${quizId}/results`} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
          🏆 Leaderboard
        </Link>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Total Participants</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{analytics.totalParticipants}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Completed</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{analytics.completedParticipants}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Average Score</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{analytics.averageScore}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Highest</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-emerald-500">{analytics.highestScore}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Lowest</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-red-500">{analytics.lowestScore}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Avg Time</span>
          <span className="text-2xl font-black tabular-nums tracking-tight text-slate-900">{formatDuration(analytics.averageTimeMs)}</span>
        </div>
      </div>

      {/* Question Difficulty */}
      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Question Difficulty</h3>
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col gap-4">
          {analytics.questions.map((q) => (
            <div key={q.questionId} className="flex items-center gap-4">
              <span className="w-8 text-sm font-bold text-slate-500 text-right">Q{q.questionOrder}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${q.correctPercentage}%`,
                    background: q.correctPercentage >= 70
                      ? 'var(--color-emerald-500)'
                      : q.correctPercentage >= 40
                        ? 'linear-gradient(90deg, var(--color-amber-500), #f97316)'
                        : 'var(--color-red-500)',
                  }}
                />
              </div>
              <span className="w-12 text-sm font-bold text-slate-900 tabular-nums">{q.correctPercentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Detailed Breakdown</h3>
      <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead>
            <tr>
              <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Q#</th>
              <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Question</th>
              <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Correct</th>
              <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Incorrect</th>
              <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Timed Out</th>
              <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Avg Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analytics.questions.map((q) => (
              <tr key={q.questionId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 align-middle font-bold text-fuchsia-600">Q{q.questionOrder}</td>
                <td className="px-6 py-4 align-middle truncate max-w-[300px] font-medium text-slate-900">{q.questionText}</td>
                <td className="px-6 py-4 align-middle font-semibold text-emerald-600 tabular-nums">{q.correctCount}</td>
                <td className="px-6 py-4 align-middle font-semibold text-red-600 tabular-nums">{q.incorrectCount}</td>
                <td className="px-6 py-4 align-middle font-semibold text-amber-500 tabular-nums">{q.timeoutCount}</td>
                <td className="px-6 py-4 align-middle font-medium tabular-nums">{(q.avgTimeTakenMs / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
