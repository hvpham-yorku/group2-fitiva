from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


# Shared choices

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


# Models

class CustomUser(AbstractUser):
    """Basic user model for the app."""
    is_trainer = models.BooleanField(default=False)
    email = models.EmailField(unique=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """Stores the user profile info."""
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
    """Extra info for trainer accounts."""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='trainer_profile')
    bio = models.TextField(max_length=500, blank=True)
    years_of_experience = models.IntegerField(default=0)

    # Specialties (multiple selection supported)
    specialty_strength = models.BooleanField(default=False)
    specialty_cardio = models.BooleanField(default=False)
    specialty_flexibility = models.BooleanField(default=False)
    specialty_sports = models.BooleanField(default=False)
    specialty_rehabilitation = models.BooleanField(default=False)

    certifications = models.TextField(
        max_length=300,
        blank=True,
        help_text="Comma-separated certifications",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trainer_profiles'

    def __str__(self):
        return f"Trainer Profile: {self.user.username}"


class WorkoutPlan(models.Model):
    """Workout plan made by a trainer or the system."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    focus = models.JSONField(
        default=list,
        help_text="List of workout focuses (e.g., ['strength', 'cardio'])",
    )
    difficulty = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES)
    weekly_frequency = models.IntegerField(help_text="Number of workouts per week")
    session_length = models.IntegerField(help_text="Minutes per session")
    # show/hide in Browse Programs
    is_published = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    trainer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_plans',
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
        help_text="List of muscle groups (e.g., ['chest', 'triceps'])",
    )
    exercise_type = models.CharField(
        max_length=10,
        choices=EXERCISE_TYPE_CHOICES,
        default='reps',
        help_text="Whether this exercise is rep-based or time-based",
    )
    default_recommendations = models.CharField(
        max_length=200,
        blank=True,
        help_text="e.g., '3-4 sets of 8-12 reps'",
    )
    image_url = models.URLField(
        blank=True,
        null=True,
        help_text="Future: exercise demonstration image",
    )
    trainer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='exercise_templates',
        null=True,
        blank=True,
        help_text="If null, this is a default exercise available to all",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Default exercises are available to all trainers",
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
        return (
            f"{self.name} "
            f"({'Default' if self.is_default else self.trainer.username if self.trainer else 'Unknown'})"
        )


class ProgramSection(models.Model):
    """Represents a workout day/section in a program."""
    program = models.ForeignKey(
        WorkoutPlan,
        on_delete=models.CASCADE,
        related_name='sections',
    )
    format = models.CharField(
        max_length=50,
        help_text="Day name (e.g., 'Monday', 'Tuesday')",
    )
    type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional day description (e.g., 'Upper Body', 'Chest Day')",
    )
    is_rest_day = models.BooleanField(
        default=False,
        help_text="Whether this day is a rest day",
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
        related_name='exercises',
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
        related_name='sets',
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
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sessions')
    plan = models.ForeignKey(WorkoutPlan, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    duration_minutes = models.IntegerField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_sessions'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'],
                name='unique_session_per_user_per_day',
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.date}"


class WorkoutFeedback(models.Model):
    """Post-workout feedback for adaptive scheduling."""
    session = models.OneToOneField(
        WorkoutSession,
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    difficulty_rating = models.IntegerField(choices=DIFFICULTY_RATING_CHOICES)
    fatigue_level = models.IntegerField(null=True, blank=True, help_text="1-5 scale")
    pain_reported = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_feedback'

    def __str__(self):
        return f"Feedback for {self.session}"


class UserSchedule(models.Model):
    """
    User's personalized workout schedule.
    Can contain multiple programs merged together.
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='schedules',
    )
    programs = models.ManyToManyField(
        WorkoutPlan,
        related_name='user_schedules',
    )
    start_date = models.DateField()
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Optional end date for the schedule",
    )

    # Active weekly schedule — modified by AI adjustments
    weekly_schedule = models.JSONField(
        default=dict,
        help_text="Maps days of week to lists of program section IDs or 'rest'",
    )

    # ── Snapshot taken at creation (or when first program is added).
    #    Used by revert_schedule to undo all AI adjustments.
    original_weekly_schedule = models.JSONField(
        null=True,
        blank=True,
        default=None,
        help_text=(
            "Immutable snapshot of weekly_schedule taken at creation. "
            "Used to revert AI adjustments back to the original plan."
        ),
    )

    # ── True once any AI adjustment (stress-based or pain recovery) has been
    #    applied. Drives the 'Default Schedule' / 'Revert' button visibility.
    is_adjusted = models.BooleanField(
        default=False,
        help_text="True if the schedule has been modified by the AI adjustment feature.",
    )

    # ── Per-day duration overrides set by the 'shorter_workout' recovery option.
    #    e.g. {"tuesday": 27}  — means Tuesday's session should last 27 minutes.
    duration_overrides = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text=(
            "Per-day duration overrides in minutes. "
            "e.g. {'tuesday': 27}. Set by the shorter_workout recovery option."
        ),
    )

    # ── Per-day focus overrides set by the 'lighter_focus' recovery option.
    #    e.g. {"tuesday": "mobility"}
    focus_overrides = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text=(
            "Per-day focus overrides. "
            "e.g. {'tuesday': 'mobility'}. Set by the lighter_focus recovery option."
        ),
    )

    adjustments_locked_until = models.DateField(
        null=True,
        blank=True,
        help_text="If set, AI adjustment suggestions are blocked until the end of this date.",
    )

    adjustment_lock_note = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Optional note saved when the user locks the current plan for the next cycle.",
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this is the user's active schedule",
    )

    # ── NEW (US story: accept/reject/lock adjustments) ────────────────────
    # When True, the AI suggestion system will not propose or apply any changes
    # for the current cycle. The user can toggle this on/off at any time via
    # the Lock Plan button in the schedule header.
    is_locked = models.BooleanField(
        default=False,
        help_text=(
            "When True, AI-suggested schedule adjustments are paused. "
            "The user has explicitly locked this schedule for the current cycle."
        ),
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


# ─────────────────────────────────────────────────────────
# US 4.1 – Earn Points for Workout Completion
# ─────────────────────────────────────────────────────────

class UserPoints(models.Model):
    """Tracks the total gamification points for a user."""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='points',
    )
    total_points = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_points'

    def __str__(self):
        return f"{self.user.username} – {self.total_points} pts"


