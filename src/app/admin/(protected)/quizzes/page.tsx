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
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quizzes</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all your quizzes</p>
        </div>
        <Link href="/admin/quizzes/create" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2">
          + Create Quiz
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl h-24 w-full shadow-sm" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 border-dashed rounded-3xl">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No quizzes yet</div>
          <div className="text-slate-500 mb-6 max-w-sm mx-auto">
            Create your first quiz to get started!
          </div>
          <Link href="/admin/quizzes/create" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md">
            Create Your First Quiz
          </Link>
        </div>
      ) : (
        <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Quiz</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Status</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Questions</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Schedule</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Participants</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizzes.map((quiz) => {
                const state = getQuizState(quiz.start_time, quiz.end_time);
                const badgeClass = state === 'ACTIVE' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : state === 'UPCOMING' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-slate-100 text-slate-800';
                return (
                  <tr key={quiz.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 align-middle">
                      <span className="font-semibold text-slate-900">{quiz.title}</span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${badgeClass}`}>{state}</span>
                    </td>
                    <td className="px-6 py-4 align-middle">{quiz.question_count}</td>
                    <td className="px-6 py-4 align-middle text-xs text-slate-500">{formatDateTime(quiz.start_time)}</td>
                    <td className="px-6 py-4 align-middle">{quiz.participantCount}</td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {state === 'UPCOMING' && (
                          <Link href={`/admin/quizzes/${quiz.id}/edit`} className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            Edit
                          </Link>
                        )}
                        <button className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleCopyLink(quiz.public_slug)}>
                          Copy Link
                        </button>
                        <Link href={`/admin/quizzes/${quiz.id}/results`} className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors">
                          Results
                        </Link>
                        <Link href={`/admin/quizzes/${quiz.id}/analytics`} className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors">
                          Analytics
                        </Link>
                        <button className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleDuplicate(quiz.id)}>
                          Duplicate
                        </button>
                        <button className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDelete(quiz.id, quiz.title)}>
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
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
