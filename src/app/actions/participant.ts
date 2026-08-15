'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getQuizState } from '@/lib/utils';
import type { PublicQuizInfo, CurrentQuestionResponse, CompletionResponse } from '@/types';

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

export async function startAttempt(slug: string, participantName: string): Promise<{ attemptId: string; firstQuestion: CurrentQuestionResponse } | { error: string }> {
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

  // Get first question
  const { data: question } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .eq('question_order', 1)
    .single();

  if (!question) return { error: 'No questions found' };

  // Get options (no is_correct!)
  const { data: options } = await db
    .from('options')
    .select('id, option_order, option_text')
    .eq('question_id', question.id)
    .order('option_order', { ascending: true });

  // Record question start
  const now = new Date().toISOString();
  await db.from('answers').insert({
    attempt_id: attempt.id,
    question_id: question.id,
    question_started_at: now,
    timed_out: false,
  });

  // Log integrity event
  await db.from('integrity_events').insert({
    attempt_id: attempt.id,
    event_type: 'QUIZ_STARTED',
    event_timestamp: now,
  });

  return {
    attemptId: attempt.id,
    firstQuestion: {
      attemptId: attempt.id,
      question: {
        id: question.id,
        text: question.question_text,
        questionNumber: 1,
        totalQuestions: quiz.question_count,
        timeLimitSeconds: question.time_limit_seconds,
      },
      options: (options || []).map((o: { id: string; option_text: string; option_order: number }) => ({
        id: o.id,
        text: o.option_text,
        order: o.option_order,
      })),
      msRemaining: question.time_limit_seconds * 1000,
      isLastQuestion: quiz.question_count === 1,
    },
  };
}

// ─── Get Current Question (for resume) ──────────────────────────

export async function getCurrentQuestion(attemptId: string): Promise<CurrentQuestionResponse | { error: string; completed?: boolean }> {
  const db = await createServiceClient();

  // Get attempt
  const { data: attempt } = await db
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (!attempt) return { error: 'Attempt not found' };
  if (attempt.status === 'COMPLETED') return { error: 'Quiz already completed', completed: true };

  // Get quiz
  const { data: quiz } = await db
    .from('quizzes')
    .select('*')
    .eq('id', attempt.quiz_id)
    .single();

  if (!quiz) return { error: 'Quiz not found' };

  // Get current question
  const currentIndex = attempt.current_question_index;
  const { data: question } = await db
    .from('questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .eq('question_order', currentIndex + 1)
    .single();

  if (!question) {
    // All questions answered, finish attempt
    await finishAttempt(attemptId);
    return { error: 'Quiz completed', completed: true };
  }

  // Check if there's an existing answer record for this question
  const { data: existingAnswer } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('question_id', question.id)
    .single();

  const now = new Date();
  let msRemaining: number;

  if (existingAnswer) {
    // Check if question has timed out
    const questionStarted = new Date(existingAnswer.question_started_at);
    const elapsedMs = now.getTime() - questionStarted.getTime();
    const allowedMs = question.time_limit_seconds * 1000;

    if (elapsedMs >= allowedMs) {
      // Timeout this question
      if (!existingAnswer.answered_at && !existingAnswer.timed_out) {
        await db.from('answers').update({
          timed_out: true,
          is_correct: false,
          time_taken_ms: allowedMs,
          answered_at: new Date(questionStarted.getTime() + allowedMs).toISOString(),
        }).eq('id', existingAnswer.id);

        // Advance to next question
        const newIndex = currentIndex + 1;
        await db.from('attempts').update({
          current_question_index: newIndex,
          updated_at: now.toISOString(),
        }).eq('id', attemptId);

        // Recursively get next question
        return getCurrentQuestion(attemptId);
      }
    }

    msRemaining = Math.max(0, allowedMs - elapsedMs);
  } else {
    // Create answer record for question start
    await db.from('answers').insert({
      attempt_id: attemptId,
      question_id: question.id,
      question_started_at: now.toISOString(),
      timed_out: false,
    });
    msRemaining = question.time_limit_seconds * 1000;
  }

  // Get options
  const { data: options } = await db
    .from('options')
    .select('id, option_order, option_text')
    .eq('question_id', question.id)
    .order('option_order', { ascending: true });

  return {
    attemptId,
    question: {
      id: question.id,
      text: question.question_text,
      questionNumber: currentIndex + 1,
      totalQuestions: quiz.question_count,
      timeLimitSeconds: question.time_limit_seconds,
    },
    options: (options || []).map((o: { id: string; option_text: string; option_order: number }) => ({
      id: o.id,
      text: o.option_text,
      order: o.option_order,
    })),
    msRemaining,
    isLastQuestion: currentIndex + 1 === quiz.question_count,
  };
}

// ─── Submit Answer ──────────────────────────────────────────────

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  optionId: string
): Promise<{ nextQuestion: CurrentQuestionResponse | null; completed: boolean } | { error: string }> {
  const db = await createServiceClient();
  const now = new Date();

  // Validate attempt
  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) return { error: 'Attempt not found' };
  if (attempt.status === 'COMPLETED') return { error: 'Quiz already completed' };

  // Get the answer record
  const { data: answerRecord } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId)
    .single();

  if (!answerRecord) return { error: 'Question not started' };
  if (answerRecord.answered_at || answerRecord.timed_out) {
    // Idempotent: already answered, just return next question
    const next = await getCurrentQuestion(attemptId);
    if ('error' in next) return { nextQuestion: null, completed: true };
    return { nextQuestion: next, completed: false };
  }

  // Validate option belongs to question
  const { data: option } = await db
    .from('options')
    .select('*')
    .eq('id', optionId)
    .eq('question_id', questionId)
    .single();

  if (!option) return { error: 'Invalid option' };

  // Calculate server-side time
  const questionStarted = new Date(answerRecord.question_started_at);
  const elapsedMs = now.getTime() - questionStarted.getTime();

  // Get question for time limit
  const { data: question } = await db.from('questions').select('time_limit_seconds').eq('id', questionId).single();
  const allowedMs = (question?.time_limit_seconds || 20) * 1000;

  // Check if timed out
  const timedOut = elapsedMs > allowedMs + 2000; // 2s grace for network

  // Update answer
  await db.from('answers').update({
    selected_option_id: timedOut ? null : optionId,
    answered_at: now.toISOString(),
    time_taken_ms: Math.min(elapsedMs, allowedMs),
    is_correct: timedOut ? false : option.is_correct,
    timed_out: timedOut,
  }).eq('id', answerRecord.id);

  // Advance attempt
  const { data: quiz } = await db.from('quizzes').select('question_count').eq('id', attempt.quiz_id).single();
  const newIndex = attempt.current_question_index + 1;

  if (newIndex >= (quiz?.question_count || 0)) {
    // Last question — finish
    await db.from('attempts').update({
      current_question_index: newIndex,
      updated_at: now.toISOString(),
    }).eq('id', attemptId);
    await finishAttempt(attemptId);
    return { nextQuestion: null, completed: true };
  }

  // Advance to next
  await db.from('attempts').update({
    current_question_index: newIndex,
    updated_at: now.toISOString(),
  }).eq('id', attemptId);

  // Get next question
  const next = await getCurrentQuestion(attemptId);
  if ('error' in next) return { nextQuestion: null, completed: true };
  return { nextQuestion: next, completed: false };
}

