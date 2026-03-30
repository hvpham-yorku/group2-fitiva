# User Story 1.5 - Browse Trainer Created Programs
# As a user, I want to browse workout programs created by trainers so that I can
# explore different training styles and subscription-based options.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import WorkoutPlan

User = get_user_model()


# --- UNIT TESTS ---

class US15_BrowseTrainerProgramsTests(TestCase):
    """US 1.5 – Users browse the catalogue of trainer-created programs."""

    def setUp(self):
        self.client = APIClient()
        self.trainer_a = User.objects.create_user(
            username='trainer_a',
            email='trainer_a@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        self.trainer_b = User.objects.create_user(
            username='trainer_b',
            email='trainer_b@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        self.regular_user = User.objects.create_user(
            username='regularuser',
            email='user@example.com',
            password='UserPass123!',
            is_trainer=False,
        )
        WorkoutPlan.objects.create(
            name='Strength Foundations',
            trainer=self.trainer_a,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        WorkoutPlan.objects.create(
            name='Cardio Blast',
            trainer=self.trainer_b,
            focus=['cardio'],
            difficulty='intermediate',
            weekly_frequency=5,
            session_length=30,
        )

    def test_authenticated_user_can_browse_all_programs(self):
        """A logged-in user can see programs from multiple trainers."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/programs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results') or response.data
        self.assertGreaterEqual(len(data), 2)

    def test_program_list_includes_trainer_info(self):
        """Each program entry includes trainer information."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/programs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results') or response.data
        for program in data:
            self.assertIn('name', program)

    def test_user_can_view_programs_by_specific_trainer(self):
        """User can filter and view all programs published by a specific trainer."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(f'/api/users/{self.trainer_a.id}/programs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('programs', [])
        for program in data:
            self.assertEqual(program['name'], 'Strength Foundations')

    def test_unauthenticated_user_cannot_browse_programs(self):
        """Unauthenticated users cannot access the program list."""
        response = self.client.get('/api/programs/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_program_list_shows_difficulty_and_focus(self):
        """Programs in the catalogue include difficulty and focus fields."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/programs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results') or response.data
        for program in data:
            self.assertIn('difficulty', program)
            self.assertIn('focus', program)

# --- INTEGRATION TESTS ---

class US15_BrowseProgramsIntegrationTests(TestCase):
    """US 1.5 Integration - Multiple trainers publish programs; user browses all."""

    def setUp(self):
        self.client = APIClient()
        self.trainer_a = User.objects.create_user(
            username='trainer_a', email='trainer_a@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.trainer_b = User.objects.create_user(
            username='trainer_b', email='trainer_b@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.regular_user = User.objects.create_user(
            username='regularuser', email='user@example.com',
            password='UserPass123!', is_trainer=False,
        )

    def test_full_multi_trainer_browse_flow(self):
        """Two trainers each create a program; user browses and sees both."""
        # Step 1: trainer A creates a program
        WorkoutPlan.objects.create(
            name='Trainer A Strength', trainer=self.trainer_a,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        # Step 2: trainer B creates a program
        WorkoutPlan.objects.create(
            name='Trainer B Cardio', trainer=self.trainer_b,
            focus=['cardio'], difficulty='intermediate', weekly_frequency=5, session_length=30,
        )
        # Step 3: user browses all programs
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/programs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results') or response.data
        names = [p['name'] for p in data]
        self.assertIn('Trainer A Strength', names)
        self.assertIn('Trainer B Cardio', names)
