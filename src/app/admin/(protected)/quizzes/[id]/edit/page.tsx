import { getQuizForEdit } from '@/app/actions/quiz';
import QuizBuilder from '@/components/admin/QuizBuilder';

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { quiz, questions } = await getQuizForEdit(id);

  const isLocked = new Date(quiz.start_time) <= new Date();

  const initialData = {
    title: quiz.title,
    description: quiz.description || '',
    startTime: quiz.start_time,
    endTime: quiz.end_time,
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Quiz</h1>
          <p className="text-sm text-slate-500 mt-1">{quiz.title}</p>
        </div>
      </div>
      <QuizBuilder mode="edit" quizId={id} initialData={initialData} isLocked={isLocked} />
    </div>
  );
}
