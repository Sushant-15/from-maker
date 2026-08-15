'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import type { LeaderboardEntry, ParticipantDetail, QuizAnalytics } from '@/types';

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role || role.role !== 'admin') throw new Error('Forbidden');
  return user;
}

// ─── Leaderboard ────────────────────────────────────────────────

export async function getQuizResults(quizId: string): Promise<{ quiz: { title: string; question_count: number }; leaderboard: LeaderboardEntry[] }> {
  await getAdminUser();
  const db = await createServiceClient();

  const { data: quiz } = await db.from('quizzes').select('title, question_count').eq('id', quizId).single();
  if (!quiz) throw new Error('Quiz not found');

  const { data: attempts } = await db
    .from('attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('status', 'COMPLETED')
    .order('score', { ascending: false });

  // Secondary sort by time (fastest first) for same scores
  const sorted = (attempts || []).sort((a: { score: number; total_time_ms: number }, b: { score: number; total_time_ms: number }) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.total_time_ms - b.total_time_ms;
  });

  const leaderboard: LeaderboardEntry[] = sorted.map((a: { id: string; participant_name: string; score: number; percentage: number; total_time_ms: number; completed_at: string }, idx: number) => ({
    rank: idx + 1,
    attemptId: a.id,
    participantName: a.participant_name,
    score: a.score || 0,
    totalQuestions: quiz.question_count,
    percentage: a.percentage || 0,
    totalTimeMs: a.total_time_ms || 0,
    completedAt: a.completed_at,
  }));

  return { quiz, leaderboard };
}

// ─── Participant Detail ─────────────────────────────────────────

export async function getAttemptDetails(attemptId: string): Promise<ParticipantDetail> {
  await getAdminUser();
  const db = await createServiceClient();

  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) throw new Error('Attempt not found');

  const { data: answers } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId);

  // Get questions for this quiz
  const { data: questions } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', attempt.quiz_id)
    .order('question_order', { ascending: true });

  // Get all options for these questions
  const questionIds = questions?.map((q: { id: string }) => q.id) || [];
  const { data: options } = await db
    .from('options')
    .select('*')
    .in('question_id', questionIds);

  // Build enriched answers
  const enrichedAnswers = (answers || []).map((a: { question_id: string; selected_option_id: string | null; id: string; attempt_id: string; question_started_at: string; answered_at: string | null; time_taken_ms: number | null; is_correct: boolean | null; timed_out: boolean; created_at: string }) => {
    const q = questions?.find((q: { id: string }) => q.id === a.question_id);
    const selectedOption = options?.find((o: { id: string }) => o.id === a.selected_option_id);
    const correctOption = options?.find((o: { question_id: string; is_correct: boolean }) => o.question_id === a.question_id && o.is_correct);

    return {
      ...a,
      questionText: q?.question_text || '',
      questionOrder: q?.question_order || 0,
      selectedOptionText: selectedOption?.option_text || null,
      correctOptionText: correctOption?.option_text || '',
      timeLimitSeconds: q?.time_limit_seconds || 20,
    };
  }).sort((a: { questionOrder: number }, b: { questionOrder: number }) => a.questionOrder - b.questionOrder);

  // Get integrity events
  const { data: events } = await db
    .from('integrity_events')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('event_timestamp', { ascending: true });

  return {
    attempt,
    answers: enrichedAnswers,
    integrityEvents: events || [],
  };
}

// ─── Analytics ──────────────────────────────────────────────────

