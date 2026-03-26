from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from api.models import WorkoutPlan, WorkoutSession

User = get_user_model()

class WorkoutHistoryFilteringTests(APITestCase):
    """Test suite for history filtering feature (UI-driven behavior)"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="historyuser",
            password="TestPass123!",
            email="history@example.com"
        )

        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )

        self.plan = WorkoutPlan.objects.create(
            name="History Plan",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )

        self.client.force_authenticate(user=self.user)

def test_no_filters_returns_all_sessions(self):
    """Test that no filters returns full workout history"""

    for i in range(3):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=date.today() - timedelta(days=i),
            status="completed",
            is_completed=True
        )

    response = self.client.get("/api/sessions/history/")
    self.assertEqual(response.status_code, status.HTTP_200_OK)

    data = response.json()
    self.assertEqual(data["total"], 3)
def test_filter_by_start_date_only(self):
    """Test filtering sessions after a start date"""

    old = date.today() - timedelta(days=10)
    recent = date.today() - timedelta(days=2)

    WorkoutSession.objects.create(
        user=self.user,
        plan=self.plan,
        date=old,
        status="completed",
        is_completed=True
    )

    WorkoutSession.objects.create(
        user=self.user,
        plan=self.plan,
        date=recent,
        status="completed",
        is_completed=True
    )

    start = (date.today() - timedelta(days=5)).isoformat()

    response = self.client.get(f"/api/sessions/history/?start={start}")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()

    self.assertEqual(data["total"], 1)
    self.assertEqual(data["sessions"][0]["date"], recent.isoformat())

def test_filter_by_end_date_only(self):
    """Test filtering sessions before an end date"""

    old = date.today() - timedelta(days=10)
    recent = date.today() - timedelta(days=2)

    WorkoutSession.objects.create(
        user=self.user,
        plan=self.plan,
        date=old,
        status="completed",
        is_completed=True
    )

    WorkoutSession.objects.create(
        user=self.user,
        plan=self.plan,
        date=recent,
        status="completed",
        is_completed=True
    )

    end = (date.today() - timedelta(days=5)).isoformat()

    response = self.client.get(f"/api/sessions/history/?end={end}")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()

    self.assertEqual(data["total"], 1)
    self.assertEqual(data["sessions"][0]["date"], old.isoformat())

def test_filter_by_date_range(self):
    """Test filtering sessions between start and end dates"""

    d1 = date.today() - timedelta(days=8)
    d2 = date.today() - timedelta(days=5)
    d3 = date.today() - timedelta(days=2)

    for d in (d1, d2, d3):
        WorkoutSession.objects.create(
            user=self.user,
            plan=self.plan,
            date=d,
            status="completed",
            is_completed=True
        )

    start = (date.today() - timedelta(days=7)).isoformat()
    end = (date.today() - timedelta(days=3)).isoformat()

    response = self.client.get(f"/api/sessions/history/?start={start}&end={end}")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()

    self.assertEqual(data["total"], 1)
    self.assertEqual(data["sessions"][0]["date"], d2.isoformat())

def test_filter_returns_no_results(self):
    """Test filtering when no sessions match"""

    WorkoutSession.objects.create(
        user=self.user,
        plan=self.plan,
        date=date.today() - timedelta(days=20),
        status="completed",
        is_completed=True
    )

    start = (date.today() - timedelta(days=5)).isoformat()

    response = self.client.get(f"/api/sessions/history/?start={start}")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()

    self.assertEqual(data["total"], 0)
    self.assertEqual(data["sessions"], [])