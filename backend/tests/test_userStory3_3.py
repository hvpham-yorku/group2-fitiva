from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import WorkoutSession

User = get_user_model()

class AnalyzeTrainingTrendsTests(APITestCase):
    """Test suite for US 3.3 - Analyze Training Trends (Dashboard Summary)"""

    def setUp(self):
        self.user = User.objects.create_user(username="trends_tester", password="Testpass123!", email="trends@fitiva.com")
        self.client.login(username="trends_tester", password="Testpass123!")
        self.today = timezone.now().date()

    # --- UNIT & INTEGRATION TESTS ---

    def test_dashboard_summary_populated(self):
        """Main Scenario: Dashboard natively aggregates completed workouts and accurately sums total time"""
        # Create 3 completed workouts totaling 95 minutes
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=2), status='completed', is_completed=True, duration_minutes=20)
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=1), status='completed', is_completed=True, duration_minutes=45)
        WorkoutSession.objects.create(user=self.user, date=self.today, status='completed', is_completed=True, duration_minutes=30)

        response = self.client.get("/api/dashboard/summary/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 3)
        self.assertEqual(response.data["total_time_trained"], 95)

    def test_dashboard_summary_empty_state(self):
        """Corner Case: New user with no history receives zeros without crashing"""
        response = self.client.get("/api/dashboard/summary/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 0)
        self.assertEqual(response.data["total_time_trained"], 0)

    def test_dashboard_ignores_incomplete_workouts(self):
        """Corner Case: In-progress or missed workouts must NOT inflate trend numbers"""
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=1), status='missed', is_completed=False, duration_minutes=45)
        WorkoutSession.objects.create(user=self.user, date=self.today, status='in_progress', is_completed=False, duration_minutes=20)

        response = self.client.get("/api/dashboard/summary/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 0)
        self.assertEqual(response.data["total_time_trained"], 0)