// ─── Timeout Question ───────────────────────────────────────────

export async function timeoutQuestion(
  attemptId: string,
  questionId: string
): Promise<{ nextQuestion: CurrentQuestionResponse | null; completed: boolean } | { error: string }> {
  const db = await createServiceClient();
  const now = new Date();

  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) return { error: 'Attempt not found' };
  if (attempt.status === 'COMPLETED') return { error: 'Quiz already completed' };

  const { data: answerRecord } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId)
    .single();

  if (!answerRecord) return { error: 'Question not started' };
  if (answerRecord.answered_at || answerRecord.timed_out) {
    // Idempotent
    const next = await getCurrentQuestion(attemptId);
    if ('error' in next) return { nextQuestion: null, completed: true };
    return { nextQuestion: next, completed: false };
  }

  // Server-side validation of timeout
  const questionStarted = new Date(answerRecord.question_started_at);
  const { data: question } = await db.from('questions').select('time_limit_seconds').eq('id', questionId).single();
  const allowedMs = (question?.time_limit_seconds || 20) * 1000;
  const elapsedMs = now.getTime() - questionStarted.getTime();

  // Allow timeout if at least 80% of time has passed (network tolerance)
  if (elapsedMs < allowedMs * 0.8) {
    return { error: 'Question has not timed out yet' };
  }

  await db.from('answers').update({
    timed_out: true,
    is_correct: false,
    time_taken_ms: allowedMs,
    answered_at: now.toISOString(),
  }).eq('id', answerRecord.id);

  // Log integrity event
  await db.from('integrity_events').insert({
    attempt_id: attemptId,
    event_type: 'QUESTION_TIMEOUT',
    event_timestamp: now.toISOString(),
    metadata: { questionId },
  });

  // Advance
  const { data: quiz } = await db.from('quizzes').select('question_count').eq('id', attempt.quiz_id).single();
  const newIndex = attempt.current_question_index + 1;

  if (newIndex >= (quiz?.question_count || 0)) {
    await db.from('attempts').update({
      current_question_index: newIndex,
      updated_at: now.toISOString(),
    }).eq('id', attemptId);
    await finishAttempt(attemptId);
    return { nextQuestion: null, completed: true };
  }

  await db.from('attempts').update({
    current_question_index: newIndex,
    updated_at: now.toISOString(),
  }).eq('id', attemptId);

  const next = await getCurrentQuestion(attemptId);
  if ('error' in next) return { nextQuestion: null, completed: true };
  return { nextQuestion: next, completed: false };
}

// ─── Finish Attempt ─────────────────────────────────────────────

export async function finishAttempt(attemptId: string): Promise<CompletionResponse | { error: string }> {
  const db = await createServiceClient();
  const now = new Date();

  const { data: attempt } = await db.from('attempts').select('*').eq('id', attemptId).single();
  if (!attempt) return { error: 'Attempt not found' };

  if (attempt.status === 'COMPLETED') {
    // Already completed, return result
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

  // Calculate score
  const { data: answers } = await db
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId);

  const correctCount = answers?.filter((a: { is_correct: boolean }) => a.is_correct).length || 0;
  const totalTimeMs = answers?.reduce((sum: number, a: { time_taken_ms: number | null }) => sum + (a.time_taken_ms || 0), 0) || 0;

  const { data: quiz } = await db.from('quizzes').select('show_results, question_count').eq('id', attempt.quiz_id).single();
  const totalQuestions = quiz?.question_count || 0;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Update attempt
  await db.from('attempts').update({
    status: 'COMPLETED',
    completed_at: now.toISOString(),
    score: correctCount,
    percentage,
    total_time_ms: totalTimeMs,
    updated_at: now.toISOString(),
  }).eq('id', attemptId);

  // Log completion
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
