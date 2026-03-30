from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import UserSchedule, WorkoutSession

User = get_user_model()

class DetectMissedSessionsTests(APITestCase):
    """Test suite for US 3.5 - Detect Missed Sessions"""

    def setUp(self):
        self.user = User.objects.create_user(username="missed_tester", password="Testpass123!", email="missed@fitiva.com")
        self.client.login(username="missed_tester", password="Testpass123!")
        
        self.today = timezone.now().date()
        self.yesterday = self.today - timedelta(days=1)
        self.two_days_ago = self.today - timedelta(days=2)
        
        yesterday_name = self.yesterday.strftime('%A').lower()
        two_days_ago_name = self.two_days_ago.strftime('%A').lower()

        # Create a schedule that started 3 days ago, with workouts scheduled on the past 2 days
        self.schedule = UserSchedule.objects.create(
            user=self.user,
            start_date=self.today - timedelta(days=3),
            weekly_schedule={
                two_days_ago_name: [1], 
                yesterday_name: [2], 
                self.today.strftime('%A').lower(): [3] # Today
            },
            is_active=True
        )

    # --- UNIT & INTEGRATION TESTS ---

    def test_auto_mark_past_missed_sessions(self):
        """Main Scenario: Fetching history triggers background detection of missed workouts"""
        # Initially, 0 sessions exist in the DB
        self.assertEqual(WorkoutSession.objects.filter(user=self.user).count(), 0)

        # Trigger detection via history endpoint
        response = self.client.get("/api/sessions/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # It should create 'missed' sessions for yesterday and 2 days ago, but NOT today
        missed_sessions = WorkoutSession.objects.filter(user=self.user, status='missed')
        self.assertEqual(missed_sessions.count(), 2)
        
        missed_dates = [s.date for s in missed_sessions]
        self.assertIn(self.yesterday, missed_dates)
        self.assertIn(self.two_days_ago, missed_dates)
        self.assertNotIn(self.today, missed_dates) # Today is not missed yet!

    def test_existing_sessions_prevent_missed_marking(self):
        """Corner Case: If a session was already completed, it shouldn't be overwritten as missed"""
        # User actually completed the workout 2 days ago
        WorkoutSession.objects.create(
            user=self.user, 
            date=self.two_days_ago, 
            status='completed', 
            is_completed=True
        )

        # Trigger detection
        self.client.get("/api/sessions/history/")
        
        # Only yesterday should be marked missed. Two days ago remains completed.
        self.assertEqual(WorkoutSession.objects.filter(user=self.user, status='missed').count(), 1)
        self.assertTrue(WorkoutSession.objects.filter(user=self.user, date=self.two_days_ago, status='completed').exists())

    def test_rest_days_not_marked_missed(self):
        """Corner Case: Days with empty arrays (rest days) are ignored by the missed session detector"""
        # Change yesterday to a rest day in the schedule
        yesterday_name = self.yesterday.strftime('%A').lower()
        new_schedule = self.schedule.weekly_schedule.copy()
        new_schedule[yesterday_name] = []
        self.schedule.weekly_schedule = new_schedule
        self.schedule.save()

        # Trigger detection
        self.client.get("/api/sessions/history/")

        # Only 2 days ago should be marked missed
        self.assertEqual(WorkoutSession.objects.filter(user=self.user, status='missed').count(), 1)