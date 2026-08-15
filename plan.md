Yes. The raw idea is already strong, but it currently reads more like a **feature specification** than a product plan. I would turn QuizArena into a polished **Kahoot-style competitive quiz platform**, while keeping the architecture serious enough that timing, cheating resistance, resume, and result integrity actually work.

Your source already establishes the core priorities: quiz creation, scheduling, public no-account participation, per-question timing, server-authoritative timing, detailed results, mobile-first UX, and CSV export. 

# QuizArena — Senior-Level Product & Engineering Plan

## 1. Product Vision

**QuizArena** should feel like:

> **Kahoot's engagement + Google Forms' simplicity + a lightweight quiz analytics dashboard.**

But there is an important product decision:

### Participant side

**Zero-friction.**

Open link → enter name → start → answer → finish.

No:

* signup
* email
* password
* participant dashboard
* leaderboard
* unnecessary navigation

### Admin side

**Powerful control center.**

Admin can:

```text
Create
   ↓
Configure
   ↓
Preview
   ↓
Schedule
   ↓
Share
   ↓
Participants compete
   ↓
Results
   ↓
Analytics
   ↓
Export
```

The participant should feel like they are entering a **competition**, not filling out a boring form.

---

# 2. Product Structure

I would divide the entire application into 3 systems.

```text
                    QUIZARENA
                        │
          ┌─────────────┼─────────────┐
          │             │             │
      PARTICIPANT     ADMIN        PLATFORM
          │             │             │
      Quiz UI       Dashboard      Database
      Timing        Quiz Builder   Auth
      Resume        Results        Server Functions
      Answers       Analytics      Integrity
      Completion    Export         Scheduling
```

---

# 3. Participant Experience

This is the most important part of the product.

Your source explicitly says the participant interface should be mobile-first, touch-friendly, fast, and distraction-free. 

I would make the participant experience feel **premium rather than simply functional**.

## Screen 1 — Upcoming

```text
┌──────────────────────────────┐
│                              │
│         QUIZARENA            │
│                              │
│     🧠 General Knowledge     │
│                              │
│   Quiz starts in             │
│                              │
│        01 : 24 : 35          │
│                              │
│   Saturday, 6:00 PM          │
│                              │
│   ─────────────────────      │
│   20 Questions               │
│   Timed Quiz                 │
│                              │
└──────────────────────────────┘
```

The countdown is only a **visual countdown**.

Server decides whether the quiz is actually upcoming.

---

# 4. Active Landing Page

This should be extremely polished.

```text
┌──────────────────────────────┐
│        QUIZARENA             │
│                              │
│  🧠 GENERAL KNOWLEDGE        │
│                              │
│  Test your knowledge         │
│  across science, history     │
│  and technology.             │
│                              │
│  ┌────────┐ ┌─────────────┐  │
│  │  20    │ │  TIMED      │  │
│  │QUESTIONS│ │ QUESTIONS   │  │
│  └────────┘ └─────────────┘  │
│                              │
│  Your name                   │
│  ┌────────────────────────┐  │
│  │ Enter your name        │  │
│  └────────────────────────┘  │
│                              │
│       [ START QUIZ → ]      │
│                              │
│  By continuing you agree... │
└──────────────────────────────┘
```

### Important

The username is collected **before the attempt is created** or as part of `startAttempt`.

Your latest requirement specifically says the username should be taken before entering the quiz, and the source confirms that the entered name is stored with the attempt. 

---

# 5. Question Experience

This is where QuizArena should look premium.

Instead of a generic form, use a **competition interface**.

```text
┌──────────────────────────────┐
│ General Knowledge      ⋮     │
│                              │
│ Question 4 / 20              │
│ ████████████░░░░░░░░  20%    │
│                              │
│             00:12            │
│                              │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │ What is the SI unit of   │ │
│ │ force?                   │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ A    Joule               │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ B    Newton              │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ C    Pascal              │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ D    Watt                │ │
│ └──────────────────────────┘ │
│                              │
│          [ NEXT → ]          │
└──────────────────────────────┘
```

---

# 6. Make the Timer Feel Like a Competition

Don't simply display:

`00:12`

Use visual states.

### Normal

```text
        00:12
```

### Warning

```text
        00:05
```

