from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import WorkoutPlan, ProgramSection, UserSchedule

User = get_user_model()

class PersonalizedScheduleTests(APITestCase):
    """Test suite for US 3.6 - Personalized Schedule from Selected Program"""

    def setUp(self):
        self.user = User.objects.create_user(username="schedule_tester", password="Testpass123!", email="personalized@fitiva.com")
        self.client.login(username="schedule_tester", password="Testpass123!")
        
        self.trainer = User.objects.create_user(username="trainer_bob", password="Testpass123!", is_trainer=True)
        
        # Setup a mock program with 2 workout sections
        self.program = WorkoutPlan.objects.create(
            name="Hypertrophy Basics", 
            trainer=self.trainer, 
            session_length=45, 
            weekly_frequency=3
        )
        self.section1 = ProgramSection.objects.create(program=self.program, format="Upper Body", order=1, is_rest_day=False)
        self.section2 = ProgramSection.objects.create(program=self.program, format="Lower Body", order=2, is_rest_day=False)

    # --- UNIT & INTEGRATION TESTS ---

    def test_generate_personalized_schedule_success(self):
        """Main Scenario: User successfully generates a weekly schedule skipping specific rest days"""
        payload = {
            "program_id": self.program.id,
            "start_date": timezone.now().date().isoformat(),
            "rest_days": ["sunday", "wednesday"]
        }

        response = self.client.post("/api/schedule/generate/", payload, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("schedule", response.data)
        
        # Verify DB
        schedule = UserSchedule.objects.get(user=self.user, is_active=True)
        self.assertIn(self.program, schedule.programs.all())
        
        # Verify rest days were applied
        self.assertEqual(schedule.weekly_schedule["sunday"], [])
        self.assertEqual(schedule.weekly_schedule["wednesday"], [])

    def test_prevent_duplicate_program_in_schedule(self):
        """Corner Case: User cannot add the exact same program to their schedule twice"""
        # Add it once
        schedule = UserSchedule.objects.create(
            user=self.user, 
            start_date=timezone.now().date(), 
            weekly_schedule={}, 
            is_active=True
        )
        schedule.programs.add(self.program)

        # Try to add it again
        payload = {"program_id": self.program.id}
        response = self.client.post("/api/schedule/generate/", payload, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already in your schedule", str(response.data))

    def test_get_active_schedule_calendar_layout(self):
        """Integration: Fetching the active schedule returns structured calendar_events array"""
        schedule = UserSchedule.objects.create(
            user=self.user, 
            start_date=timezone.now().date(), 
            weekly_schedule={'monday': [self.section1.id], 'tuesday': []}, 
            is_active=True
        )

        response = self.client.get("/api/schedule/active/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the calendar layout formatting expected by the frontend
        self.assertIn("calendar_events", response.data)
        
        # Ensure 'monday' contains a 'workout' section type and 'tuesday' is a 'rest' type
        events = response.data["calendar_events"]
        monday_event = next((e for e in events if e["day"] == "monday"), None)
        tuesday_event = next((e for e in events if e["day"] == "tuesday"), None)
        
        self.assertEqual(monday_event["section_type"], "workout")
        self.assertEqual(monday_event["sections"][0]["name"], "Upper Body")
        
        self.assertEqual(tuesday_event["section_type"], "rest")
        self.assertEqual(len(tuesday_event["sections"]), 0)