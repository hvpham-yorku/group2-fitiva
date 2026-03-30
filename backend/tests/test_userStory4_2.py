from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import WorkoutSession, UserBadge

User = get_user_model()

class UnlockAchievementBadgesTests(APITestCase):
    """Test suite for US 4.2 - Unlock Achievement Badges"""

    def setUp(self):
        self.user = User.objects.create_user(username="badge_tester", password="Testpass123!", email="achievement@fitiva.com")
        self.client.login(username="badge_tester", password="Testpass123!")
        self.today = timezone.now().date()
        self.today_str = self.today.isoformat()

    # --- UNIT & INTEGRATION TESTS ---

    def test_milestone_badge_unlock(self):
        """Main Scenario: Completing the 1st workout triggers the 'first_workout' badge payload"""
        url = f"/api/sessions/complete/{self.today_str}/"
        response = self.client.post(url, {"duration_minutes": 30}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        unlocked = response.data.get("newly_unlocked_badges", [])
        self.assertGreater(len(unlocked), 0)
        self.assertEqual(unlocked[0]["badge_id"], "first_workout")

        self.assertTrue(UserBadge.objects.filter(user=self.user, badge_id="first_workout").exists())

    def test_streak_badge_unlock(self):
        """Integration: Completing a 3rd consecutive workout unlocks the 'streak_3' badge"""
        # Inject workouts for the past 2 days
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=2), status='completed', is_completed=True)
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=1), status='completed', is_completed=True)
        
        # Complete today's workout
        url = f"/api/sessions/complete/{self.today_str}/"
        response = self.client.post(url, {"duration_minutes": 30}, format="json")

        unlocked_ids = [b["badge_id"] for b in response.data.get("newly_unlocked_badges", [])]
        
        # Should unlock both 'streak_3' and 'five_workouts' (if they had 2 others earlier, but here we just check streak_3)
        self.assertIn("streak_3", unlocked_ids)
        self.assertTrue(UserBadge.objects.filter(user=self.user, badge_id="streak_3").exists())

    def test_streak_calculation_works_correctly(self):
        """Corner Case: Testing that a normal streak calculates correctly despite the distinct() fix"""
        # Inject standard workouts for the past 2 days
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=2), status='completed', is_completed=True)
        WorkoutSession.objects.create(user=self.user, date=self.today - timedelta(days=1), status='completed', is_completed=True)

        # Complete today's workout
        url = f"/api/sessions/complete/{self.today_str}/"
        response = self.client.post(url, {"duration_minutes": 30}, format="json")
        
        # The streak should correctly evaluate to 3 unique days, unlocking streak_3
        unlocked_ids = [b["badge_id"] for b in response.data.get("newly_unlocked_badges", [])]
        self.assertIn("streak_3", unlocked_ids)