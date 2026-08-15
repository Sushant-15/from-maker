'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateSlug } from '@/lib/utils';
import type { QuizFormData, DashboardStats } from '@/types';

// ─── Auth Helpers ───────────────────────────────────────────────

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!role || role.role !== 'admin') throw new Error('Forbidden');
  return user;
}

// ─── Dashboard ──────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  await getAdminUser();
  const db = await createServiceClient();
  const now = new Date().toISOString();

  const { count: totalQuizzes } = await db.from('quizzes').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  const { count: activeQuizzes } = await db.from('quizzes').select('*', { count: 'exact', head: true }).is('deleted_at', null).lte('start_time', now).gte('end_time', now);
  const { count: upcomingQuizzes } = await db.from('quizzes').select('*', { count: 'exact', head: true }).is('deleted_at', null).gt('start_time', now);
  const { count: completedQuizzes } = await db.from('quizzes').select('*', { count: 'exact', head: true }).is('deleted_at', null).lt('end_time', now);
  const { count: totalParticipants } = await db.from('attempts').select('*', { count: 'exact', head: true });

  return {
    totalQuizzes: totalQuizzes || 0,
    activeQuizzes: activeQuizzes || 0,
    upcomingQuizzes: upcomingQuizzes || 0,
    completedQuizzes: completedQuizzes || 0,
    totalParticipants: totalParticipants || 0,
  };
}

// ─── Quiz CRUD ──────────────────────────────────────────────────

export async function getAdminQuizzes() {
  await getAdminUser();
  const db = await createServiceClient();

  const { data: quizzes, error } = await db
    .from('quizzes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Get attempt counts for each quiz
  const quizIds = quizzes.map((q: { id: string }) => q.id);
  const { data: attemptCounts } = await db
    .from('attempts')
    .select('quiz_id')
    .in('quiz_id', quizIds);

  const countMap: Record<string, number> = {};
  attemptCounts?.forEach((a: { quiz_id: string }) => {
    countMap[a.quiz_id] = (countMap[a.quiz_id] || 0) + 1;
  });

  return (quizzes || []).map((q: any) => ({
    ...q,
    participantCount: countMap[q.id] || 0,
  }));
}

export async function getQuizForEdit(quizId: string) {
  await getAdminUser();
  const db = await createServiceClient();

  const { data: quiz, error } = await db
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .is('deleted_at', null)
    .single();

  if (error || !quiz) throw new Error('Quiz not found');

  const { data: questions } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });

  const questionIds = questions?.map((q: { id: string }) => q.id) || [];
  const { data: options } = await db
    .from('options')
    .select('*')
    .in('question_id', questionIds)
    .order('option_order', { ascending: true });

  const optionsByQuestion: Record<string, any[]> = {};
  (options || []).forEach((o: any) => {
    if (!optionsByQuestion[o.question_id]) optionsByQuestion[o.question_id] = [];
    optionsByQuestion[o.question_id].push(o);
  });

  return {
    quiz,
    questions: (questions || []).map((q: any) => ({
      ...q,
      options: optionsByQuestion[q.id] || [],
    })),
  };
}

export async function createQuiz(formData: QuizFormData) {
  const user = await getAdminUser();
  const db = await createServiceClient();

  const slug = generateSlug(formData.title);

  // Create quiz
  const { data: quiz, error: quizError } = await db
    .from('quizzes')
    .insert({
      title: formData.title,
      description: formData.description || null,
      public_slug: slug,
      start_time: formData.startTime,
      end_time: formData.endTime,
      show_results: formData.showResults,
      question_count: formData.questions.length,
      created_by: user.id,
    })
    .select()
    .single();

  if (quizError) throw new Error(quizError.message);

  // Create questions and options
  for (let i = 0; i < formData.questions.length; i++) {
    const q = formData.questions[i];
    const { data: question, error: qError } = await db
      .from('questions')
      .insert({
        quiz_id: quiz.id,
        question_order: i + 1,
        question_text: q.questionText,
        time_limit_seconds: q.timeLimitSeconds,
      })
      .select()
      .single();

    if (qError) throw new Error(qError.message);

    const optionInserts = q.options.map((o, idx) => ({
      question_id: question.id,
      option_order: idx + 1,
      option_text: o.optionText,
      is_correct: o.isCorrect,
    }));

    const { error: oError } = await db.from('options').insert(optionInserts);
    if (oError) throw new Error(oError.message);
  }

  revalidatePath('/admin/quizzes');
  revalidatePath('/admin/dashboard');
  return { quizId: quiz.id, slug };
}

export async function updateQuiz(quizId: string, formData: QuizFormData) {
  await getAdminUser();
  const db = await createServiceClient();

  // Check if quiz has started (editing lock)
  const { data: quiz } = await db.from('quizzes').select('start_time').eq('id', quizId).single();
  if (quiz && new Date(quiz.start_time) <= new Date()) {
    throw new Error('Cannot edit a quiz that has already started');
  }

  // Update quiz
  const { error: quizError } = await db
    .from('quizzes')
    .update({
      title: formData.title,
      description: formData.description || null,
      start_time: formData.startTime,
      end_time: formData.endTime,
      show_results: formData.showResults,
      question_count: formData.questions.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quizId);

  if (quizError) throw new Error(quizError.message);

  // Delete old questions (cascade deletes options)
  await db.from('questions').delete().eq('quiz_id', quizId);

  // Re-create questions and options
  for (let i = 0; i < formData.questions.length; i++) {
    const q = formData.questions[i];
    const { data: question, error: qError } = await db
      .from('questions')
      .insert({
        quiz_id: quizId,
        question_order: i + 1,
        question_text: q.questionText,
        time_limit_seconds: q.timeLimitSeconds,
      })
      .select()
      .single();

    if (qError) throw new Error(qError.message);

    const optionInserts = q.options.map((o, idx) => ({
      question_id: question.id,
      option_order: idx + 1,
      option_text: o.optionText,
      is_correct: o.isCorrect,
    }));

    const { error: oError } = await db.from('options').insert(optionInserts);
    if (oError) throw new Error(oError.message);
  }

  revalidatePath('/admin/quizzes');
  revalidatePath(`/admin/quizzes/${quizId}/edit`);
}

export async function deleteQuiz(quizId: string) {
  await getAdminUser();
  const db = await createServiceClient();

  // Hard Delete: Wipe out all related data permanently
  // 1. Delete attempts (cascades to answers and integrity_events)
  await db.from('attempts').delete().eq('quiz_id', quizId);
  
  // 2. Delete questions (cascades to options)
  await db.from('questions').delete().eq('quiz_id', quizId);

  // 3. Delete the quiz itself
  const { error } = await db
    .from('quizzes')
    .delete()
    .eq('id', quizId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/quizzes');
  revalidatePath('/admin/dashboard');
}

export async function duplicateQuiz(quizId: string) {
  await getAdminUser();
  const db = await createServiceClient();

  const { quiz, questions } = await getQuizForEdit(quizId);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setHours(dayAfter.getHours() + 2);

  const newFormData: QuizFormData = {
    title: `${quiz.title} (Copy)`,
    description: quiz.description || '',
    startTime: tomorrow.toISOString(),
    endTime: dayAfter.toISOString(),
    showResults: quiz.show_results,
    questions: questions.map((q: any) => ({
      questionText: q.question_text,
      timeLimitSeconds: q.time_limit_seconds,
      options: q.options.map((o: any) => ({
        optionText: o.option_text,
        isCorrect: o.is_correct,
      })),
    })),
  };

  const result = await createQuiz(newFormData);
  redirect(`/admin/quizzes/${result.quizId}/edit`);
}
