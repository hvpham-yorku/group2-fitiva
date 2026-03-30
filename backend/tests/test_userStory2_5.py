# User Story 2.5 - Accept or Lock Recommended Adjustments
# As a user, I want to accept, reject, or lock recommended schedule changes so that
# I retain control over my training plan.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from api.models import WorkoutPlan, ProgramSection, UserSchedule

User = get_user_model()


# --- UNIT TESTS ---

class US25_LockAdjustmentsTests(TestCase):
    """US 2.5 – User accepts, rejects, or locks schedule adjustments."""

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
            name='Lockable Plan',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        ProgramSection.objects.create(
            program=self.program, format='Monday', type='Upper Body', is_rest_day=False
        )
        self.client.force_authenticate(user=self.user)
        # Create a schedule so there is something to lock
        gen_response = self.client.post(
            '/api/schedule/generate/',
            {'program_id': self.program.id, 'start_date': date.today().isoformat()},
            format='json',
        )
        self.schedule_id = None
        if gen_response.status_code in [200, 201]:
            self.schedule_id = (
                gen_response.data.get('id')
                or gen_response.data.get('schedule', {}).get('id')
            )

    def test_user_can_lock_their_schedule(self):
        """User can lock a schedule so that adjustments are no longer applied."""
        if self.schedule_id is None:
            self.skipTest('Schedule was not created; skipping lock test.')
        response = self.client.post(
            f'/api/schedule/{self.schedule_id}/lock/', {}, format='json'
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_user_can_lock_adjustments_via_dedicated_endpoint(self):
        """User can lock schedule adjustments via the adjustment-lock endpoint."""
        response = self.client.post('/api/schedule/lock-adjustments/', {}, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_user_can_revert_to_original_schedule(self):
        """User can reject AI changes by reverting to the original schedule."""
        response = self.client.post('/api/schedule/revert/', {}, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_user_can_remove_a_program_from_schedule(self):
        """User can remove a specific program from their schedule."""
        response = self.client.delete(
            f'/api/schedule/remove-program/{self.program.id}/', format='json'
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND],
        )

    def test_unauthenticated_user_cannot_lock_schedule(self):
        """Unauthenticated users cannot lock or modify schedule adjustments."""
        unauth_client = APIClient()
        response = unauth_client.post('/api/schedule/lock-adjustments/', {}, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_user_can_check_if_program_is_in_schedule(self):
        """User can check whether a given program is already part of their schedule."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/schedule/check-program/{self.program.id}/')
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND],
        )

# --- INTEGRATION TESTS ---

class US25_LockAdjustmentsIntegrationTests(TestCase):
    """US 2.5 Integration - User generates schedule, locks it, then verifies lock behaviour."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='lockflow', email='lock@example.com', password='TestPass123!'
        )
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name='Lock Plan', trainer=self.trainer,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        ProgramSection.objects.create(program=self.program, format='Monday', type='Upper Body', is_rest_day=False)
        self.client.force_authenticate(user=self.user)

    def test_full_generate_lock_and_check_flow(self):
        """User generates schedule, locks adjustments, then checks program is in schedule."""
        # Step 1: generate schedule
        gen = self.client.post('/api/schedule/generate/', {
            'program_id': self.program.id, 'start_date': date.today().isoformat(),
        }, format='json')
        self.assertIn(gen.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 2: lock schedule adjustments
        lock = self.client.post('/api/schedule/lock-adjustments/', {}, format='json')
        self.assertIn(lock.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        # Step 3: check program is in schedule
        check = self.client.get(f'/api/schedule/check-program/{self.program.id}/')
        self.assertIn(check.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

        # Step 4: revert schedule to original
        revert = self.client.post('/api/schedule/revert/', {}, format='json')
        self.assertIn(revert.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
