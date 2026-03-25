# Fitiva — Group 2 — Iteration 2 Log

# To see the ITR2 Source Code, please checkout to the branch called ITR2

## Team
- Ege Yesilyurt — 219701739 — [egeyesss@my.yorku.ca](mailto:egeyesss@my.yorku.ca)
- Weiqin Situ — 219720432 — [ksitu@my.yorku.ca](mailto:ksitu@my.yorku.ca)
- Arshia Hassanpour — 219284272 — [arshi79@my.yorku.ca](mailto:arshi79@my.yorku.ca)
- Raha Golsorkhi — 219763580 — [raha9@my.yorku.ca](mailto:raha9@my.yorku.ca)
- Dawood Al-Janaby — 219625417 — [Dawood91@my.yorku.ca](mailto:Dawood91@my.yorku.ca)
- Nurjahan Ahmed Shiah — 218802348 — [nshiah49@my.yorku.ca](mailto:nshiah49@my.yorku.ca)

---

# 1. Architecture & Design Decisions (Rationale)

## 1.1 System Architecture (High-Level)
Fitiva is a full-stack web application with:
- **Frontend:** Next.js 16.1.6 (React 19.2.3, TypeScript 5.x) using **custom CSS** and **CSS variables** for theming (no Tailwind).
- **Backend:** Django 4.2.8 + Django REST Framework 3.14.0 with **session-based authentication** (Django sessions).
- **Database:** MySQL 8.0 (host port 3307 → container 3306) running via Docker Compose.
- **DevOps:** Docker Compose (frontend + backend + db), enabling consistent setup across Windows/Mac.

## 1.2 Repository Structure (Layered Organization)
We organized the codebase by layers and features, aligning with a clean separation of concerns.

### Frontend (Next.js) — `frontend/src/`
- **Routes & UI pages** (feature-based):
  - `/signup`, `/login`, `/dashboard`, `/profile/[id]`, `/create-program`, `/trainer-programs`
- **Global providers / cross-cutting concerns:**
  - `contexts/AuthContext.tsx` → global authentication state and persistence
  - `components/ThemeProvider.tsx` → theme initialization (light/dark)
- **API client layer:**
  - `library/api.ts` → typed API functions (`authAPI`, `profileAPI`, `sessionAPI`) + error handling
- **Reusable UI components:**
  - `components/ui/*` → Button/Input/Alert/Logo/Modals/Theme toggle components
- **Styling approach:**
  - One `.css` file per page/component plus `globals.css` for theme variables.

### Backend (Django) — `backend/api/`
- **Domain models:** `models.py`
  Includes `CustomUser`, `UserProfile`, `TrainerProfile`, and workout program structure:
  `WorkoutPlan` → `ProgramSection` → `Exercise` → `ExerciseSet`, plus `ExerciseTemplate`,
  `WorkoutSession`, and `WorkoutFeedback`.
- **Serialization layer:** `serializers.py`
  Uses nested serializers for structured program creation (sections → exercises → sets).
- **HTTP/API layer:** `views.py` + `urls.py`
  Implements endpoints for auth, profile CRUD, programs CRUD, exercise template listing/search,
  schedule management, workout completion, feedback, and trainer aggregated feedback.
- **Automated tests:** `backend/api/tests/` (9 test files — see Section 6).

## 1.3 Major Design Decisions (and Why)

### Decision A — "Real DB + Seeded Data" instead of a fake ArrayList stub
Although the course description allows a stub database, Fitiva uses a **Dockerized MySQL database** from the start to reduce integration risk later and to enable nested program persistence (plans → sections → exercises → sets).
- Benefit: avoids rewriting persistence logic when moving from stub to real DB.
- Risk mitigation: development remains reproducible via Docker Compose; schema is managed by migrations.

