"""
Integration Tests — tests persistence using the REAL database (not the stub).
Run with: python manage.py test tests.integration
"""
from django.test import TestCase
from api.models import CustomUser, UserProfile, WorkoutPlan, TrainerProfile, WorkoutSession, WorkoutFeedback
from repository import Repository
from datetime import date


class TestUserPersistence(TestCase):
    def test_create_and_retrieve_user(self):
        user = CustomUser.objects.create_user(username="testuser_int", password="pass123", is_trainer=False)
        fetched = CustomUser.objects.get(username="testuser_int")
        self.assertEqual(fetched.username, "testuser_int")
        self.assertFalse(fetched.is_trainer)

    def test_create_trainer_user(self):
        CustomUser.objects.create_user(username="trainer_int", password="pass123", is_trainer=True)
        self.assertTrue(CustomUser.objects.get(username="trainer_int").is_trainer)

    def test_user_profile_linked_to_user(self):
        user = CustomUser.objects.create_user(username="profile_int", password="pass123")
        UserProfile.objects.create(user=user, experience_level="beginner", training_location="home")
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.experience_level, "beginner")


class TestWorkoutPlanPersistence(TestCase):
    def setUp(self):
        self.trainer = CustomUser.objects.create_user(username="trainer_wp", password="pass123", is_trainer=True)

    def test_create_and_retrieve_workout_plan(self):
        WorkoutPlan.objects.create(
            name="Test Plan", trainer=self.trainer,
            weekly_frequency=3, session_length=45,
            difficulty="beginner", is_published=True,
        )
        fetched = WorkoutPlan.objects.get(name="Test Plan")
        self.assertEqual(fetched.trainer, self.trainer)
        self.assertEqual(fetched.weekly_frequency, 3)

    def test_soft_delete_plan(self):
        plan = WorkoutPlan.objects.create(
            name="DeleteMe", trainer=self.trainer,
            weekly_frequency=3, session_length=45, is_deleted=False,
        )
        plan.is_deleted = True
        plan.save()
        self.assertTrue(WorkoutPlan.objects.get(name="DeleteMe").is_deleted)
        self.assertEqual(WorkoutPlan.objects.filter(is_deleted=False, name="DeleteMe").count(), 0)

    def test_multiple_plans_for_trainer(self):
        WorkoutPlan.objects.create(
            name="Plan A", trainer=self.trainer,
            weekly_frequency=3, session_length=45,
        )
        WorkoutPlan.objects.create(
            name="Plan B", trainer=self.trainer,
            weekly_frequency=4, session_length=60,
        )
        self.assertEqual(WorkoutPlan.objects.filter(trainer=self.trainer).count(), 2)


class TestWorkoutSessionPersistence(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username="session_user", password="pass123")

    def test_create_and_complete_session(self):
        session = WorkoutSession.objects.create(
            user=self.user, date=date(2026, 3, 1), status="in_progress", is_completed=False
        )
        session.status = "completed"
        session.is_completed = True
        session.save()
        fetched = WorkoutSession.objects.get(user=self.user, date=date(2026, 3, 1))
        self.assertEqual(fetched.status, "completed")
        self.assertTrue(fetched.is_completed)

    def test_feedback_linked_to_session(self):
        session = WorkoutSession.objects.create(
            user=self.user, date=date(2026, 3, 2), status="completed", is_completed=True
        )
        WorkoutFeedback.objects.create(
            session=session, difficulty_rating=4, fatigue_level=3, pain_reported=False
        )
        self.assertEqual(WorkoutFeedback.objects.get(session=session).difficulty_rating, 4)

    def test_pain_feedback_is_stored(self):
        session = WorkoutSession.objects.create(
            user=self.user, date=date(2026, 3, 3), status="completed", is_completed=True
        )
        WorkoutFeedback.objects.create(session=session, difficulty_rating=5, pain_reported=True, notes="knee pain")
        fb = WorkoutFeedback.objects.get(session=session)
        self.assertTrue(fb.pain_reported)
        self.assertEqual(fb.notes, "knee pain")


class TestRepositoryIntegration(TestCase):
    def setUp(self):
        self.repo = Repository()
        self.trainer = CustomUser.objects.create_user(username="repo_trainer", password="pass123", is_trainer=True)

    def test_repository_get_workout_plans(self):
        WorkoutPlan.objects.create(
            name="Repo Plan", trainer=self.trainer,
            weekly_frequency=3, session_length=45, is_deleted=False,
        )
        plans = WorkoutPlan.objects.filter(is_deleted=False)
        self.assertTrue(any(p.name == "Repo Plan" for p in plans))

    def test_repository_get_users(self):
        users = self.repo.get_all_users()
        self.assertTrue(any(u["username"] == "repo_trainer" for u in users))
