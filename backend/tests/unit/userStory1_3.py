# User Story 1.3 - Create Programs from the List of Workouts
# As a trainer, I want to create workout programs from a list of available exercises
# so that I can design structured training plans for my clients.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import WorkoutPlan, ExerciseTemplate

User = get_user_model()


# --- UNIT TESTS ---

class US13_CreateWorkoutProgramTests(TestCase):
    """US 1.3 – Trainer creates structured programs from exercise library."""

    def setUp(self):
        self.client = APIClient()
        self.trainer = User.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        self.regular_user = User.objects.create_user(
            username='regularuser',
            email='user@example.com',
            password='UserPass123!',
            is_trainer=False,
        )
        self.program_url = '/api/programs/'

    def _program_payload(self, name='Beginner Strength Plan'):
        return {
            'name': name,
            'description': 'A structured beginner strength program',
            'focus': ['strength'],
            'difficulty': 'beginner',
            'weekly_frequency': 3,
            'session_length': 45,
            'sections': [
                {
                    'format': 'Monday',
                    'type': 'Upper Body',
                    'is_rest_day': False,
                    'exercises': [
                        {
                            'name': 'Push-ups',
                            'order': 0,
                            'sets': [
                                {'set_number': 1, 'reps': 10, 'time': None, 'rest': 60},
                                {'set_number': 2, 'reps': 10, 'time': None, 'rest': 60},
                            ],
                        }
                    ],
                },
                {
                    'format': 'Wednesday',
                    'type': 'Rest',
                    'is_rest_day': True,
                    'exercises': [],
                },
            ],
        }

    def test_trainer_creates_workout_program_successfully(self):
        """Trainer can create a full workout program with sections and exercises."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.post(self.program_url, self._program_payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(WorkoutPlan.objects.filter(name='Beginner Strength Plan').exists())

    def test_program_is_associated_with_trainer(self):
        """The created program is linked to the trainer who created it."""
        self.client.force_authenticate(user=self.trainer)
        self.client.post(self.program_url, self._program_payload(), format='json')
        program = WorkoutPlan.objects.get(name='Beginner Strength Plan')
        self.assertEqual(program.trainer, self.trainer)

    def test_regular_user_cannot_create_program(self):
        """Non-trainer users are forbidden from creating workout programs."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(self.program_url, self._program_payload(), format='json')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

    def test_unauthenticated_user_cannot_create_program(self):
        """Unauthenticated requests to create a program are rejected."""
        response = self.client.post(self.program_url, self._program_payload(), format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_program_missing_name_is_rejected(self):
        """Program creation fails when the program name is missing."""
        self.client.force_authenticate(user=self.trainer)
        payload = self._program_payload()
        payload.pop('name')
        response = self.client.post(self.program_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_trainer_can_create_multiple_programs(self):
        """A trainer can create more than one workout program."""
        self.client.force_authenticate(user=self.trainer)
        self.client.post(self.program_url, self._program_payload('Program A'), format='json')
        self.client.post(self.program_url, self._program_payload('Program B'), format='json')
        self.assertEqual(WorkoutPlan.objects.filter(trainer=self.trainer).count(), 2)

    def test_trainer_can_list_own_programs(self):
        """Trainer can retrieve the list of programs they have created."""
        self.client.force_authenticate(user=self.trainer)
        WorkoutPlan.objects.create(
            name='My Program',
            trainer=self.trainer,
            focus=['cardio'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=30,
        )
        response = self.client.get(self.program_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [p['name'] for p in (response.data.get('results') or response.data)]
        self.assertIn('My Program', names)

# --- INTEGRATION TESTS ---

class US13_CreateProgramIntegrationTests(TestCase):
    """US 1.3 Integration - Trainer creates program then verifies it appears in list."""

    def setUp(self):
        self.client = APIClient()
        self.trainer = User.objects.create_user(
            username='trainerflow', email='trainerflow@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.client.force_authenticate(user=self.trainer)

    def test_full_create_and_list_program_flow(self):
        """Trainer creates a program then sees it in the program list."""
        # Step 1: create program
        payload = {
            'name': 'Integration Program',
            'description': 'Test',
            'focus': ['strength'],
            'difficulty': 'beginner',
            'weekly_frequency': 3,
            'session_length': 45,
            'sections': [{'format': 'Monday', 'type': 'Upper Body', 'is_rest_day': False, 'exercises': []}],
        }
        create = self.client.post('/api/programs/', payload, format='json')
        self.assertIn(create.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 2: list programs and verify it appears
        listing = self.client.get('/api/programs/')
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        names = [p['name'] for p in (listing.data.get('results') or listing.data)]
        self.assertIn('Integration Program', names)
