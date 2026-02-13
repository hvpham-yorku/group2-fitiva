from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from api.models import WorkoutPlan, ProgramSection, UserSchedule

User = get_user_model()

# SCHEDULER TEST CASES

class ScheduleTests(APITestCase):
    """Test suite for user schedule management"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="test@example.com"
        )
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )
        
        self.program = WorkoutPlan.objects.create(
            name="Test Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )
        
        # Create sections for the program
        self.monday_section = ProgramSection.objects.create(
            program=self.program,
            format="Monday",
            type="Upper Body",
            is_rest_day=False,
            order=0
        )

    def test_generate_schedule(self):
        """Test generating a workout schedule"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            "program_id": self.program.id,
            "start_date": "2026-02-17"
        }
        
        response = self.client.post("/api/schedule/generate/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('schedule', response.data)
        
        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        self.assertTrue(schedule.is_active)
        self.assertIn(self.program, schedule.programs.all())

    def test_get_active_schedule(self):
        """Test retrieving active schedule"""
        self.client.force_authenticate(user=self.user)
        
        schedule = UserSchedule.objects.create(
            user=self.user,
            start_date=date.today(),
            is_active=True,
            weekly_schedule={}
        )
        schedule.programs.add(self.program)
        
        response = self.client.get("/api/schedule/active/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('schedule', response.data)
        self.assertIn('calendar_events', response.data)
