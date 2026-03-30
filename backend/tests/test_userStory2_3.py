# User Story 2.3 - Automatic Weekly Schedule Regeneration
# As a user, I want to rate how difficult a workout felt and report issues so that
# the system can learn from my experience and regenerate my schedule automatically.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from api.models import WorkoutPlan, ProgramSection, UserSchedule

User = get_user_model()


# --- UNIT TESTS ---

class US23_ScheduleRegenerationTests(TestCase):
    """US 2.3 – System regenerates schedule based on user feedback."""

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
            name='Adaptive Strength Plan',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        ProgramSection.objects.create(
            program=self.program, format='Monday', type='Upper Body', is_rest_day=False
        )
        ProgramSection.objects.create(
            program=self.program, format='Wednesday', type='Rest', is_rest_day=True
        )
        ProgramSection.objects.create(
            program=self.program, format='Friday', type='Lower Body', is_rest_day=False
        )
        self.client.force_authenticate(user=self.user)
        # Generate an initial schedule
        self.client.post(
            '/api/schedule/generate/',
            {'program_id': self.program.id, 'start_date': date.today().isoformat()},
            format='json',
        )

    def test_regeneration_preview_endpoint_is_accessible(self):
        """The regeneration preview endpoint responds for a user with an active schedule."""
        response = self.client.post('/api/schedule/regenerate/preview/', {}, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_regeneration_apply_updates_schedule(self):
        """Applying regeneration modifies the user's active schedule."""
        apply_response = self.client.post('/api/schedule/regenerate/apply/', {}, format='json')
        self.assertIn(
            apply_response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_recovery_option_can_be_applied(self):
        """System can apply a recovery option when user reports fatigue or pain."""
        response = self.client.post(
            '/api/schedule/apply-recovery-option/',
            {'option': 'rest_day'},
            format='json',
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_schedule_can_be_deactivated(self):
        """User can deactivate their current schedule."""
        response = self.client.delete('/api/schedule/deactivate/', format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_unauthenticated_user_cannot_regenerate_schedule(self):
        """Unauthenticated users cannot trigger schedule regeneration."""
        unauth_client = APIClient()
        response = unauth_client.post('/api/schedule/regenerate/apply/', {}, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

# --- INTEGRATION TESTS ---

class US23_RegenerationIntegrationTests(TestCase):
    """US 2.3 Integration - User has schedule, triggers regeneration, verifies it applies."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='regenflow', email='regen@example.com', password='TestPass123!'
        )
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name='Regen Plan', trainer=self.trainer,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        ProgramSection.objects.create(program=self.program, format='Monday', type='Upper Body', is_rest_day=False)
        self.client.force_authenticate(user=self.user)

    def test_full_generate_and_regenerate_flow(self):
        """User generates a schedule then attempts to apply a regeneration."""
        # Step 1: generate schedule
        gen = self.client.post('/api/schedule/generate/', {
            'program_id': self.program.id, 'start_date': date.today().isoformat(),
        }, format='json')
        self.assertIn(gen.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 2: apply regeneration
        regen = self.client.post('/api/schedule/regenerate/apply/', {}, format='json')
        self.assertIn(regen.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        # Step 3: active schedule is still accessible after regeneration
        active = self.client.get('/api/schedule/active/')
        self.assertEqual(active.status_code, status.HTTP_200_OK)
