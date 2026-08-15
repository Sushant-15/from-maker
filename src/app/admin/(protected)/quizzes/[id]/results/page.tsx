'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getQuizResults, exportQuizCSV } from '@/app/actions/results';
import { formatDuration } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [quizId, setQuizId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Results</h1>
          <p className="page-subtitle">{quizTitle}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/quizzes/${quizId}/analytics`} className="btn btn-secondary">
            📊 Analytics
          </Link>
          <button className="btn btn-primary" onClick={handleExport} disabled={leaderboard.length === 0}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="kpi-card">
          <span className="kpi-label">Participants</span>
          <span className="kpi-value">{leaderboard.length}</span>
        </div>
        {leaderboard.length > 0 && (
          <>
            <div className="kpi-card">
              <span className="kpi-label">Highest Score</span>
              <span className="kpi-value" style={{ color: 'var(--success)' }}>
                {sortedLeaderboard[0]?.score}/{sortedLeaderboard[0]?.totalQuestions}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Fastest Time</span>
              <span className="kpi-value">
                {formatDuration(Math.min(...leaderboard.map(l => l.totalTimeMs)))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted font-medium">Sort by:</span>
        {(['score', 'time', 'name'] as const).map(s => (
          <button
            key={s}
            className={`btn btn-sm ${sortBy === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSortBy(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-title">No results yet</div>
          <div className="empty-state-text">Share the quiz link and wait for participants to complete it.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Participant</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.map((entry, idx) => (
                <tr key={entry.attemptId}>
                  <td>
                    <span className="font-bold" style={{
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : 'var(--foreground)',
                      fontSize: idx < 3 ? 'var(--font-size-lg)' : 'var(--font-size-base)',
                    }}>
                      {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                    </span>
                  </td>
                  <td className="font-semibold">{entry.participantName}</td>
                  <td>
                    <span className="font-bold">{entry.score}</span>
                    <span className="text-muted">/{entry.totalQuestions}</span>
                  </td>
                  <td>{entry.percentage}%</td>
                  <td className="font-medium">{formatDuration(entry.totalTimeMs)}</td>
                  <td>
                    <Link
                      href={`/admin/quizzes/${quizId}/results/${entry.attemptId}`}
                      className="btn btn-ghost btn-sm"
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
