from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import Challenge, UserChallenge

User = get_user_model()

class ChallengeIntegrationTests(APITestCase):
    """Integration tests for Weekly Challenges (US 4.4)"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="challengetester",
            password="Testpass123!",
            email="tester@fitiva.com"
        )
        self.client.login(username="challengetester", password="Testpass123!")
        self.today = timezone.now().date()
        self.next_week = self.today + timedelta(days=7)

        self.active_challenge = Challenge.objects.create(
            name="Integration Test Challenge",
            description="Complete 1 workout",
            start_date=self.today,
            end_date=self.next_week,
            goal_criteria={"workouts": 1},
            reward_points=50,
            reward_badge="test_badge_integration",
            is_active=True
        )

    def test_workout_completion_updates_challenge_progress(self):
        """
        Integration Test: Verifies completing a workout (Module A)
        updates challenge progress (Module B) and awards points (Module C).
        """
        uc = UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)
        
        today_str = self.today.strftime('%Y-%m-%d')
        url = f"/api/sessions/complete/{today_str}/"
        
        payload = {"duration_minutes": 30, "notes": "Felt great"}
        response = self.client.post(url, data=payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        uc.refresh_from_db()
        self.assertEqual(uc.current_progress.get("workouts"), 1)
        self.assertTrue(uc.is_completed)
        self.assertIsNotNone(uc.completed_at)

        self.assertTrue(hasattr(self.user, 'points'))
        self.assertGreaterEqual(self.user.points.total_points, 50)