### Critical

```text
        00:02
```

The **client animation changes**, but the server remains authoritative.

The source correctly emphasizes that client-side `setInterval()` must not be the source of truth.  

---

# 7. Answer Interaction

I recommend this interaction:

### Tap answer

```text
A  Joule
B  Newton  ← selected
C  Pascal
D  Watt
```

Then:

```text
        [ CONFIRM → ]
```

But there's an important UX decision.

Your original specification says **single-tap-guarded Next**, while also saying an answer is selected and then Next is pressed.

I recommend:

### One tap selects.

### Second tap confirms.

This gives users a chance to correct an accidental touch **before advancing**, without violating the "no answer changes after advancing" rule.

Once confirmed:

```text
Question submitted
        ↓
Server validates
        ↓
Answer locked
        ↓
Next question
```

No back button.

---

# 8. Timeout Flow

Suppose:

```text
Question 5
20 seconds
```

Timer reaches:

```text
00:00
```

Client immediately requests/initiates timeout.

Server checks:

```text
server_now - question_started_at
```

If it exceeds the allowed time:

```text
answer = NULL
timed_out = true
time_taken = question_limit
```

Then:

```text
Question 6
```

The database records the timeout.

This matches the original requirement that timed-out questions become unanswered and automatically advance. 

---

# 9. The Most Important Architecture Decision: Resume

This is one of the strongest features in your idea.

Don't implement:

> "Save question number in localStorage and trust it."

Instead:

### localStorage

Stores only:

```json
{
  "attemptId": "uuid",
  "quizSlug": "general-knowledge",
  "lastKnownQuestion": 4
}
```

This is merely a **recovery pointer**.

### Server stores

```text
attempt
 ├── current_question
 ├── status
 ├── started_at
 ├── current_question_started_at
 └── completed_at

answers
 ├── question_id
 ├── selected_option
 ├── answered_at
 ├── time_taken
 └── timed_out
```

When the user reopens the site:

```text
localStorage
     ↓
attemptId
     ↓
Server
     ↓
Validate attempt
     ↓
Find current question
     ↓
Calculate elapsed time
     ↓
If expired → timeout it
     ↓
Return authoritative state
```

So:

> **LocalStorage remembers the attempt. Server remembers the quiz.**

This is much safer.

---

# 10. Resume Example

Suppose:

```text
Question 4
Allowed: 20 sec

Started: 17:20:00
```

Participant closes browser at:

```text
17:20:12
```

Reopens at:

```text
17:20:17
```

Server calculates:

```text
17 sec elapsed
20 - 17 = 3 sec remaining
```

Client receives:

```json
{
  "question": 4,
  "msRemaining": 3000
}
```

If they reopen at:

```text
17:20:25
```

the question has expired.

Server automatically records:

```text
timed_out = true
time_taken = 20
```

and moves them to Question 5.

That is the correct architecture.

---

# 11. Quiz End-Time Semantics

There's a subtle issue in the original specification.

It says:

> If a participant starts before the end time, allow them to finish.

I would explicitly define this as:

### `end_time` = closing time for **new attempts**

Not necessarily the forced termination time of existing attempts.

Therefore:

```text
18:00 ─────────────────── 20:00 ────────────────
        quiz active          new attempts blocked
             │
        Participant A starts
             │
             └──────────── can finish
```

This avoids destroying a participant's attempt halfway through.

However, an admin should eventually be able to choose:

```text
End behavior:

○ Stop accepting new participants
● Hard stop all attempts at end time
```

For V1, use:

> **Stop new attempts at end time; existing attempts can finish.**

---

# 12. Public State Machine

The server should have one canonical function:

```text
getQuizPublicState(slug)
```

Returns:

```typescript
type QuizState =
  | "UPCOMING"
  | "ACTIVE"
  | "ENDED";
```

Logic:

```text
if now < start_time
    UPCOMING

else if now >= start_time
     && now <= end_time
    ACTIVE

else
    ENDED
```

This logic should never be duplicated across frontend components.

---

# 13. Admin Product

The admin side should feel more like a **SaaS analytics dashboard**.

Layout:

