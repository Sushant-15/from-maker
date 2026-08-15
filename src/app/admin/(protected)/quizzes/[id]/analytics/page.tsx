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
      <div>
        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      </div>
    );
  }

  if (!analytics) return <div className="text-center text-muted p-8">No data available</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Quiz performance breakdown</p>
        </div>
        <Link href={`/admin/quizzes/${quizId}/results`} className="btn btn-secondary">
          🏆 Leaderboard
        </Link>
      </div>

      {/* Overview */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Participants</span>
          <span className="kpi-value">{analytics.totalParticipants}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Completed</span>
          <span className="kpi-value">{analytics.completedParticipants}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Average Score</span>
          <span className="kpi-value">{analytics.averageScore}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Highest</span>
          <span className="kpi-value" style={{ color: 'var(--success)' }}>{analytics.highestScore}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Lowest</span>
          <span className="kpi-value" style={{ color: 'var(--danger)' }}>{analytics.lowestScore}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Avg Time</span>
          <span className="kpi-value text-xl">{formatDuration(analytics.averageTimeMs)}</span>
        </div>
      </div>

      {/* Question Difficulty */}
      <h3 className="section-title mt-8">Question Difficulty</h3>
      <div className="card">
        <div className="bar-chart">
          {analytics.questions.map((q) => (
            <div key={q.questionId} className="bar-row">
              <span className="bar-label">Q{q.questionOrder}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${q.correctPercentage}%`,
                    background: q.correctPercentage >= 70
                      ? 'var(--success)'
                      : q.correctPercentage >= 40
                        ? 'linear-gradient(90deg, var(--warning), #f97316)'
                        : 'var(--danger)',
                  }}
                />
              </div>
              <span className="bar-value">{q.correctPercentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <h3 className="section-title mt-8">Detailed Breakdown</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Q#</th>
              <th>Question</th>
              <th>Correct</th>
              <th>Incorrect</th>
              <th>Timed Out</th>
              <th>Avg Time</th>
            </tr>
          </thead>
          <tbody>
            {analytics.questions.map((q) => (
              <tr key={q.questionId}>
                <td className="font-bold" style={{ color: 'var(--primary)' }}>Q{q.questionOrder}</td>
                <td className="truncate" style={{ maxWidth: 300 }}>{q.questionText}</td>
                <td style={{ color: 'var(--success)' }}>{q.correctCount}</td>
                <td style={{ color: 'var(--danger)' }}>{q.incorrectCount}</td>
                <td style={{ color: 'var(--warning)' }}>{q.timeoutCount}</td>
                <td>{(q.avgTimeTakenMs / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
