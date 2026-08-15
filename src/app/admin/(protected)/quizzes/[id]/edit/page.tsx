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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Quiz</h1>
          <p className="page-subtitle">{quiz.title}</p>
        </div>
      </div>
      <QuizBuilder mode="edit" quizId={id} initialData={initialData} isLocked={isLocked} />
    </div>
  );
}