```text
┌────────────┬─────────────────────────────────────┐
│            │                                     │
│ QuizArena  │ Dashboard                           │
│            │                                     │
│ Dashboard  │ ┌──────┐ ┌──────┐ ┌──────┐        │
│ Quizzes    │ │ 12   │ │  3   │ │  27  │        │
│ Results    │ │Total │ │Live  │ │Users │        │
│ Analytics  │ └──────┘ └──────┘ └──────┘        │
│            │                                     │
│ Settings   │ Recent Quizzes                     │
│            │ ───────────────────────────────     │
│            │ General Knowledge   LIVE   Results │
│            │ Physics Challenge   UPCOMING       │
│            │ DBMS Sprint         ENDED          │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

Desktop:

### Sidebar

```text
QuizArena

Dashboard
Quizzes
Results
Analytics

────────────

Settings
Logout
```

Mobile admin can use:

```text
top bar + drawer
```

---

# 14. Admin Dashboard

Primary KPI cards:

```text
Total Quizzes
Active Quizzes
Upcoming Quizzes
Completed Quizzes
Total Participants
```

Your original specification already defines these dashboard metrics. 

Then:

### Recent quizzes

| Quiz              | Status   | Start     | Participants | Actions |
| ----------------- | -------- | --------- | -----------: | ------- |
| General Knowledge | Active   | 6:00 PM   |           42 | Results |
| DBMS Sprint       | Upcoming | Tomorrow  |            — | Edit    |
| Python Basics     | Ended    | Yesterday |           86 | Results |

Actions:

```text
Edit
Preview
Results
Copy Link
Duplicate
Delete
```

---

# 15. Quiz Builder — Make This a Major Feature

Don't make the create page a giant boring form.

Use a builder.

```text
CREATE QUIZ

Basic Information
────────────────────────────────

Title
[ General Knowledge Sprint ]

Description
[ Test your knowledge... ]

Schedule
────────────────────────────────

Start
[ 15 Aug 2026 ] [ 18:00 ]

End
[ 15 Aug 2026 ] [ 20:00 ]

Results
────────────────────────────────

☑ Show score after completion

Questions
────────────────────────────────

┌───────────────────────────────────┐
│ Q1                            ⋮⋮  │
│                                   │
│ What is the capital of France?    │
│                                   │
│ A Paris         ● Correct         │
│ B London                           │
│ C Berlin                           │
│ D Rome                             │
│                                   │
│ Time limit: [ 15 sec ]            │
│                                   │
│ ↑ Move up    ↓ Move down    🗑    │
└───────────────────────────────────┘

[ + Add Question ]

                    [ SAVE QUIZ ]
```

---

# 16. Question Builder Enhancements

For premium UX:

### Question number

```text
01
```

### Drag handle

```text
⋮⋮
```

### Duplicate

```text
Duplicate Question
```

### Delete

```text
Delete
```

### Collapse

```text
Q1  What is...?          ↑
```

This becomes especially useful for 20–50 question quizzes.

---

# 17. Quiz Preview

Preview should literally reuse the participant components.

Architecture:

```text
ParticipantQuiz
      │
      ├── Real Mode
      │      ↓
      │   Server attempt
      │
      └── Preview Mode
             ↓
         Local/mock state
```

Don't build two separate UIs.

The admin should see:

> **PREVIEW MODE**

at the top.

No real attempt is created.

Your specification explicitly requires preview to behave like the real quiz without creating a participant result. 

---

# 18. Editing Lock

This should be enforced in **both UI and backend**.

Before start:

```text
EDIT
```

After start:

```text
🔒 Quiz Locked

This quiz has started and can no longer be modified.

[ DUPLICATE QUIZ ]
```

Do not rely only on disabling frontend controls.

Backend must reject:

```text
UPDATE quiz
UPDATE questions
UPDATE options
```

once the quiz has started.

The source explicitly requires this to protect result consistency. 

---

# 19. Results — Admin Only

This is important:

## Participants NEVER see leaderboard.

The original requirements explicitly distinguish participant completion from admin results, and your latest requirement makes leaderboard admin-only. 

After submission participants see only:

```text
🎉 Quiz Completed!

Thank you, Sajal.

Your submission has been recorded.

Score
18 / 20

Accuracy
90%

Time
04:32
```

**only if admin enabled result visibility.**

Otherwise:

```text
🎉 Quiz Completed!

