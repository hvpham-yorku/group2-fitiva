# User Story 1.7 - Select Training Plan and Auto-Generate Weekly Schedule
# As a user, I want to select a workout plan and have the system automatically
# generate my weekly training schedule so that I know what workouts to perform
# each day.

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from api.models import WorkoutPlan, ProgramSection, UserSchedule

User = get_user_model()


# --- UNIT TESTS ---

class US17_GenerateWeeklyScheduleTests(TestCase):
    """US 1.7 – User selects a program and the system generates a weekly schedule."""

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
            name='Weekly Strength Plan',
            trainer=self.trainer,
            focus=['strength'],
            difficulty='beginner',
            weekly_frequency=3,
            session_length=45,
        )
        ProgramSection.objects.create(
            plan=self.program,
            format='Monday',
            type='Upper Body',
            is_rest_day=False,
        )
        ProgramSection.objects.create(
            plan=self.program,
            format='Wednesday',
            type='Rest',
            is_rest_day=True,
        )
        ProgramSection.objects.create(
            plan=self.program,
            format='Friday',
            type='Lower Body',
            is_rest_day=False,
        )

    def test_user_can_generate_schedule_for_selected_program(self):
        """Selecting a program triggers schedule generation and returns a schedule."""
        self.client.force_authenticate(user=self.user)
        payload = {
            'program_id': self.program.id,
            'start_date': date.today().isoformat(),
        }
        response = self.client.post('/api/schedule/generate/', payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_generated_schedule_is_stored_in_database(self):
        """After generation, a UserSchedule record is created for the user."""
        self.client.force_authenticate(user=self.user)
        payload = {
            'program_id': self.program.id,
            'start_date': date.today().isoformat(),
        }
        self.client.post('/api/schedule/generate/', payload, format='json')
        self.assertTrue(UserSchedule.objects.filter(user=self.user).exists())

    def test_active_schedule_is_retrievable(self):
        """After generation, the user can retrieve their active schedule."""
        self.client.force_authenticate(user=self.user)
        payload = {
            'program_id': self.program.id,
            'start_date': date.today().isoformat(),
        }
        self.client.post('/api/schedule/generate/', payload, format='json')
        response = self.client.get('/api/schedule/active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_user_cannot_generate_schedule(self):
        """Unauthenticated requests to generate a schedule are rejected."""
        payload = {
            'program_id': self.program.id,
            'start_date': date.today().isoformat(),
        }
        response = self.client.post('/api/schedule/generate/', payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_schedule_generation_fails_for_nonexistent_program(self):
        """Schedule generation fails when the specified program does not exist."""
        self.client.force_authenticate(user=self.user)
        payload = {
            'program_id': 99999,
            'start_date': date.today().isoformat(),
        }
        response = self.client.post('/api/schedule/generate/', payload, format='json')
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND],
        )

# --- INTEGRATION TESTS ---

class US17_GenerateScheduleIntegrationTests(TestCase):
    """US 1.7 Integration - User selects program, schedule is generated and retrievable."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='scheduser', email='sched@example.com', password='TestPass123!'
        )
        self.trainer = User.objects.create_user(
            username='trainer', email='trainer@example.com',
            password='TrainerPass123!', is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name='Full Week Plan', trainer=self.trainer,
            focus=['strength'], difficulty='beginner', weekly_frequency=3, session_length=45,
        )
        ProgramSection.objects.create(plan=self.program, format='Monday', type='Upper Body', is_rest_day=False)
        self.client.force_authenticate(user=self.user)

    def test_full_select_program_and_get_schedule_flow(self):
        """User selects a program, schedule is generated, and active schedule is returned."""
        # Step 1: generate schedule
        gen = self.client.post('/api/schedule/generate/', {
            'program_id': self.program.id, 'start_date': date.today().isoformat(),
        }, format='json')
        self.assertIn(gen.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Step 2: retrieve active schedule
        active = self.client.get('/api/schedule/active/')
        self.assertEqual(active.status_code, status.HTTP_200_OK)
        self.assertIn('weekly_schedule', active.data)

        # Step 3: verify schedule is stored in DB
        self.assertTrue(UserSchedule.objects.filter(user=self.user).exists())
