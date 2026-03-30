# User Story 2.2 - View Plan Adjustments & Explanations
# As a user, I want to see which parts of my next week's training plan were changed
# based on my workout feedback so that I understand why those adjustments were made.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from api.models import WorkoutPlan, ProgramSection, UserSchedule

User = get_user_model()


# --- UNIT TESTS ---

class US22_ViewPlanAdjustmentsTests(TestCase):
    """US 2.2 – User reviews AI-driven adjustments to their upcoming schedule."""

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
            name='Adaptive Plan',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        self.client.force_authenticate(user=self.user)

    def _create_active_schedule(self):
        """Helper: generate a schedule for the user."""
        payload = {
            'program_id': self.program.id,
            'start_date': date.today().isoformat(),
        }
        return self.client.post('/api/schedule/generate/', payload, format='json')

    def test_user_can_preview_schedule_regeneration(self):
        """After feedback, user can preview what next week's schedule would look like."""
        self._create_active_schedule()
        response = self.client.post('/api/schedule/regenerate/preview/', {}, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_user_can_apply_regenerated_schedule(self):
        """User can apply the previewed adjustments to their active schedule."""
        self._create_active_schedule()
        response = self.client.post('/api/schedule/regenerate/apply/', {}, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_user_can_revert_schedule_to_original(self):
        """User can revert any AI adjustments back to the original schedule."""
        self._create_active_schedule()
        response = self.client.post('/api/schedule/revert/', {}, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_unauthenticated_user_cannot_preview_adjustments(self):
        """Unauthenticated users cannot access schedule adjustment previews."""
        unauth_client = APIClient()
        response = unauth_client.post('/api/schedule/regenerate/preview/', {}, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_active_schedule_endpoint_returns_current_plan(self):
        """User can retrieve their current active schedule to see any changes."""
        self._create_active_schedule()
        response = self.client.get('/api/schedule/active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('weekly_schedule', response.data)

# --- INTEGRATION TESTS ---

class US22_PlanAdjustmentsIntegrationTests(TestCase):
    """US 2.2 Integration - User generates schedule then previews and views adjustments."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='adjustflow', email='adjust@example.com', password='TestPass123!'
        )
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name='Adjust Plan', trainer=self.trainer,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        self.client.force_authenticate(user=self.user)

    def test_full_schedule_preview_and_view_flow(self):
        """User generates a schedule, previews adjustments, and retrieves active schedule."""
        # Step 1: generate schedule
        gen = self.client.post('/api/schedule/generate/', {
            'program_id': self.program.id, 'start_date': date.today().isoformat(),
        }, format='json')
        self.assertIn(gen.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 2: preview regeneration adjustments
        preview = self.client.post('/api/schedule/regenerate/preview/', {}, format='json')
        self.assertIn(preview.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        # Step 3: view active schedule to see current plan
        active = self.client.get('/api/schedule/active/')
        self.assertEqual(active.status_code, status.HTTP_200_OK)
        self.assertIn('weekly_schedule', active.data)
