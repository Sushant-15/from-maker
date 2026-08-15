'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { submitAnswer, timeoutQuestion, logIntegrityEvent } from '@/app/actions/participant';
import { getTimerState } from '@/lib/utils';
import type { AllQuestionsResponse } from '@/types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function AttemptPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [quizData, setQuizData] = useState<AllQuestionsResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [msRemaining, setMsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Load quiz data from localStorage (set by landing page)
  useEffect(() => {
    const stored = localStorage.getItem(`quiz_current_${slug}`);

    if (stored) {
      try {
        const data: AllQuestionsResponse = JSON.parse(stored);
        setQuizData(data);
        setCurrentIndex(data.currentIndex);
        
        if (data.questions[data.currentIndex]) {
          setMsRemaining(data.questions[data.currentIndex].question.timeLimitSeconds * 1000);
          questionStartTimeRef.current = Date.now();
        }
        setLoading(false);
      } catch {
        router.push(`/quiz/${slug}`);
      }
    } else {
      router.push(`/quiz/${slug}`);
    }
  }, [slug, router]);

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibility = () => {
      if (!quizData?.attemptId) return;
      if (document.hidden) {
        logIntegrityEvent(quizData.attemptId, 'TAB_HIDDEN');
      } else {
        logIntegrityEvent(quizData.attemptId, 'TAB_VISIBLE');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [quizData?.attemptId]);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const advanceQuestion = useCallback((nextIndex: number) => {
    if (!quizData) return;
    
    if (nextIndex >= quizData.questions.length) {
      localStorage.removeItem(`quiz_current_${slug}`);
      router.push(`/quiz/${slug}/complete`);
      return;
    }

    const nextData = { ...quizData, currentIndex: nextIndex };
    setQuizData(nextData);
    setCurrentIndex(nextIndex);
    setSelectedOption(null);
    setMsRemaining(quizData.questions[nextIndex].question.timeLimitSeconds * 1000);
    setAnimKey(prev => prev + 1);
    questionStartTimeRef.current = Date.now();
    
    localStorage.setItem(`quiz_current_${slug}`, JSON.stringify(nextData));
  }, [quizData, slug, router]);

  const handleTimeout = useCallback(() => {
    if (!quizData) return;
    
    const currentQ = quizData.questions[currentIndex];
    if (!currentQ) return;

    // Fire in background
    timeoutQuestion(quizData.attemptId, currentQ.question.id).catch(console.error);

    advanceQuestion(currentIndex + 1);
  }, [quizData, currentIndex, advanceQuestion]);

  // Timer countdown
  useEffect(() => {
    if (!quizData) return;

    timerRef.current = setInterval(() => {
      setMsRemaining(prev => {
        const next = prev - 100;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizData, currentIndex, handleTimeout]);

  const handleSelectOption = (optionId: string) => {
    if (!quizData) return;
    const currentQ = quizData.questions[currentIndex];
    if (!currentQ) return;

    // Calculate time taken
    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    setSelectedOption(optionId);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Fire in background
    submitAnswer(
      quizData.attemptId,
      currentQ.question.id,
      optionId,
      timeTakenMs
    ).catch(console.error);

    // Advance instantly (0ms delay)
    advanceQuestion(currentIndex + 1);
  };

  if (loading || !quizData || !quizData.questions[currentIndex]) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
        <div className="w-full max-w-[520px] bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-pulse bg-slate-200 h-8 w-1/2 mx-auto mb-4 rounded" />
            <div className="animate-pulse bg-slate-200 h-40 w-full mx-auto rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quizData.questions[currentIndex];
  const { question, options } = currentQ;
  
  const timerState = getTimerState(msRemaining);
  const progress = (question.questionNumber / question.totalQuestions) * 100;
  const secondsLeft = Math.ceil(msRemaining / 1000);

  // Derive timer colors
  const timerColorClass = timerState === 'normal' ? 'text-slate-900' : timerState === 'warning' ? 'text-amber-500 animate-pulse' : 'text-red-500 animate-pulse';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50">
      <div className="w-full max-w-[520px] bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-500">
              Quiz
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-900">
              Question {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-xs text-slate-500 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-fuchsia-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Timer */}
        <div className="px-6 py-4 text-center bg-white border-b border-slate-50">
          <div className={`text-4xl md:text-5xl font-black tabular-nums tracking-tight transition-colors ${timerColorClass}`}>
            {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Question */}
        <div className="p-5 md:p-6" key={animKey}>
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-50 rounded-2xl p-5 md:p-6 mb-6">
              <p className="text-lg font-semibold text-slate-900 leading-relaxed">
                {question.text}
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option.id;
                return (
                  <button
                    key={option.id}
                    className={`w-full p-4 md:p-5 border-2 rounded-2xl cursor-pointer flex items-center gap-4 text-left font-medium transition-all hover:-translate-y-px hover:shadow-sm ${
                      isSelected
                        ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-900 ring-4 ring-fuchsia-500/10'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-fuchsia-500 hover:bg-fuchsia-50'
                    }`}
                    onClick={() => handleSelectOption(option.id)}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span>{option.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
