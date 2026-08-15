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
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🔒</div>
        <h2>Quiz Locked</h2>
        <p className="text-muted mt-2 mb-6">
          This quiz has started and can no longer be modified.
        </p>
        <button className="btn btn-primary" onClick={() => quizId && router.push(`/admin/quizzes/${quizId}/results`)}>
          View Results
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <div style={{
          background: 'var(--danger-light)',
          color: 'var(--danger-foreground)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: 'var(--space-6)',
        }}>
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="card mb-6">
        <h3 className="section-title">Basic Information</h3>
        <div className="form-group">
          <label className="label" htmlFor="quiz-title">Title</label>
          <input
            id="quiz-title"
            className="input"
            placeholder="General Knowledge Sprint"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="quiz-description">Description</label>
          <textarea
            id="quiz-description"
            className="input"
            placeholder="Test your knowledge across science, history and technology."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="card mb-6">
        <h3 className="section-title">Schedule</h3>
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="label" htmlFor="start-time">Start Time</label>
            <input
              id="start-time"
              type="datetime-local"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="label" htmlFor="end-time">End Time</label>
            <input
              id="end-time"
              type="datetime-local"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="card mb-6">
        <h3 className="section-title">Settings</h3>
        <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showResults}
            onChange={(e) => setShowResults(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
          />
          <span className="font-medium">Show score to participants after completion</span>
        </label>
      </div>

      {/* Questions */}
      <div className="mb-6">
        <h3 className="section-title">Questions ({questions.length})</h3>
        <div className="flex flex-col gap-4">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="question-builder">
              <div className="question-builder-header" onClick={() => toggleCollapse(qIdx)}>
                <div className="flex items-center gap-3">
                  <span className="question-builder-number">Q{qIdx + 1}</span>
                  {q.isCollapsed && (
                    <span className="text-sm text-muted truncate" style={{ maxWidth: 300 }}>
                      {q.questionText || 'Untitled question'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{q.timeLimitSeconds}s</span>
                  <span style={{ fontSize: '12px' }}>{q.isCollapsed ? '▼' : '▲'}</span>
                </div>
              </div>

              {!q.isCollapsed && (
                <>
                  <div className="question-builder-body">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="label" htmlFor={`q-${qIdx}-text`}>Question</label>
                      <textarea
                        id={`q-${qIdx}-text`}
                        className="input"
                        placeholder="What is the SI unit of force?"
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div>
                      <span className="label">Options (select correct answer)</span>
                      <div className="flex flex-col gap-3">
                        {q.options.map((o, oIdx) => (
                          <div key={oIdx} className="option-row">
                            <span className="font-bold text-sm text-muted" style={{ minWidth: 20 }}>
                              {OPTION_LETTERS[oIdx]}
                            </span>
                            <input
                              className="input"
                              placeholder={`Option ${OPTION_LETTERS[oIdx]}`}
                              value={o.optionText}
                              onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                            />
                            <input
                              type="radio"
                              className="correct-radio"
                              name={`correct-${qIdx}`}
                              checked={o.isCorrect}
                              onChange={() => setCorrectOption(qIdx, oIdx)}
                              title="Mark as correct"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="label" htmlFor={`q-${qIdx}-time`}>
                        Time limit: {q.timeLimitSeconds} seconds
                      </label>
                      <input
                        id={`q-${qIdx}-time`}
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={q.timeLimitSeconds}
                        onChange={(e) => updateQuestion(qIdx, { timeLimitSeconds: parseInt(e.target.value) })}
                        style={{ width: '100%', accentColor: 'var(--primary)' }}
                      />
                      <div className="flex justify-between text-xs text-muted">
                        <span>5s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  </div>

                  <div className="question-builder-footer">
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => moveQuestion(qIdx, -1)}
                        disabled={qIdx === 0}
                      >
                        ↑
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => moveQuestion(qIdx, 1)}
                        disabled={qIdx === questions.length - 1}
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteQuestion(qIdx)}
                      disabled={questions.length <= 1}
                      style={{ color: 'var(--danger)' }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-secondary w-full mt-4" onClick={addQuestion}>
          + Add Question
        </button>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-4">
        <button className="btn btn-secondary" onClick={() => router.push('/admin/quizzes')}>
          Cancel
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : mode === 'edit' ? 'Update Quiz' : 'Save Quiz'}
        </button>
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="modal-overlay" onClick={() => { setShareModal(null); router.push('/admin/quizzes'); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎉 Quiz Published!</h3>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm mb-4">Your quiz is ready to share.</p>
              <div className="share-link-box">
                <span className="share-link-url">
                  {window.location.origin}/quiz/{shareModal.slug}
                </span>
                <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShareModal(null); router.push('/admin/quizzes'); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
