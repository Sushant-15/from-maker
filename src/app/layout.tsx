import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizArena — Competitive Quiz Platform",
  description: "Create, schedule, and share competitive timed quizzes. Kahoot-style engagement with zero friction for participants.",
  keywords: ["quiz", "competition", "timed quiz", "education", "assessment"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
