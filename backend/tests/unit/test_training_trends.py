from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import WorkoutPlan, WorkoutSession

User = get_user_model()


class TrainingTrendsHistoryTests(APITestCase):
    
    # Create test user, other user, trainer, and a workout plan for session fixtures.
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="testuser@example.com",
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            password="OtherPass123!",
            email="other@example.com",
        )
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True,
        )
        self.plan = WorkoutPlan.objects.create(
            name="Test Plan",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
        )
    # Authenticated user gets 200 and a list of their completed sessions with total count.
    def test_authenticated_user_retrieves_completed_history(self):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today(),
            status="completed",
            is_completed=True,
            duration_minutes=30,
        )
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today() - timedelta(days=1),
            status="completed",
            is_completed=True,
            duration_minutes=45,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("sessions", data)
        self.assertIn("total", data)
        self.assertEqual(len(data["sessions"]), 2)
        self.assertEqual(data["total"], 2)

    # Response includes only completed sessions belonging to the authenticated user.
    def test_only_returns_workouts_for_logged_in_user(self):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today(),
            status="completed",
            is_completed=True,
        )
        WorkoutSession.objects.create(
            user=self.other_user,
            plan=self.plan,
            date=date.today(),
            status="completed",
            is_completed=True,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(len(data["sessions"]), 1)
        self.assertEqual(data["sessions"][0]["user"], self.user.id)
    # Only sessions with status completed are returned; in-progress sessions are excluded.
    def test_only_completed_sessions_returned(self):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today(),
            status="in_progress",
            is_completed=False,
        )
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today() - timedelta(days=1),
            status="completed",
            is_completed=True,
            duration_minutes=40,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(len(data["sessions"]), 1)
        self.assertTrue(data["sessions"][0]["is_completed"])

    def test_sessions_ordered_by_date_descending(self):
        d1 = date.today() - timedelta(days=2)
        d2 = date.today() - timedelta(days=1)
        d3 = date.today()
        for d in (d1, d2, d3):
            WorkoutSession.objects.create(
                user=self.user,
                plan=self.plan,
                date=d,
                status="completed",
                is_completed=True,
            )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data["sessions"]), 3)
        self.assertEqual(data["sessions"][0]["date"], d3.isoformat())
        self.assertEqual(data["sessions"][1]["date"], d2.isoformat())
        self.assertEqual(data["sessions"][2]["date"], d1.isoformat())

    def test_response_contains_required_fields(self):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today(),
            status="completed",
            is_completed=True,
            duration_minutes=50,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreater(len(data["sessions"]), 0)
        session = data["sessions"][0]
        self.assertIn("id", session)
        self.assertIn("plan_name", session)
        self.assertIn("date", session)
        self.assertIn("duration_minutes", session)

    # The top-level total field equals the length of the sessions array.
    def test_total_equals_session_count(self):
        for i in range(3):
            WorkoutSession.objects.create(
                user=self.user,
                plan=self.plan,
                date=date.today() - timedelta(days=i),
                status="completed",
                is_completed=True,
            )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], len(data["sessions"]))
        self.assertEqual(data["total"], 3)

    def test_no_completed_workouts_returns_empty(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], 0)
        self.assertEqual(data["sessions"], [])

    def test_unauthenticated_returns_401(self):
        response = self.client.get("/api/sessions/history/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_query_param_start_filters_correctly(self):
        old = date.today() - timedelta(days=10)
        recent = date.today() - timedelta(days=2)
        for d in (old, recent):
            WorkoutSession.objects.create(
                user=self.user,
                plan=self.plan,
                date=d,
                status="completed",
                is_completed=True,
            )
        self.client.force_authenticate(user=self.user)
        start = (date.today() - timedelta(days=5)).isoformat()
        response = self.client.get(f"/api/sessions/history/?start={start}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["sessions"][0]["date"], recent.isoformat())
    # Query param end=YYYY-MM-DD returns only sessions on or before that date.
    def test_query_param_end_filters_correctly(self):
        old = date.today() - timedelta(days=10)
        recent = date.today() - timedelta(days=2)
        for d in (old, recent):
            WorkoutSession.objects.create(
                user=self.user,
                plan=self.plan,
                date=d,
                status="completed",
                is_completed=True,
            )
        self.client.force_authenticate(user=self.user)
        end = (date.today() - timedelta(days=5)).isoformat()
        response = self.client.get(f"/api/sessions/history/?end={end}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["sessions"][0]["date"], old.isoformat())
    # Query params start and end together return only sessions within the date range.
    def test_query_params_start_and_end_together(self):
        d1 = date.today() - timedelta(days=8)
        d2 = date.today() - timedelta(days=5)
        d3 = date.today() - timedelta(days=2)
        for d in (d1, d2, d3):
            WorkoutSession.objects.create(
                user=self.user,
                plan=self.plan,
                date=d,
                status="completed",
                is_completed=True,
            )
        self.client.force_authenticate(user=self.user)
        start = (date.today() - timedelta(days=7)).isoformat()
        end = (date.today() - timedelta(days=3)).isoformat()
        response = self.client.get(f"/api/sessions/history/?start={start}&end={end}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["sessions"][0]["date"], d2.isoformat())

    # When a session is linked to a plan, the response includes plan_name from that plan.
    def test_plan_name_populated_when_session_has_plan(self):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today(),
            status="completed",
            is_completed=True,
            duration_minutes=40,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data["sessions"]), 1)
        self.assertEqual(data["sessions"][0]["plan_name"], self.plan.name)
