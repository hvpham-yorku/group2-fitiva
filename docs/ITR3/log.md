# Fitiva — Group 2 — Iteration 3 Log

# To see the ITR3 Source Code, please checkout to the branch called ITR3 (or the latest version of main)

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
  `WorkoutSession`, `WorkoutFeedback`, and more.
- **Serialization layer:** `serializers.py`
  Uses nested serializers for structured program creation (sections → exercises → sets).
- **HTTP/API layer:** `views.py` + `urls.py`
  Implements endpoints for auth, profile CRUD, programs CRUD, exercise template listing/search,
  schedule management, workout completion, feedback, and trainer aggregated feedback.
- **Automated tests:** `backend/api/tests/` (See Section 6).

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

## 2.1 ITR1

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
| US 1.7 | Select training plan and auto-generate weekly schedule | Shiah |

## 2.2 ITR2

| User Story | Description | Owner(s) |
|------------|-------------|----------|
| US 2.1 | Submit Post-Workout Feedback | Ege |
| US 2.3 | Automatic Weekly Schedule Regeneration | Shiah |
| US 2.4 | Review Aggregated Client Feedback (Trainer View) | Weiqin |
| US 3.3 | Analyze Training Trends | Arshia |
| US 3.4 | View Progress Summary Dashboard | Raha |

## 2.3 New in ITR3
| User Story | Description | Owner(s) |
|------------|-------------|----------|
| US 4.5 | Trainer-Hosted Challenges | Ege |
| US 2.2 | View Plan Adjustments & Explanations | Dawood |
| US 4.4 | Participate in Weekly Challenges | Weiqin |
| US 4.2 | Unlock Achievement Badges | Dawood |
| US 2.5 | Accept or Lock Recommended Adjustments | Shiah |
| US 4.3 | View Achievement Gallery | Arshia |
| US 3.5 | Detect Missed Sessions | Arshia |
| US 3.2 | Review Workout History | Raha |
| US 4.1 | Earn Points for Workout Completion | Dawood |

---

# 3. Plan Revision (ITR1 → ITR2)
This section documents what changed across the iterations, from the **Iteration 1 **baseline plan, through the** Iteration 2** updates, and culminating in the **final Iteration 3 **plan.

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

## 3.3 Final Revised Plan (ITR3 Updated)
**New stories introduced (or finalized) in ITR3:**
- **US 2.2 – View Plan Adjustments & Explanations:** Added UI explanations to ensure users understand exactly why their schedule was modified based on their past feedback.
- **US 2.5 – Accept or Lock Recommended Adjustments: **Expanded the user control flow to let trainees seamlessly accept, reject, or lock their schedules against incoming AI adjustments.
- **US 3.2 – Review Workout History:** Implemented a chronological log view allowing users to browse their past completed workouts.
- **US 3.5 – Detect Missed Sessions:** Built background logic to automatically detect and mark scheduled workouts as "missed" if the date passes without completion.
- **US 4.1 – Earn Points for Workout Completion:** Introduced a gamification system awarding base points, length bonuses, and streak multipliers for completing workouts.
-** US 4.2 – Unlock Achievement Badges: **Added milestone tracking that automatically awards badges when users hit specific targets (e.g., 5 workouts, 3-day streak).
-** US 4.3 – View Achievement Gallery:** Created a dedicated visual gallery interface for users to browse their earned badges and track their point totals.
- **US 4.4 – Participate in Weekly Challenges:** Allowed users to opt into time-limited challenges (e.g., complete X workouts in a week) to earn bonus points and exclusive badges.
- **US 4.5 – Trainer-Hosted Challenges:** Empowered trainers to create custom, themed challenges tied specifically to their published programs to drive trainee engagement.

## 3.3 Rationale for Plan Changes
- Post-workout feedback (US 2.1) was needed to feed the regeneration engine (US 2.3) and the trainer feedback dashboard (US 2.4).
- Training trends (US 3.3) and the progress dashboard (US 3.4) were prioritized early in ITR2 to give users meaningful data visualization while workout history accumulates.
- US 2.5 (lock/accept adjustments) closes the feedback loop for trainers managing client schedules.

