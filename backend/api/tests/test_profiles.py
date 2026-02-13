from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import UserProfile

User = get_user_model()

# PROFILES TEST CASES

class UserProfileTests(APITestCase):
    """Test suite for user profile creation and management"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="Testpass123!",
            email="test@example.com"
        )
        self.client.login(username="testuser", password="Testpass123!")
        self.create_profile_url = "/api/profile/create/"
        
    def test_create_profile_success(self):
        """Test successful profile creation with valid data"""
        data = {
            "age": 25,
            "experience_level": "beginner",
            "training_location": "home",
            "fitness_focus": ["strength", "cardio"]
        }

        response = self.client.post(self.create_profile_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.age, 25)
        self.assertIn("strength", profile.fitness_focus)

    def test_create_profile_invalid_age(self):
        """Test that profiles with invalid age are rejected"""
        data = {
            "age": 10,
            "experience_level": "beginner",
            "training_location": "home",
            "fitness_focus": ["strength"]
        }

        response = self.client.post(self.create_profile_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("age", response.data.get("errors", {}))

    def test_get_profile(self):
        """Test retrieving existing profile"""
        UserProfile.objects.create(
            user=self.user,
            age=30,
            experience_level="intermediate",
            training_location="gym",
            fitness_focus=["cardio"]
        )

        response = self.client.get("/api/profile/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["age"], 30)
        self.assertEqual(response.data["training_location"], "gym")

    def test_cannot_create_duplicate_profile(self):
        """Test that users cannot create multiple profiles"""
        UserProfile.objects.create(
            user=self.user,
            age=25,
            experience_level="beginner",
            training_location="home",
            fitness_focus=["strength"]
        )

        data = {
            "age": 30,
            "experience_level": "advanced",
            "training_location": "gym",
            "fitness_focus": ["cardio"]
        }

        response = self.client.post(self.create_profile_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_get_profile_me(self):
        """Test current user getting their profile"""
        UserProfile.objects.create(
            user=self.user,
            age=28,
            experience_level="intermediate",
            training_location="gym",
            fitness_focus=["cardio"]
        )

        response = self.client.get("/api/profile/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["age"], 28)
        self.assertEqual(response.data["experience_level"], "intermediate")

    def test_update_profile(self):
        """Test updating existing profile"""
        profile = UserProfile.objects.create(
            user=self.user,
            age=20,
            experience_level="beginner",
            training_location="home",
            fitness_focus=["strength"]
        )

        data = {
            "age": 35,
            "experience_level": "advanced",
            "training_location": "gym",
            "fitness_focus": ["strength", "cardio"]
        }

        response = self.client.put("/api/profile/me/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        profile.refresh_from_db()
        self.assertEqual(profile.age, 35)
        self.assertEqual(profile.experience_level, "advanced")

    def test_unauthenticated_user_cannot_access_profile(self):
        """Test that unauthenticated users cannot access profile endpoints"""
        self.client.logout()

        response = self.client.get("/api/profile/me/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_experience_level(self):
        """Test that invalid experience levels are rejected"""
        data = {
            "age": 25,
            "experience_level": "expert",
            "training_location": "home",
            "fitness_focus": ["strength"]
        }

        response = self.client.post(self.create_profile_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("experience_level", response.data.get("errors", {}))

    def test_multiple_fitness_focuses(self):
        """Test creating profile with multiple fitness focuses"""
        data = {
            "age": 28,
            "experience_level": "intermediate",
            "training_location": "gym",
            "fitness_focus": ["strength", "cardio", "flexibility"]
        }

        response = self.client.post(self.create_profile_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(len(profile.fitness_focus), 3)
        self.assertIn("flexibility", profile.fitness_focus)
