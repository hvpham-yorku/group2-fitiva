"""
Test Cases for Schedule Page
============================================================
Covers:
  US 1.5  – Browse Trainer Created Programs
  US 1.7  – Select Training Plan and Auto-Generate Weekly Schedule
  US 2.3  – Automatic Weekly Schedule Regeneration
  US 2.5  – Accept or Lock Recommended Plan Adjustments
  US 3.6  – Personalized Schedule from Selected Program
"""
import unittest

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta

from api.models import (
    UserProfile,
    TrainerProfile,
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
# BASE CLASS
# ============================================================================

class ScheduleUSBaseTest(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="test@example.com",
        )

        self.trainer = User.objects.create_user(
            username="trainer1",
            password="TrainerPass123!",
            email="trainer1@example.com",
            is_trainer=True,
        )

        self.other_trainer = User.objects.create_user(
            username="trainer2",
            password="TrainerPass123!",
            email="trainer2@example.com",
            is_trainer=True,
        )

        # Programs
        self.strength_program = WorkoutPlan.objects.create(
            name="Strength Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
            is_published=True,
        )

        self.cardio_program = WorkoutPlan.objects.create(
            name="Cardio Blast",
            trainer=self.trainer,
            focus=["cardio"],
            difficulty="intermediate",
            weekly_frequency=2,
            session_length=30,
            is_published=True,
        )

        self.other_program = WorkoutPlan.objects.create(
            name="Trainer 2 Program",
            trainer=self.other_trainer,
            focus=["balance"],
            difficulty="advanced",
            weekly_frequency=4,
            session_length=60,
            is_published=True,
        )

        # Sections
        self.monday_section = ProgramSection.objects.create(
            program=self.strength_program,
            format="Monday",
            type="Upper Body",
            is_rest_day=False,
            order=0,
        )

        ex = Exercise.objects.create(
            section=self.monday_section,
            name="Push Up",
            order=0,
        )

        ExerciseSet.objects.create(
            exercise=ex,
            set_number=1,
            reps=10,
            rest=60,
        )

        self.wednesday_section = ProgramSection.objects.create(
            program=self.strength_program,
            format="Wednesday",
            type="Lower Body",
            is_rest_day=False,
            order=1,
        )

        self.friday_section = ProgramSection.objects.create(
            program=self.strength_program,
            format="Friday",
            type="Full Body",
            is_rest_day=False,
            order=2,
        )

    # -------------------------
    # Helpers
    # -------------------------

    def _make_schedule(self):
        schedule = UserSchedule.objects.create(
            user=self.user,
            start_date=date.today(),
            is_active=True,
            weekly_schedule={
                "monday": [self.monday_section.id],
                "wednesday": [self.wednesday_section.id],
                "friday": [self.friday_section.id],
            },
            original_weekly_schedule={},
        )
        schedule.programs.add(self.strength_program)
        return schedule


# ============================================================================
# US 1.5 — Browse Programs
# ============================================================================

class BrowseTrainerProgramsTests(ScheduleUSBaseTest):

    def test_browse_returns_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f"/api/users/{self.trainer.id}/programs/")
        self.assertEqual(res.status_code, 200)

    def test_only_trainer_programs(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f"/api/users/{self.trainer.id}/programs/")
        ids = [p["id"] for p in res.data["programs"]]
        self.assertNotIn(self.other_program.id, ids)


# ============================================================================
# US 1.7 — Generate Schedule
# ============================================================================

class GenerateScheduleTests(ScheduleUSBaseTest):

    def test_create_schedule(self):
        self.client.force_authenticate(user=self.user)

        self.client.post(
            "/api/schedule/generate/",
            {"program_id": self.strength_program.id},
            format="json",
        )

        self.assertTrue(
            UserSchedule.objects.filter(user=self.user, is_active=True).exists()
        )


# ============================================================================
# US 2.3 — Regeneration
# ============================================================================

