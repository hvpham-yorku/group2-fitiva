from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import WorkoutSession, UserPoints, PointTransaction

User = get_user_model()

class EarnPointsTests(APITestCase):
    """Test suite for US 4.1 - Earn Points for Workout Completion"""

    def setUp(self):
        self.user = User.objects.create_user(username="points_tester", password="Testpass123!", email="workout@fitiva.com")
        self.client.login(username="points_tester", password="Testpass123!")
        self.today = timezone.now().date()
        self.today_str = self.today.isoformat()

    # --- UNIT & INTEGRATION TESTS ---

    def test_base_points_awarded(self):
        """Main Scenario: A standard workout (< 45 mins, no streak) awards 10 base points"""
        url = f"/api/sessions/complete/{self.today_str}/"
        response = self.client.post(url, {"duration_minutes": 30}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["points_awarded"], 10)
        self.assertEqual(response.data["total_points"], 10)
        
        # Verify DB state
        self.assertTrue(PointTransaction.objects.filter(user=self.user, points_awarded=10).exists())

    def test_long_session_bonus_points(self):
        """Integration: Workouts 45 minutes or longer award a +5 point bonus (15 total)"""
        url = f"/api/sessions/complete/{self.today_str}/"
        response = self.client.post(url, {"duration_minutes": 50}, format="json")
        
        self.assertEqual(response.data["points_awarded"], 15)  # 10 base + 5 length bonus
        
        transaction = PointTransaction.objects.get(user=self.user)
        self.assertIn("long session bonus", transaction.reason)

    def test_streak_bonus_points(self):
        """Integration: Completing a workout on a streak awards +2 points per streak day"""
        # Manually inject a workout completed yesterday to create a 1-day streak going into today
        WorkoutSession.objects.create(
            user=self.user, 
            date=self.today - timedelta(days=1), 
            status='completed', 
            is_completed=True
        )

        url = f"/api/sessions/complete/{self.today_str}/"
        response = self.client.post(url, {"duration_minutes": 30}, format="json")
        
        # 10 base + (1 day streak * 2 pts) = 12 points
        self.assertEqual(response.data["points_awarded"], 12)
        transaction = PointTransaction.objects.get(user=self.user, session__date=self.today)
        self.assertIn("1-day streak bonus", transaction.reason)

    def test_points_idempotency_guard(self):
        """Corner Case: Resubmitting the completion for the exact same session shouldn't double-award points"""
        url = f"/api/sessions/complete/{self.today_str}/"
        
        # First completion
        self.client.post(url, {"duration_minutes": 30}, format="json")
        self.assertEqual(UserPoints.objects.get(user=self.user).total_points, 10)
        
        # Second completion (e.g. user double-clicked or refreshed)
        response2 = self.client.post(url, {"duration_minutes": 30}, format="json")
        
        # Points awarded this time should be 0
        self.assertEqual(response2.data["points_awarded"], 0)
        self.assertEqual(UserPoints.objects.get(user=self.user).total_points, 10)
        self.assertEqual(PointTransaction.objects.filter(user=self.user).count(), 1)