Your response has been successfully submitted.

Thank you for participating.
```

---

# 20. Admin Leaderboard

Admin gets:

```text
GENERAL KNOWLEDGE SPRINT

86 Participants

┌────┬────────────┬───────┬──────────┬─────────┐
│ #  │ Participant│ Score │ Accuracy │ Time    │
├────┼────────────┼───────┼──────────┼─────────┤
│ 1  │ Rahul      │ 19/20 │ 95%      │ 02:31   │
│ 2  │ Aditi      │ 19/20 │ 95%      │ 02:48   │
│ 3  │ Sajal      │ 18/20 │ 90%      │ 02:14   │
│ 4  │ Arjun      │ 18/20 │ 90%      │ 03:02   │
└────┴────────────┴───────┴──────────┴─────────┘
```

Default ranking:

```text
1. Score DESC
2. Total Time ASC
```

Exactly as specified in the source. 

But give admin:

```text
Sort by:

● Score
○ Time
○ Accuracy
○ Submission time
○ Name
```

---

# 21. Participant Detail

Click Rahul:

```text
Rahul

19 / 20
95% Accuracy
02:31 Total Time

Started       6:14:03 PM
Completed     6:16:34 PM
```

Then:

```text
QUESTION 01

What is the SI unit of force?

Selected:
B — Newton

Correct:
B — Newton

✓ Correct

Time
7.8 sec
```

Next:

```text
QUESTION 02

Selected:
C — Pascal

Correct:
A — Newton

✕

12.4 sec
```

Timed out:

```text
QUESTION 03

No answer

⏱ TIMED OUT

20.0 sec
```

This is one of the strongest admin features because it transforms the app from a simple quiz form into an **assessment platform**.

---

# 22. Integrity Timeline

Add a small section:

```text
Integrity Events

12:14:03   Quiz started
12:14:42   Answer submitted
12:15:07   Tab switched
12:15:12   Tab returned
12:16:21   Page reloaded
12:16:34   Quiz completed
```

Use severity:

```text
INFO
WARNING
```

But don't automatically punish them.

That follows your source's requirement that tab switching, visibility changes, and reloads should be recorded rather than automatically disqualifying participants. 

---

# 23. Analytics Dashboard

This should be visually much better than a collection of numbers.

## Overview

```text
Participants        86
Average Score       14.7 / 20
Highest Score       20 / 20
Lowest Score        4 / 20
Avg Completion      04:18
```

Then charts.

### Score distribution

```text
20 |       ███
18 |     ███████
16 |   ███████████
14 | █████████████
12 | █████████
10 | █████
```

### Question difficulty

```text
Q1   ██████████████████  92%
Q2   ███████████████     78%
Q3   ███████             41%
Q4   █████████████████   85%
```

This directly supports the source requirement to identify difficult questions. 

---

# 24. Database Architecture

I would use:

```text
Supabase
├── PostgreSQL
├── Supabase Auth
├── RLS
└── Database Functions
```

And the application:

```text
TanStack Start
├── TanStack Router
├── React
├── Server Functions
└── CSS design system
```

This is a better fit for your stated `createServerFn` architecture than introducing a completely separate Node/Express backend.

---

# 25. Database Schema

I would slightly improve your proposed schema.

```text
users / auth.users
        │
        ▼
user_roles
        │
        ▼
quizzes
        │
        ├──────────────┐
        ▼              ▼
    questions       attempts
        │              │
        ▼              ├──────────────┐
      options          ▼              ▼
                     answers    integrity_events
```

### quizzes

```sql
quizzes
---------
id
title
description
public_slug
start_time
end_time
status
show_results
question_count
created_by
created_at
updated_at
```

### questions

```sql
questions
---------
id
quiz_id
question_order
question_type
question_text
time_limit_seconds
created_at
```

### options

```sql
options
---------
id
question_id
option_order
option_text
is_correct
```

`is_correct` remains server-protected.

---

# 26. Attempts

```sql
attempts
---------
id
quiz_id
participant_name

status
current_question_index

started_at
completed_at

total_time_ms
score
percentage

