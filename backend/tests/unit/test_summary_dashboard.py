import unittest

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import WorkoutPlan, WorkoutSession
from datetime import date

User = get_user_model()

class ProgressSummaryDashboardTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="dashboarduser",
            password="UserPass123!",
            email="dashboard@example.com",
            is_trainer=False
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            password="UserPass123!",
            email="other@example.com",
            is_trainer=False
        )
        self.dashboard_url = "/api/dashboard/summary/"

    def test_get_progress_summary_with_workout_data(self):
        self.client.force_authenticate(user=self.user)
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 1),
            duration_minutes=45, is_completed=True, status='completed'
        )
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 2),
            duration_minutes=30, is_completed=True, status='completed'
        )
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 2)
        self.assertEqual(response.data["total_time_trained"], 75)

    def test_get_progress_summary_with_no_workouts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 0)
        self.assertEqual(response.data["total_time_trained"], 0)

    def test_dashboard_only_counts_completed_workouts(self):
        self.client.force_authenticate(user=self.user)
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 1),
            duration_minutes=40, is_completed=True, status='completed'
        )
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 2),
            duration_minutes=20, is_completed=False, status='in_progress'
        )
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 1)
        self.assertEqual(response.data["total_time_trained"], 40)

    def test_dashboard_does_not_include_other_users_data(self):
        self.client.force_authenticate(user=self.user)
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 1),
            duration_minutes=35, is_completed=True, status='completed'
        )
        WorkoutSession.objects.create(
            user=self.other_user, date=date(2026, 1, 2),
            duration_minutes=60, is_completed=True, status='completed'
        )
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 1)
        self.assertEqual(response.data["total_time_trained"], 35)

    def test_dashboard_requires_authentication(self):
        response = self.client.get(self.dashboard_url)
        self.assertIn(response.status_code,
                      [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_dashboard_visual_data_is_returned(self):
        self.client.force_authenticate(user=self.user)
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 1),
            duration_minutes=25, is_completed=True, status='completed'
        )
        WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 2),
            duration_minutes=50, is_completed=True, status='completed'
        )
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("chart_data", response.data)
        self.assertIsInstance(response.data["chart_data"], list)

    def test_dashboard_visual_data_returns_empty_list_when_no_workouts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("chart_data", response.data)
        self.assertEqual(response.data["chart_data"], [])

    def test_dashboard_handles_multiple_completed_workouts_correctly(self):
        self.client.force_authenticate(user=self.user)
        for i, mins in enumerate([15, 20, 25, 40], start=1):
            WorkoutSession.objects.create(
                user=self.user, date=date(2026, 1, i),
                duration_minutes=mins, is_completed=True, status='completed'
            )
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 4)
        self.assertEqual(response.data["total_time_trained"], 100)


class DashboardProgressFlowTests(APITestCase):
    """Tests for viewing the progress summary dashboard through realistic flows."""

    def setUp(self):
        self.trainer = User.objects.create_user(
            username="dashtrainer",
            password="TrainerPass123!",
            email="dashtrainer@example.com",
            is_trainer=True,
        )
        self.program = WorkoutPlan.objects.create(
            name="Strength Starter",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
            is_published=True,
        )
        self.user = User.objects.create_user(
            username="dashflowuser",
            password="UserPass123!",
            email="dashflow@example.com",
            is_trainer=False,
        )
        self.user_b = User.objects.create_user(
            username="dashflowuser_b",
            password="UserPass123!",
            email="dashflow_b@example.com",
            is_trainer=False,
        )
        self.other_user = User.objects.create_user(
            username="dashflowother",
            password="UserPass123!",
            email="dashflowother@example.com",
            is_trainer=False,
        )
        self.dashboard_url = "/api/dashboard/summary/"

    def _create_completed_session(self, user, on_date, duration=45):
        return WorkoutSession.objects.create(
            user=user,
            plan=self.program,
            date=date.fromisoformat(on_date),
            status="completed",
            is_completed=True,
            duration_minutes=duration,
        )

    def test_user_opens_dashboard_and_sees_progress_metrics(self):
        """User opens dashboard and sees progress summary metrics."""
        self.client.force_authenticate(user=self.user)
        self._create_completed_session(self.user, "2026-01-01", duration=45)
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 1)
        self.assertEqual(response.data["total_time_trained"], 45)

    def test_dashboard_updates_after_user_completes_a_workout(self):
        """Dashboard updates after the user completes a workout."""
        self.client.force_authenticate(user=self.user)
        before_response = self.client.get(self.dashboard_url)
        self.assertEqual(before_response.status_code, status.HTTP_200_OK)
        before_total = before_response.data["total_workouts"]

        self._create_completed_session(self.user, "2026-01-02", duration=30)

        after_response = self.client.get(self.dashboard_url)
        self.assertEqual(after_response.status_code, status.HTTP_200_OK)
        self.assertEqual(after_response.data["total_workouts"], before_total + 1)
        self.assertEqual(after_response.data["total_time_trained"], 30)

    def test_new_or_inactive_user_sees_zero_state(self):
        """New or inactive user sees a valid empty or zero state on the dashboard."""
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 0)
        self.assertEqual(response.data["total_time_trained"], 0)
        self.assertEqual(response.data["chart_data"], [])

    def test_dashboard_shows_only_current_users_progress(self):
        """Dashboard shows only the current user's progress summary."""
        self._create_completed_session(self.user, "2026-01-03", duration=35)
        self._create_completed_session(self.other_user, "2026-01-04", duration=60)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_workouts"], 1)
        self.assertEqual(response.data["total_time_trained"], 35)

    @unittest.skip(
        "Visual indicators are frontend-only. The backend summary endpoint "
        "returns chart_data but does not render visual elements."
    )
    def test_dashboard_includes_simple_visual_indicators_for_progress(self):
        """Dashboard includes simple visual indicators for progress."""

    @unittest.skip(
        "Page load speed is a manual usability check. "
        "Backend response timing does not represent the full rendered dashboard."
    )
    def test_dashboard_loads_quickly_for_a_logged_in_user(self):
        """Dashboard loads quickly for a logged-in user."""
