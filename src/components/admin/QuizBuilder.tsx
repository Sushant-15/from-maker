'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createQuiz, updateQuiz } from '@/app/actions/quiz';
import type { QuizFormQuestion, QuizFormData } from '@/types';
import { toLocalDatetimeString } from '@/lib/utils';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function createEmptyQuestion(): QuizFormQuestion {
  return {
    questionText: '',
    timeLimitSeconds: 20,
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
    isCollapsed: false,
  };
}

interface QuizBuilderProps {
  mode: 'create' | 'edit';
  quizId?: string;
  initialData?: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    showResults: boolean;
    questions: QuizFormQuestion[];
  };
  isLocked?: boolean;
}

export default function QuizBuilder({ mode, quizId, initialData, isLocked }: QuizBuilderProps) {
  const router = useRouter();

  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 2);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startTime, setStartTime] = useState(
    initialData?.startTime ? toLocalDatetimeString(new Date(initialData.startTime)) : toLocalDatetimeString(defaultStart)
  );
  const [endTime, setEndTime] = useState(
    initialData?.endTime ? toLocalDatetimeString(new Date(initialData.endTime)) : toLocalDatetimeString(defaultEnd)
  );
  const [showResults, setShowResults] = useState(initialData?.showResults ?? true);
  const [questions, setQuestions] = useState<QuizFormQuestion[]>(
    initialData?.questions?.length ? initialData.questions : [createEmptyQuestion()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shareModal, setShareModal] = useState<{ slug: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const updateQuestion = (idx: number, update: Partial<QuizFormQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...update } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, qi) => {
      if (qi !== qIdx) return q;
      return {
        ...q,
        options: q.options.map((o, oi) => oi === oIdx ? { ...o, optionText: text } : o),
      };
    }));
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, qi) => {
      if (qi !== qIdx) return q;
      return {
        ...q,
        options: q.options.map((o, oi) => ({ ...o, isCorrect: oi === oIdx })),
      };
    }));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, createEmptyQuestion()]);
  };

  const deleteQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const toggleCollapse = (idx: number) => {
    updateQuestion(idx, { isCollapsed: !questions[idx].isCollapsed });
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!startTime || !endTime) return 'Schedule is required';
    if (new Date(startTime) >= new Date(endTime)) return 'End time must be after start time';
    if (questions.length === 0) return 'At least one question is required';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return `Question ${i + 1}: text is required`;
      if (!q.options.some(o => o.isCorrect)) return `Question ${i + 1}: mark a correct answer`;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].optionText.trim()) return `Question ${i + 1}, Option ${OPTION_LETTERS[j]}: text is required`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    const formData: QuizFormData = {
      title: title.trim(),
      description: description.trim(),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      showResults,
      questions: questions.map(q => ({
        questionText: q.questionText.trim(),
        timeLimitSeconds: q.timeLimitSeconds,
        options: q.options.map(o => ({
          optionText: o.optionText.trim(),
          isCorrect: o.isCorrect,
        })),
      })),
    };

    try {
      if (mode === 'edit' && quizId) {
        await updateQuiz(quizId, formData);
        router.push('/admin/quizzes');
      } else {
        const result = await createQuiz(formData);
        setShareModal({ slug: result.slug });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    }

    setSaving(false);
  };

  const handleCopyLink = () => {
    if (!shareModal) return;
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${shareModal.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLocked) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto mt-8">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-slate-900">Quiz Locked</h2>
        <p className="text-slate-500 mt-2 mb-6">
          This quiz has started and can no longer be modified.
        </p>
        <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold rounded-xl transition-all shadow-sm" onClick={() => quizId && router.push(`/admin/quizzes/${quizId}/results`)}>
          View Results
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl pb-12">
      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium mb-6 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm">📝</span>
          Basic Information
        </h3>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="quiz-title">Title</label>
          <input
            id="quiz-title"
            className="w-full px-4 py-2.5 text-slate-900 bg-white border border-slate-200 rounded-xl transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none placeholder:text-slate-400"
            placeholder="General Knowledge Sprint"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="quiz-description">Description</label>
          <textarea
            id="quiz-description"
            className="w-full px-4 py-2.5 text-slate-900 bg-white border border-slate-200 rounded-xl transition-all focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none placeholder:text-slate-400 resize-y"
            placeholder="Test your knowledge across science, history and technology."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">⏱️</span>
          Schedule
        </h3>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="start-time">Start Time</label>
            <input
              id="start-time"
              type="datetime-local"
              className="w-full px-4 py-2.5 text-slate-900 bg-white border border-slate-200 rounded-xl transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor="end-time">End Time</label>
            <input
              id="end-time"
              type="datetime-local"
              className="w-full px-4 py-2.5 text-slate-900 bg-white border border-slate-200 rounded-xl transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">⚙️</span>
          Settings
        </h3>
        <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={showResults}
            onChange={(e) => setShowResults(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-600"
          />
          <span className="font-semibold text-slate-700">Show score to participants after completion</span>
        </label>
      </div>

      {/* Questions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-sm">❓</span>
            Questions <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{questions.length}</span>
          </h3>
        </div>
        
        <div className="flex flex-col gap-4">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleCollapse(qIdx)}>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-fuchsia-100 text-fuchsia-700 text-xs font-bold">Q{qIdx + 1}</span>
                  {q.isCollapsed && (
                    <span className="text-sm font-medium text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                      {q.questionText || 'Untitled question'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">{q.timeLimitSeconds}s</span>
                  <span className="text-slate-400">{q.isCollapsed ? '▼' : '▲'}</span>
                </div>
              </div>

              {!q.isCollapsed && (
                <>
                  <div className="p-5 md:p-6 flex flex-col gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2" htmlFor={`q-${qIdx}-text`}>Question Text</label>
                      <textarea
                        id={`q-${qIdx}-text`}
                        className="w-full px-4 py-3 text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl transition-all focus:border-fuchsia-500 focus:bg-white focus:ring-4 focus:ring-fuchsia-500/10 outline-none placeholder:text-slate-400 resize-y"
                        placeholder="What is the SI unit of force?"
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div>
                      <span className="block text-sm font-semibold text-slate-900 mb-3">Options <span className="text-xs font-normal text-slate-500">(select correct answer)</span></span>
                      <div className="flex flex-col gap-3">
                        {q.options.map((o, oIdx) => (
                          <div key={oIdx} className={`flex items-center gap-3 p-2 pr-4 rounded-xl border ${o.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${o.isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                              {OPTION_LETTERS[oIdx]}
                            </div>
                            <input
                              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0"
                              placeholder={`Option ${OPTION_LETTERS[oIdx]}`}
                              value={o.optionText}
                              onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                            />
                            <input
                              type="radio"
                              className="w-5 h-5 text-emerald-500 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              name={`correct-${qIdx}`}
                              checked={o.isCorrect}
                              onChange={() => setCorrectOption(qIdx, oIdx)}
                              title="Mark as correct"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-sm font-semibold text-slate-900 mb-3" htmlFor={`q-${qIdx}-time`}>
                        <span>Time limit</span>
                        <span className="text-fuchsia-600 bg-fuchsia-50 px-2 py-1 rounded-md">{q.timeLimitSeconds} seconds</span>
                      </label>
                      <input
                        id={`q-${qIdx}-time`}
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={q.timeLimitSeconds}
                        onChange={(e) => updateQuestion(qIdx, { timeLimitSeconds: parseInt(e.target.value) })}
                        className="w-full accent-fuchsia-600"
                      />
                      <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
                        <span>5s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors"
                        onClick={() => moveQuestion(qIdx, -1)}
                        disabled={qIdx === 0}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors"
                        onClick={() => moveQuestion(qIdx, 1)}
                        disabled={qIdx === questions.length - 1}
                        title="Move Down"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      onClick={() => deleteQuestion(qIdx)}
                      disabled={questions.length <= 1}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button className="w-full mt-4 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-semibold hover:border-fuchsia-500 hover:text-fuchsia-600 hover:bg-fuchsia-50/50 transition-all focus:outline-none focus:ring-4 focus:ring-fuchsia-500/10" onClick={addQuestion}>
          + Add Another Question
        </button>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-slate-200">
        <button className="inline-flex items-center justify-center px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2" onClick={() => router.push('/admin/quizzes')}>
          Cancel
        </button>
        <button className="inline-flex items-center justify-center px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 disabled:opacity-50" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : mode === 'edit' ? 'Update Quiz' : 'Save & Publish'}
        </button>
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setShareModal(null); router.push('/admin/quizzes'); }}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 bg-fuchsia-50/50">
              <h3 className="text-xl font-bold text-fuchsia-900 flex items-center gap-2">🎉 Quiz Published!</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4 font-medium">Your quiz is ready to share.</p>
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="flex-1 px-3 text-sm text-slate-600 truncate font-mono">
                  {window.location.origin}/quiz/{shareModal.slug}
                </span>
                <button className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-all" onClick={handleCopyLink}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button className="inline-flex items-center justify-center px-6 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl transition-all shadow-sm" onClick={() => { setShareModal(null); router.push('/admin/quizzes'); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
