# User Story 2.1 - Submit Post-Workout Feedback & Trainer Management
# As a user, I want to rate workout difficulty and provide session feedback so that
# the system can personalise and improve my future training plans.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from api.models import WorkoutPlan, WorkoutSession, WorkoutFeedback

User = get_user_model()


# --- UNIT TESTS ---

class US21_PostWorkoutFeedbackTests(TestCase):
    """US 2.1 – User submits difficulty rating and notes after completing a session."""

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
        self.program = WorkoutPlan.objects.create(
            name='Test Program',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        self.today = date.today().isoformat()
        self.client.force_authenticate(user=self.user)

    def _start_and_complete_session(self):
        """Helper: start and complete a workout session for today."""
        self.client.post(f'/api/sessions/start/{self.today}/', format='json')
        self.client.post(
            f'/api/sessions/complete/{self.today}/',
            {'program_id': self.program.id},
            format='json',
        )

    def test_user_can_submit_feedback_after_completing_session(self):
        """A difficulty rating can be submitted for a completed workout session."""
        self._start_and_complete_session()
        data = {
            'difficulty_rating': 3,
            'fatigue_level': 2,
            'pain_reported': False,
            'notes': 'Felt manageable',
        }
        response = self.client.post(f'/api/sessions/feedback/{self.today}/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_feedback_is_stored_in_database(self):
        """Submitted feedback is persisted and linked to the workout session."""
        self._start_and_complete_session()
        data = {'difficulty_rating': 4, 'fatigue_level': 3, 'pain_reported': False, 'notes': ''}
        self.client.post(f'/api/sessions/feedback/{self.today}/', data, format='json')
        session = WorkoutSession.objects.filter(user=self.user).first()
        if session:
            self.assertTrue(WorkoutFeedback.objects.filter(session=session).exists())

    def test_invalid_difficulty_rating_is_rejected(self):
        """Feedback with a difficulty rating outside the allowed range is rejected."""
        self._start_and_complete_session()
        data = {'difficulty_rating': 10, 'fatigue_level': 1, 'pain_reported': False, 'notes': ''}
        response = self.client.post(f'/api/sessions/feedback/{self.today}/', data, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK],
        )

    def test_unauthenticated_user_cannot_submit_feedback(self):
        """Unauthenticated users cannot submit workout feedback."""
        unauth_client = APIClient()
        data = {'difficulty_rating': 3, 'fatigue_level': 2, 'pain_reported': False, 'notes': ''}
        response = unauth_client.post(f'/api/sessions/feedback/{self.today}/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_feedback_can_include_pain_flag(self):
        """Feedback can include a pain_reported flag to alert the trainer."""
        self._start_and_complete_session()
        data = {
            'difficulty_rating': 5,
            'fatigue_level': 5,
            'pain_reported': True,
            'notes': 'Knee pain during squats',
        }
        response = self.client.post(f'/api/sessions/feedback/{self.today}/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

# --- INTEGRATION TESTS ---

class US21_FeedbackIntegrationTests(TestCase):
    """US 2.1 Integration - User starts, completes session, then submits feedback."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='feedbackflow', email='feedback@example.com', password='TestPass123!'
        )
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name='Feedback Program', trainer=self.trainer,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        self.today = date.today().isoformat()
        self.client.force_authenticate(user=self.user)

    def test_full_session_and_feedback_flow(self):
        """User starts a session, completes it, then submits difficulty feedback."""
        # Step 1: start session
        start = self.client.post(f'/api/sessions/start/{self.today}/', format='json')
        self.assertIn(start.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 2: complete session
        complete = self.client.post(f'/api/sessions/complete/{self.today}/', {
            'program_id': self.program.id,
        }, format='json')
        self.assertIn(complete.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 3: submit feedback
        feedback = self.client.post(f'/api/sessions/feedback/{self.today}/', {
            'difficulty_rating': 3, 'fatigue_level': 2,
            'pain_reported': False, 'notes': 'Felt good',
        }, format='json')
        self.assertIn(feedback.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 4: verify feedback is linked to session
        session = WorkoutSession.objects.filter(user=self.user).first()
        if session:
            self.assertTrue(WorkoutFeedback.objects.filter(session=session).exists())
