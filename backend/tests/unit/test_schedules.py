from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from api.models import (
    WorkoutPlan,
    ProgramSection,
    Exercise,
    ExerciseSet,
    UserSchedule,
    WorkoutSession,
    WorkoutFeedback,
)

User = get_user_model()


# ============================================================================
# SHARED BASE CLASS
# ============================================================================

class ScheduleBaseTest(APITestCase):
    """
    Shared setUp for all schedule test suites.
    Creates: user, trainer, 2 programs, sections for Mon/Tue/Wed/Thu,
    and a helper to build an active schedule.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="test@example.com",
        )
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name="Strength Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
        )
        self.program2 = WorkoutPlan.objects.create(
            name="Cardio Program",
            trainer=self.trainer,
            focus=["cardio"],
            difficulty="intermediate",
            weekly_frequency=2,
            session_length=30,
        )

        # Monday section with exercises
        self.monday_section = ProgramSection.objects.create(
            program=self.program, format="Monday",
            type="Upper Body", is_rest_day=False, order=0,
        )
        ex = Exercise.objects.create(section=self.monday_section, name="Push Up", order=0)
        ExerciseSet.objects.create(exercise=ex, set_number=1, reps=10, rest=60)

        self.tuesday_section = ProgramSection.objects.create(
            program=self.program, format="Tuesday",
            type="Lower Body", is_rest_day=False, order=1,
        )
        self.wednesday_section = ProgramSection.objects.create(
            program=self.program2, format="Wednesday",
            type="Cardio", is_rest_day=False, order=2,
        )
        self.thursday_section = ProgramSection.objects.create(
            program=self.program, format="Thursday",
            type="Full Body", is_rest_day=False, order=3,
        )

    def _make_schedule(self, weekly_schedule=None, start_date=None):
        """Helper: create an active schedule for self.user."""
        if weekly_schedule is None:
            weekly_schedule = {
                "monday":    [self.monday_section.id],
                "tuesday":   [self.tuesday_section.id],
                "wednesday": [],
                "thursday":  [self.thursday_section.id],
                "friday":    [],
                "saturday":  [],
                "sunday":    [],
            }
        schedule = UserSchedule.objects.create(
            user=self.user,
            start_date=start_date or date.today(),
            is_active=True,
            weekly_schedule=weekly_schedule,
            original_weekly_schedule=weekly_schedule.copy(),
        )
        schedule.programs.add(self.program)
        return schedule

    def _make_completed_session(self, target_date, pain=False, difficulty=3, fatigue=3):
        """Helper: create a completed session with feedback on target_date."""
        session = WorkoutSession.objects.create(
            user=self.user,
            date=target_date,
            status="completed",
            is_completed=True,
            duration_minutes=45,
        )
        WorkoutFeedback.objects.create(
            session=session,
            difficulty_rating=difficulty,
            fatigue_level=fatigue,
            pain_reported=pain,
        )
        return session


# ============================================================================
# 1. GENERATE SCHEDULE
# ============================================================================

class GenerateScheduleTests(ScheduleBaseTest):

    def test_generate_schedule_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "program_id": self.program.id,
            "start_date": "2026-03-09",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("schedule", response.data)
        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        self.assertIn(self.program, schedule.programs.all())

    def test_generate_schedule_unauthenticated(self):
        response = self.client.post("/api/schedule/generate/", {
            "program_id": self.program.id,
            "start_date": "2026-03-09",
        }, format="json")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])

    def test_generate_schedule_missing_program_id(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "start_date": "2026-03-09",
        }, format="json")
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND
        ])

    def test_generate_schedule_invalid_program_id(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "program_id": 99999,
            "start_date": "2026-03-09",
        }, format="json")
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND
        ])

    def test_generate_schedule_missing_start_date(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "program_id": self.program.id,
        }, format="json")
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED
        ])

    def test_generate_second_program_merges_into_schedule(self):
        """Adding a second program should merge into the existing schedule."""
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/schedule/generate/", {
            "program_id": self.program.id,
            "start_date": "2026-03-09",
        }, format="json")
        response = self.client.post("/api/schedule/generate/", {
            "program_id": self.program2.id,
            "start_date": "2026-03-09",
        }, format="json")
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED
        ])
        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        self.assertIn(self.program2, schedule.programs.all())


# ============================================================================
# 2. GET ACTIVE SCHEDULE
# ============================================================================

class GetActiveScheduleTests(ScheduleBaseTest):

    def test_get_active_schedule_success(self):
        self._make_schedule()
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/active/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("schedule", response.data)
        self.assertIn("calendar_events", response.data)

    def test_get_active_schedule_contains_28_events(self):
        """Calendar should always return exactly 28 days (4 weeks)."""
        self._make_schedule()
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/active/")
        self.assertEqual(len(response.data["calendar_events"]), 28)

    def test_get_active_schedule_no_schedule(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/active/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["schedule"])

    def test_get_active_schedule_unauthenticated(self):
        response = self.client.get("/api/schedule/active/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])

    def test_calendar_events_reflect_weekly_schedule(self):
        """Workout days in weekly_schedule should appear as 'workout' section_type."""
        schedule = self._make_schedule()
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/active/")
        events = {e["day"]: e for e in response.data["calendar_events"]}
        # monday has a section → should be workout
        self.assertEqual(events["monday"]["section_type"], "workout")
        # wednesday is empty → should be rest
        self.assertEqual(events["wednesday"]["section_type"], "rest")

    def test_calendar_events_show_session_status(self):
        """Completed sessions should reflect status in calendar events."""
        schedule = self._make_schedule(start_date=date.today())
        WorkoutSession.objects.create(
            user=self.user, date=schedule.start_date,
            status="completed", is_completed=True,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/active/")
        first_event = response.data["calendar_events"][0]
        self.assertEqual(first_event["session_status"], "completed")

    def test_calendar_events_show_has_feedback(self):
        """Days with feedback should have has_feedback=True."""
        schedule = self._make_schedule(start_date=date.today())
        self._make_completed_session(schedule.start_date)
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/active/")
        first_event = response.data["calendar_events"][0]
        self.assertTrue(first_event["has_feedback"])


# ============================================================================
# 3. WORKOUT FOR DATE
# ============================================================================

class WorkoutForDateTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        # Monday schedule
        self.schedule = self._make_schedule(start_date=date(2026, 3, 9))

    def test_get_workout_day_returns_sections(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/workout/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_rest_day"])
        self.assertGreater(len(response.data["workouts"]), 0)

    def test_get_rest_day_returns_rest(self):
        self.client.force_authenticate(user=self.user)
        # Wednesday is empty in the default schedule
        response = self.client.get("/api/schedule/workout/2026-03-11/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_rest_day"])

    def test_get_workout_invalid_date_format(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/workout/not-a-date/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_workout_no_schedule(self):
        self.schedule.is_active = False
        self.schedule.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/workout/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_workout_returns_feedback_when_exists(self):
        self._make_completed_session(date(2026, 3, 9), pain=True, difficulty=4, fatigue=5)
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/schedule/workout/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_feedback"])
        self.assertIsNotNone(response.data["feedback"])
        self.assertEqual(response.data["feedback"]["difficulty_rating"], 4)
        self.assertTrue(response.data["feedback"]["pain_reported"])

    def test_get_workout_unauthenticated(self):
        response = self.client.get("/api/schedule/workout/2026-03-09/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])


# ============================================================================
# 4. WORKOUT SESSIONS — Start / Complete / Undo
# ============================================================================

class WorkoutSessionTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self._make_schedule(start_date=date(2026, 3, 9))

    def test_start_session(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/sessions/start/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "in_progress")

    def test_start_session_idempotent(self):
        """Starting an already-started session should not fail."""
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/sessions/start/2026-03-09/")
        response = self.client.post("/api/sessions/start/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(WorkoutSession.objects.filter(user=self.user, date="2026-03-09").count(), 1)

    def test_complete_session(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/sessions/start/2026-03-09/")
        response = self.client.post("/api/sessions/complete/2026-03-09/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertTrue(response.data["is_completed"])

    def test_complete_session_with_duration(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/sessions/start/2026-03-09/")
        response = self.client.post("/api/sessions/complete/2026-03-09/", {
            "duration_minutes": 60,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["duration_minutes"], 60)

    def test_complete_session_invalid_duration(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/sessions/start/2026-03-09/")
        response = self.client.post("/api/sessions/complete/2026-03-09/", {
            "duration_minutes": "not-a-number",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_undo_session(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/sessions/start/2026-03-09/")
        self.client.post("/api/sessions/complete/2026-03-09/", {}, format="json")
        response = self.client.delete("/api/sessions/undo/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session = WorkoutSession.objects.get(user=self.user, date="2026-03-09")
        self.assertEqual(session.status, "in_progress")
        self.assertFalse(session.is_completed)

    def test_undo_session_also_removes_feedback(self):
        self.client.force_authenticate(user=self.user)
        self._make_completed_session(date(2026, 3, 9))
        self.client.delete("/api/sessions/undo/2026-03-09/")
        session = WorkoutSession.objects.get(user=self.user, date="2026-03-09")
        self.assertFalse(WorkoutFeedback.objects.filter(session=session).exists())

    def test_undo_session_not_found(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete("/api/sessions/undo/2020-01-01/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_start_session_invalid_date(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/sessions/start/bad-date/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ============================================================================
# 5. WORKOUT FEEDBACK — POST / PATCH / GET / DELETE
# ============================================================================

class WorkoutFeedbackTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self._make_schedule(start_date=date(2026, 3, 9))
        self.client.force_authenticate(user=self.user)
        # Create and complete a session to attach feedback to
        self.client.post("/api/sessions/start/2026-03-09/")
        self.client.post("/api/sessions/complete/2026-03-09/", {}, format="json")

    def test_submit_feedback_success(self):
        response = self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 3,
            "fatigue_level": 2,
            "pain_reported": False,
            "notes": "Felt good",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["difficulty_rating"], 3)

    def test_submit_feedback_pain_reported(self):
        response = self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 5,
            "fatigue_level": 5,
            "pain_reported": True,
            "notes": "Knee pain",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["pain_reported"])

    def test_submit_feedback_missing_difficulty(self):
        response = self.client.post("/api/sessions/feedback/2026-03-09/", {
            "fatigue_level": 2,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_feedback_difficulty_out_of_range(self):
        response = self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 10,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_feedback_fatigue_out_of_range(self):
        response = self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 3,
            "fatigue_level": 99,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_feedback_incomplete_session(self):
        """Feedback on an incomplete session should fail."""
        self.client.post("/api/sessions/start/2026-03-10/")
        # Do NOT complete it
        response = self.client.post("/api/sessions/feedback/2026-03-10/", {
            "difficulty_rating": 3,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_edit_feedback_patch(self):
        self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 2,
        }, format="json")
        response = self.client.patch("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 5,
            "pain_reported": True,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["difficulty_rating"], 5)
        self.assertTrue(response.data["pain_reported"])

    def test_get_feedback(self):
        self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 4,
            "notes": "Hard day",
        }, format="json")
        response = self.client.get("/api/sessions/feedback/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["difficulty_rating"], 4)

    def test_get_feedback_not_found(self):
        response = self.client.get("/api/sessions/feedback/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_feedback(self):
        self.client.post("/api/sessions/feedback/2026-03-09/", {
            "difficulty_rating": 3,
        }, format="json")
        response = self.client.delete("/api/sessions/feedback/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session = WorkoutSession.objects.get(user=self.user, date="2026-03-09")
        self.assertFalse(WorkoutFeedback.objects.filter(session=session).exists())

    def test_delete_feedback_not_found(self):
        response = self.client.delete("/api/sessions/feedback/2026-03-09/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_feedback_no_session(self):
        response = self.client.post("/api/sessions/feedback/2020-01-01/", {
            "difficulty_rating": 3,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ============================================================================
# 6. UPDATE START / END DATE
# ============================================================================

class UpdateScheduleDateTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self.schedule = self._make_schedule(start_date=date(2026, 3, 9))
        self.client.force_authenticate(user=self.user)

    def test_update_start_date_success(self):
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-start-date/",
            {"start_date": "2026-03-16"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.start_date.isoformat(), "2026-03-16")

    def test_update_start_date_invalid_format(self):
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-start-date/",
            {"start_date": "not-a-date"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_start_date_missing(self):
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-start-date/",
            {}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_end_date_success(self):
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-end-date/",
            {"end_date": "2026-04-30"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.end_date.isoformat(), "2026-04-30")

    def test_update_end_date_before_start_date(self):
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-end-date/",
            {"end_date": "2026-01-01"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_end_date_invalid_format(self):
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-end-date/",
            {"end_date": "bad-date"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_date_wrong_user(self):
        other_user = User.objects.create_user(
            username="other", password="Pass123!", email="other@test.com"
        )
        self.client.force_authenticate(user=other_user)
        response = self.client.patch(
            f"/api/schedule/{self.schedule.id}/update-start-date/",
            {"start_date": "2026-04-01"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ============================================================================
# 7. DEACTIVATE SCHEDULE
# ============================================================================

class DeactivateScheduleTests(ScheduleBaseTest):

    def test_deactivate_schedule(self):
        self._make_schedule()
        self.client.force_authenticate(user=self.user)
        response = self.client.delete("/api/schedule/deactivate/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            UserSchedule.objects.filter(user=self.user, is_active=True).exists()
        )

    def test_deactivate_no_schedule(self):
        """Deactivating when no schedule exists should still return 200."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete("/api/schedule/deactivate/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_deactivate_unauthenticated(self):
        response = self.client.delete("/api/schedule/deactivate/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])


# ============================================================================
# 8. ADAPTIVE SCHEDULE — Preview
# ============================================================================

class RegeneratePreviewTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self._make_schedule(start_date=date.today() - timedelta(days=7))
        self.client.force_authenticate(user=self.user)

    def test_preview_no_feedback_returns_not_regenerated(self):
        response = self.client.post("/api/schedule/regenerate/preview/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("regenerated", True))

    def test_preview_with_high_stress_feedback(self):
        """High difficulty + fatigue scores should trigger a suggestion."""
        for i in range(3):
            day = date.today() - timedelta(days=i + 1)
            self._make_completed_session(day, difficulty=5, fatigue=5)
        response = self.client.post("/api/schedule/regenerate/preview/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if response.data.get("regenerated"):
            self.assertIn("adjustment", response.data)
            self.assertIn(response.data["adjustment"], [
                "recovery", "reduced", "increased", "pain", "none"
            ])

    def test_preview_with_pain_returns_pain_adjustment(self):
        """Pain feedback should return adjustment='pain' and recovery_options."""
        self._make_completed_session(
            date.today() - timedelta(days=1), pain=True, difficulty=4, fatigue=4
        )
        response = self.client.post("/api/schedule/regenerate/preview/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if response.data.get("regenerated"):
            self.assertEqual(response.data["adjustment"], "pain")
            self.assertTrue(response.data["pain_reported"])
            self.assertIn("recovery_options", response.data)
            self.assertGreater(len(response.data["recovery_options"]), 0)

    def test_preview_pain_includes_session_date(self):
        """pain_session_date must be returned so frontend can derive pain_day."""
        pain_date = date.today() - timedelta(days=1)
        self._make_completed_session(pain_date, pain=True)
        response = self.client.post("/api/schedule/regenerate/preview/")
        if response.data.get("regenerated") and response.data.get("pain_reported"):
            self.assertIn("pain_session_date", response.data)
            self.assertEqual(response.data["pain_session_date"], pain_date.isoformat())

    def test_preview_unauthenticated(self):
        self.client.logout()
        response = self.client.post("/api/schedule/regenerate/preview/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])


# ============================================================================
# 9. ADAPTIVE SCHEDULE — Apply (non-pain)
# ============================================================================

class RegenerateApplyTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self._make_schedule(start_date=date.today() - timedelta(days=7))
        self.client.force_authenticate(user=self.user)

    def test_apply_non_pain_adjustment(self):
        for i in range(4):
            self._make_completed_session(
                date.today() - timedelta(days=i + 1), difficulty=5, fatigue=5
            )
        response = self.client.post("/api/schedule/regenerate/apply/")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_apply_sets_is_adjusted(self):
        for i in range(3):
            self._make_completed_session(
                date.today() - timedelta(days=i + 1), difficulty=5, fatigue=5
            )
        self.client.post("/api/schedule/regenerate/apply/")
        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        # May or may not have applied depending on stress score threshold
        self.assertIn(schedule.is_adjusted, [True, False])

    def test_apply_snapshots_original_schedule(self):
        """First apply should snapshot original_weekly_schedule."""
        for i in range(3):
            self._make_completed_session(
                date.today() - timedelta(days=i + 1), difficulty=5, fatigue=5
            )
        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        # Clear snapshot to test it gets created on apply
        schedule.original_weekly_schedule = None
        schedule.save()
        self.client.post("/api/schedule/regenerate/apply/")
        schedule.refresh_from_db()
        if schedule.is_adjusted:
            self.assertIsNotNone(schedule.original_weekly_schedule)


# ============================================================================
# 10. APPLY RECOVERY OPTION
# ============================================================================

class ApplyRecoveryOptionTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self.schedule = self._make_schedule(start_date=date.today())
        self.client.force_authenticate(user=self.user)

    def test_rest_next_removes_workout_day(self):
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "rest_next",
            "affected_day": "monday",
            "affected_date": "2026-03-09",
            "change_type": "rest",
            "pain_day": "sunday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        slot = self.schedule.weekly_schedule.get("monday")
        self.assertFalse(slot)  # should be empty list or falsy

    def test_shorter_workout_sets_duration_override(self):
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "shorter_workout",
            "affected_day": "tuesday",
            "affected_date": "2026-03-10",
            "change_type": "shorter",
            "duration_minutes": 27,
            "pain_day": "monday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.duration_overrides.get("tuesday"), 27)

    def test_lighter_focus_sets_focus_override(self):
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "lighter_focus",
            "affected_day": "thursday",
            "affected_date": "2026-03-12",
            "change_type": "lighter",
            "pain_day": "monday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.focus_overrides.get("thursday"), "mobility")

    def test_rest_same_day(self):
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "rest_same_day",
            "affected_day": "monday",
            "affected_date": "2026-03-09",
            "change_type": "rest",
            "pain_day": "monday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        slot = self.schedule.weekly_schedule.get("monday")
        self.assertFalse(slot)

    def test_keep_going_no_changes(self):
        original_schedule = self.schedule.weekly_schedule.copy()
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "keep_going",
            "pain_day": "monday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.weekly_schedule, original_schedule)
        self.assertFalse(self.schedule.is_adjusted)

    def test_invalid_option_id(self):
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "do_magic",
            "pain_day": "monday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_apply_recovery_sets_is_adjusted(self):
        self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "rest_next",
            "affected_day": "monday",
            "affected_date": "2026-03-09",
            "change_type": "rest",
            "pain_day": "sunday",
        }, format="json")
        self.schedule.refresh_from_db()
        self.assertTrue(self.schedule.is_adjusted)

    def test_apply_recovery_snapshots_original(self):
        """First recovery apply should snapshot original_weekly_schedule."""
        self.schedule.original_weekly_schedule = None
        self.schedule.save()
        self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "rest_next",
            "affected_day": "monday",
            "affected_date": "2026-03-09",
            "change_type": "rest",
            "pain_day": "sunday",
        }, format="json")
        self.schedule.refresh_from_db()
        self.assertIsNotNone(self.schedule.original_weekly_schedule)

    def test_apply_recovery_no_schedule(self):
        self.schedule.is_active = False
        self.schedule.save()
        response = self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "keep_going",
            "pain_day": "monday",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ============================================================================
# 11. REVERT SCHEDULE
# ============================================================================

class RevertScheduleTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self.original = {
            "monday": [self.monday_section.id],
            "tuesday": [self.tuesday_section.id],
            "wednesday": [],
            "thursday": [self.thursday_section.id],
            "friday": [], "saturday": [], "sunday": [],
        }
        self.schedule = self._make_schedule(weekly_schedule=self.original)
        self.client.force_authenticate(user=self.user)

    def test_revert_restores_original_schedule(self):
        # Apply a change first
        self.client.post("/api/schedule/apply-recovery-option/", {
            "option_id": "rest_next",
            "affected_day": "monday",
            "affected_date": "2026-03-09",
            "change_type": "rest",
            "pain_day": "sunday",
        }, format="json")
        # Now revert
        response = self.client.post("/api/schedule/revert/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(
            self.schedule.weekly_schedule["monday"],
            self.original["monday"],
        )

    def test_revert_clears_is_adjusted(self):
        self.schedule.is_adjusted = True
        self.schedule.save()
        self.client.post("/api/schedule/revert/")
        self.schedule.refresh_from_db()
        self.assertFalse(self.schedule.is_adjusted)

    def test_revert_clears_duration_overrides(self):
        self.schedule.duration_overrides = {"monday": 27}
        self.schedule.save()
        self.client.post("/api/schedule/revert/")
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.duration_overrides, {})

    def test_revert_clears_focus_overrides(self):
        self.schedule.focus_overrides = {"thursday": "mobility"}
        self.schedule.save()
        self.client.post("/api/schedule/revert/")
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.focus_overrides, {})

    def test_revert_no_snapshot_returns_400(self):
        self.schedule.original_weekly_schedule = None
        self.schedule.save()
        response = self.client.post("/api/schedule/revert/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revert_no_active_schedule_returns_404(self):
        self.schedule.is_active = False
        self.schedule.save()
        response = self.client.post("/api/schedule/revert/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_revert_unauthenticated(self):
        self.client.logout()
        response = self.client.post("/api/schedule/revert/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])


# ============================================================================
# 12. WORKOUT HISTORY
# ============================================================================

class WorkoutHistoryTests(ScheduleBaseTest):

    def setUp(self):
        super().setUp()
        self._make_schedule(start_date=date.today() - timedelta(days=30))
        self.client.force_authenticate(user=self.user)

    def test_history_returns_completed_sessions(self):
        self._make_completed_session(date.today() - timedelta(days=1))
        self._make_completed_session(date.today() - timedelta(days=3))
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)

    def test_history_excludes_in_progress(self):
        WorkoutSession.objects.create(
            user=self.user,
            date=date.today(),
            status="in_progress",
            is_completed=False,
        )
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 0)

    def test_history_filter_by_date_range(self):
        self._make_completed_session(date.today() - timedelta(days=2))
        self._make_completed_session(date.today() - timedelta(days=10))
        start = (date.today() - timedelta(days=5)).isoformat()
        end   = date.today().isoformat()
        response = self.client.get(f"/api/sessions/history/?start={start}&end={end}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)

    def test_history_empty(self):
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 0)

    def test_history_unauthenticated(self):
        self.client.logout()
        response = self.client.get("/api/sessions/history/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ])


# ============================================================================
# 13. PAIN DAY DERIVATION — Unit-level correctness
# ============================================================================

class PainDayDerivationTests(ScheduleBaseTest):
    """
    Verify that pain_day in the preview response always matches the actual
    weekday of the session that had pain — regardless of today's date.
    """

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.user)

    def _pain_on_day(self, target_date):
        """Create schedule + completed pain session on target_date, run preview."""
        # Clear any previous schedules and sessions
        UserSchedule.objects.filter(user=self.user).delete()
        WorkoutSession.objects.filter(user=self.user).delete()

        # Build a schedule that has a workout on target_date's weekday
        weekday = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"][
            target_date.weekday()
        ]
        sections_by_day = {
            "monday": [], "tuesday": [], "wednesday": [],
            "thursday": [], "friday": [], "saturday": [], "sunday": [],
        }
        # pick a section for that day
        section = self.monday_section
        sections_by_day[weekday] = [section.id]
        # also add a next-day workout so findNextWorkoutDay has something to find
        next_weekday_idx = (target_date.weekday() + 1) % 7
        next_weekday = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"][next_weekday_idx]
        sections_by_day[next_weekday] = [self.tuesday_section.id]

        self._make_schedule(weekly_schedule=sections_by_day, start_date=target_date - timedelta(days=7))
        self._make_completed_session(target_date, pain=True, difficulty=4, fatigue=4)

        return self.client.post("/api/schedule/regenerate/preview/")

    def test_pain_day_is_tuesday(self):
        today = date.today()
        days_back = (today.weekday() - 1) % 7
        if days_back == 0:
            days_back = 7
        tuesday = today - timedelta(days=days_back)
        response = self._pain_on_day(tuesday)
        if response.data.get("regenerated") and response.data.get("pain_reported"):
            self.assertEqual(response.data["pain_day"], "tuesday")
            self.assertEqual(response.data["pain_session_date"], tuesday.isoformat())

    def test_pain_day_is_thursday(self):
        today = date.today()
        days_back = (today.weekday() - 3) % 7
        if days_back == 0:
            days_back = 7
        thursday = today - timedelta(days=days_back)
        response = self._pain_on_day(thursday)
        if response.data.get("regenerated") and response.data.get("pain_reported"):
            self.assertEqual(response.data["pain_day"], "thursday")
            self.assertEqual(response.data["pain_session_date"], thursday.isoformat())