# Fitiva — Group 2 — Iteration 1 Log

## Team
- Ege Yesilyurt — 219701739 — egeyesss@my.yorku.ca  
- Weiqin Situ — 219720432 — ksitu@my.yorku.ca  
- Arshia Hassanpour — 219284272 — arshi79@my.yorku.ca  
- Raha Golsorkhi — 219763580 — raha9@my.yorku.ca  
- Dawood Al-Janaby — 219625417 — Dawood91@my.yorku.ca  
- Nurjahan Ahmed Shiah — 218802348 — nshiah49@my.yorku.ca  

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
  - `library/api.ts` → typed API functions (`authAPI`, `profileAPI`) + error handling
- **Reusable UI components:**
  - `components/ui/*` → Button/Input/Alert/Logo/Modals/Theme toggle components
- **Styling approach:**
  - One `.css` file per page/component plus `globals.css` for theme variables.

### Backend (Django) — `backend/api/`
- **Domain models:** `models.py`  
  Includes `CustomUser`, `UserProfile`, `TrainerProfile`, and workout program structure:
  `WorkoutPlan` → `ProgramSection` → `Exercise` → `ExerciseSet`, plus `ExerciseTemplate`.
- **Serialization layer:** `serializers.py`  
  Uses nested serializers for structured program creation (sections → exercises → sets).
- **HTTP/API layer:** `views.py` + `urls.py`  
  Implements endpoints for auth, profile CRUD, programs CRUD, and exercise template listing/search.
- **Automated tests:** `tests.py`  
  Covers authentication and profile operations for iteration 1.

## 1.3 Major Design Decisions (and Why)

### Decision A — “Real DB + Seeded Data” instead of a fake ArrayList stub
Although the course description allows a stub database, Fitiva uses a **Dockerized MySQL database** from the start to reduce integration risk later and to enable nested program persistence (plans → sections → exercises → sets).
- Benefit: avoids rewriting persistence logic in ITR2 when moving from stub to real DB.
- Risk mitigation: development remains reproducible via Docker Compose; schema is managed by migrations.