### Decision B — Session-based authentication (Django sessions)
We implemented **session cookies** (not JWT) for simpler secure local development and consistent server-side auth state.
- Frontend requests include cookies (`credentials: 'include'`) from the API client (`frontend/src/library/api.ts`).
- Backend provides `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.

### Decision C — Strong separation between UI state and backend data
- Auth state is centralized in `AuthContext`, preventing duplicate auth logic in each page.
- Protected pages are gated via `ProtectedRoute` so that access control is consistent.
- API calls are centralized in `library/api.ts`, enforcing typed request/response shapes.
- Workout session and history calls are centralized in `sessionAPI.getWorkoutHistory()`.

### Decision D — Program modeling matches the product UX (Monday–Sunday)
Trainer program creation is structured around a weekly grid:
- A program always includes **7 days** (Monday–Sunday) using `ProgramSection.format`.
- "Rest days" are explicit (`is_rest_day`) and validated with warnings if exercises exist.
- Exercise ordering is preserved using `order` fields and UI drag-and-drop.

This aligns backend structure with the frontend builder UI so that saving/loading is stable.

### Decision E — Theme system via CSS variables (full dark mode)
Fitiva supports **full dark mode** across the entire app using CSS variables in `globals.css` and a `data-theme` attribute on `<html>`.
- Theme preference persists in `localStorage`.
- Theme switching is available for logged-in users (SettingsModal) and non-logged-in users (ThemeToggle on login/signup).
- All UI components reference variables (no hardcoded colors), ensuring consistency.

### Decision F — Drag-and-drop reordering uses native HTML5 API
We implemented drag-and-drop reordering of exercises **within a day** using the native HTML5 drag-and-drop API.
- We restrict moves to the same day to keep behavior predictable and reduce complexity.
- Handlers are defined at the component level (not nested) to avoid React re-render issues.

### Decision G — WorkoutFeedback stored per session date (ITR2)
Post-workout feedback is stored as a `WorkoutFeedback` model linked to a `WorkoutSession` by date.
- `GET/POST /api/sessions/feedback/<date>/` enables per-day feedback retrieval and submission.
- The schedule endpoints (`/api/schedule/active/` and `/api/schedule/workout/<date>/`) return a `has_feedback` boolean so the UI can show "Feedback Given" vs. "Rate this Workout" badges without a separate API call.
- Feedback auto-prompts after completing a workout; it is always skippable.

### Decision H — Schedule regeneration triggered manually and automatically (ITR2)
Weekly schedule regeneration (US 2.3) is triggered two ways:
- **Manual:** a user or trainer can explicitly regenerate the schedule.
- **Automatic:** the system regenerates on Sundays based on accumulated feedback.
This keeps the experience flexible and testable without requiring a live cron job in development.

## 1.4 Domain Model Rationale (Backend)
Key domain objects and why they exist:
- **CustomUser** with `is_trainer`: single user table supports both roles.
- **UserProfile**: captures workout preferences; auto-created at signup with `age=null` to detect incomplete profile.
- **TrainerProfile**: captures trainer public info (bio, specialties, certifications).
- **WorkoutPlan** (with `is_published`): the top-level program entity; `is_published` controls browsing visibility for users; supports multi-focus via array field and `is_deleted` for soft-delete planning.
- **ProgramSection**: a "day" within the plan; supports explicit rest days.
- **Exercise / ExerciseSet**: represent ordered exercises and set-level details (reps/time/rest).
- **ExerciseTemplate**: searchable library to speed up program authoring.
- **WorkoutSession**: records workout completion per date; includes `completed` and `in_progress` states.
- **WorkoutFeedback**: stores post-workout difficulty (1–5), fatigue flag, pain flag, and notes per session; used for regeneration logic and trainer aggregated dashboard.

---

# 2. Iteration 2 User Stories

This section lists all user stories planned for Iteration 2 — both carried over from ITR1 (now also tested) and newly implemented in ITR2.

## 2.1 Carried Over from ITR1 (Completed & Now Fully Tested)

| User Story | Description | Owner(s) |
|------------|-------------|----------|
| US 1.1 | Register & Log In | Ege, Weiqin |
| US 1.2 | Create Fitness Profile | Arshia, Raha |
| US 1.3 | Create Programs from Workouts | Ege, Weiqin |
| US 1.4 | View List of Workouts | Ege |
| US 1.5 | Browse Trainer Created Programs | Shiah |
| US 1.6 | Profile-Based Recommendations | Ege |
| US 3.1 | Record Workout Completion | Raha |
| US 3.6 | Personalized Calendar Schedule View | Shiah |

## 2.2 New in ITR2

| User Story | Description | Owner(s) |
|------------|-------------|----------|
| US 2.1 | Submit Post-Workout Feedback | Ege |
| US 2.3 | Automatic Weekly Schedule Regeneration | Shiah |
| US 2.4 | Review Aggregated Client Feedback (Trainer View) | Weiqin |
| US 2.5 | Accept or Lock Recommended Adjustments | Dawood |
| US 3.3 | Analyze Training Trends | Arshia |
| US 3.4 | View Progress Summary Dashboard | Raha |

---

# 3. Plan Revision (ITR1 → ITR2)
This section documents what changed from the **Iteration 1 plan** to the **Iteration 2 plan**, and why.

## 3.1 Baseline Plan (ITR1 Snapshot)
**Stories completed in ITR1:**
- US 1.1 Register & Log In
- US 1.2 Create Fitness Profile
- US 1.3 Create Programs from list of workouts (trainer program builder)
- US 1.4 View List of Workouts
- US 1.5 Browse Trainer-Created Programs
- US 1.6 Profile-Based Recommendations
- US 3.1 Record Workout Completion (model + UI completion state)
- US 3.6 Personalized Calendar Schedule View (weekly calendar layout)

## 3.2 Revised Plan (ITR2 Updated)
**New stories introduced in ITR2:**
- **US 2.1 – Submit Post-Workout Feedback:** difficulty scale (1–5), fatigue/pain flags, notes; auto-prompts after session completion.
- **US 2.3 – Automatic Weekly Schedule Regeneration:** integrates feedback into next-week schedule; supports manual trigger and Sunday auto-regeneration.
- **US 2.4 – Review Aggregated Client Feedback:** trainer-facing dashboard showing average difficulty, fatigue frequency, and weekly trends chart.
- **US 2.5 – Accept or Lock Recommended Adjustments:** confirmation modal + lock flag for trainer-approved schedule adjustments.
- **US 3.3 – Analyze Training Trends:** total workouts, total training time, current streak, empty state; weekly activity chart fixed to minutes.
- **US 3.4 – View Progress Summary Dashboard:** total workouts/week widget, total minutes/week widget, workout summary graph pulling from history and completed sessions.

**Notable ITR2 enhancements:**
- `is_published` field added to `WorkoutPlan` for trainer browsing visibility control.
- Edit and delete functionality added for workout programs.
- `sessionAPI.getWorkoutHistory()` introduced and used to centralize session data fetching on the dashboard.
- Dashboard widget layout bug fixed (widgets no longer shift when clicking Recommendations).
- `recharts` dependency properly resolved via Docker anonymous volume for `/app/node_modules`.

## 3.3 Rationale for Plan Changes
- Post-workout feedback (US 2.1) was needed to feed the regeneration engine (US 2.3) and the trainer feedback dashboard (US 2.4).
- Training trends (US 3.3) and the progress dashboard (US 3.4) were prioritized early in ITR2 to give users meaningful data visualization while workout history accumulates.
- US 2.5 (lock/accept adjustments) closes the feedback loop for trainers managing client schedules.

*(Planning docs are maintained at `/docs/ITR0/`, `/docs/ITR1/`, and `/docs/ITR2/`.)*

---

# 4. Meeting Minutes

## Meeting 10 — Feb 13, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- Final review of ITR1 documentation for submission readiness
- Demo/review: features for US 3.1 & US 3.6
- Assigned at least one story per member to begin **ITR2** implementation planning

**Decisions:**
- Iteration 2 user stories selected and initial assignments confirmed:
  - Ege → US 2.1
  - Shiah → US 2.3
  - Weiqin → US 2.4
  - Dawood → US 2.5
  - Arshia → US 3.3
  - Raha → US 3.4

## Meeting 11 — Feb 18, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- ITR2 kickoff; each member confirms implementation approach for assigned story
- Discussed feedback model design (US 2.1) and schedule regeneration logic (US 2.3)

**Decisions:**
- WorkoutFeedback model approach finalized: per-date, linked to WorkoutSession
- Regeneration to support both manual trigger and automatic Sunday trigger

## Meeting 12 — Feb 20, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- First progress check on ITR2 stories
- Discussed trainer feedback aggregation requirements for US 2.4

**Decisions:**
- Backend endpoint for aggregated feedback to be built alongside US 2.1 to unblock US 2.4
- Frontend trend chart to use recharts (same as dashboard)

## Meeting 13 — Feb 25, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- Mid-sprint progress update from all members
- Reviewed schedule regeneration integration approach (US 2.3 + US 3.6 dependency)

**Decisions:**
- Confirmed regeneration integrates with existing schedule model via feedback-weighted rules
- Dashboard widgets (US 3.4) to pull from `sessionAPI.getWorkoutHistory()` for consistency

## Meeting 14 — Feb 27, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- Backend integration review: feedback endpoints, schedule updates, summary dashboard API
- Test coverage planning: each member responsible for test file for their story

**Decisions:**
- Test files to be committed to `backend/api/tests/` as separate files per domain
- All tests must pass before ITR2 branch is created

## Meeting 15 — Mar 3, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- Near-final progress update; most stories in testing phase
- Reviewed dashboard layout bug (widgets shifting on Recommendations click)

**Decisions:**
- Widget layout bug assigned to Raha for fix before final merge
- Final PR reviews to be completed by Mar 6

## Meeting 16 — Mar 6, 2026
**Attendees:** All team members
**Duration:** 30 minutes
**Agenda:**
- Final ITR2 code review and documentation check
- All outstanding PRs merged (US 2.3, US 2.4, US 3.3, US 3.4 testing)
- ITR2 branch created from latest main

**Decisions:**
- ITR2 branch and tag created (March 6, 2026 at 11:00 PM UTC)
- All ITR2 stories confirmed merged; documentation updated

---

# 5. Task Assignments, Estimates, and Actuals (Per User Story)
> **Rule:** Include all planned tasks for ITR2 (done or not), and record estimate vs actual time.

## 5.1 Summary Table

| User Story | Owner(s) | Estimated Time | Status | Notes |
|------------|----------|----------------|--------|-------|
| US 1.1 – Register & Log In | Ege, Weiqin | 2 days | ✅ Completed (ITR1) | Full authentication system with password validation and session-based login |
| US 1.2 – Create Fitness Profile | Arshia, Raha | 2 days | ✅ Completed (ITR1) | Profile auto-created on signup, finished by user, editable via modal |
| US 1.3 – Create Programs | Ege, Weiqin | 3 days | ✅ Completed (ITR1) | Program creation (Mon–Sun structure), exercise library, sets config, drag-and-drop, edit/delete |
| US 1.4 – View List of Workouts | Ege | 2 days | ✅ Completed (ITR1) | Access list of default workouts or ones created by you |
| US 1.5 – Browse Trainer Created Programs | Shiah | 1 day | ✅ Completed (ITR1) | Browse all published programs; `is_published` flag added to WorkoutPlan |
| US 1.6 – Profile-Based Recommendations | Ege | 1 day | ✅ Completed (ITR1) | Matching workout programs with the same focus as user's preferred focus |
| US 3.1 – Record Workout Completion | Raha | 3 days | ✅ Completed (ITR1 + ITR2 tests) | Complete/in-progress states on schedule tab; test cases added in ITR2 |
| US 3.6 – Personalized Calendar Schedule View | Shiah | 3 days | ✅ Completed (ITR1 + ITR2 scheduling) | Weekly calendar UI; schedule generation and regeneration integrated in ITR2 |
| US 2.1 – Submit Post-Workout Feedback | Ege | 2 days | ✅ Completed (ITR2) | Difficulty scale (1–5) + fatigue/pain/notes; auto-prompts after completion; "Feedback Given"/"Rate this Workout" badges |
| US 2.3 – Automatic Weekly Schedule Regeneration | Shiah | 3 days | ✅ Completed (ITR2) | Regeneration logic based on feedback; manual + Sunday auto-trigger; scheduling test suite |
| US 2.4 – Review Aggregated Client Feedback | Weiqin | 3 days | ✅ Completed (ITR2) | Trainer program feedback dashboard with weekly trends chart; avg difficulty + fatigue frequency |
| US 2.5 – Accept or Lock Adjustments | Dawood | 3 days | ⚠️ Pushed to ITR3 | Adjustment confirmation modal + lock flag — no PR or commit found on main/ITR2 branch |
| US 3.3 – Analyze Training Trends | Arshia | 2 days | ✅ Completed (ITR2) | Weekly activity chart (minutes), total workouts, total training time, streak logic, empty state; frontend-only |
| US 3.4 – View Progress Summary Dashboard | Raha | 3 days | ✅ Completed (ITR2) | Total workouts/week widget, total minutes/week widget, weekly workout summary graph; widget layout bug fixed |

> ⚠️ **Note on US 2.5:** As of the ITR2 branch creation (March 6, 2026), no pull request or commit from Dawood implementing US 2.5 can be found in the repository. Dawood's repository contributions for ITR2 consisted of uploading the peer review form to `docs/`. The team decided to push the implementation of US2.5 to ITR3.

---

## 5.2 Task Breakdown

### US 1.1 — Register & Log In
- UI: login/register pages, error messaging, navigation (Est: 6h, Actual: 4h)
- Backend/service: auth endpoints or handlers (Est: 4h, Actual: 2h)
- Stub data integration (Est: 1h, Actual: 1h)
- Unit tests: validation + auth logic (Est: 1h, Actual: 2h)

### US 1.2 — Create Fitness Profile
- UI: profile form + validation (Est: 5h, Actual: 6h)
- Domain model: profile entity + rules (Est: 2h, Actual: 3h)
- Stub repository: save/load profile (Est: 2h, Actual: 2h)
- Unit tests: validation + persistence behavior (Est: 1h, Actual: 1h)

### US 1.3 — Create Programs from Workouts (Trainer)
- UI: program builder, section type/format, add exercises, drag-and-drop reorder (Est: 6h, Actual: 8h)
- Domain model: Program, Section, ExerciseEntry (Est: 4h, Actual: 6h)
- Edit/delete functionality for workout programs (Est: 2h, Actual: 2h)
- Stub repository: seed workouts + programs (Est: 3h, Actual: 2h)
- Unit tests: program constraints (min 1 exercise, etc.) (Est: 1h, Actual: 2h)

### US 1.4 — View List of Workouts
- UI: workout catalog + filters + details (Est: 3h, Actual: 4h)
- Data: seeded workouts in stub DB (Est: 1h, Actual: 1h)
- Unit tests: filtering/sorting logic (Est: 1h, Actual: 1h)

### US 1.5 — Browse Trainer Programs
- UI: browse programs screen + program details (Est: 5h, Actual: 5h)
- Added `is_published` field to `WorkoutPlan` for browsing visibility (Est: 1h, Actual: 1h)
- Data: seeded trainer programs (Est: 2h, Actual: 1h)
- Unit tests: mapping/display logic (Est: 1h, Actual: 1h)

### US 1.6 — Profile-Based Recommendations
- Logic: recommendation rules (based on focus, level, location) (Est: 2h, Actual: 1h)
- UI: recommended list + plan preview (Est: 2h, Actual: 3h)
- Unit tests: rule coverage with multiple profiles (Est: 1h, Actual: 2h)

### US 3.1 — Record Workout Completion
- UI: complete/in-progress states for started workouts on schedule tab (Est: 5h, Actual: 5h)
- Domain/service: record completion + basic details (Est: 6h, Actual: 3h)
- Unit tests: `test_workoutcompletion.py` + `test_workout_sessions.py` (Est: 2h, Actual: 2h)

### US 3.6 — Personalized Schedule (Calendar View)
- UI: weekly calendar layout + click to view workout details (Est: 8h, Actual: 8h)
- Logic: generate events from schedule/program selection (Est: 4h, Actual: 4h)
- Unit tests: schedule generation mapping in `test_schedules.py` (Est: 3h, Actual: 3h)

### US 2.1 — Submit Post-Workout Feedback
- UI: difficulty scale (1–5) + fatigue/pain checkbox + notes; modal in schedule workout view (Est: 4h, Actual: 5h)
- Backend: `WorkoutFeedback` model; `GET/POST /api/sessions/feedback/<date>/` endpoint (Est: 3h, Actual: 2h)
- Backend: `/api/trainer/programs/<id>/feedback/` aggregated endpoint (backend, unlocks US 2.4) (Est: 2h, Actual: 2h)
- Schedule API updated: `/api/schedule/active/` and `/api/schedule/workout/<date>/` now return `has_feedback` bool (Est: 1h, Actual: 1h)
- Feedback auto-prompts after completion, skippable; calendar tiles show "Feedback Given" or "Rate this Workout" (Est: 2h, Actual: 2h)
- Unit tests: validation + persistence (Est: 3h, Actual: 3h)

### US 2.3 — Automatic Weekly Schedule Regeneration
- Logic: integrate feedback into next-week schedule rules; feedback-weighted reordering (Est: 5h, Actual: 4h)
- Service layer: regeneration trigger — manual + Sunday auto-regeneration (Est: 4h, Actual: 3h)
- Scheduling adjustments and edge-case handling (Est: 2h, Actual: 3h)
- Integration/unit tests: `test_schedules.py` (~43 KB test suite) (Est: 3h, Actual: 4h)

### US 2.4 — Review Aggregated Client Feedback (Trainer)
- Backend: aggregation queries already exposed by US 2.1 at `/api/trainer/programs/<id>/feedback/` (Est: 0h — reused)
- UI: program feedback dashboard with weekly trends chart (recharts); avg difficulty + fatigue frequency display (Est: 6h, Actual: 6h)
- Refined styling pass post-initial implementation (Est: 2h, Actual: 2h)
- Unit tests: aggregation accuracy (Est: 2h, Actual: 2h)

### US 2.5 — Accept or Lock Recommended Adjustments ⚠️
- UI: adjustment confirmation modal (Est: 4h, Actual: N/A — no PR found)
- Backend: lock flag + override logic (Est: 4h, Actual: N/A)
- UX messaging: warning when rejecting system advice (Est: 2h, Actual: N/A)
- Unit tests: lock behavior verification (Est: 2h, Actual: N/A)
> **Status:** No pull request or code commit for this story exists in the repository as of ITR2 submission. Team pushed this to ITR3.

### US 3.3 — Analyze Training Trends
- Frontend: weekly activity chart fixed to display minutes (not raw counts); total workouts + total training time summary cards; current streak calculation; empty state when no workouts exist (Est: 6h, Actual: 6h)
- Refactored dashboard to use `sessionAPI.getWorkoutHistory()` (Est: 1h, Actual: 1h)
- Files changed: `dashboard/page.tsx`, `dashboard/dashboard.css` — no backend changes (Est: 4h, Actual: 4h)
- Unit tests: streak + chart data accuracy (Est: 3h, Actual: 3h)

### US 3.4 — View Progress Summary Dashboard
- UI: total workouts/week widget, total minutes/week widget, workout summary bar graph for current week (Est: 4h, Actual: 4h)
- Data: pulls from workout history + completed workout records (Est: 3h, Actual: 2h)
- Bug fix: dashboard widgets no longer shift position when clicking Recommendations (Est: 1h, Actual: 1h)
- Testing: `test_summary_dashboard.py` (Est: 2h, Actual: 3h)

---

### Iteration 2 Reflection

**What Went Well**
- Clear separation between backend aggregation logic (US 2.1 backend unblocking US 2.4) and frontend dashboard rendering
- Strong test coverage: 9 dedicated test files covering all major domain areas
- Successful migration of feedback and session data to persistent DB storage
- Dashboard refactoring to `sessionAPI.getWorkoutHistory()` improved code consistency across US 3.3 and 3.4
- recharts integration worked smoothly for both feedback trends (US 2.4) and activity chart (US 3.3)

**What Can Be Improved**
- US 2.5 (Dawood) was not implemented and committed by the ITR2 deadline
- Some UI spacing and visual hierarchy refinements still needed on feedback modal
- Regeneration logic explanations for users could be clearer in the UI
- Time estimates for schedule test suite (US 2.3) were underestimated — test file grew to ~43 KB
- Meeting minutes for the ITR2 implementation period should be more detailed

---

# 6. Testing Summary (Unit Tests)
- **Test framework:** Python Django built-in test framework (`django.test`)
- **Test location:** `backend/api/tests/` (9 separate files)
- **Result:** All tests passing on latest ITR2 tag.

| Test File | Domain Covered | User Story |
|-----------|---------------|------------|
| `test_authentication.py` | Signup, login, logout, session management | US 1.1 |
| `test_profiles.py` | Profile creation, update, validation | US 1.2 |
| `test_workout_programs.py` | Program CRUD, section/exercise constraints | US 1.3 |
| `test_exercise_templates.py` | Template listing, search, filtering | US 1.4 |
| `test_recommendations.py` | Recommendation rule matching by focus/level | US 1.6 |
| `test_workout_sessions.py` | Session creation, completion state tracking | US 3.1 |
| `test_workoutcompletion.py` | Completion record correctness, in-progress handling | US 3.1 |
| `test_schedules.py` | Schedule generation, regeneration, feedback integration | US 3.6, US 2.3 |
| `test_summary_dashboard.py` | Workout summary aggregation, streak logic, widget data | US 3.4 |

**To run tests locally:**
```bash
# Start containers first
docker-compose up -d

