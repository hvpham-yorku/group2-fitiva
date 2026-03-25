from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import WorkoutSession
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
