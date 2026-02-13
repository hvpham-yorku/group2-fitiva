from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import UserProfile, WorkoutPlan

User = get_user_model()

# RECOMMENDATIONS TEST CASES

class RecommendationsTests(APITestCase):
    """Test suite for workout recommendations"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="test@example.com"
        )
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )
        UserProfile.objects.create(
            user=self.user,
            age=25,
            experience_level="beginner",
            training_location="home",
            fitness_focus=["strength", "cardio"]
        )

    def test_get_recommendations_matching_focus(self):
        """Test that recommendations match user's fitness focus"""
        self.client.force_authenticate(user=self.user)
        
        # Create programs with different focuses
        WorkoutPlan.objects.create(
            name="Strength Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )
        WorkoutPlan.objects.create(
            name="Flexibility Program",
            trainer=self.trainer,
            focus=["flexibility"],
            difficulty="beginner",
            weekly_frequency=2,
            session_length=30
        )
        
        response = self.client.get("/api/recommendations/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_recommendations'], 1)
        self.assertEqual(response.data['programs'][0]['name'], "Strength Program")

    def test_recommendations_without_profile(self):
        """Test that users without profile get appropriate message"""
        user_no_profile = User.objects.create_user(
            username="noprofile",
            password="TestPass123!",
            email="noprofile@example.com"
        )
        self.client.force_authenticate(user=user_no_profile)
        
        response = self.client.get("/api/recommendations/")
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
