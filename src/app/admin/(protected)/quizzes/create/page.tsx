import QuizBuilder from '@/components/admin/QuizBuilder';

export default function CreateQuizPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Quiz</h1>
          <p className="page-subtitle">Build a new competitive quiz</p>
        </div>
      </div>
      <QuizBuilder mode="create" />
    </div>
  );
}
