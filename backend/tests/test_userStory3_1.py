from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import WorkoutSession

User = get_user_model()

class RecordWorkoutCompletionTests(APITestCase):
    """Test suite for US 3.1 - Record Workout Completion"""

    def setUp(self):
        # Setup Member User
        self.user = User.objects.create_user(
            username="workout_tester",
            password="Testpass123!",
            email="workout@fitiva.com"
        )
        self.client.login(username="workout_tester", password="Testpass123!")
        self.today_str = timezone.now().date().isoformat()

    # --- UNIT & INTEGRATION TESTS ---

    def test_complete_workout_success(self):
        """Main Scenario: Successfully completing a workout updates DB and returns success"""
        url = f"/api/sessions/complete/{self.today_str}/"
        payload = {
            "duration_minutes": 45,
            "notes": "Felt great today!"
        }
        
        response = self.client.post(url, payload, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertTrue(response.data["is_completed"])
        
        # Verify Database State
        session = WorkoutSession.objects.get(user=self.user, date=self.today_str)
        self.assertEqual(session.status, "completed")
        self.assertEqual(session.duration_minutes, 45)
        self.assertEqual(session.notes, "Felt great today!")

    def test_complete_workout_invalid_date(self):
        """Corner Case: Providing an incorrectly formatted date string throws a 400"""
        url = "/api/sessions/complete/2026-13-45/"  # Invalid month and day
        
        response = self.client.post(url, {"duration_minutes": 30}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid date format", str(response.data))

    def test_undo_workout_completion(self):
        """Main Scenario: Undoing a completed workout resets it to in_progress"""
        # Create a completed session
        WorkoutSession.objects.create(
            user=self.user, 
            date=self.today_str, 
            status="completed", 
            is_completed=True
        )
        
        url = f"/api/sessions/undo/{self.today_str}/"
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Database State reverted
        session = WorkoutSession.objects.get(user=self.user, date=self.today_str)
        self.assertEqual(session.status, "in_progress")
        self.assertFalse(session.is_completed)