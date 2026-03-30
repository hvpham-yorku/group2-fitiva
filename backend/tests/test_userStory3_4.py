from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import WorkoutSession, WorkoutPlan, UserSchedule

User = get_user_model()

class ProgressSummaryDashboardTests(APITestCase):
    """Test suite for US 3.4 - View Progress Summary Dashboard (User & Trainer)"""

    def setUp(self):
        # Setup Member
        self.member = User.objects.create_user(username="member_dash", password="Testpass123!", email="summary@fitiva.com")
        
        # Setup Trainer
        self.trainer = User.objects.create_user(username="trainer_dash", password="Testpass123!", email="summary2@fitiva.com", is_trainer=True)
        
        self.today = timezone.now().date()

    # --- UNIT & INTEGRATION TESTS ---

    def test_user_dashboard_metrics(self):
        """Main Scenario: User dashboard correctly summarizes key performance metrics"""
        self.client.login(username="member_dash", password="Testpass123!")
        
        # Create metrics data
        WorkoutSession.objects.create(user=self.member, date=self.today - timedelta(days=1), status='completed', is_completed=True, duration_minutes=50)
        WorkoutSession.objects.create(user=self.member, date=self.today, status='completed', is_completed=True, duration_minutes=40)

        response = self.client.get("/api/dashboard/summary/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 2)
        self.assertEqual(response.data["total_time_trained"], 90)

    def test_trainer_trainee_count_dashboard(self):
        """Main Scenario: Trainer dashboard correctly counts unique active trainees"""
        self.client.login(username="trainer_dash", password="Testpass123!")
        
        program = WorkoutPlan.objects.create(name="Trainer Plan", trainer=self.trainer, session_length=45, weekly_frequency=3)
        
        # Enroll the member in the trainer's program
        schedule = UserSchedule.objects.create(
            user=self.member, 
            start_date=self.today, 
            weekly_schedule={'monday': []}, 
            is_active=True
        )
        schedule.programs.add(program)

        response = self.client.get("/api/trainer/trainee-count/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["trainee_count"], 1)

    def test_member_cannot_access_trainer_dashboard(self):
        """Corner Case: Standard users attempting to view trainer metrics get blocked"""
        self.client.login(username="member_dash", password="Testpass123!")
        
        response = self.client.get("/api/trainer/trainee-count/")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Only trainers", str(response.data))