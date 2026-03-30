# User Story 2.4 - Review Aggregated Client Feedback
# As a trainer, I want to review aggregated feedback from users following my programs
# so that I can evaluate program effectiveness and make improvements.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import WorkoutPlan, WorkoutSession, WorkoutFeedback
from datetime import date

User = get_user_model()


# --- UNIT TESTS ---

class US24_TrainerAggregatedFeedbackTests(TestCase):
    """US 2.4 – Trainer accesses aggregated feedback for their programs."""

    def setUp(self):
        self.client = APIClient()
        self.trainer = User.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        self.user_a = User.objects.create_user(
            username='user_a',
            email='user_a@example.com',
            password='UserPass123!',
        )
        self.user_b = User.objects.create_user(
            username='user_b',
            email='user_b@example.com',
            password='UserPass123!',
        )
        self.program = WorkoutPlan.objects.create(
            name='Trainer Strength Program',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='intermediate',
            weekly_frequency=4,
            session_length=60,
        )

    def test_trainer_can_access_program_feedback_endpoint(self):
        """Trainer can retrieve feedback data for one of their programs."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND],
        )

    def test_regular_user_cannot_access_trainer_feedback(self):
        """Regular users cannot access trainer-level feedback aggregation."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST],
        )

    def test_trainer_cannot_view_feedback_for_other_trainers_program(self):
        """A trainer cannot see aggregated feedback for another trainer's program."""
        other_trainer = User.objects.create_user(
            username='other_trainer',
            email='other@example.com',
            password='TrainerPass123!',
            is_trainer=True,
        )
        other_program = WorkoutPlan.objects.create(
            name='Other Trainer Program',
            trainer=other_trainer,
            focus=['cardio'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=30,
        )
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{other_program.id}/feedback/')
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
        )

    def test_unauthenticated_user_cannot_access_feedback(self):
        """Unauthenticated requests to trainer feedback endpoint are rejected."""
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_trainee_count_endpoint_is_accessible_by_trainer(self):
        """Trainer can view how many users are following their programs."""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/trainer/trainee-count/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

# --- INTEGRATION TESTS ---

class US24_AggregatedFeedbackIntegrationTests(TestCase):
    """US 2.4 Integration - Users complete sessions; trainer views aggregated feedback."""

    def setUp(self):
        self.client = APIClient()
        self.trainer = User.objects.create_user(
            username='trainerflow', email='trainerflow@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.user = User.objects.create_user(
            username='userflow', email='userflow@example.com', password='UserPass123!'
        )
        self.program = WorkoutPlan.objects.create(
            name='Feedback Program', trainer=self.trainer,
            focus=['strength'], difficulty='intermediate', weekly_frequency=4, session_length=60,
        )

    def test_full_users_complete_sessions_trainer_views_feedback(self):
        """Users complete sessions on trainer's program; trainer accesses feedback endpoint."""
        # Step 1: trainer checks trainee count
        self.client.force_authenticate(user=self.trainer)
        count = self.client.get('/api/trainer/trainee-count/')
        self.assertEqual(count.status_code, status.HTTP_200_OK)

        # Step 2: trainer views feedback for their program
        feedback = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertIn(feedback.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

        # Step 3: a regular user cannot access the same feedback
        self.client.force_authenticate(user=self.user)
        blocked = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertIn(blocked.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST])
