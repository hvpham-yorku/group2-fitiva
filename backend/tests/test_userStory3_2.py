from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import WorkoutSession

User = get_user_model()

class ReviewWorkoutHistoryTests(APITestCase):
    """Test suite for US 3.2 - Review Workout History"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="history_tester", 
            password="Testpass123!",
            email="history@fitiva.com"
        )
        self.client.login(username="history_tester", password="Testpass123!")
        
        self.today = timezone.now().date()
        
        # Inject historical data
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=5), status='completed', is_completed=True)
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=3), status='missed', is_completed=False)
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=1), status='in_progress', is_completed=False)
        WorkoutSession.objects.create(user=self.user, date=self.today, status='completed', is_completed=True)

    # --- UNIT & INTEGRATION TESTS ---

    def test_get_full_workout_history(self):
        """Main Scenario: Fetching history retrieves completed and missed workouts, ignoring in-progress, sorted by newest first"""
        response = self.client.get("/api/sessions/history/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 3)  # 2 completed + 1 missed
        
        # Check chronological ordering (newest first)
        sessions = response.data["sessions"]
        self.assertEqual(sessions[0]["date"], self.today.isoformat())
        self.assertEqual(sessions[1]["date"], (self.today - timedelta(days=3)).isoformat())

    def test_filter_workout_history_by_date_range(self):
        """Integration: Supplying start and end dates correctly filters the results"""
        start_date = (self.today - timedelta(days=4)).isoformat()
        end_date = (self.today - timedelta(days=2)).isoformat()
        
        url = f"/api/sessions/history/?start={start_date}&end={end_date}"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["sessions"][0]["status"], "missed")

    def test_history_inverted_date_guard(self):
        """Corner Case: Supplying an end date before a start date triggers a 400 Bad Request"""
        start_date = self.today.isoformat()
        end_date = (self.today - timedelta(days=5)).isoformat()
        
        url = f"/api/sessions/history/?start={start_date}&end={end_date}"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end date must be after start date", str(response.data))