import Link from 'next/link';
import { getDashboardStats, getAdminQuizzes } from '@/app/actions/quiz';
import { getQuizState, formatDateTime } from '@/lib/utils';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const quizzes = await getAdminQuizzes();
  const recentQuizzes = quizzes.slice(0, 5);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your quizzes and participants</p>
        </div>
        <Link href="/admin/quizzes/create" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2">
          + Create Quiz
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Quizzes</span>
          <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{stats.totalQuizzes}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active</span>
          <span className="text-3xl font-black text-emerald-500 tabular-nums tracking-tight">{stats.activeQuizzes}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upcoming</span>
          <span className="text-3xl font-black text-blue-500 tabular-nums tracking-tight">{stats.upcomingQuizzes}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Completed</span>
          <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">{stats.completedQuizzes}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Participants</span>
          <span className="text-3xl font-black text-fuchsia-600 tabular-nums tracking-tight">{stats.totalParticipants}</span>
        </div>
      </div>

      {/* Recent Quizzes */}
      <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Quizzes</h3>
      {recentQuizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 border-dashed rounded-3xl">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No quizzes yet</div>
          <div className="text-slate-500 mb-6 max-w-sm mx-auto">
            Create your first quiz to get started. Add questions, set a timer, and share the link!
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
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Start</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200">Participants</th>
                <th className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentQuizzes.map((quiz: any) => {
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                        {state}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle text-sm text-slate-500">{formatDateTime(quiz.start_time)}</td>
                    <td className="px-6 py-4 align-middle">{quiz.participantCount}</td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex gap-2 justify-end">
                        {state === 'UPCOMING' && (
                          <Link href={`/admin/quizzes/${quiz.id}/edit`} className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            Edit
                          </Link>
                        )}
                        <Link href={`/admin/quizzes/${quiz.id}/results`} className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
                          Results
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
