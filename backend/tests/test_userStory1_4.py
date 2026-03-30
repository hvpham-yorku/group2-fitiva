# User Story 1.4 - View List of Workouts
# As a user, I want to view a list of available workouts so that I can explore
# individual sessions and understand what types of training are offered before
# committing to a plan or program.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import ExerciseTemplate

User = get_user_model()


# --- UNIT TESTS ---

class US14_ViewWorkoutListTests(TestCase):
    """US 1.4 – Users browse the exercise / workout library."""

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
        ExerciseTemplate.objects.create(
            name='Push-ups',
            description='Upper body push movement',
            muscle_groups=['chest', 'triceps'],
            exercise_type='reps',
            trainer=self.trainer,
        )
        ExerciseTemplate.objects.create(
            name='Squats',
            description='Lower body compound movement',
            muscle_groups=['quads', 'glutes'],
            exercise_type='reps',
            trainer=self.trainer,
        )

    def test_authenticated_user_can_list_exercise_templates(self):
        """A logged-in user can retrieve the full list of exercise templates."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/exercise-templates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('exercises', [])
        self.assertGreaterEqual(len(data), 2)

    def test_exercise_list_contains_name_and_description(self):
        """Each workout entry includes name and description fields."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/exercise-templates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('exercises', [])
        for item in data:
            self.assertIn('name', item)
            self.assertIn('description', item)

    def test_trainer_can_view_exercise_templates(self):
        """Trainers can also browse the exercise template list."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/exercise-templates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_user_cannot_view_exercises(self):
        """Exercise list is not accessible without authentication."""
        response = self.client.get('/api/exercise-templates/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_exercise_detail_returns_single_exercise(self):
        """A user can view the detail page of a specific exercise template."""
        self.client.force_authenticate(user=self.trainer)
        template = ExerciseTemplate.objects.get(name='Push-ups')
        response = self.client.get(f'/api/exercise-templates/{template.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Push-ups')

    def test_nonexistent_exercise_returns_404(self):
        """Requesting a non-existent exercise template returns a 404 error."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/exercise-templates/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

# --- INTEGRATION TESTS ---

class US14_ViewWorkoutsIntegrationTests(TestCase):
    """US 1.4 Integration - Trainer creates exercise then user browses and views detail."""

    def setUp(self):
        self.client = APIClient()
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.regular_user = User.objects.create_user(
            username='regularuser', email='user@example.com',
            password='UserPass123!', is_trainer=False,
        )

    def test_full_create_browse_and_view_detail_flow(self):
        """Trainer adds an exercise; user lists all exercises then views the detail."""
        # Step 1: trainer creates an exercise template
        self.client.force_authenticate(user=self.trainer)
        create = self.client.post('/api/exercise-templates/', {
            'name': 'Deadlift', 'description': 'Hip hinge movement',
            'muscle_groups': ['quads/hamstrings', 'back'], 'exercise_type': 'reps',
        }, format='json')
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        template_id = create.data['id']

        # Step 2: regular user lists all exercises
        self.client.force_authenticate(user=self.trainer)
        listing = self.client.get('/api/exercise-templates/')
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        data = listing.data.get('exercises', [])
        names = [e['name'] for e in data]
        self.assertIn('Deadlift', names)

        # Step 3: user views the specific exercise detail
        detail = self.client.get(f'/api/exercise-templates/{template_id}/')
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['name'], 'Deadlift')