created_at
updated_at
```

Possible status:

```text
IN_PROGRESS
COMPLETED
ABANDONED
```

I would actually avoid automatically marking an attempt abandoned merely because the browser closes.

Browser closure is not abandonment.

---

# 27. Answers

```sql
answers
---------
id
attempt_id
question_id
selected_option_id

question_started_at
answered_at

time_taken_ms

is_correct
timed_out

created_at
```

Important constraint:

```text
UNIQUE(attempt_id, question_id)
```

This provides database-level protection against duplicate answers.

---

# 28. Integrity Events

```sql
integrity_events
----------------
id
attempt_id

event_type
event_timestamp

metadata
```

Examples:

```text
TAB_HIDDEN
TAB_VISIBLE
PAGE_RELOAD
QUIZ_STARTED
QUESTION_STARTED
QUESTION_TIMEOUT
ANSWER_SUBMITTED
QUIZ_COMPLETED
```

`metadata` can be JSONB.

---

# 29. Roles

Use:

```text
user_roles
----------
user_id
role
```

Roles:

```text
admin
```

Don't create an `admins` table with passwords.

Let Supabase Auth own authentication.

Then:

```text
auth.users
     ↓
user_roles
     ↓
admin authorization
```

---

# 30. RLS Strategy

This is where I would be very strict.

Your source requires that participants cannot read admin data or correct answers. 

### Public client

Should **not** directly query:

```text
options.is_correct
attempts
answers
integrity_events
```

Instead:

```text
Participant
    ↓
Server Function
    ↓
Validation
    ↓
Database
```

---

# 31. Server Functions

I would define these as the core application API.

### Public

```text
getQuizPublicState(slug)

startAttempt(slug, participantName)

getCurrentQuestion(attemptId)

submitAnswer(
    attemptId,
    questionId,
    optionId
)

timeoutQuestion(
    attemptId,
    questionId
)

finishAttempt(attemptId)

logIntegrityEvent(
    attemptId,
    eventType
)
```

### Admin

```text
createQuiz()

updateQuiz()

duplicateQuiz()

deleteQuiz()

getAdminQuizzes()

getQuizResults()

getAttemptDetails()

getQuizAnalytics()

exportQuizResults()
```

---

# 32. `getCurrentQuestion()` Contract

This function is especially important.

Client receives:

```json
{
  "attemptId": "...",
  "question": {
    "id": "...",
    "text": "What is the SI unit of force?"
  },
  "options": [
    {
      "id": "...",
      "text": "Joule"
    },
    {
      "id": "...",
      "text": "Newton"
    },
    {
      "id": "...",
      "text": "Pascal"
    },
    {
      "id": "...",
      "text": "Watt"
    }
  ],
  "questionNumber": 4,
  "totalQuestions": 20,
  "msRemaining": 11782
}
```

Notice:

```text
NO is_correct
```

This is essential.

---

# 33. `submitAnswer()` Server Algorithm

The server should perform:

```text
1. Validate attempt
        ↓
2. Validate attempt belongs to quiz
        ↓
3. Validate attempt is IN_PROGRESS
        ↓
4. Validate question is current question
        ↓
5. Validate option belongs to question
        ↓
6. Calculate server elapsed time
        ↓
7. Determine whether answer arrived before timeout
        ↓
8. If late → timed_out
        ↓
9. Look up is_correct
        ↓
10. Create immutable answer
        ↓
11. Advance attempt
        ↓
12. Return next question
```

Never:

```text
client → "I answered in 4 seconds"
```

The client can lie.

Server calculates it.

---

# 34. Idempotency

This deserves special attention.

Imagine user taps:

```text
NEXT
NEXT
```

very quickly.

Two requests could reach the server.

You don't want:

```text
Answer 1
Answer 1 duplicate
Question advances twice
```

Use:

```text
unique(attempt_id, question_id)
```

plus transactional server logic.

The second request returns the already-created state instead of creating another answer.

---

# 35. Resume Architecture

The complete system becomes:

```text
                Browser
                   │
            localStorage
                   │
             attemptId
                   │
                   ▼
            Server Function
                   │
            ┌──────┴──────┐
            │             │
        Attempt DB     Answer DB
            │
            ▼
    Current Question
            │
            ▼
   Server elapsed time
            │
       ┌────┴─────┐
       │          │
    Valid       Expired
       │          │
       ▼          ▼
   Continue    Auto-timeout
