'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getQuizPublicState, startAttempt, getQuizData } from '@/app/actions/participant';
import { formatCountdown, getQuizState } from '@/lib/utils';
import type { PublicQuizInfo } from '@/types';

export default function QuizLandingClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<PublicQuizInfo | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });

  const loadQuiz = useCallback(async () => {
    const data = await getQuizPublicState(slug);
    setQuiz(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Check localStorage for existing attempt
  useEffect(() => {
    if (!quiz) return;
    const stored = localStorage.getItem(`quiz_attempt_${slug}`);
    if (stored) {
      try {
        const { attemptId } = JSON.parse(stored);
        // Validate with server
        getQuizData(attemptId).then(result => {
          if (!('error' in result)) {
            // Resume: store question data and redirect
            localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(result));
            router.push(`/quiz/${slug}/attempt`);
          } else if (result.completed) {
            router.push(`/quiz/${slug}/complete`);
          } else {
            localStorage.removeItem(`quiz_attempt_${slug}`);
          }
        });
      } catch {
        localStorage.removeItem(`quiz_attempt_${slug}`);
      }
    }
  }, [quiz, slug, router]);

  // Countdown timer for upcoming state
  useEffect(() => {
    if (!quiz || quiz.state !== 'UPCOMING') return;
    const interval = setInterval(() => {
      const msLeft = new Date(quiz.start_time).getTime() - Date.now();
      if (msLeft <= 0) {
        loadQuiz(); // Refresh state
        return;
      }
      setCountdown(formatCountdown(msLeft));
    }, 1000);
    return () => clearInterval(interval);
  }, [quiz, loadQuiz]);

  const handleStart = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setStarting(true);
    setError('');

    const result = await startAttempt(slug, name.trim());
    if ('error' in result) {
      setError(result.error);
      setStarting(false);
      return;
    }

    // Store attempt in localStorage for resume
    localStorage.setItem(`quiz_attempt_${slug}`, JSON.stringify({
      attemptId: result.attemptId,
      quizSlug: slug,
    }));
    localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(result.quizData));

    router.push(`/quiz/${slug}/attempt`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <div className="animate-pulse bg-slate-200 w-12 h-12 rounded-full mx-auto mb-3" />
              <div className="animate-pulse bg-slate-200 h-8 w-[60%] mx-auto mb-2 rounded" />
              <div className="animate-pulse bg-slate-200 h-4 w-[80%] mx-auto mb-6 rounded" />
            </div>

            <div className="flex justify-center gap-4 mb-6">
              <div className="animate-pulse bg-slate-200 flex-1 h-16 rounded-xl" />
              <div className="animate-pulse bg-slate-200 flex-1 h-16 rounded-xl" />
            </div>

            <div className="mb-5">
              <div className="animate-pulse bg-slate-200 w-20 h-4 mb-2 rounded" />
              <div className="animate-pulse bg-slate-200 w-full h-12 rounded-xl" />
            </div>

            <div className="animate-pulse bg-slate-200 w-full h-12 rounded-xl mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-slate-900">Quiz Not Found</h2>
            <p className="text-slate-500 mt-2">This quiz doesn&apos;t exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── UPCOMING ───
  if (quiz.state === 'UPCOMING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">🧠</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-slate-500 text-sm mb-6">{quiz.description}</p>
            )}

            <p className="text-sm text-slate-500 font-medium mb-4">Quiz starts in</p>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{countdown.hours}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hours</span>
              </div>
              <span className="text-2xl font-bold text-slate-300 pb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{countdown.minutes}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Min</span>
              </div>
              <span className="text-2xl font-bold text-slate-300 pb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{countdown.seconds}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sec</span>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-6 w-full" />
            <div className="flex justify-center gap-6 text-sm text-slate-500">
              <span>{quiz.question_count} Questions</span>
              <span>Timed Quiz</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ENDED ───
  if (quiz.state === 'ENDED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
        <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-slate-900">Quiz Has Ended</h2>
            <p className="text-slate-500 mt-2">This quiz is no longer accepting participants.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE ───
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
      <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
        <div className="p-8">
          <div className="text-center">
            <div className="text-4xl mb-3">🧠</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-slate-500 text-sm mb-6">{quiz.description}</p>
            )}
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
              <div className="font-bold text-lg text-slate-900">{quiz.question_count}</div>
              <div className="text-xs text-slate-500">Questions</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
              <div className="font-bold text-lg text-slate-900">⏱</div>
              <div className="text-xs text-slate-500">Timed</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="participant-name">Your name</label>
            <input
              id="participant-name"
              className="w-full px-4 py-3 font-sans text-base text-slate-900 bg-white border border-slate-200 rounded-xl transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none placeholder:text-slate-400"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              autoFocus
              autoComplete="name"
            />
          </div>

          <button
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold rounded-2xl w-full transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? 'Starting...' : 'Start Quiz →'}
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            By continuing, your answers and timing will be recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
