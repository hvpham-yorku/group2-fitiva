from .test_authentication import (
    UserSignupTests,
    UserLoginTests,
    UserLogoutTests,
    CurrentUserTests
)
from .test_profiles import UserProfileTests
from .test_exercise_templates import ExerciseTemplateTests
from .test_workout_programs import WorkoutProgramTests
from .test_recommendations import RecommendationsTests
from .test_schedules import ScheduleTests
from .test_workout_sessions import WorkoutSessionTests

__all__ = [
    'UserSignupTests',
    'UserLoginTests',
    'UserLogoutTests',
    'CurrentUserTests',
    'UserProfileTests',
    'ExerciseTemplateTests',
    'WorkoutProgramTests',
    'RecommendationsTests',
    'ScheduleTests',
    'WorkoutSessionTests',
]
