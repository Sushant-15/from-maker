'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getQuizState } from '@/lib/utils';
import type { PublicQuizInfo, AllQuestionsResponse, CompletionResponse } from '@/types';

// ─── Public Quiz State ──────────────────────────────────────────

export async function getQuizPublicState(slug: string): Promise<PublicQuizInfo | null> {
  const db = await createServiceClient();

  const { data: quiz, error } = await db
    .from('quizzes')
    .select('id, title, description, public_slug, start_time, end_time, show_results, question_count')
    .eq('public_slug', slug)
    .is('deleted_at', null)
    .single();

  if (error || !quiz) return null;

  return {
    ...quiz,
    state: getQuizState(quiz.start_time, quiz.end_time),
  };
}

// ─── Start Attempt ──────────────────────────────────────────────

export async function startAttempt(slug: string, participantName: string): Promise<{ attemptId: string; quizData: AllQuestionsResponse } | { error: string }> {
  const db = await createServiceClient();

  // Get quiz
  const { data: quiz } = await db
    .from('quizzes')
    .select('*')
    .eq('public_slug', slug)
    .is('deleted_at', null)
    .single();

  if (!quiz) return { error: 'Quiz not found' };

  const state = getQuizState(quiz.start_time, quiz.end_time);
  if (state !== 'ACTIVE') return { error: 'Quiz is not active' };
  if (!participantName.trim()) return { error: 'Name is required' };

  // Create attempt
  const { data: attempt, error: attemptError } = await db
    .from('attempts')
    .insert({
      quiz_id: quiz.id,
      participant_name: participantName.trim(),
      status: 'IN_PROGRESS',
      current_question_index: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (attemptError) return { error: attemptError.message };

  // Get all questions
  const { data: questions } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('question_order', { ascending: true });

  if (!questions || questions.length === 0) return { error: 'No questions found' };

  // Get all options
  const { data: options } = await db
    .from('options')
    .select('id, question_id, option_order, option_text')
    .in('question_id', questions.map((q: any) => q.id))
    .order('option_order', { ascending: true });

  // Record question start for Q1
  const now = new Date().toISOString();
  await db.from('answers').insert({
    attempt_id: attempt.id,
    question_id: questions[0].id,
    question_started_at: now,
    timed_out: false,
  });

  // Log integrity event
  await db.from('integrity_events').insert({
    attempt_id: attempt.id,
    event_type: 'QUIZ_STARTED',
    event_timestamp: now,
  });

  const mappedQuestions = questions.map((q: any) => ({
    question: {
      id: q.id,
      text: q.question_text,
      questionNumber: q.question_order,
      totalQuestions: quiz.question_count,
      timeLimitSeconds: q.time_limit_seconds,
    },
    options: (options || []).filter((o: any) => o.question_id === q.id).map((o: any) => ({
      id: o.id,
      text: o.option_text,
      order: o.option_order,
    })),
  }));

  return {
    attemptId: attempt.id,
    quizData: {
      attemptId: attempt.id,
      questions: mappedQuestions,
      currentIndex: 0,
    },
  };
}

// ─── Get Quiz Data (for resume) ──────────────────────────

export async function getQuizData(attemptId: string): Promise<AllQuestionsResponse | { error: string; completed?: boolean }> {
  const db = await createServiceClient();

  // Get attempt
  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) return { error: 'Attempt not found' };
  if (attempt.status === 'COMPLETED') return { error: 'Quiz already completed', completed: true };

  // Get quiz
  const { data: quiz } = await db.from('quizzes').select('*').eq('id', attempt.quiz_id).single();
  if (!quiz) return { error: 'Quiz not found' };

  // Get all questions
  const { data: questions } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('question_order', { ascending: true });

  if (!questions) return { error: 'No questions found' };

  // Get options
  const { data: options } = await db
    .from('options')
    .select('id, question_id, option_order, option_text')
    .in('question_id', questions.map((q: any) => q.id))
    .order('option_order', { ascending: true });

  // Ensure an answer record exists for the current index
  const currentIndex = attempt.current_question_index;
  if (currentIndex >= questions.length) {
    await finishAttempt(attemptId);
    return { error: 'Quiz completed', completed: true };
  }

  const currentQ = questions[currentIndex];
  const { data: existingAnswer } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('question_id', currentQ.id)
    .single();

  if (!existingAnswer) {
    await db.from('answers').insert({
      attempt_id: attemptId,
      question_id: currentQ.id,
      question_started_at: new Date().toISOString(),
      timed_out: false,
    });
  }

  const mappedQuestions = questions.map((q: any) => ({
    question: {
      id: q.id,
      text: q.question_text,
      questionNumber: q.question_order,
      totalQuestions: quiz.question_count,
      timeLimitSeconds: q.time_limit_seconds,
    },
    options: (options || []).filter((o: any) => o.question_id === q.id).map((o: any) => ({
      id: o.id,
      text: o.option_text,
      order: o.option_order,
    })),
  }));

  return {
    attemptId,
    questions: mappedQuestions,
    currentIndex: attempt.current_question_index,
  };
}

// ─── Submit Answer ──────────────────────────────────────────────

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  optionId: string,
  clientTimeTakenMs: number
): Promise<{ completed: boolean } | { error: string }> {
  const db = await createServiceClient();
  const now = new Date();

  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) return { error: 'Attempt not found' };
  if (attempt.status === 'COMPLETED') return { completed: true };

  const { data: answerRecord } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId)
    .single();

  if (!answerRecord) return { error: 'Question not started' };
  if (answerRecord.answered_at || answerRecord.timed_out) {
    // Idempotent
    return { completed: false };
  }

  const { data: option } = await db
    .from('options')
    .select('*')
    .eq('id', optionId)
    .eq('question_id', questionId)
    .single();

  if (!option) return { error: 'Invalid option' };

  const { data: question } = await db.from('questions').select('time_limit_seconds').eq('id', questionId).single();
  const allowedMs = (question?.time_limit_seconds || 20) * 1000;
  
  // Anti-cheat on timer (tolerance of 5 seconds for network latency since client is fast but async)
  const isTimeValid = clientTimeTakenMs <= (allowedMs + 5000);
  const finalTime = Math.min(clientTimeTakenMs, allowedMs);

  await db.from('answers').update({
    selected_option_id: isTimeValid ? optionId : null,
    answered_at: now.toISOString(),
    time_taken_ms: finalTime,
    is_correct: isTimeValid ? option.is_correct : false,
    timed_out: !isTimeValid,
  }).eq('id', answerRecord.id);

  const { data: quiz } = await db.from('quizzes').select('question_count').eq('id', attempt.quiz_id).single();
  const newIndex = attempt.current_question_index + 1;

  if (newIndex >= (quiz?.question_count || 0)) {
    await db.from('attempts').update({
      current_question_index: newIndex,
      updated_at: now.toISOString(),
    }).eq('id', attemptId);
    await finishAttempt(attemptId);
    return { completed: true };
  }

  // Advance to next and create its answer record
  await db.from('attempts').update({
    current_question_index: newIndex,
    updated_at: now.toISOString(),
  }).eq('id', attemptId);

  // Find next question id
  const { data: nextQuestion } = await db
    .from('questions')
    .select('id')
    .eq('quiz_id', attempt.quiz_id)
    .eq('question_order', newIndex + 1)
    .single();

  if (nextQuestion) {
    await db.from('answers').insert({
      attempt_id: attemptId,
      question_id: nextQuestion.id,
      question_started_at: now.toISOString(),
      timed_out: false,
    });
  }

  return { completed: false };
}

