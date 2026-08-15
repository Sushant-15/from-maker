-- ═══════════════════════════════════════════════════════════════
-- QuizArena — Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Quizzes ────────────────────────────────────────────────────

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  public_slug TEXT UNIQUE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  show_results BOOLEAN NOT NULL DEFAULT TRUE,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_quizzes_slug ON quizzes(public_slug);
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX idx_quizzes_start_time ON quizzes(start_time);

-- ─── Questions ──────────────────────────────────────────────────

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_quiz ON questions(quiz_id, question_order);

-- ─── Options ────────────────────────────────────────────────────

CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_order INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_options_question ON options(question_id, option_order);

-- ─── Attempts ───────────────────────────────────────────────────

CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  participant_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  current_question_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_ms BIGINT,
  score INTEGER,
  percentage DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_quiz ON attempts(quiz_id, status);

-- ─── Answers ────────────────────────────────────────────────────

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  selected_option_id UUID REFERENCES options(id),
  question_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  time_taken_ms INTEGER,
  is_correct BOOLEAN,
  timed_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_answers_attempt ON answers(attempt_id);

-- ─── Integrity Events ──────────────────────────────────────────

CREATE TABLE integrity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_integrity_attempt ON integrity_events(attempt_id);

-- ─── User Roles ─────────────────────────────────────────────────

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin'
);

-- ─── RLS Policies ───────────────────────────────────────────────

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (via service role key in server actions)
-- These policies allow the service role to bypass RLS automatically.

-- Public read access to quizzes (for participant landing page)
CREATE POLICY "Public can view active quizzes"
  ON quizzes FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

-- Public read access to questions (no correct answers exposed here)
CREATE POLICY "Public can view questions"
  ON questions FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Public can view options (is_correct is hidden by server actions, not RLS)
CREATE POLICY "Public can view options"
  ON options FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- User roles: only the user themselves can view their role
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin full access policies
CREATE POLICY "Admin full access quizzes"
  ON quizzes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access questions"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access options"
  ON options FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access attempts"
  ON attempts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access answers"
  ON answers FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access integrity"
  ON integrity_events FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════
-- IMPORTANT: After creating a user via Supabase Auth, run:
--
--   INSERT INTO user_roles (user_id, role)
--   VALUES ('<your-user-uuid>', 'admin');
--
-- to give yourself admin access.
-- ═══════════════════════════════════════════════════════════════