```

This is the architecture I would use.

---

# 36. Premium Visual Identity

I would **not** copy Kahoot's exact visual identity.

Instead:

### Brand personality

```text
Competitive
Modern
Smart
Fast
Friendly
Academic
```

### Visual language

* off-white/light background
* one strong primary accent
* dark text
* subtle secondary surfaces
* 16–24px card radius
* soft shadows
* bold headings
* large typography
* generous spacing
* subtle gradients
* micro-interactions

Your source already calls for a light card-based educational style with a single strong accent and semantic color tokens. 

---

# 37. Design System

Don't scatter Tailwind colors throughout components.

Use semantic tokens:

```css
:root {
  --background:
  --foreground:

  --primary:
  --primary-foreground:

  --surface:
  --surface-elevated:

  --border:

  --success:
  --warning:
  --danger:

  --muted:
  --muted-foreground:
}
```

Then components use:

```text
bg-primary
text-foreground
bg-surface
border-border
```

instead of:

```text
bg-blue-500
text-gray-700
```

This makes future branding much easier.

---

# 38. Micro-Interactions

This is where the "premium" feeling comes from.

### Question transition

```text
Question 4
    ↓
slide/fade
    ↓
Question 5
```

### Answer selected

```text
tap
 ↓
subtle scale
 ↓
selected state
```

### Correct/incorrect

Don't reveal correctness during the quiz if that leaks useful information.

Just:

```text
Answer locked ✓
```

Then immediately advance.

### Completion

Use a subtle success animation.

Not an excessive confetti explosion every time.

---

# 39. Mobile UX Rules

I would establish these as hard requirements:

### Minimum touch target

```text
≥ 48px
```

Prefer:

```text
56–64px
```

for answer buttons.

### Question text

Large enough to read comfortably.

### No horizontal scrolling.

### Sticky timer

Timer remains visible.

### Bottom action

Next/confirm stays near thumb zone.

### Safe areas

Support:

```text
iPhone notch
Android gesture navigation
```

### Prevent accidental browser navigation

Don't build aggressive browser hacks.

Instead, make the application state recoverable so browser navigation/reload doesn't destroy the attempt.

---

# 40. Routes

I would structure the routes as:

```text
/
├── /quiz/$slug
│
└── /admin
    ├── /login
    ├── /dashboard
    ├── /quizzes
    ├── /quizzes/create
    └── /quizzes/$id
        ├── /edit
        ├── /preview
        ├── /results
        ├── /results/$attemptId
        └── /analytics
```

This is slightly cleaner than mixing edit and detail semantics.

---

# 41. Admin Navigation

```text
Dashboard
Quizzes
   ├── All Quizzes
   ├── Create Quiz
   └── Drafts

Results

Analytics
```

Quiz-specific navigation:

```text
Overview
Questions
Preview
Results
Analytics
```

---

# 42. Share Link UX

After saving:

```text
┌────────────────────────────────────┐
│ Quiz Published                     │
│                                    │
│ Your quiz is ready to share.       │
│                                    │
│ quizarena.app/quiz/dbms-sprint     │
│                                    │
│ [ COPY QUIZ LINK ]                 │
│                                    │
│ [ PREVIEW ]       [ VIEW QUIZ ]    │
└────────────────────────────────────┘
```

Copy button:

```text
COPY LINK
    ↓
✓ COPIED!
```

---

# 43. Demo Data

Seed:

```text
DEMO — General Knowledge Sprint
```

with 5 questions.

Example:

```text
Q1 → 15 sec
Q2 → 20 sec
Q3 → 10 sec
Q4 → 30 sec
Q5 → 15 sec
```

Set a wide active window during development.

The original specification explicitly calls for a clearly labeled approximately five-question demo quiz so the complete flow can be tested immediately. 

---

# 44. Build Phases

I would **not** build this feature-by-feature randomly.

Build vertically.

## Phase 0 — Foundation

```text
Project setup
Routing
Design tokens
Supabase connection
Auth
Environment configuration
Error handling
```

---

## Phase 1 — Database + Security

```text
quizzes
questions
options
attempts
answers
integrity_events
user_roles