# Then run tests
docker-compose exec backend python manage.py test api --verbosity=2
```

# 7. Release & Repository Notes

**Commit strategy:** frequent commits across team members throughout the iteration; avoided last-minute "mega commits".

**Tag:** ITR2 branch created on March 6, 2026 from the latest main branch after all ITR2 PRs were merged.

## Merged PRs for ITR2 (in order):

**PR #13:** US 3.1 — complete/in-progress UI (Raha)

**PR #18: **US 3.1 — test cases (Raha)

**PR #19: **US 3.4 — dashboard widgets + debug (Raha)

**PR #20:** US 2.1 — post-workout feedback system (Ege)

**PR #21 / #24:** US 3.3 — training trends analytics (Arshia)

**PR #23 / #27:** US 2.4 — program feedback dashboard + trends chart (Weiqin)

**PR #25:** US 2.3 — schedule adjustments + test cases (Shiah)

**PR #26: **US 3.4 — additional test coverage (Raha)

**PR #28: **ITR2 branch created (Ege)

## Repo structure:

frontend/ — frontend container

frontend/src/ — frontend source code

backend/ — backend container

backend/api/ — backend source code

backend/api/tests/ — all test files (9 files)

docs/ — planning documents (ITR0, ITR1, ITR2)

GitHub Wiki — wiki + architecture sketch references

# 8. Concern / Challenge
**US 2.5 not committed: **Dawood's implementation of US 2.5 (Accept or Lock Recommended Adjustments) was not merged into the repository before the ITR2 branch was created. It was deferred to ITR3.

All other team members delivered their assigned stories with no concerns about group dynamics or project direction.

# 9. Next Steps (Preview for ITR3)

Confirm status of US 2.5 and finish it

Identify additional ITR3 stories

**Plan improvements:**

Expand test coverage for feedback and regeneration edge cases

UI polish: feedback modal spacing, dashboard visual hierarchy

Add rewards/reflection flows tied to streaks and milestones

Improve dashboard UI with richer visual elements

Add trainer-side client management views
