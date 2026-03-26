from django.apps import AppConfig
import sys

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        
        if 'makemigrations' in sys.argv or 'migrate' in sys.argv:
            return

        try:
            from .models import Challenge
            from django.utils import timezone
            from datetime import timedelta

            # Only generate these if the database is completely empty of challenges
            if not Challenge.objects.exists():
                print("--- Auto-generating weekly challenges... ---")
                
                today = timezone.now().date()
                next_week = today + timedelta(days=7)

                Challenge.objects.create(
                    name="Welcome Week Hustle",
                    description="Complete 3 workouts and log 90 total minutes this week!",
                    start_date=today,
                    end_date=next_week,
                    goal_criteria={"workouts": 3, "total_time_minutes": 90},
                    reward_points=100,
                    reward_badge="Starter Champion",
                    is_active=True
                )
                
                Challenge.objects.create(
                    name="Daily Micro-Doser",
                    description="Consistency is key! Complete 5 short workouts this week.",
                    start_date=today,
                    end_date=next_week,
                    goal_criteria={"workouts": 5, "total_time_minutes": 75}, # Avg 15 mins a day
                    reward_points=150,
                    reward_badge="Habit Builder",
                    is_active=True
                )

                Challenge.objects.create(
                    name="Weekend Warrior",
                    description="Push hard! Log 2 heavy sessions and 120 total minutes.",
                    start_date=today,
                    end_date=next_week,
                    goal_criteria={"workouts": 2, "total_time_minutes": 120}, # Avg 60 mins a day
                    reward_points=200,
                    reward_badge="Iron Will",
                    is_active=True
                )

                Challenge.objects.create(
                    name="The First Step",
                    description="Just show up! Complete exactly one workout this week.",
                    start_date=today,
                    end_date=next_week,
                    goal_criteria={"workouts": 1},
                    reward_points=25,
                    reward_badge="First Step",
                    is_active=True
                )
                
        except Exception:
            pass