*(Planning docs are maintained at `/docs/ITR0/`, `/docs/ITR1/`, `/docs/ITR2/`, and `/docs/ITR3/`.)*

---
# 4. Meeting Minutes

## Meeting 17 — March 11, 2026  
**Attendees:** All team members  
**Duration:** 30 minutes  

**Agenda:**
- Kick-off for Iteration 3 and review of remaining user stories  
- Discuss workload distribution
- Run the system as a group to identify bugs and UI issues  

**Decisions:**
- Iteration 3 user stories assigned based on familiarity and workload balance:
  - Ege → US 4.5  
  - Shiah → US 2.3  
  - Weiqin → US 4.4  
  - Dawood → US 4.1, 4.2, 2.2  
  - Arshia → US 3.5, 4.3  
  - Raha → US 3.2

**Decisions:**
- Agreed to prioritize fixing visible UI bugs before adding new features  
- Identified several minor frontend inconsistencies to be addressed early  


## Meeting 18 — March 13, 2026  
**Attendees:** All team members  
**Duration:** 30 minutes  

**Agenda:**
- Review progress on assigned user stories  
- Discuss integration challenges between frontend and backend  
- Plan approach for integration testing  

**Decisions:**
- We’ll do integration testing after each person finishes a feature and tests their own work
- Identified dependency issues between certain user stories (e.g., shared API endpoints)  
- Agreed to standardize API responses to avoid frontend inconsistencies  


## Meeting 19 — March 18, 2026  
**Attendees:** All team members  
**Duration:** 30 minutes  

**Agenda:**
- Review progress on Iteration 3 implementation  
- Demo partially completed features
- Discuss bugs discovered during testing  

**Decisions:**
- Identified missing edge case handling in a user story
- Agreed to increase focus on unit and integration testing moving forward  
- Reassigned minor tasks to balance workload across team members
- Updated the UI to be more user-friendly based on the professor’s feedback


## Meeting 20 — March 20, 2026  
**Attendees:** All team members  
**Duration:** 30 minutes  

**Agenda:**
- Continue integration testing across implemented features  
- Review UI/UX consistency across pages  
- Discuss refactoring opportunities  

**Decisions:**
- Agreed to refactor duplicated logic in backend services  
- Standardized naming conventions across components  


## Meeting 21 — March 25, 2026  
**Attendees:** All team members  
**Duration:** 30 minutes  

**Agenda:**
- Prepare for final presentation and demo  
- Work on documentation (log, README, refactoring document)  
- Review completeness of implemented user stories  

**Decisions:**
- Divided presentation slides among team members based on contributions  
- Ensed all major user stories are functional end-to-end  
- Agreed to finalize testing before presentation  


## Meeting 22 — March 29, 2026  
**Attendees:** All team members  
**Duration:** 30 minutes  

**Agenda:**
- Finalize all deliverables for Iteration 3 / Delivery 2  
- Perform mock presentation  

**Decisions:**
- Completed all required documentation and reviewed for consistency  
- Fixed last-minute UI and functional issues  
- Practiced presentation flow and timing  
- Confirmed readiness for final demo and submission  
---

# 5. Task Assignments, Estimates, and Actuals (Per User Story)
> **Rule:** Include all planned tasks for ITR2 (done or not), and record estimate vs actual time.

## 5.1 Summary Table

