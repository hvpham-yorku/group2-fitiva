from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import Challenge, UserChallenge, WorkoutPlan, ProgramSection

User = get_user_model()

class WeeklyChallengesTests(APITestCase):
    """Test suite for Weekly Challenges (US 4.4) - Unit and Integration Tests"""

    def setUp(self):
        # 1. Create a test user and log them in
        self.user = User.objects.create_user(
            username="challengetester",
            password="Testpass123!",
            email="tester@fitiva.com"
        )
        self.client.login(username="challengetester", password="Testpass123!")

        # 2. Setup dates
        self.today = timezone.now().date()
        self.next_week = self.today + timedelta(days=7)
        self.last_week = self.today - timedelta(days=7)

        # 3. Create mock challenges in the database
        self.active_challenge = Challenge.objects.create(
            name="Active Test Challenge",
            description="Complete 1 workout",
            start_date=self.today,
            end_date=self.next_week,
            goal_criteria={"workouts": 1},
            reward_points=50,
            reward_badge="test_badge_1",
            is_active=True
        )

        self.inactive_challenge = Challenge.objects.create(
            name="Expired Challenge",
            description="This is too late to join",
            start_date=self.last_week - timedelta(days=7),
            end_date=self.last_week,
            goal_criteria={"workouts": 3},
            reward_points=100,
            is_active=False
        )

    # --- UNIT TESTS: Normal & Corner Cases ---

    def test_join_active_challenge_success(self):
        """Test successfully joining an active challenge"""
        url = f"/api/challenges/{self.active_challenge.id}/join/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserChallenge.objects.filter(user=self.user, challenge=self.active_challenge).exists())

    def test_join_challenge_duplicate_is_handled(self):
        """Corner Case: Test that joining an already joined challenge doesn't crash (Idempotency)"""
        # Join once
        UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)
        
        # Try to join again
        url = f"/api/challenges/{self.active_challenge.id}/join/"
        response = self.client.post(url)

        # Should return 200 OK (already joined) instead of 201 Created or a 500 Crash
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChallenge.objects.filter(user=self.user, challenge=self.active_challenge).count(), 1)

    def test_join_inactive_challenge_fails(self):
        """Corner Case: Test that users cannot join an inactive/expired challenge"""
        url = f"/api/challenges/{self.inactive_challenge.id}/join/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(UserChallenge.objects.filter(user=self.user, challenge=self.inactive_challenge).exists())

    def test_get_user_challenges(self):
        """Test retrieving the list of challenges the user is participating in"""
        UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)

        response = self.client.get("/api/user-challenges/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["challenge_name"], "Active Test Challenge")
        self.assertEqual(response.data[0]["progress_percent"], 0) # Should start at 0%

    def test_leave_challenge_success(self):
        """Test that a user can successfully remove a challenge from their dashboard"""
        UserChallenge.objects.create(user=self.user, challenge=self.active_challenge)

        url = f"/api/challenges/{self.active_challenge.id}/leave/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(UserChallenge.objects.filter(user=self.user, challenge=self.active_challenge).exists())

    def test_leave_not_joined_challenge_fails(self):
        """Corner Case: Test leaving a challenge the user never joined"""
        url = f"/api/challenges/{self.active_challenge.id}/leave/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

