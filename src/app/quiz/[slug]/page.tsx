import QuizLanding from '@/components/quiz/QuizLanding';

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QuizLanding slug={slug} />;
}
