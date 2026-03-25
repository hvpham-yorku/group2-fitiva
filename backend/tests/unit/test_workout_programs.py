from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import WorkoutPlan

User = get_user_model()

# WORKOUT PROGRAMS TEST CASES

class WorkoutProgramTests(APITestCase):
    """Test suite for workout program creation and management"""

    def setUp(self):
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )
        self.other_trainer = User.objects.create_user(
            username="othertrainer",
            password="TrainerPass123!",
            email="other@example.com",
            is_trainer=True
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            password="UserPass123!",
            email="user@example.com",
            is_trainer=False
        )

    def test_create_workout_program_as_trainer(self):
        """Test that trainers can create workout programs"""
        self.client.force_authenticate(user=self.trainer)
        
        data = {
            "name": "Beginner Strength Program",
            "description": "Perfect for beginners",
            "focus": ["strength"],
            "difficulty": "beginner",
            "weekly_frequency": 3,
            "session_length": 45,
            "sections": [
                {
                    "format": "Monday",
                    "type": "Upper Body",
                    "is_rest_day": False,
                    "exercises": [
                        {
                            "name": "Push-ups",
                            "order": 0,
                            "sets": [
                                {"set_number": 1, "reps": 10, "time": None, "rest": 60},
                                {"set_number": 2, "reps": 10, "time": None, "rest": 60}
                            ]
                        }
                    ]
                },
                {
                    "format": "Tuesday",
                    "type": "",
                    "is_rest_day": True,
                    "exercises": []
                }
            ]
        }
        
        response = self.client.post("/api/programs/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkoutPlan.objects.count(), 1)
        
        program = WorkoutPlan.objects.first()
        self.assertEqual(program.name, "Beginner Strength Program")
        self.assertEqual(program.trainer, self.trainer)
        self.assertEqual(program.sections.count(), 2)
        self.assertEqual(program.sections.first().exercises.count(), 1)

    def test_regular_user_cannot_create_program(self):
        """Test that regular users cannot create workout programs"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            "name": "Test Program",
            "description": "Test",
            "focus": ["strength"],
            "difficulty": "beginner",
            "weekly_frequency": 3,
            "session_length": 45
        }
        
        response = self.client.post("/api/programs/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_multiple_focus_areas(self):
        """Test creating program with multiple focus areas"""
        self.client.force_authenticate(user=self.trainer)
        
        data = {
            "name": "Full Body Program",
            "description": "Balanced workout",
            "focus": ["strength", "cardio", "flexibility"],
            "difficulty": "intermediate",
            "weekly_frequency": 4,
            "session_length": 60,
            "sections": []
        }
        
        response = self.client.post("/api/programs/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        program = WorkoutPlan.objects.first()
        self.assertEqual(len(program.focus), 3)
        self.assertIn("cardio", program.focus)

    def test_soft_delete_program(self):
        """Test that programs are soft deleted"""
        self.client.force_authenticate(user=self.trainer)
        
        program = WorkoutPlan.objects.create(
            name="Test Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )
        
        response = self.client.delete(f"/api/programs/{program.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        program.refresh_from_db()
        self.assertTrue(program.is_deleted)
        self.assertTrue(WorkoutPlan.objects.filter(id=program.id).exists())

    def test_cannot_delete_other_trainer_program(self):
        """Test that trainers cannot delete other trainer's programs"""
        self.client.force_authenticate(user=self.trainer)
        
        program = WorkoutPlan.objects.create(
            name="Other Program",
            trainer=self.other_trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )
        
        response = self.client.delete(f"/api/programs/{program.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_programs_excludes_deleted(self):
        """Test that deleted programs are not listed"""
        self.client.force_authenticate(user=self.trainer)
        
        WorkoutPlan.objects.create(
            name="Active Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
            is_deleted=False
        )
        WorkoutPlan.objects.create(
            name="Deleted Program",
            trainer=self.trainer,
            focus=["cardio"],
            difficulty="intermediate",
            weekly_frequency=4,
            session_length=60,
            is_deleted=True
        )
        
        response = self.client.get("/api/programs/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Active Program")

    def test_get_trainer_programs_with_stats(self):
        """Test getting all programs by trainer (including deleted for stats)"""
        self.client.force_authenticate(user=self.trainer)
        
        WorkoutPlan.objects.create(
            name="Program 1",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45
        )
        WorkoutPlan.objects.create(
            name="Program 2",
            trainer=self.trainer,
            focus=["cardio"],
            difficulty="intermediate",
            weekly_frequency=4,
            session_length=60,
            is_deleted=True
        )
        
        response = self.client.get(f"/api/users/{self.trainer.id}/programs/?include_deleted=true")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_count'], 2)
