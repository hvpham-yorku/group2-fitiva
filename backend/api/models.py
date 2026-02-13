from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


# ============================================================================
# SHARED CHOICES
# ============================================================================

EXPERIENCE_CHOICES = [
    ('beginner', 'Beginner'),
    ('intermediate', 'Intermediate'),
    ('advanced', 'Advanced'),
]

LOCATION_CHOICES = [
    ('home', 'Home'),
    ('gym', 'Gym'),
]

VALID_FOCUS_OPTIONS = ['strength', 'cardio', 'flexibility', 'balance']

DIFFICULTY_RATING_CHOICES = [
    (1, 'Very Easy'),
    (2, 'Easy'),
    (3, 'Medium'),
    (4, 'Hard'),
    (5, 'Very Hard'),
]


# ============================================================================
# MODELS
# ============================================================================

class CustomUser(AbstractUser):
    """Extended user model for regular users and trainers."""
    is_trainer = models.BooleanField(default=False)
    email = models.EmailField(unique=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """User fitness profile with goals and preferences."""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    age = models.IntegerField(null=True, blank=True)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, default='beginner')
    training_location = models.CharField(max_length=20, choices=LOCATION_CHOICES, default='home')
    fitness_focus = models.JSONField(
        default=list,
        help_text="List of fitness focuses (e.g., ['strength', 'cardio'])"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"{self.user.email}'s Profile"


class TrainerProfile(models.Model):
    """Extended profile for fitness trainers with credentials and specialties."""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='trainer_profile')
    bio = models.TextField(max_length=500, blank=True)
    years_of_experience = models.IntegerField(default=0)
    
    # Specialties (multiple selection supported)
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


class WorkoutPlan(models.Model):
    """Workout plan created by trainers or system defaults."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    focus = models.JSONField(
        default=list,
        help_text="List of workout focuses (e.g., ['strength', 'cardio'])"
    )
    difficulty = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES)
    weekly_frequency = models.IntegerField(help_text="Number of workouts per week")
    session_length = models.IntegerField(help_text="Minutes per session")
    #show/hide in Browse Programs
    is_published = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    trainer = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='created_plans'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workout_plans'

    def __str__(self):
        return self.name


class ExerciseTemplate(models.Model):
    """
    Exercise library/template that trainers can create and reuse.
    Separate from the actual exercises in workout programs.
    """
    EXERCISE_TYPE_CHOICES = [
        ('reps', 'Rep-based'),
        ('time', 'Time-based'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, help_text="Exercise instructions/description")
    muscle_groups = models.JSONField(
        default=list,
        help_text="List of muscle groups (e.g., ['chest', 'triceps'])"
    )
    exercise_type = models.CharField(
        max_length=10,
        choices=EXERCISE_TYPE_CHOICES,
        default='reps',
        help_text="Whether this exercise is rep-based or time-based"
    )
    default_recommendations = models.CharField(
        max_length=200,
        blank=True,
        help_text="e.g., '3-4 sets of 8-12 reps'"
    )
    image_url = models.URLField(blank=True, null=True, help_text="Future: exercise demonstration image")
    
    trainer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='exercise_templates',
        null=True,
        blank=True,
        help_text="If null, this is a default exercise available to all"
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Default exercises are available to all trainers"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'exercise_templates'
        ordering = ['name']
        indexes = [
            models.Index(fields=['trainer', 'is_default']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({'Default' if self.is_default else self.trainer.username if self.trainer else 'Unknown'})"

class ProgramSection(models.Model):
    """
    Represents a workout day/section in a program.
    """
    program = models.ForeignKey(
        WorkoutPlan,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    format = models.CharField(
        max_length=50,
        help_text="Day name (e.g., 'Monday', 'Tuesday')"
    )
    type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional day description (e.g., 'Upper Body', 'Chest Day')"
    )
    is_rest_day = models.BooleanField(
        default=False,
        help_text="Whether this day is a rest day"
    )
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'program_sections'
        ordering = ['order']
        indexes = [
            models.Index(fields=['program', 'order']),
        ]
    
    def __str__(self):
        rest_label = " (Rest)" if self.is_rest_day else ""
        return f"{self.program.name} - {self.format}{rest_label}"



class Exercise(models.Model):
    """Exercise within a program section."""
    section = models.ForeignKey(
        ProgramSection, 
        on_delete=models.CASCADE, 
        related_name='exercises'
    )
    name = models.CharField(max_length=200)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercises'
        ordering = ['order']

    def __str__(self):
        return self.name

class ExerciseSet(models.Model):
    """Individual set within an exercise."""
    exercise = models.ForeignKey(
        Exercise, 
        on_delete=models.CASCADE, 
        related_name='sets'
    )
    set_number = models.IntegerField()
    reps = models.IntegerField(null=True, blank=True)
    time = models.IntegerField(null=True, blank=True, help_text="Time in seconds")
    rest = models.IntegerField(default=0, help_text="Rest time in seconds")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercise_sets'
        ordering = ['set_number']

    def __str__(self):
        return f"{self.exercise.name} - Set {self.set_number}"

class WorkoutSession(models.Model):
    """Individual workout session completed by a user."""
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
    """Post-workout feedback for adaptive scheduling."""
    session = models.OneToOneField(WorkoutSession, on_delete=models.CASCADE, related_name='feedback')
    difficulty_rating = models.IntegerField(choices=DIFFICULTY_RATING_CHOICES)
    fatigue_level = models.IntegerField(null=True, blank=True, help_text="1-5 scale")
    pain_reported = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_feedback'

    def __str__(self):
        return f"Feedback for {self.session}"


# add schedule 

class UserSchedule(models.Model):
    """
    User's personalized workout schedule.
    Can contain multiple programs merged together.
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    
    # Remove single program field, use many-to-many instead
    programs = models.ManyToManyField(
        WorkoutPlan,
        related_name='user_schedules'
    )
    
    # Start date for this schedule
    start_date = models.DateField()
    
    # JSON field mapping: {"monday": [section_id, section_id], "tuesday": [section_id], ...}
    # Now stores LISTS of section IDs per day to support multiple programs
    weekly_schedule = models.JSONField(
        default=dict,
        help_text="Maps days of week to lists of program section IDs or 'rest'"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this is the user's active schedule"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_schedules'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        program_names = ', '.join([p.name for p in self.programs.all()[:3]])
        return f"{self.user.username}'s schedule: {program_names}"