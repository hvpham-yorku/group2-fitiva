from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from api.models import (
    WorkoutPlan,
    ProgramSection,
    Exercise,
    ExerciseSet,
    UserSchedule,
    WorkoutSession,
)

User = get_user_model()

class UserStory31RecordWorkoutCompletionTests(APITestCase):
    """Test suite for User Story 3.1: Record Workout Completion (ITR1)"""

    def setUp(self):
        """Set up a user, trainer, a scheduled workout (with sets/reps/rest), and an active schedule"""
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="test@example.com",
            is_trainer=False
        )
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )

        self.client.force_authenticate(user=self.user)

        # Create a workout program and a section with exercises + sets
        self.program = WorkoutPlan.objects.create(
            name="US3.1 Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
            is_deleted=False
        )

        self.section = ProgramSection.objects.create(
            program=self.program,
            format="Today",
            type="Upper Body",
            is_rest_day=False,
            order=0
        )

        self.exercise = Exercise.objects.create(
            section=self.section,
            name="Push-ups",
            order=0
        )

        ExerciseSet.objects.create(
            exercise=self.exercise,
            set_number=1,
            reps=10,
            time=None,
            rest=60
        )
        ExerciseSet.objects.create(
            exercise=self.exercise,
            set_number=2,
            reps=12,
            time=None,
            rest=90
        )

        self.today = date.today()
        self.today_str = self.today.isoformat()
        self.day_name = self.today.strftime("%A").lower()

        # Active schedule: put today's section in today's weekday slot
        weekly_schedule = {
            "monday": [],
            "tuesday": [],
            "wednesday": [],
            "thursday": [],
            "friday": [],
            "saturday": [],
            "sunday": []
        }
        weekly_schedule[self.day_name] = [self.section.id]

        self.schedule = UserSchedule.objects.create(
            user=self.user,
            start_date=self.today,
            weekly_schedule=weekly_schedule,
            is_active=True
        )
        self.schedule.programs.add(self.program)


    # Mark workout as completed + log basic details

    def test_complete_workout_marks_session_completed_and_logs_details(self):
        """Test marking workout completed saves status, duration_minutes and notes"""
        data = {"duration_minutes": 45, "notes": "Felt strong today"}
        response = self.client.post(f"/api/sessions/complete/{self.today_str}/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertTrue(response.data["is_completed"])
        self.assertEqual(response.data["duration_minutes"], 45)
        self.assertEqual(response.data["notes"], "Felt strong today")

        # Verify DB state
        session = WorkoutSession.objects.get(user=self.user, date=self.today)
        self.assertEqual(session.status, "completed")
        self.assertTrue(session.is_completed)
        self.assertEqual(session.duration_minutes, 45)
        self.assertEqual(session.notes, "Felt strong today")

    def test_workout_for_date_includes_session_status_after_completion(self):
        """Test training history accuracy: workout-for-date includes session_status after completion"""
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 20},
            format="json"
        )

        response = self.client.get(f"/api/schedule/workout/{self.today_str}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["session_status"], "completed")

    def test_complete_rejects_non_integer_duration(self):
        """Test duration_minutes must be an integer"""
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": "forty"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)