Foreign keys
Indexes
Constraints
RLS
Admin authorization
```

**Deliverable:**

Secure database that can support the entire application.

---

# 45. Phase 2 — Admin Authentication

Build:

```text
/admin/login
```

Then:

```text
/authenticated
       ↓
/admin/dashboard
```

Test:

```text
Unauthenticated → redirected
Admin → allowed
Participant → denied
```

---

# 46. Phase 3 — Quiz Builder

Implement:

```text
Create
Edit
Delete
Duplicate
Reorder
Preview
Schedule
```

Before moving forward, the admin should be able to create a completely valid quiz.

---

# 47. Phase 4 — Public Quiz

Build:

```text
/quiz/$slug
```

States:

```text
UPCOMING
ACTIVE
ENDED
```

Then:

```text
Name
 ↓
Start
 ↓
Question
 ↓
Answer
 ↓
Next
 ↓
...
 ↓
Completion
```

---

# 48. Phase 5 — Timing Engine

This should be treated as a separate engineering milestone.

Test:

```text
Normal answer
Late answer
Timeout
Browser clock manipulation
Slow network
Double click
Reload
Close/reopen
Multiple tabs
```

Do not move to analytics until this is reliable.

---

# 49. Phase 6 — Resume

Implement:

```text
startAttempt
     ↓
localStorage
     ↓
reload
     ↓
restore
```

Test:

### Scenario A

Close immediately.

### Scenario B

Close halfway through question.

### Scenario C

Close after question timeout.

### Scenario D

Close after answering.

### Scenario E

Open same attempt on another tab.

### Scenario F

Manipulate localStorage.

The server should remain authoritative in every case.

---

# 50. Phase 7 — Results

Build:

```text
Leaderboard
Participant details
Integrity timeline
```

Remember:

```text
Participant → NO leaderboard
Admin → leaderboard
```

---

# 51. Phase 8 — Analytics

Add:

```text
score statistics
time statistics
question difficulty
timeout statistics
```

Then visualization.

---

# 52. Phase 9 — CSV

Generate:

```text
Participant Name
Score
Percentage
Total Time
Start Time
Completion Time

Q1 Answer
Q1 Time

Q2 Answer
Q2 Time

...
```

This matches the requested export structure. 

---

# 53. Phase 10 — Integrity + Polish

Finally:

```text
tab switch detection
visibility detection
reload events
network edge cases
loading states
error states
mobile polish
animations
accessibility
```

---

# 54. Testing Strategy

This project absolutely needs more than "does the button work?"

## Unit tests

Test:

```text
calculateQuizState()
calculateRemainingTime()
calculateScore()
calculatePercentage()
calculateLeaderboard()
```

---

## Server tests

Test:

```text
startAttempt()
submitAnswer()
timeoutQuestion()
finishAttempt()
```

Especially:

```text
late request
duplicate request
wrong attempt
wrong question
wrong option
completed attempt
expired quiz
```

---

## E2E tests

Full flow:

```text
Admin login
 ↓
Create quiz
 ↓
Copy link
 ↓
Open participant
 ↓
Enter name
 ↓
Answer questions
 ↓
Finish
 ↓
Admin sees result
```

---

# 55. Critical Edge Cases

These should be explicitly planned.

### User refreshes

→ Resume.

### User closes browser

→ Resume.

### User loses internet for 5 seconds

→ UI shows connection state.

### User submits during network delay

→ idempotent server request.

### Timer reaches zero while network is unavailable

→ server decides when connection returns.

### User changes device clock

→ no effect.

### User changes localStorage

→ server rejects invalid attempt state.

### User opens two tabs

→ server prevents conflicting advancement.

### Admin attempts editing started quiz

→ server rejects.

### Quiz deleted while participant is playing

→ existing attempt policy must be defined.

I recommend:

> Soft-delete quiz rather than physically deleting it if attempts exist.

---

# 56. One Important Improvement: Don't Physically Delete Quiz Data

Admin clicks:

```text
Delete
```

Don't immediately:

```sql
DELETE FROM quizzes
```

Instead:

```text
deleted_at
```

or:

```text
archived = true
```

This preserves historical results.

---

# 57. Security Model

The security boundary should look like:

```text
                 INTERNET
                     │
          ┌──────────┴──────────┐
          │                     │
      Participant             Admin
          │                     │
     Public route           Auth required
          │                     │
          ▼                     ▼
   Server Functions       Admin Functions
          │                     │
          └──────────┬──────────┘
                     ▼
                PostgreSQL
                     │
                    RLS
