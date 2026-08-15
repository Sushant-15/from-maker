'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getAdminQuizzes, deleteQuiz, duplicateQuiz } from '@/app/actions/quiz';
import { getQuizState, formatDateTime } from '@/lib/utils';

interface QuizItem {
  id: string;
  title: string;
  public_slug: string;
  start_time: string;
  end_time: string;
  question_count: number;
  participantCount: number;
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await getAdminQuizzes();
      setQuizzes(data);
    } catch {
      // Handle error silently
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This action can't be undone.`)) return;
    await deleteQuiz(id);
    setToast('Quiz deleted');
    setTimeout(() => setToast(''), 3000);
    loadQuizzes();
  };

  const handleDuplicate = async (id: string) => {
    await duplicateQuiz(id);
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/quiz/${slug}`;
    navigator.clipboard.writeText(url);
    setToast('Link copied!');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quizzes</h1>
          <p className="page-subtitle">Manage all your quizzes</p>
        </div>
        <Link href="/admin/quizzes/create" className="btn btn-primary">
          + Create Quiz
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No quizzes yet</div>
          <div className="empty-state-text">
            Create your first quiz to get started!
          </div>
          <Link href="/admin/quizzes/create" className="btn btn-primary">
            Create Your First Quiz
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Schedule</th>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => {
                const state = getQuizState(quiz.start_time, quiz.end_time);
                return (
                  <tr key={quiz.id}>
                    <td>
                      <span className="font-semibold">{quiz.title}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${state.toLowerCase()}`}>{state}</span>
                    </td>
                    <td>{quiz.question_count}</td>
                    <td className="text-sm text-muted">{formatDateTime(quiz.start_time)}</td>
                    <td>{quiz.participantCount}</td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        {state === 'UPCOMING' && (
                          <Link href={`/admin/quizzes/${quiz.id}/edit`} className="btn btn-ghost btn-sm">
                            Edit
                          </Link>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCopyLink(quiz.public_slug)}>
                          Copy Link
                        </button>
                        <Link href={`/admin/quizzes/${quiz.id}/results`} className="btn btn-ghost btn-sm">
                          Results
                        </Link>
                        <Link href={`/admin/quizzes/${quiz.id}/analytics`} className="btn btn-ghost btn-sm">
                          Analytics
                        </Link>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(quiz.id)}>
                          Duplicate
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(quiz.id, quiz.title)} style={{ color: 'var(--danger)' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}