// ─── Timeout Question ───────────────────────────────────────────

export async function timeoutQuestion(
  attemptId: string,
  questionId: string
): Promise<{ completed: boolean } | { error: string }> {
  // Pass max time taken to submitAnswer
  const db = await createServiceClient();
  const { data: question } = await db.from('questions').select('time_limit_seconds').eq('id', questionId).single();
  return submitAnswer(attemptId, questionId, '00000000-0000-0000-0000-000000000000', (question?.time_limit_seconds || 20) * 1000 + 10000);
}

// ─── Finish Attempt ─────────────────────────────────────────────

export async function finishAttempt(attemptId: string): Promise<CompletionResponse | { error: string }> {
  const db = await createServiceClient();
  const now = new Date();

  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) return { error: 'Attempt not found' };

  if (attempt.status === 'COMPLETED') {
    const { data: quiz } = await db.from('quizzes').select('show_results, question_count').eq('id', attempt.quiz_id).single();
    if (!quiz?.show_results) return { showResults: false };
    return {
      showResults: true,
      result: {
        participantName: attempt.participant_name,
        score: attempt.score || 0,
        totalQuestions: quiz.question_count,
        percentage: attempt.percentage || 0,
        totalTimeMs: attempt.total_time_ms || 0,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at || now.toISOString(),
      },
    };
  }

  const { data: answers } = await db.from('answers').select('*').eq('attempt_id', attemptId);
  const correctCount = answers?.filter((a: any) => a.is_correct).length || 0;
  const totalTimeMs = answers?.reduce((sum: number, a: any) => sum + (a.time_taken_ms || 0), 0) || 0;

  const { data: quiz } = await db.from('quizzes').select('show_results, question_count').eq('id', attempt.quiz_id).single();
  const totalQuestions = quiz?.question_count || 0;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  await db.from('attempts').update({
    status: 'COMPLETED',
    completed_at: now.toISOString(),
    score: correctCount,
    percentage,
    total_time_ms: totalTimeMs,
    updated_at: now.toISOString(),
  }).eq('id', attemptId);

  await db.from('integrity_events').insert({
    attempt_id: attemptId,
    event_type: 'QUIZ_COMPLETED',
    event_timestamp: now.toISOString(),
  });

  if (!quiz?.show_results) return { showResults: false };
  return {
    showResults: true,
    result: {
      participantName: attempt.participant_name,
      score: correctCount,
      totalQuestions,
      percentage,
      totalTimeMs,
      startedAt: attempt.started_at,
      completedAt: now.toISOString(),
    },
  };
}

// ─── Log Integrity Event ────────────────────────────────────────

export async function logIntegrityEvent(
  attemptId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  const db = await createServiceClient();
  await db.from('integrity_events').insert({
    attempt_id: attemptId,
    event_type: eventType,
    event_timestamp: new Date().toISOString(),
    metadata: metadata || null,
  });
}
