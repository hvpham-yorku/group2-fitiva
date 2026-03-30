from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import Challenge, UserChallenge, WorkoutSession

User = get_user_model()

class ParticipateInChallengesTests(APITestCase):
    """Test suite for US 4.4 - Participate in Weekly Challenges"""

    def setUp(self):
        self.user = User.objects.create_user(username="challenge_user", password="Testpass123!", email="challenge@fitiva.com")
        self.client.login(username="challenge_user", password="Testpass123!")
        
        self.today = timezone.now().date()
        self.next_week = self.today + timedelta(days=7)
        self.last_week = self.today - timedelta(days=7)

        # Create system challenges
        self.active_challenge = Challenge.objects.create(
            name="Weekend Warrior",
            description="Complete 2 workouts",
            start_date=self.today,
            end_date=self.next_week,
            goal_criteria={"workouts": 2},
            reward_points=50,
            is_active=True
        )

        self.inactive_challenge = Challenge.objects.create(
            name="Old Challenge",
            description="Too late to join",
            start_date=self.last_week - timedelta(days=7),
            end_date=self.last_week,
            goal_criteria={"workouts": 1},
            reward_points=10,
            is_active=False
        )

    # --- UNIT & INTEGRATION TESTS ---

    def test_join_active_challenge_success(self):
        """Main Scenario: A user can successfully join an active challenge"""
        url = f"/api/challenges/{self.active_challenge.id}/join/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserChallenge.objects.filter(user=self.user, challenge=self.active_challenge).exists())

    def test_join_inactive_challenge_fails(self):
        """Corner Case: Users cannot join expired or inactive challenges"""
        url = f"/api/challenges/{self.inactive_challenge.id}/join/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(UserChallenge.objects.filter(user=self.user, challenge=self.inactive_challenge).exists())

    def test_join_challenge_idempotency(self):
        """Corner Case: Clicking join multiple times shouldn't crash or duplicate records"""
        UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)
        
        url = f"/api/challenges/{self.active_challenge.id}/join/"
        response = self.client.post(url)

        # Returns 200 OK with "Already joined" instead of 201 or 500
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChallenge.objects.filter(user=self.user, challenge=self.active_challenge).count(), 1)

    def test_get_user_challenges(self):
        """Main Scenario: User dashboard correctly lists only their joined, active challenges"""
        UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)

        response = self.client.get("/api/user-challenges/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(any("Weekend Warrior" in str(val) for val in response.data[0].values()))

    def test_leave_challenge_success(self):
        """Main Scenario: User can remove a challenge from their dashboard"""
        UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)

        url = f"/api/challenges/{self.active_challenge.id}/leave/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(UserChallenge.objects.filter(user=self.user, challenge=self.active_challenge).exists())

    def test_workout_completion_updates_challenge_progress(self):
        """Integration: Completing a workout automatically ticks up challenge progress (Smell-001 extracted logic)"""
        uc = UserChallenge.objects.create(user=self.user, challenge=self.active_challenge, current_progress={"workouts": 0})
        
        # Trigger workout completion
        url = f"/api/sessions/complete/{self.today.isoformat()}/"
        self.client.post(url, {"duration_minutes": 30}, format="json")

        # Refresh UserChallenge from DB
        uc.refresh_from_db()
        self.assertEqual(uc.current_progress["workouts"], 1)
        self.assertFalse(uc.is_completed) # Needs 2 workouts to complete