class RegenerationTests(ScheduleUSBaseTest):

    def setUp(self):
        super().setUp()
        self.schedule = self._make_schedule()
        self.client.force_authenticate(user=self.user)

    def test_preview_locked(self):
        self.schedule.adjustments_locked_until = date.today() + timedelta(days=3)
        self.schedule.save()

        res = self.client.post("/api/schedule/regenerate/preview/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["locked"])


# ============================================================================
# US 2.5 — Adjustments
# ============================================================================

class AdjustmentTests(ScheduleUSBaseTest):

    def setUp(self):
        super().setUp()
        self.schedule = self._make_schedule()
        self.client.force_authenticate(user=self.user)

    def test_rest_next(self):
        res = self.client.post(
            "/api/schedule/apply-recovery-option/",
            {
                "option_id": "rest_next",
                "affected_day": "monday",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)


# ============================================================================
# US 3.6 — Personalized Schedule
# ============================================================================

class PersonalizedScheduleTests(ScheduleUSBaseTest):

    def setUp(self):
        super().setUp()
        self.schedule = self._make_schedule()
        self.client.force_authenticate(user=self.user)

    def test_active_schedule(self):
        res = self.client.get("/api/schedule/active/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("schedule", res.data)

    def test_deactivate_schedule(self):
        res = self.client.delete("/api/schedule/deactivate/")
        self.assertEqual(res.status_code, 200)

        self.assertFalse(
            UserSchedule.objects.filter(user=self.user, is_active=True).exists()
        )


# ============================================================================
# SCHEDULE SELECTION FLOW
# ============================================================================

class ScheduleSelectionFlowTests(ScheduleUSBaseTest):
    """Tests for selecting a training plan and generating a weekly schedule."""

    def setUp(self):
        super().setUp()
        self.start_date = "2026-03-09"
        UserProfile.objects.create(
            user=self.user,
            age=22,
            experience_level="beginner",
            training_location="home",
            fitness_focus=["strength"],
        )
        UserProfile.objects.create(
            user=self.trainer,
            age=31,
            experience_level="advanced",
            training_location="gym",
            fitness_focus=["strength", "cardio"],
        )
        TrainerProfile.objects.create(
            user=self.trainer,
            bio="Certified trainer",
            years_of_experience=6,
            specialty_strength=True,
            specialty_cardio=True,
            certifications="NASM",
        )

    def test_user_selects_a_plan_and_generates_a_weekly_schedule(self):
        """User selects a workout plan and generates a weekly schedule."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "program_id": self.strength_program.id,
            "start_date": self.start_date,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Program added to your schedule")

        active_response = self.client.get("/api/schedule/active/")
        self.assertEqual(active_response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(active_response.data["schedule"])
        self.assertEqual(len(active_response.data["calendar_events"]), 28)

        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        self.assertIn(self.strength_program, schedule.programs.all())

    def test_generated_schedule_persists_after_logout_and_relogin(self):
        """Generated schedule persists after logout and re-login."""
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/schedule/generate/", {
            "program_id": self.strength_program.id,
            "start_date": self.start_date,
        }, format="json")

        before_logout = self.client.get("/api/schedule/active/")
        self.assertEqual(before_logout.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(before_logout.data["schedule"])

        self.client.post("/api/auth/logout/")
        login_response = self.client.post("/api/auth/login/", {
            "login": self.user.username,
            "password": "TestPass123!",
        }, format="json")
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        after_relogin = self.client.get("/api/schedule/active/")
        self.assertEqual(after_relogin.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(after_relogin.data["schedule"])

        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        self.assertIn(self.strength_program, schedule.programs.all())

    def test_confirmation_message_appears_after_plan_activation(self):
        """Confirmation message appears after successful plan activation."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "program_id": self.strength_program.id,
            "start_date": self.start_date,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Program added to your schedule")
        self.assertIn("schedule", response.data)

    @unittest.skip(
        "Schedule generation does not currently expose a profile-based decision trace "
        "that proves visible differences from experience level and training location."
    )
    def test_generated_schedule_reflects_experience_level_and_training_location(self):
        """Generated schedule reflects the user's experience level and training location."""

    @unittest.skip(
        "Sunday auto-regeneration requires a scheduler hook or time-freezing support "
        "which is not available in the current test harness."
    )
    def test_weekly_schedule_is_regenerated_automatically_on_sunday(self):
        """Weekly schedule is regenerated automatically on Sunday."""

    def test_user_cannot_generate_schedule_without_selecting_a_plan(self):
        """User cannot generate a schedule without selecting a plan."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/schedule/generate/", {
            "start_date": self.start_date,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("program_id is required", str(response.data))
        self.assertFalse(UserSchedule.objects.filter(user=self.user, is_active=True).exists())


# ============================================================================
# POST-WORKOUT FEEDBACK FLOW
# ============================================================================

class PostWorkoutFeedbackFlowTests(ScheduleUSBaseTest):
    """Tests for submitting post-workout feedback through the full session flow."""

    def setUp(self):
        super().setUp()
        self.start_date = "2026-03-09"
        self.monday = "2026-03-09"
        self.tuesday = "2026-03-10"
        self.thursday = "2026-03-12"

        # Add exercises to wednesday and friday sections
        wed_ex = Exercise.objects.create(section=self.wednesday_section, name="Squat", order=0)
        ExerciseSet.objects.create(exercise=wed_ex, set_number=1, reps=8, rest=60)

        fri_ex = Exercise.objects.create(section=self.friday_section, name="Burpee", order=0)
        ExerciseSet.objects.create(exercise=fri_ex, set_number=1, reps=12, rest=60)

        self.client.force_authenticate(user=self.user)
        self.client.post("/api/schedule/generate/", {
            "program_id": self.strength_program.id,
            "start_date": self.start_date,
        }, format="json")

    def test_user_submits_feedback_after_completing_a_workout(self):
        """User submits workout feedback successfully after completing a workout."""
        self.client.post(f"/api/sessions/start/{self.monday}/")
        complete_response = self.client.post(
            f"/api/sessions/complete/{self.monday}/",
            {"duration_minutes": 45},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)

        feedback_response = self.client.post(
            f"/api/sessions/feedback/{self.monday}/",
            {"difficulty_rating": 3, "notes": "Felt good"},
            format="json",
        )
        self.assertEqual(feedback_response.status_code, status.HTTP_201_CREATED)

        session = WorkoutSession.objects.get(user=self.user, date=date.fromisoformat(self.monday))
        self.assertTrue(session.is_completed)
        self.assertTrue(WorkoutFeedback.objects.filter(session=session).exists())

    def test_user_submits_feedback_with_fatigue_and_pain(self):
        """User submits feedback with fatigue and pain information."""
        self.client.post(f"/api/sessions/start/{self.monday}/")
        self.client.post(
            f"/api/sessions/complete/{self.monday}/",
            {"duration_minutes": 45},
            format="json",
        )

        feedback_response = self.client.post(
            f"/api/sessions/feedback/{self.monday}/",
            {
                "difficulty_rating": 5,
                "fatigue_level": 4,
                "pain_reported": True,
                "notes": "Knee pain",
            },
            format="json",
        )
        self.assertEqual(feedback_response.status_code, status.HTTP_201_CREATED)

        feedback = WorkoutFeedback.objects.get(
            session__user=self.user,
            session__date=date.fromisoformat(self.monday),
        )
        self.assertEqual(feedback.difficulty_rating, 5)
        self.assertEqual(feedback.fatigue_level, 4)
        self.assertTrue(feedback.pain_reported)

    @unittest.skip(
        "Skipping feedback is a GUI-only interaction (skip/close button). "
        "The API layer cannot simulate this flow."
    )
    def test_user_skips_feedback_after_completing_a_workout(self):
        """User skips feedback after completing a workout."""

    @unittest.skip(
        "Submission timing is a manual usability check. "
        "Backend request timing does not represent the full user interaction."
    )
    def test_user_submits_feedback_in_under_30_seconds(self):
        """User submits feedback in under 30 seconds."""

    def test_user_cannot_submit_feedback_for_incomplete_workout(self):
        """User cannot submit feedback for a workout that was not completed."""
        self.client.post(f"/api/sessions/start/{self.tuesday}/")

        feedback_response = self.client.post(
            f"/api/sessions/feedback/{self.tuesday}/",
            {"difficulty_rating": 3},
            format="json",
        )
        self.assertEqual(feedback_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            WorkoutFeedback.objects.filter(
                session__user=self.user,
                session__date=date.fromisoformat(self.tuesday),
            ).exists()
        )

    def test_feedback_remains_linked_to_correct_completed_workout(self):
        """Submitted feedback remains linked to the correct completed workout."""
        self.client.post(f"/api/sessions/start/{self.monday}/")
        self.client.post(
            f"/api/sessions/complete/{self.monday}/",
            {"duration_minutes": 45},
            format="json",
        )
        self.client.post(
            f"/api/sessions/feedback/{self.monday}/",
            {"difficulty_rating": 2, "notes": "Workout A"},
            format="json",
        )

        self.client.post(f"/api/sessions/start/{self.thursday}/")
        self.client.post(
            f"/api/sessions/complete/{self.thursday}/",
            {"duration_minutes": 30},
            format="json",
        )

        session_a = WorkoutSession.objects.get(
            user=self.user, date=date.fromisoformat(self.monday),
        )
        session_b = WorkoutSession.objects.get(
            user=self.user, date=date.fromisoformat(self.thursday),
        )

        self.assertTrue(WorkoutFeedback.objects.filter(session=session_a).exists())
        self.assertFalse(WorkoutFeedback.objects.filter(session=session_b).exists())
        self.assertEqual(session_a.feedback.notes, "Workout A")
