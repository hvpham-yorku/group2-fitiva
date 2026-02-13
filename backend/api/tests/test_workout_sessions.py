from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from api.models import WorkoutPlan, WorkoutSession

User = get_user_model()

# TEST CASES FOR WORKOUT SESSIONS

class WorkoutSessionTests(APITestCase):
    """Test suite for workout session tracking"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!",
            email="test@example.com"
        )
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )
        
        self.program = WorkoutPlan.objects.create(
            name="Test Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )

    def test_start_workout_session(self):
        """Test starting a workout session"""
        self.client.force_authenticate(user=self.user)
        
        today_str = date.today().isoformat()
        response = self.client.post(f"/api/sessions/start/{today_str}/", format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(WorkoutSession.objects.count(), 1)
        
        session = WorkoutSession.objects.first()
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.status, 'in_progress')

    def test_complete_workout_session(self):
        """Test completing a workout session"""
        self.client.force_authenticate(user=self.user)
        
        today = date.today()
        session = WorkoutSession.objects.create(
            user=self.user,
            plan=self.program,
            date=today,
            status='in_progress'
        )
        
        data = {
            "duration_minutes": 45
        }
        
        response = self.client.post(f"/api/sessions/complete/{today.isoformat()}/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')
        self.assertEqual(session.duration_minutes, 45)
