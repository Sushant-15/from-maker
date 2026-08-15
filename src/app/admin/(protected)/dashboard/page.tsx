import Link from 'next/link';
import { getDashboardStats, getAdminQuizzes } from '@/app/actions/quiz';
import { getQuizState, formatDateTime } from '@/lib/utils';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const quizzes = await getAdminQuizzes();
  const recentQuizzes = quizzes.slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your quizzes and participants</p>
        </div>
        <Link href="/admin/quizzes/create" className="btn btn-primary">
          + Create Quiz
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Quizzes</span>
          <span className="kpi-value">{stats.totalQuizzes}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active</span>
          <span className="kpi-value" style={{ color: 'var(--success)' }}>{stats.activeQuizzes}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Upcoming</span>
          <span className="kpi-value" style={{ color: 'var(--info)' }}>{stats.upcomingQuizzes}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Completed</span>
          <span className="kpi-value">{stats.completedQuizzes}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Participants</span>
          <span className="kpi-value" style={{ color: 'var(--primary)' }}>{stats.totalParticipants}</span>
        </div>
      </div>

      {/* Recent Quizzes */}
      <h3 className="section-title">Recent Quizzes</h3>
      {recentQuizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No quizzes yet</div>
          <div className="empty-state-text">
            Create your first quiz to get started. Add questions, set a timer, and share the link!
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
                <th>Start</th>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentQuizzes.map((quiz: any) => {
                const state = getQuizState(quiz.start_time, quiz.end_time);
                return (
                  <tr key={quiz.id}>
                    <td>
                      <span className="font-semibold">{quiz.title}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${state.toLowerCase()}`}>
                        {state}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{formatDateTime(quiz.start_time)}</td>
                    <td>{quiz.participantCount}</td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        {state === 'UPCOMING' && (
                          <Link href={`/admin/quizzes/${quiz.id}/edit`} className="btn btn-ghost btn-sm">
                            Edit
                          </Link>
                        )}
                        <Link href={`/admin/quizzes/${quiz.id}/results`} className="btn btn-ghost btn-sm">
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