### Decision B — Session-based authentication (Django sessions)
We implemented **session cookies** (not JWT) for simpler secure local development and consistent server-side auth state.
- Frontend requests include cookies (`credentials: 'include'`) from the API client (`frontend/src/library/api.ts`).
- Backend provides `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.

### Decision C — Strong separation between UI state and backend data
- Auth state is centralized in `AuthContext`, preventing duplicate auth logic in each page.
- Protected pages are gated via `ProtectedRoute` so that access control is consistent.
- API calls are centralized in `library/api.ts`, enforcing typed request/response shapes.

### Decision D — Program modeling matches the product UX (Monday–Sunday)
Trainer program creation is structured around a weekly grid:
- A program always includes **7 days** (Monday–Sunday) using `ProgramSection.format`.
- “Rest days” are explicit (`is_rest_day`) and validated with warnings if exercises exist.
- Exercise ordering is preserved using `order` fields and UI drag-and-drop.

This aligns backend structure with the frontend builder UI so that saving/loading is stable.

### Decision E — Theme system via CSS variables (full dark mode)
Fitiva supports **full dark mode** across the entire app using CSS variables in `globals.css` and a `data-theme` attribute on `<html>`.
- Theme preference persists in `localStorage`.
- Theme switching is available for logged-in users (SettingsModal) and non-logged-in users (ThemeToggle on login/signup).
- All UI components reference variables (no hardcoded colors), ensuring consistency.

### Decision F — Drag-and-drop reordering uses native HTML5 API
We implemented drag-and-drop reordering of exercises **within a day** using the native HTML5 drag-and-drop API.
- We restrict moves to the same day to keep behavior predictable and reduce complexity in ITR1.
- Handlers are defined at the component level (not nested) to avoid React re-render issues.

## 1.4 Domain Model Rationale (Backend)
Key domain objects and why they exist:
- **CustomUser** with `is_trainer`: single user table supports both roles.
- **UserProfile**: captures workout preferences; auto-created at signup with `age=null` to detect incomplete profile.
- **TrainerProfile**: captures trainer public info (bio, specialties, certifications).
- **WorkoutPlan**: the top-level program entity; supports multi-focus via array field and `is_deleted` for soft-delete planning.
- **ProgramSection**: a “day” within the plan; supports explicit rest days.
- **Exercise / ExerciseSet**: represent ordered exercises and set-level details (reps/time/rest).
- **ExerciseTemplate**: searchable library to speed up program authoring.
- **WorkoutSession / WorkoutFeedback**: created for future stories (completion tracking + post-workout feedback) and aligns with Big Stories 2 & 3.
---

# 3. Plan Revision (ITR0 → ITR1)
This section documents what changed from the **Iteration 0 plan** to the **Iteration 1 plan**, and why.

## 3.1 Original Plan (ITR0 Snapshot)
**ITR1 User Stories included:**
- US 1.1 Register & Log In
- US 1.2 Create Fitness Profile
- US 1.3 View Profile-Based Recommendations
- US 1.4 Browse Trainer-Created Programs
- US 1.5 Select Plan + Auto-Generate Weekly Schedule

## 3.2 Revised Plan (ITR1 Updated)
**Changes introduced in ITR1 planning update:**
- Added **US 1.3: Create Programs from list of workouts** (trainer program builder)
- Added **US 1.4: View List of Workouts** (catalog of workouts)
- Reordered/renamed some stories for clearer scope:
  - Recommendations moved to **US 1.6**
  - Plan selection + schedule becomes **US 1.7**
- Added dashboard scheduling enhancement:
  - **US 3.6: Personalized Schedule from Selected Program** (calendar-style schedule view)

## 3.3 Rationale for Plan Changes
- The team needed an explicit workflow for trainers to build programs (US 1.3) and for users to browse workouts before committing (US 1.4).
- The schedule/calendar experience (US 3.6) was introduced to make weekly planning visible and testable in the UI early.

*(Keep both planning docs in the repo, e.g., `/docs/ITR0-Plan.md` and `/docs/ITR1-Plan.md` or similar.)*

---

# 4. Meeting Minutes

## Meeting 1 — Jan 14, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Reviewed Iteration 0 expectations and deliverables
- Drafted/confirmed team contract and collaboration norms
- Shared individual strengths and preferred tasks
- Set meeting cadence (2 meetings/week)
- Brainstormed potential project ideas and app name

**Decisions:**
- Agreed on meeting cadence and collaboration expectations
- Began ideation and direction-setting for project scope

## Meeting 2 — Jan 15, 2026
**Attendees:** All team members  
**Duration:** 15 minutes  
**Agenda:**
- Confirmed project topic and initial deliverable checklist
- Set up project tracking tools (Jira + GitHub repo structure)

**Decisions:**
- Jira board created and workflow started
- GitHub repository structure initialized

## Meeting 3 — Jan 21, 2026
**Attendees:** All team members  
**Duration:** 1 hour  
**Agenda:**
- Defined big stories and initial user stories
- Refined Fitiva vision statement and core features

**Decisions:**
- Finalized **4 big stories**
- Drafted **5–6 initial user stories**
- Vision statement completed

## Meeting 4 — Jan 23, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Reviewed Iteration 0 submission for completeness
- Planned and divided ITR1 tasks and stories

**Decisions:**
- Each team member assigned at least one user story for ITR1 implementation

## Meeting 5 — Jan 28, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Revised planning document for submission quality and clarity
- Confirmed estimates + scope for ITR1

**Decisions:**
- Team began implementation work on assigned stories

## Meeting 6 — Jan 30, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Environment setup using Docker
- Verified initial project runs in containers without blocking issues

**Decisions:**
- All members confirmed environment setup and started coding assigned tasks

## Meeting 7 — Feb 4, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Finalized logo + signature color for Fitiva
- Progress update: US 1.1 (Register/Login) completed

**Decisions:**
- Began moving to: US 1.2, 1.3, 1.4, 1.5, 1.6 (next implementation targets)

## Meeting 8 — Feb 6, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Implementation progress updates by each member
- Status: US 1.1, 1.2, 1.3 completed by this point

**Decisions:**
- Continued implementation on remaining assigned stories and integration work

## Meeting 9 — Feb 11, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Progress updates by each member
- Status: **US 1.4, 1.5, 1.6 completed by this point**

**Decisions:**
- Finish all ITR1 documentation
- Final coding touches for US 1.1–1.6
- Complete remaining work for US 3.1 and US 3.6

## Meeting 10 — Feb 13, 2026
**Attendees:** All team members  
**Duration:** 30 minutes  
**Agenda:**
- Final review of ITR1 documentation for submission readiness
- Demo/review: features for US 3.1 & US 3.6
- Assigned at least one story per member to begin ITR2 planning

**Decisions:**
- Iteration 2 user stories selected and initial assignments discussed

---

# 5. Task Assignments, Estimates, and Actuals (Per User Story)
> **Rule:** Include all planned tasks for ITR1 (done or not), and record estimate vs actual time.

## 5.1 Summary Table

| User Story | Owner(s) | Estimated Time | Status | Notes |
|------------|----------|---------------|--------|-------|
| US 1.1 – Register & Log In | Ege, Weiqin | 2 days | Completed | Full authentication system with password validation and session-based login |
| US 1.2 – Create Fitness Profile | Arshia, Raha | 2 days | Completed | Profile auto-created on signup, finished by user, editable via modal |
| US 1.3 – Create Programs | Ege, Weiqin | 3 days | Completed | Program creation (Mon–Sun structure), exercise library, sets config, drag-and-drop |
| US 1.4 – View List of Workouts | Ege | 2 days | Completed | Access list of default workouts or ones created by you |
| US 1.5 – Browse Trainer Created Programs | Shiah | 1 day | Completed | Browse all programs created by you or other trainers and choose which one to use |
| US 1.6 - Profile-Based Recommendations | Ege | 1 day | Completed | Matching workout programs with the same focus as user's preferred focus |
| US 3.1 – Record Workout Completion | Raha | 3 days | Completed | WorkoutSession model created; UI integration pending |
| US 3.6 – Personalized Calendar Schedule View | Shiah | 3 days | Completed | Weekly calendar UI planned; dynamic schedule generation pending |


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
- UI: program builder, section type/format, add exercises (Est: 6h, Actual: 8h)
- Domain model: Program, Section, ExerciseEntry (Est: 4h, Actual: 6h)
- Stub repository: seed workouts + programs (Est: 3h, Actual: 2h)
- Unit tests: program constraints (min 1 exercise, etc.) (Est: 1h, Actual: 2h)

### US 1.4 — View List of Workouts
- UI: workout catalog + filters + details (Est: 3h, Actual: 4h)
- Data: seeded workouts in stub DB (Est: 1h, Actual: 1h)
- Unit tests: filtering/sorting logic (Est: 1h, Actual: 1h)

### US 1.5 — Browse Trainer Programs
- UI: browse programs screen + program details (Est: 5h, Actual: 5h)
- Data: seeded trainer programs + subscription(?) labeling (Est: 2h, Actual: 1h)
- Unit tests: mapping/display logic (Est: 1h, Actual: 1h)

### US 1.6 — Profile-Based Recommendations
- Logic: recommendation rules (based on focus, level, location) (Est: 2h, Actual: 1h)
- UI: recommended list + plan preview (Est: 2h, Actual: 3h)
- Unit tests: rule coverage with multiple profiles (Est: 1h, Actual: 2h)

### US 3.1 — Record Workout Completion
- UI: daily workout view + completion action (Est: 5h, Actual: 5h)
- Domain/service: record completion + basic details (Est: 6h, Actual: 3h)
- Unit tests: completion record correctness (Est: 2h, Actual: 2h)

### US 3.6 — Personalized Schedule (Calendar View)
- UI: weekly calendar layout + click to view workout details (Est: 8h, Actual: 8h)
- Logic: generate events from schedule/program selection (Est: 4h, Actual: 4h)
- Unit tests: schedule generation mapping (Est: 3h, Actual: 3h)

---

# 6. Testing Summary (Unit Tests)
- Test framework used: Python tests using Django’s built-in test framework 
- Coverage focus:
  - Domain models (Profile, Program, Workout, Schedule)
  - Recommendation logic
  - Schedule generation and completion tracking
- Result: All tests passing on latest ITR1 tag.

*(to run tests locally: `docker-compose exec backend python manage.py test api --verbosity=2`)*
*(this will only work after running `docker-compose up -d` to start the containers)

---

# 7. Release & Repository Notes
- Commit strategy: frequent commits across team members; avoided last-minute “mega commits”.
- Tag: `ITR1` created on a commit **before** Feb 13, 2026 11:59 PM.
- Repo contains:
  - `frontend/` frontend container
  - `frontend/src` frontend source code
  - `backend/` backend container
  - `backend/api` backend source code
  - `backend/api/tests` test cases folder
  - `docs/` planning documents (ITR0 + ITR1 (log.md, etc.)
  - `Github Wiki` wiki + architecture sketch references

---

# 8. Concern/Challenge
we don't have any concerns with the project or group members.

---

# 9. Next Steps (Preview for ITR2)
- Identify ITR2 stories (assigned in Meeting 10)
- Plan improvements:
  - Expand tests and UI polish
  - Add dashboards rewards/reflection flows