| User Story | Owner(s) | Estimated Time | Actual Time | Status | Notes |
|------------|----------|----------------|-------------|--------|-------|
| US 1.1 – Register & Log In | Ege, Weiqin | 2 days | 2 days | ✅ Completed (ITR1) | Email/password auth, validation rules, session persistence, error handling for invalid login |
| US 1.2 – Create Fitness Profile | Arshia, Raha | 2 days | 2.5 days | ✅ Completed (ITR1) | User inputs age, level, location, focus; trainer profile + program publishing supported |
| US 1.3 – Create Programs | Ege, Weiqin | 3 days | 3.5 days | ✅ Completed (ITR1) | Trainers build structured programs with exercises, sets, reps, rest, and sections |
| US 1.4 – View List of Workouts | Ege | 2 days | 1.5 days | ✅ Completed (ITR1) | Workout catalog with name, focus, difficulty, duration, and filtering options |
| US 1.5 – Browse Trainer Created Programs | Shiah | 1 day | 1 day | ✅ Completed (ITR1) | Displays trainer programs with focus, difficulty, and subscription labels |
| US 1.6 – Profile-Based Recommendations | Ege | 1 day | 1.5 days | ✅ Completed (ITR1) | Recommended plans based on profile attributes (focus, experience, etc.) |
| US 1.7 – Select Training Plan and Auto-Generate Weekly Schedule | Shiah | 2 days | 2 days | ✅ Completed (ITR1) | Users select a plan and the system generates a 7-day schedule based on profile, with weekly regeneration each Sunday |
| US 3.1 – Record Workout Completion | Raha | 3 days | 3.5 days | ✅ Completed (ITR1) | Users mark workouts complete; updates history, streaks, and stats |
| US 3.6 – Personalized Calendar Schedule View | Shiah | 3 days | 4 days | ✅ Completed (ITR1) | Weekly schedule shown in calendar UI, updates when plan changes |
| US 2.1 – Submit Post-Workout Feedback | Ege | 2 days | 2.5 days | ✅ Completed (ITR2) | Difficulty rating, fatigue/pain flags, optional notes; quick submission (<30s) |
| US 2.3 – Automatic Weekly Schedule Regeneration | Shiah | 3 days | 4 days | ✅ Completed (ITR2) | Uses feedback to adjust future schedules; auto-regenerates weekly |
| US 2.4 – Review Aggregated Client Feedback | Weiqin | 3 days | 3 days | ✅ Completed (ITR2) | Trainer dashboard with avg difficulty, fatigue stats, and trends over time |
| US 2.5 – Accept or Lock Adjustments | Shiah | 3 days | 3 days | ✅ Completed(ITR3) | Users can accept/reject changes or lock plans; prevents unwanted modifications |
| US 3.3 – Analyze Training Trends | Arshia | 2 days | 2.5 days | ✅ Completed (ITR2) | Calculates total workouts, time, streaks; displays weekly activity trends |
| US 3.4 – View Progress Summary Dashboard | Raha | 3 days | 3 days | ✅ Completed (ITR2) | Dashboard shows streaks, totals, and key metrics with simple visuals |
| US 4.5 – Trainer-Hosted Challenges | Ege | 3 days | 3 days | ✅ Completed (ITR3) | Trainers create challenges with rules and track user participation |
| US 2.2 – View Plan Adjustments & Explanations | Dawood | 2 days | 2.5 days | ✅ Completed(ITR3) | Shows plan changes with explanations and comparison to previous schedule |
| US 4.4 – Participate in Weekly Challenges | Weiqin | 3 days | 3 days | ✅ Completed (ITR3) | Users join challenges, track progress, and complete goals within timeframe |
| US 4.2 – Unlock Achievement Badges | Dawood | 2 days | 2 days | ✅ Completed (ITR3) | Badges unlocked automatically based on milestones (e.g., streaks) |
| US 4.3 – View Achievement Gallery | Arshia | 2 days | 2 days | ✅ Completed (ITR3) | Displays earned and locked badges with descriptions |
| US 3.5 – Detect Missed Sessions | Arshia | 2 days | 2.5 days | ✅ Completed (ITR3) | Tracks skipped workouts and updates streak/consistency metrics |
| US 3.2 – Review Workout History | Raha | 2 days | 2 days | ✅ Completed (ITR3) | Chronological workout history with duration, plan info, and filtering |
| US 4.1 – Earn Points for Workout Completion | Dawood | 3 days | 3 days | ✅ Completed (ITR3) | Points awarded per workout; supports streak-based rewards |
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

