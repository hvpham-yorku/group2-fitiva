from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    """Extended user model for regular users and trainers."""
    is_trainer = models.BooleanField(default=False)
    email = models.EmailField(unique=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """User fitness profile."""
    EXPERIENCE_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    LOCATION_CHOICES = [
        ('home', 'Home'),
        ('gym', 'Gym'),
    ]
    
    FOCUS_CHOICES = [
        ('strength', 'Strength'),
        ('cardio', 'Cardio'),
        ('flexibility', 'Flexibility'),
        ('mixed', 'Mixed'),
    ]

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    age = models.IntegerField(null=True, blank=True)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, default='beginner')
    training_location = models.CharField(max_length=20, choices=LOCATION_CHOICES, default='home')
    fitness_focus = models.CharField(max_length=50, choices=FOCUS_CHOICES, default='mixed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"{self.user.email}'s Profile"


class WorkoutPlan(models.Model):
    """Default workout plan model."""
    FOCUS_CHOICES = [
        ('strength', 'Strength'),
        ('cardio', 'Cardio'),
        ('flexibility', 'Flexibility'),
        ('mixed', 'Mixed'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    focus = models.CharField(max_length=20, choices=FOCUS_CHOICES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    weekly_frequency = models.IntegerField()  # Number of workouts per week
    session_length = models.IntegerField()  # Minutes per session
    is_subscription = models.BooleanField(default=False)
    trainer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True, related_name='created_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workout_plans'

    def __str__(self):
        return self.name


class WorkoutSession(models.Model):
    """A single workout session."""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sessions')
    plan = models.ForeignKey(WorkoutPlan, on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    duration_minutes = models.IntegerField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_sessions'

    def __str__(self):
        return f"{self.user.email} - {self.date}"


class WorkoutFeedback(models.Model):
    """Post-workout feedback."""
    DIFFICULTY_CHOICES = [
        (1, 'Very Easy'),
        (2, 'Easy'),
        (3, 'Medium'),
        (4, 'Hard'),
        (5, 'Very Hard'),
    ]

    session = models.OneToOneField(WorkoutSession, on_delete=models.CASCADE, related_name='feedback')
    difficulty_rating = models.IntegerField(choices=DIFFICULTY_CHOICES)
    fatigue_level = models.IntegerField(null=True, blank=True, help_text="1-5 scale")
    pain_reported = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_feedback'

    def __str__(self):
        return f"Feedback for {self.session}"
    
class TrainerProfile(models.Model):
    """Extended profile for fitness trainers"""
    user = models.OneToOneField(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='trainer_profile'
    )
    bio = models.TextField(max_length=500, blank=True)
    years_of_experience = models.IntegerField(default=0)
    
    # Specialties (can select multiple via checkboxes in frontend)
    specialty_strength = models.BooleanField(default=False)
    specialty_cardio = models.BooleanField(default=False)
    specialty_flexibility = models.BooleanField(default=False)
    specialty_sports = models.BooleanField(default=False)
    specialty_rehabilitation = models.BooleanField(default=False)
    
    certifications = models.TextField(max_length=300, blank=True, help_text="Comma-separated certifications")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trainer_profiles'
    
    def __str__(self):
        return f"Trainer Profile: {self.user.username}"

