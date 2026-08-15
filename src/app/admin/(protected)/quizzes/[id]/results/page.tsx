'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getQuizResults, exportQuizCSV } from '@/app/actions/results';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [quizId, setQuizId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [liveModeEnabled, setLiveModeEnabled] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'name'>('score');

  useEffect(() => {
    params.then(p => {
      setQuizId(p.id);
      loadResults(p.id);
    });
  }, [params]);

  const loadResults = async (id: string) => {
    try {
      const data = await getQuizResults(id);
      setQuizTitle(data.quiz.title);
      setLeaderboard(data.leaderboard);
    } catch {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!quizId || !liveModeEnabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`results-${quizId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attempts',
          filter: `quiz_id=eq.${quizId}`,
        },
        (payload) => {
          if (payload.new.status === 'COMPLETED') {
            loadResults(quizId);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        } else {
          setIsLive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [quizId, liveModeEnabled]);

  const handleExport = async () => {
    const csv = await exportQuizCSV(quizId);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quizTitle.replace(/\s+/g, '-').toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'time') return a.totalTimeMs - b.totalTimeMs;
    if (sortBy === 'name') return a.participantName.localeCompare(b.participantName);
    // Default: score desc, time asc
    if (b.score !== a.score) return b.score - a.score;
    return a.totalTimeMs - b.totalTimeMs;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results</h1>
            {!liveModeEnabled ? (
              <button 
                onClick={() => setLiveModeEnabled(true)}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-bold text-white bg-gradient-to-br from-fuchsia-800 to-fuchsia-600 shadow shadow-fuchsia-800/30 hover:-translate-y-px hover:shadow-md hover:shadow-fuchsia-800/40 transition-all uppercase focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 cursor-pointer"
              >
                📡 Go Live
              </button>
            ) : (
              <button 
                onClick={() => setLiveModeEnabled(false)}
                title="Click to disconnect"
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold uppercase transition-all shadow-sm cursor-pointer border ${isLive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 shadow-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20'}`}
              >
                <span className="relative flex h-2 w-2">
                  {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-red-500'}`}></span>
                </span>
                {isLive ? 'Live' : 'Connecting'}
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{quizTitle}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/quizzes/${quizId}/analytics`} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
            📊 Analytics
          </Link>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 disabled:opacity-50" onClick={handleExport} disabled={leaderboard.length === 0}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Participants</span>
          <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{leaderboard.length}</span>
        </div>
        {leaderboard.length > 0 && (
          <>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Highest Score</span>
              <span className="text-3xl font-black tabular-nums tracking-tight text-emerald-500">
                {sortedLeaderboard[0]?.score}<span className="text-lg text-emerald-500/50">/{sortedLeaderboard[0]?.totalQuestions}</span>
              </span>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fastest Time</span>
              <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">
                {formatDuration(Math.min(...leaderboard.map(l => l.totalTimeMs)))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-slate-500 font-medium">Sort by:</span>
        {(['score', 'time', 'name'] as const).map(s => (
          <button
            key={s}
            className={`inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-1 ${sortBy === s ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
            onClick={() => setSortBy(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl h-16 w-full shadow-sm" />)}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 border-dashed rounded-3xl">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No results yet</div>
          <div className="text-slate-500">Share the quiz link and wait for participants to complete it.</div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm mb-12">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200 w-[50px]">#</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Participant</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Score</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Accuracy</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Time</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedLeaderboard.map((entry, idx) => (
                <tr key={entry.attemptId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 align-middle">
                    <span className={`font-bold ${idx < 3 ? 'text-lg' : 'text-base'} ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-900'}`}>
                      {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-middle font-semibold text-slate-900">{entry.participantName}</td>
                  <td className="px-6 py-4 align-middle tabular-nums">
                    <span className="font-bold text-slate-900">{entry.score}</span>
                    <span className="text-slate-400">/{entry.totalQuestions}</span>
                  </td>
                  <td className="px-6 py-4 align-middle tabular-nums">{entry.percentage}%</td>
                  <td className="px-6 py-4 align-middle font-medium text-slate-700 tabular-nums">{formatDuration(entry.totalTimeMs)}</td>
                  <td className="px-6 py-4 align-middle text-right">
                    <Link
                      href={`/admin/quizzes/${quizId}/results/${entry.attemptId}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