### US 2.5 — Accept or Lock Recommended Adjustments 
- UI: adjustment confirmation modal (Est: 4h, Actual: 4h)
- Backend: lock flag + override logic (Est: 4h, Actual: 4h)
- UX messaging: warning when rejecting system advice (Est: 2h, Actual: 3h)
- Unit tests: lock behavior verification (Est: 2h, Actual: 3h)

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

### US 4.5 — Trainer-Hosted Challenges
- UI: create challenge form (title, rules, duration, linked program) (Est: 5h, Actual: 5h)
- Backend: challenge model + CRUD endpoints (Est: 5h, Actual: 4h)
- Logic: associate challenge with workout program and track participants (Est: 3h, Actual: 3h)
- Unit tests: challenge creation and association (Est: 2h, Actual: 2h)

### US 2.2 — View Plan Adjustments & Explanations
- UI: comparison view for previous vs updated schedule (Est: 4h, Actual: 5h)
- UI: highlight modified workouts and display explanation messages (Est: 3h, Actual: 3h)
- Backend: logic to generate explanation messages based on feedback (Est: 3h, Actual: 2h)
- Unit tests: correctness of displayed adjustments (Est: 2h, Actual: 2h)

### US 4.4 — Participate in Weekly Challenges
- UI: challenge listing + join/leave functionality (Est: 4h, Actual: 4h)
- Backend: track user participation and progress (Est: 4h, Actual: 3h)
- Logic: progress updates based on completed workouts (Est: 3h, Actual: 3h)
- Unit tests: participation tracking and completion validation (Est: 2h, Actual: 2h)

### US 4.2 — Unlock Achievement Badges
- Logic: define badge thresholds (e.g., streaks, total workouts) (Est: 3h, Actual: 2h)
- Backend: badge assignment and storage (Est: 3h, Actual: 3h)
- UI: notification on badge unlock (Est: 2h, Actual: 2h)
- Unit tests: badge unlocking conditions (Est: 2h, Actual: 2h)

### US 2.5 — Accept or Lock Recommended Adjustments
- UI: adjustment confirmation modal (Est: 4h, Actual: 4h)
- Backend: lock flag implementation + override logic (Est: 4h, Actual: 3h)
- UX messaging: warning when rejecting system suggestions (Est: 2h, Actual: 2h)
- Unit tests: lock behavior and persistence (Est: 2h, Actual: 2h)

### US 4.3 — View Achievement Gallery
- UI: gallery view displaying earned and locked badges (Est: 3h, Actual: 3h)
- UI: sorting and filtering (date/category) (Est: 2h, Actual: 2h)
- Data: fetch badge data from backend (Est: 2h, Actual: 2h)
- Unit tests: display correctness and ordering (Est: 1h, Actual: 1h)

### US 3.5 — Detect Missed Sessions
- Logic: detect skipped workouts based on schedule vs completion (Est: 4h, Actual: 4h)
- Backend: update streak and consistency metrics (Est: 3h, Actual: 3h)
- UI: reflect missed sessions on dashboard (Est: 2h, Actual: 2h)
- Unit tests: missed session detection accuracy (Est: 2h, Actual: 2h)

### US 3.2 — Review Workout History
- UI: chronological list of completed workouts (Est: 4h, Actual: 4h)
- UI: filtering by date range (Est: 2h, Actual: 2h)
- Backend: retrieve workout session history (Est: 3h, Actual: 2h)
- Unit tests: history retrieval and filtering (Est: 2h, Actual: 2h)

### US 4.1 — Earn Points for Workout Completion
- Logic: assign points per completed workout (Est: 3h, Actual: 3h)
- Backend: store and update user points (Est: 3h, Actual: 3h)
- UI: display points and updates after completion (Est: 2h, Actual: 2h)
- Unit tests: point calculation and duplication prevention (Est: 2h, Actual: 2h)
---

### Iteration 3 Reflection

