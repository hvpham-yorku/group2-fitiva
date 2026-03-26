from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
from trainer.models import (
    CustomUser, WorkoutPlan, WorkoutFeedback, WorkoutSession
)
from trainer.views import trainer_program_feedback

User = get_user_model()

class TrainerProgramFeedbackTests(APITestCase):
    
    def setUp(self):
        self.client = APIClient()
        
        # Create trainer
        self.trainer = User.objects.create_user(
            username='trainer1', 
            email='trainer@test.com',
            is_trainer=True,
            password='testpass123'
        )
        
        # Create regular user
        self.client_user = User.objects.create_user(
            username='client1', 
            email='client@test.com',
            password='testpass123'
        )
        
        # Create test program
        self.program = WorkoutPlan.objects.create(
            name='Test Program',
            trainer=self.trainer,
            weekly_frequency=3
        )
        
        # Create client session + feedback
        self.session = WorkoutSession.objects.create(
            user=self.client_user,
            date=date.today(),
            status='completed'
        )
    
    def create_feedback(self, difficulty, pain=False, days_ago=0):
        """Helper to create feedback"""
        session_date = date.today() - timedelta(days=days_ago)
        session = WorkoutSession.objects.create(
            user=self.client_user,
            date=session_date,
            status='completed'
        )
        return WorkoutFeedback.objects.create(
            session=session,
            program=self.program,
            difficulty_rating=difficulty,
            fatigue_level=difficulty - 1,
            pain_reported=pain,
            notes=f"Test feedback {days_ago}"
        )
    
    def test_trainer_access_own_program(self):
        """Trainer can access feedback for their own program"""
        self.create_feedback(4)
        self.create_feedback(5)
        
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['program_id'], self.program.id)
        self.assertEqual(response.data['total_responses'], 2)
        self.assertAlmostEqual(response.data['avg_difficulty'], 4.5)
    
    def test_non_trainer_forbidden(self):
        """Non-trainer gets 403"""
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_trainer_other_program_forbidden(self):
        """Trainer can't access other trainer's program"""
        other_trainer = User.objects.create_user(
            username='trainer2', is_trainer=True
        )
        other_program = WorkoutPlan.objects.create(
            name='Other Program', trainer=other_trainer
        )
        
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{other_program.id}/feedback/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_no_feedback_empty_response(self):
        """Empty program returns zeros/nulls"""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_responses'], 0)
        self.assertIsNone(response.data['avg_difficulty'])
    
    def test_weekly_trends_calculation(self):
        """Groups feedback by ISO week"""
        self.create_feedback(4, days_ago=8)  # Previous week
        self.create_feedback(5, days_ago=1)  # This week
        
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        
        self.assertGreater(len(response.data['weekly_trends']), 0)
        self.assertIn('avg_difficulty', response.data['weekly_trends'][0])
    
    def test_pain_report_counting(self):
        """Counts pain_reported=True"""
        self.create_feedback(3, pain=True)
        self.create_feedback(4, pain=False)
        
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/trainer/programs/{self.program.id}/feedback/')
        self.assertEqual(response.data['pain_reported_count'], 1)