```

Never trust:

```text
participant_name
question_index
score
time_taken
is_correct
```

when sent from the client.

The server derives them whenever possible.

---

# 58. Final Architecture

My recommended stack:

```text
Frontend
──────────────
React
TanStack Router
TanStack Start
TypeScript
Semantic CSS / Tailwind
Motion library only where useful


Backend
──────────────
TanStack Server Functions
Supabase
PostgreSQL
Supabase Auth
RLS


Storage
──────────────
PostgreSQL


Authentication
──────────────
Supabase Auth


Deployment
──────────────
Lovable Cloud / supported hosting


Export
──────────────
Server-generated CSV
```

---

# 59. Final System Diagram

```text
                         QUIZARENA
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
     PARTICIPANT                              ADMIN
          │                                     │
    /quiz/:slug                         /admin/*
          │                                     │
          ▼                                     ▼
   Public Quiz UI                         Admin UI
          │                                     │
          │                              Supabase Auth
          │                                     │
          └──────────────┬──────────────────────┘
                         │
                  Server Functions
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Quiz State        Attempts         Results
   Timing            Answers          Analytics
   Validation        Integrity        Export
        │                │                │
        └────────────────┼────────────────┘
                         │
                    PostgreSQL
                         │
        ┌────────────────┼────────────────┐
        │                │                │
      quizzes        questions        options
                         │
                    attempts
                         │
                     answers
                         │
                 integrity_events
                         │
                    user_roles
```

---

# 60. MVP Definition

Don't let the project become unnecessarily huge.

### Must have

* Admin authentication
* Create quiz
* Edit quiz
* Schedule quiz
* Public share link
* Name entry
* MCQ
* Per-question timer
* Server-authoritative timing
* Auto timeout
* No back navigation
* Submission
* Resume after reload/close
* Admin-only leaderboard
* Participant detail
* Analytics
* CSV export
* RLS
* Integrity events
* Demo quiz
* Mobile-first UI

### V1.1

* Duplicate quiz
* Better charts
* Question bank
* Bulk question import
* Quiz templates
* Richer integrity analytics

### V2

Potentially:

```text
Live host mode
Team quizzes
Question pools
Randomized questions
Randomized options
Multiple correct answers
True/false
Image questions
Code questions
Short answer
AI question generation
Certificates
Public quiz discovery
Participant accounts
```

But **do not build these in V1**.

---

# 61. The Core UX Loop

The final experience should be this simple:

```text
                    ADMIN
                      │
                      ▼
               Create Quiz
                      │
                      ▼
                Add Questions
                      │
                      ▼
              Set Schedule/Timer
                      │
                      ▼
                  Preview
                      │
                      ▼
               COPY QUIZ LINK
                      │
                      ▼
                 SHARE LINK
                      │
                      ▼
       ┌──────────── PARTICIPANTS ────────────┐
       │                                      │
       ▼                                      │
    Open Link                                 │
       │                                      │
       ▼                                      │
   Enter Name                                 │
       │                                      │
       ▼                                      │
    Start Quiz                                │
       │                                      │
       ▼                                      │
 Question → Answer → Next → Question → ...   │
       │                                      │
       ▼                                      │
    Complete                                  │
       │                                      │
       └──────────────────────────────────────┘
                      │
                      ▼
                    ADMIN
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Leaderboard  Details    Analytics
          │           │           │
          └───────────┼───────────┘
                      ▼
                   CSV Export
```

## The biggest architectural principle

If I were handing this to a development team, I would put this sentence at the top of the technical specification:

> **The browser is a presentation layer; the server is the authority.**

That single principle solves most of the difficult parts of QuizArena:

* timer manipulation
* device clock manipulation
* answer manipulation
* duplicate submissions
* resume correctness
* leaderboard integrity
* correct-answer leakage
* quiz scheduling
* attempt state

The second principle would be:

> **Build the participant experience as a competition, not as a form.**

That is what will make the final product feel like a **premium Kahoot-style quiz platform** rather than another CRUD dashboard.