export async function getQuizAnalytics(quizId: string): Promise<QuizAnalytics> {
  await getAdminUser();
  const db = await createServiceClient();

  // Get all completed attempts
  const { data: attempts } = await db
    .from('attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('status', 'COMPLETED');

  const { data: allAttempts } = await db
    .from('attempts')
    .select('*')
    .eq('quiz_id', quizId);

  const completedAttempts = attempts || [];
  const total = allAttempts?.length || 0;

  const scores = completedAttempts.map((a: { score: number }) => a.score || 0);
  const times = completedAttempts.map((a: { total_time_ms: number }) => a.total_time_ms || 0);

  // Get questions
  const { data: questions } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });

  // Get all answers for these attempts
  const attemptIds = (allAttempts || []).map((a: { id: string }) => a.id);
  const { data: allAnswers } = await db
    .from('answers')
    .select('*')
    .in('attempt_id', attemptIds);

  // Per-question analytics
  const questionAnalytics = (questions || []).map((q: { id: string; question_order: number; question_text: string }) => {
    const qAnswers = (allAnswers || []).filter((a: { question_id: string }) => a.question_id === q.id);
    const correct = qAnswers.filter((a: { is_correct: boolean }) => a.is_correct).length;
    const incorrect = qAnswers.filter((a: { is_correct: boolean | null; timed_out: boolean }) => a.is_correct === false && !a.timed_out).length;
    const timedOut = qAnswers.filter((a: { timed_out: boolean }) => a.timed_out).length;
    const totalAnswers = qAnswers.length;
    const avgTime = totalAnswers > 0
      ? qAnswers.reduce((sum: number, a: { time_taken_ms: number | null }) => sum + (a.time_taken_ms || 0), 0) / totalAnswers
      : 0;

    return {
      questionId: q.id,
      questionOrder: q.question_order,
      questionText: q.question_text,
      totalAttempts: totalAnswers,
      correctCount: correct,
      incorrectCount: incorrect,
      timeoutCount: timedOut,
      correctPercentage: totalAnswers > 0 ? Math.round((correct / totalAnswers) * 100) : 0,
      avgTimeTakenMs: Math.round(avgTime),
    };
  });

  return {
    totalParticipants: total,
    completedParticipants: completedAttempts.length,
    averageScore: scores.length > 0 ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    averageTimeMs: times.length > 0 ? Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length) : 0,
    questions: questionAnalytics,
  };
}

// ─── CSV Export ──────────────────────────────────────────────────

export async function exportQuizCSV(quizId: string): Promise<string> {
  await getAdminUser();
  const db = await createServiceClient();

  const { data: quiz } = await db.from('quizzes').select('*').eq('id', quizId).single();
  if (!quiz) throw new Error('Quiz not found');

  const { data: questions } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });

  const { data: attempts } = await db
    .from('attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('status', 'COMPLETED')
    .order('score', { ascending: false });

  const attemptIds = (attempts || []).map((a: { id: string }) => a.id);
  const { data: allAnswers } = await db
    .from('answers')
    .select('*')
    .in('attempt_id', attemptIds);

  const { data: allOptions } = await db
    .from('options')
    .select('*')
    .in('question_id', (questions || []).map((q: { id: string }) => q.id));

  // Build CSV header
  const questionHeaders = (questions || []).flatMap((_: unknown, i: number) => [
    `Q${i + 1} Answer`,
    `Q${i + 1} Correct`,
    `Q${i + 1} Time (s)`,
    `Q${i + 1} Timed Out`,
  ]);

  const headers = ['Rank', 'Name', 'Score', 'Percentage', 'Total Time (s)', 'Started At', 'Completed At', ...questionHeaders];

  const rows = (attempts || []).map((attempt: { id: string; participant_name: string; score: number; percentage: number; total_time_ms: number; started_at: string; completed_at: string }, idx: number) => {
    const attemptAnswers = (allAnswers || []).filter((a: { attempt_id: string }) => a.attempt_id === attempt.id);

    const questionData = (questions || []).flatMap((q: { id: string }) => {
      const answer = attemptAnswers.find((a: { question_id: string }) => a.question_id === q.id);
      const selectedOption = allOptions?.find((o: { id: string }) => o.id === answer?.selected_option_id);

      return [
        selectedOption?.option_text || (answer?.timed_out ? 'TIMED OUT' : 'N/A'),
        answer?.is_correct ? 'Yes' : 'No',
        answer?.time_taken_ms ? (answer.time_taken_ms / 1000).toFixed(1) : 'N/A',
        answer?.timed_out ? 'Yes' : 'No',
      ];
    });

    return [
      idx + 1,
      attempt.participant_name,
      attempt.score || 0,
      `${attempt.percentage || 0}%`,
      ((attempt.total_time_ms || 0) / 1000).toFixed(1),
      attempt.started_at,
      attempt.completed_at,
      ...questionData,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((r: (string | number)[]) => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
