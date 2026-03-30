from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import Challenge, UserChallenge, WorkoutPlan

User = get_user_model()

class TrainerHostedChallengesTests(APITestCase):
    """Test suite for US 4.5 - Trainer-Hosted Challenges"""

    def setUp(self):
        # 1. Setup Users
        self.trainer = User.objects.create_user(username="pro_trainer", password="Testpass123!", email="hosted@fitiva.com", is_trainer=True)
        self.member1 = User.objects.create_user(username="member_1", password="Testpass123!", email="hosted1@fitiva.com")
        self.member2 = User.objects.create_user(username="member_2", password="Testpass123!", email="hosted2@fitiva.com")
        
        self.today = timezone.now().date()
        self.next_week = self.today + timedelta(days=7)

        # 2. Setup a Trainer's Program
        self.program = WorkoutPlan.objects.create(
            name="Shred 90",
            trainer=self.trainer,
            session_length=45,
            weekly_frequency=3
        )

        self.valid_challenge_payload = {
            "name": "Shred 90 Sprint",
            "description": "Complete 3 Shred 90 workouts this week!",
            "start_date": self.today.isoformat(),
            "end_date": self.next_week.isoformat(),
            "goal_criteria": {"workouts": 3},
            "program": self.program.id,
            "reward_points": 100,
            "reward_badge": "shred_sprint_badge"
        }

    # --- UNIT & INTEGRATION TESTS ---

    def test_trainer_can_create_challenge(self):
        """Main Scenario: A trainer successfully creates a challenge linked to their program"""
        self.client.login(username="pro_trainer", password="Testpass123!")
        
        response = self.client.post("/api/challenges/create/", self.valid_challenge_payload, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Shred 90 Sprint")
        
        # Verify it saved correctly with the trainer relationship
        challenge = Challenge.objects.get(name="Shred 90 Sprint")
        self.assertEqual(challenge.trainer, self.trainer)
        self.assertEqual(challenge.program, self.program)

    def test_non_trainer_cannot_create_challenge(self):
        """Corner Case: Standard users attempting to access the creation endpoint are blocked"""
        self.client.login(username="member_1", password="Testpass123!")
        
        response = self.client.post("/api/challenges/create/", self.valid_challenge_payload, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Only trainers", str(response.data))
        self.assertEqual(Challenge.objects.count(), 0)

    def test_trainer_challenge_analytics(self):
        """Integration: Trainer dashboard correctly calculates participant count and completion rate"""
        # 1. Manually inject a pre-made challenge
        challenge = Challenge.objects.create(
            name="Shred 90 Sprint",
            trainer=self.trainer,
            program=self.program,
            start_date=self.today,
            end_date=self.next_week,
            goal_criteria={"workouts": 3},
            is_active=True
        )

        # 2. Add participants (1 completed, 1 in-progress) -> Expected 50% completion rate
        UserChallenge.objects.create(user=self.member1, challenge=challenge, is_completed=True)
        UserChallenge.objects.create(user=self.member2, challenge=challenge, is_completed=False)

        # 3. Fetch analytics as the trainer
        self.client.login(username="pro_trainer", password="Testpass123!")
        response = self.client.get("/api/challenges/analytics/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        analytics = response.data[0]
        self.assertEqual(analytics["name"], "Shred 90 Sprint")
        self.assertEqual(analytics["participant_count"], 2)
        self.assertEqual(analytics["completion_rate"], 50.0)

    def test_analytics_empty_challenge(self):
        """Corner Case: Analytics safely handles challenges with 0 participants without division-by-zero errors"""
        Challenge.objects.create(
            name="Empty Challenge",
            trainer=self.trainer,
            start_date=self.today,
            end_date=self.next_week,
            goal_criteria={"workouts": 1},
            is_active=True
        )

        self.client.login(username="pro_trainer", password="Testpass123!")
        response = self.client.get("/api/challenges/analytics/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["participant_count"], 0)
        self.assertEqual(response.data[0]["completion_rate"], 0.0) # Should be 0.0