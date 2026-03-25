from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import ExerciseTemplate

User = get_user_model()

# EXERCISE TEMPLATES TEST CASES

class ExerciseTemplateTests(APITestCase):
    """Test suite for exercise template management"""

    def setUp(self):
        self.trainer = User.objects.create_user(
            username="trainer",
            password="TrainerPass123!",
            email="trainer@example.com",
            is_trainer=True
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            password="UserPass123!",
            email="user@example.com",
            is_trainer=False
        )
        
    def test_create_exercise_template_as_trainer(self):
        """Test that trainers can create exercise templates"""
        self.client.force_authenticate(user=self.trainer)
        
        data = {
            "name": "Push-ups",
            "description": "Classic bodyweight chest exercise",
            "muscle_groups": ["chest", "triceps"],
            "exercise_type": "reps",
            "default_recommendations": "3 sets of 10-15 reps"
        }
        
        response = self.client.post("/api/exercise-templates/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExerciseTemplate.objects.count(), 1)
        template = ExerciseTemplate.objects.first()
        self.assertEqual(template.name, "Push-ups")
        self.assertEqual(template.trainer, self.trainer)
        self.assertFalse(template.is_default)

    def test_regular_user_cannot_create_template(self):
        """Test that regular users cannot create exercise templates"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            "name": "Push-ups",
            "description": "Test",
            "muscle_groups": ["chest"],
            "exercise_type": "reps"
        }
        
        response = self.client.post("/api/exercise-templates/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_exercise_templates(self):
        """Test searching exercise templates by name"""
        self.client.force_authenticate(user=self.trainer)
        
        ExerciseTemplate.objects.create(
            name="Push-ups",
            trainer=self.trainer,
            exercise_type="reps",
            muscle_groups=["chest"]
        )
        ExerciseTemplate.objects.create(
            name="Pull-ups",
            trainer=self.trainer,
            exercise_type="reps",
            muscle_groups=["back"]
        )
        
        response = self.client.get("/api/exercise-templates/?search=push", format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['exercises']), 1)
        self.assertEqual(response.data['exercises'][0]['name'], "Push-ups")

    def test_time_based_exercise_template(self):
        """Test creating time-based exercise template"""
        self.client.force_authenticate(user=self.trainer)
        
        data = {
            "name": "Plank",
            "description": "Core stability exercise",
            "muscle_groups": ["core"],
            "exercise_type": "time",
            "default_recommendations": "3 sets of 30-60 seconds"
        }
        
        response = self.client.post("/api/exercise-templates/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        template = ExerciseTemplate.objects.get(name="Plank")
        self.assertEqual(template.exercise_type, "time")
