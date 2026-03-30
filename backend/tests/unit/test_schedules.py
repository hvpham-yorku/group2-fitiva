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