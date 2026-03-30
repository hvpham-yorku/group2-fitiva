# User Story 1.6 - View Profile-Based Workout Recommendations
# As a user, I want to see workout programs recommended based on my fitness profile
# so that I can quickly find programs that match my goals and experience level.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import UserProfile, WorkoutPlan

User = get_user_model()


# --- UNIT TESTS ---

class US16_WorkoutRecommendationsTests(TestCase):
    """US 1.6 – Recommendations match the user's profile (focus, level, location)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
        )
        self.trainer = User.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        UserProfile.objects.create(
            user=self.user,
            age=25,
            experience_level='beginner',
            training_location='home',
            fitness_focus=['strength'],
        )
        WorkoutPlan.objects.create(
            name='Beginner Strength Program',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        WorkoutPlan.objects.create(
            name='Advanced Yoga',
            trainer=self.trainer,
            focus=['flexibility'],
            difficulty='advanced',
            weekly_frequency=6,
            session_length=60,
        )

    def test_recommendations_match_user_fitness_focus(self):
        """Recommendations include programs matching the user's fitness focus."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        programs = response.data.get('programs', [])
        names = [p['name'] for p in programs]
        self.assertIn('Beginner Strength Program', names)

    def test_unmatched_programs_are_excluded(self):
        """Programs that do not match the user's profile are not recommended."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        programs = response.data.get('programs', [])
        names = [p['name'] for p in programs]
        self.assertNotIn('Advanced Yoga', names)

    def test_recommendation_count_is_returned(self):
        """Response includes the total number of recommendations."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_recommendations', response.data)

    def test_unauthenticated_user_cannot_get_recommendations(self):
        """Unauthenticated users cannot access recommendations."""
        response = self.client.get('/api/recommendations/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_user_without_profile_gets_empty_recommendations(self):
        """A user without a fitness profile receives no personalised recommendations."""
        new_user = User.objects.create_user(
            username='noprofile',
            email='noprofile@example.com',
            password='TestPass123!',
        )
        self.client.force_authenticate(user=new_user)
        response = self.client.get('/api/recommendations/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(response.data.get('total_recommendations', 0), 0)

# --- INTEGRATION TESTS ---

class US16_RecommendationsIntegrationTests(TestCase):
    """US 1.6 Integration - User creates profile then gets matching recommendations."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='recuser', email='rec@example.com', password='TestPass123!'
        )
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_full_profile_to_recommendations_flow(self):
        """User creates a strength-focused profile and sees only strength programs recommended."""
        # Step 1: create profile
        UserProfile.objects.create(
            user=self.user, age=25, experience_level='beginner',
            training_location='gym', fitness_focus=['strength'],
        )
        # Step 2: programs exist in the system
        WorkoutPlan.objects.create(
            name='Strength Match', trainer=self.trainer,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        WorkoutPlan.objects.create(
            name='Yoga No Match', trainer=self.trainer,
            focus=['flexibility'], difficulty='beginner', weekly_frequency=3, session_length=30,
        )
        # Step 3: get recommendations
        response = self.client.get('/api/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [p['name'] for p in response.data.get('programs', [])]
        self.assertIn('Strength Match', names)
        self.assertNotIn('Yoga No Match', names)
