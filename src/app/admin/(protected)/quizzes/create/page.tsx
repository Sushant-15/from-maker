import QuizBuilder from '@/components/admin/QuizBuilder';

export default function CreateQuizPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Quiz</h1>
          <p className="text-sm text-slate-500 mt-1">Build a new competitive quiz</p>
        </div>
      </div>
      <QuizBuilder mode="create" />
    </div>
  );
}