class PointTransaction(models.Model):
    """Records each time points were awarded so we can prevent duplicates."""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='point_transactions',
    )
    session = models.OneToOneField(
        WorkoutSession,
        on_delete=models.CASCADE,
        related_name='point_transaction',
        null=True,
        blank=True,
    )
    points_awarded = models.IntegerField(default=0)
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'point_transactions'

    def __str__(self):
        return f"{self.user.username} +{self.points_awarded} ({self.reason})"


# ─────────────────────────────────────────────────────────
# US 4.2 – Unlock Achievement Badges
# ─────────────────────────────────────────────────────────

class UserBadge(models.Model):
    """Records which badges a user has earned."""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='badges',
    )
    # badge_id matches a key in BADGE_DEFINITIONS (see views.py / rewards helper)
    badge_id = models.CharField(max_length=50)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_badges'
        # A user can only earn each badge once
        unique_together = [('user', 'badge_id')]

    def __str__(self):
        return f"{self.user.username} – {self.badge_id}"

class Challenge(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    goal_criteria = models.JSONField(default=dict)  # {'logins': 5, 'workouts': 3}
    reward_points = models.IntegerField(default=0)
    reward_badge = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'challenges'
        ordering = ['-created_at']

class UserChallenge(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_challenges')
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='user_progress')
    current_progress = models.JSONField(default=dict)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_challenges'
        unique_together = ['user', 'challenge']
