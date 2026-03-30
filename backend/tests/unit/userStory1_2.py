# User Story 1.2 - Create Fitness Profile & Personalized Workout
# As a new user, I want to enter my age, experience level, training location,
# and primary fitness focus so that the system can recommend suitable workout plans.
# As a trainer, I want to create a professional profile and publish my programs
# so that users can discover my content.

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from api.models import CustomUser, UserProfile, TrainerProfile


# --- UNIT TESTS ---

class US12_CreateUserProfileTests(TestCase):
    """US 1.2 – Regular user fills out fitness profile."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
        )
        self.client.force_authenticate(user=self.user)
        self.create_url = reverse('create_profile')

    def test_create_profile_with_valid_data(self):
        """User can create a profile with age, experience level, location, and focus."""
        data = {
            'age': 25,
            'experience_level': 'beginner',
            'training_location': 'home',
            'fitness_focus': ['strength', 'cardio'],
        }
        response = self.client.post(self.create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.age, 25)
        self.assertIn('strength', profile.fitness_focus)

    def test_profile_with_gym_location(self):
        """User can specify gym as training location."""
        data = {
            'age': 30,
            'experience_level': 'intermediate',
            'training_location': 'gym',
            'fitness_focus': ['cardio'],
        }
        response = self.client.post(self.create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.training_location, 'gym')

    def test_invalid_age_is_rejected(self):
        """Profile creation fails when age is below the minimum allowed value."""
        data = {
            'age': 10,
            'experience_level': 'beginner',
            'training_location': 'home',
            'fitness_focus': ['strength'],
        }
        response = self.client.post(self.create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_experience_level_is_rejected(self):
        """Profile creation fails with an unrecognised experience level."""
        data = {
            'age': 25,
            'experience_level': 'superhero',
            'training_location': 'home',
            'fitness_focus': ['strength'],
        }
        response = self.client.post(self.create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_profile_creation_is_rejected(self):
        """A user cannot create a second profile if one already exists."""
        UserProfile.objects.create(
            user=self.user,
            age=25,
            experience_level='beginner',
            training_location='home',
            fitness_focus=['strength'],
        )
        data = {
            'age': 30,
            'experience_level': 'advanced',
            'training_location': 'gym',
            'fitness_focus': ['cardio'],
        }
        response = self.client.post(self.create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_user_cannot_create_profile(self):
        """Unauthenticated requests to create a profile are rejected."""
        unauth_client = APIClient()
        data = {
            'age': 25,
            'experience_level': 'beginner',
            'training_location': 'home',
            'fitness_focus': ['strength'],
        }
        response = unauth_client.post(self.create_url, data, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class US12_TrainerProfileTests(TestCase):
    """US 1.2 – Trainer creates and updates their professional profile."""

    def setUp(self):
        self.client = APIClient()
        self.trainer = CustomUser.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        self.client.force_authenticate(user=self.trainer)

    def test_trainer_can_update_profile(self):
        """Trainer can set bio, certifications, and specialties."""
        TrainerProfile.objects.create(user=self.trainer)
        data = {
            'bio': 'Experienced strength coach',
            'years_of_experience': 6,
            'specialty_strength': True,
            'specialty_cardio': False,
            'specialty_flexibility': False,
            'specialty_sports': False,
            'specialty_rehabilitation': False,
            'certifications': 'NASM-CPT',
        }
        response = self.client.put(reverse('update_trainer_profile'), data, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_regular_user_cannot_update_trainer_profile(self):
        """Non-trainer users cannot update trainer profile details."""
        regular = CustomUser.objects.create_user(
            username='regular',
            email='regular@example.com',
            password='UserPass123!',
            is_trainer=False,
        )
        self.client.force_authenticate(user=regular)
        data = {'bio': 'Trying to impersonate a trainer'}
        response = self.client.put(reverse('update_trainer_profile'), data, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
        )

# --- INTEGRATION TESTS ---

class US12_ProfileCreationIntegrationTests(TestCase):
    """US 1.2 Integration - Full register → create profile → retrieve profile flow."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='profileflow', email='profileflow@example.com', password='TestPass123!'
        )
        self.client.force_authenticate(user=self.user)

    def test_full_create_and_retrieve_profile_flow(self):
        """User creates a fitness profile and immediately retrieves it."""
        # Step 1: create profile
        create = self.client.post(reverse('create_profile'), {
            'age': 28, 'experience_level': 'intermediate',
            'training_location': 'gym', 'fitness_focus': ['strength', 'cardio'],
        }, format='json')
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)

        # Step 2: retrieve profile
        get = self.client.get(reverse('profile_me'))
        self.assertEqual(get.status_code, status.HTTP_200_OK)
        self.assertEqual(get.data['age'], 28)
        self.assertEqual(get.data['experience_level'], 'intermediate')
        self.assertIn('strength', get.data['fitness_focus'])