**What Went Well**
- Successfully completed all remaining user stories, including previously unimplemented US 2.5, ensuring full feature coverage across all big stories  
- Strong integration between new gamification features (points, badges, challenges) and existing workout tracking system  
- UI consistency improved across dashboard, challenges, and achievement-related pages  
- Reuse of existing backend logic (e.g., workout completion, history, feedback) made implementation of ITR3 features more efficient  
- Final system testing and mock demo helped identify and fix last-minute bugs before submission  

**What Can Be Improved**
- Some features (e.g., challenges and achievements) could benefit from deeper integration with user feedback and schedule adaptation logic  
- Certain UI elements (e.g., badge gallery and challenge views) could be further refined for better visual clarity and responsiveness  
- Time estimates for some ITR3 features were slightly underestimated due to additional integration and debugging effort  
- More detailed documentation and comments could have been added during development instead of at the end of the iteration  
- Team coordination could be improved by tracking progress more frequently to avoid last-minute fixes and adjustments

---

# 6. Testing Summary (Unit Tests)
- **Test framework:** Python Django built-in test framework (`django.test`)
- **Test location:** `backend/api/tests/` (9 separate files)
- **Result:** All tests passing on latest ITR2 tag.

| Test File | Domain Covered | User Story |
|-----------|---------------|------------|
| `test_authentication.py` | Signup, login, logout, session management | US 1.1 |
| `test_profiles.py` | Profile creation, update, validation | US 1.2 |
| `test_workout_programs.py` | Program creation, editing, structure constraints | US 1.3 |
| `test_exercise_templates.py` | Workout template listing, filtering, selection | US 1.4 |
| `test_recommendations.py` | Recommendation logic based on profile attributes | US 1.6 |
| `test_schedules.py` | Schedule generation, regeneration, feedback integration | US 1.7, US 3.6, US 2.3 |
| `test_workout_sessions.py` | Session creation, tracking, and state updates | US 3.1 |
| `test_workoutcompletion.py` | Workout completion correctness and persistence | US 3.1 |
| `test_workout_history.py` | Retrieval and filtering of workout history | US 3.2 |
| `test_training_trends.py` | Trend calculations (streaks, totals, activity) | US 3.3 |
| `test_summary_dashboard.py` | Dashboard metrics aggregation and display data | US 3.4 |
| `test_challenges.py` | Challenge creation, participation, and tracking | US 4.4, US 4.5 |
| `test_rewards.py` | Points system and badge unlocking logic | US 4.1, US 4.2 |


**To run tests locally:**
```bash
# Start containers first
docker-compose up -d

# Then run tests
docker-compose exec backend python manage.py test api --verbosity=2
```

# 7. Release & Repository Notes

**Commit strategy:** frequent commits across team members throughout the iteration; avoided last-minute "mega commits".

**Tag:** ITR3 branch created on March 29, 2026 from the latest main branch after all ITR3 PRs were merged.


## Repo structure:

frontend/ — frontend container

frontend/src/ — frontend source code

backend/ — backend container

backend/api/ — backend source code

backend/api/tests/ — all test files

docs/ — planning documents (ITR0, ITR1, ITR2, ITR3)

GitHub Wiki — wiki + architecture sketch references

# 8. Concern / Challenge

All team members successfully delivered their assigned stories for the final iteration. Group dynamics remained strong, and there were no major blockers regarding project direction. However, finalizing the complex gamification and scheduling systems presented a few notable technical challenges that the team successfully navigated:


**Challenges Overcome in ITR3:**

- Edge Case Complexity in Gamification: Implementing the streak logic required precise date handling to ensure users weren't penalized for working out twice in one day, while accurately tracking missed sessions in the background.
- Database Performance: As the dashboard required more aggregated data (total time, points, badges), we had to refactor Python-level calculations into native Django ORM aggregations to prevent memory leaks and ensure the application scales smoothly.
- UI/UX Integration: Seamlessly blending Trainer-Hosted Challenges into the existing Weekly Challenges widget required careful frontend state management to prevent visual clutter on the dashboard.
