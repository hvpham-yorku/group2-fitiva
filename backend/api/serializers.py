import re
from rest_framework import serializers
from .models import (
    CustomUser,
    UserProfile,
    TrainerProfile,
    WorkoutPlan,
    WorkoutSession,
    WorkoutFeedback,
    ProgramSection,
    Exercise,
    ExerciseSet,
    EXPERIENCE_CHOICES,
    LOCATION_CHOICES,
    FOCUS_CHOICES,
)



# ============================================================================
# USER & PROFILE SERIALIZERS
# ============================================================================

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user fitness profile."""
    
    class Meta:
        model = UserProfile
        fields = [
            "id", "age", "experience_level", "training_location", 
            "fitness_focus", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_age(self, value):
        """Validate age is within reasonable bounds."""
        if value < 13:
            raise serializers.ValidationError("You must be at least 13 years old")
        if value > 120:
            raise serializers.ValidationError("Please enter a valid age")
        return value
    
    def validate_experience_level(self, value):
        """Validate experience level against model choices."""
        valid_choices = [choice[0] for choice in EXPERIENCE_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid experience level. Choose from: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_training_location(self, value):
        """Validate training location against model choices."""
        valid_choices = [choice[0] for choice in LOCATION_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid training location. Choose from: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_fitness_focus(self, value):
        """Validate fitness focus against model choices."""
        valid_choices = [choice[0] for choice in FOCUS_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid fitness focus. Choose from: {', '.join(valid_choices)}"
            )
        return value
    
    def validate(self, data):
        """Validate all required fields are present."""
        if data.get('age') is not None and data.get('age') < 0:
            raise serializers.ValidationError({'age': 'Age cannot be negative'})
        if not data.get('experience_level'):
            raise serializers.ValidationError({'experience_level': 'Experience level is required'})
        if not data.get('training_location'):
            raise serializers.ValidationError({'training_location': 'Training location is required'})
        if not data.get('fitness_focus'):
            raise serializers.ValidationError({'fitness_focus': 'Fitness focus is required'})
        return data


class TrainerProfileSerializer(serializers.ModelSerializer):
    """Serializer for trainer profile with credentials."""
    
    class Meta:
        model = TrainerProfile
        fields = [
            'id', 'bio', 'years_of_experience',
            'specialty_strength', 'specialty_cardio', 'specialty_flexibility',
            'specialty_sports', 'specialty_rehabilitation',
            'certifications', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_years_of_experience(self, value):
        """Validate years of experience is within reasonable bounds."""
        if value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative")
        if value > 50:
            raise serializers.ValidationError("Please enter a valid number of years")
        return value


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data with nested profiles."""
    profile = UserProfileSerializer(read_only=True)
    trainer_profile = TrainerProfileSerializer(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "first_name", "last_name", 
            "is_trainer", "profile", "trainer_profile"
        ]
        read_only_fields = ["id"]


# ============================================================================
# AUTHENTICATION SERIALIZERS
# ============================================================================

class UserSignupSerializer(serializers.Serializer):
    """Serializer for user registration with optional trainer data."""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    is_trainer = serializers.BooleanField(default=False)
    trainer_data = serializers.JSONField(required=False, allow_null=True)

    def validate_username(self, value):
        """Validate username is unique and within length limits."""
        if len(value) > 16:
            raise serializers.ValidationError("Username must be 16 characters or less")
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken")
        return value

    def validate_email(self, value):
        """Validate email is unique (case-insensitive)."""
        normalized_email = value.strip().lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Email already in use")
        return normalized_email

    def validate_password(self, value):
        """Validate password meets security requirements."""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character")
        return value
    
    def validate(self, data):
        """Validate password confirmation and trainer data."""
        # Check passwords match
        if data.get('password') != data.get('password2'):
            raise serializers.ValidationError({"password2": "Passwords do not match"})
        
        # Validate trainer_data if is_trainer is True
        if data.get('is_trainer') and data.get('trainer_data'):
            trainer_data = data['trainer_data']
            
            # Ensure trainer_data is a dictionary
            if not isinstance(trainer_data, dict):
                raise serializers.ValidationError({"trainer_data": "Invalid trainer data format"})
            
            # Check at least one specialty is selected
            has_specialty = any([
                trainer_data.get('specialty_strength'),
                trainer_data.get('specialty_cardio'),
                trainer_data.get('specialty_flexibility'),
                trainer_data.get('specialty_sports'),
                trainer_data.get('specialty_rehabilitation')
            ])
            
            if not has_specialty:
                raise serializers.ValidationError({"trainer_data": "At least one specialty must be selected"})
        
        return data

    def create(self, validated_data):
        """Create user with profile and optional trainer profile."""
        # Remove password confirmation
        validated_data.pop('password2', None)
        
        # Extract trainer_data
        trainer_data = validated_data.pop('trainer_data', None)
        
        # Create user
        user = CustomUser.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            is_trainer=validated_data.get("is_trainer", False),
        )
        
        # Create UserProfile
        UserProfile.objects.create(user=user)

        # Create TrainerProfile if user is a trainer
        if user.is_trainer:
            if trainer_data:
                TrainerProfile.objects.create(
                    user=user,
                    bio=trainer_data.get('bio', ''),
                    years_of_experience=int(trainer_data.get('years_of_experience', 0)),
                    specialty_strength=bool(trainer_data.get('specialty_strength', False)),
                    specialty_cardio=bool(trainer_data.get('specialty_cardio', False)),
                    specialty_flexibility=bool(trainer_data.get('specialty_flexibility', False)),
                    specialty_sports=bool(trainer_data.get('specialty_sports', False)),
                    specialty_rehabilitation=bool(trainer_data.get('specialty_rehabilitation', False)),
                    certifications=trainer_data.get('certifications', ''),
                )
            else:
                # Create empty trainer profile
                TrainerProfile.objects.create(user=user)

        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login with username or email."""
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        """Validate credentials and return user."""
        login = data.get('login')
        password = data.get('password')
        
        if not login or not password:
            raise serializers.ValidationError("Login and password are required")
        
        # Check if login is email or username
        if '@' in login:
            try:
                user = CustomUser.objects.get(email__iexact=login.strip().lower())
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials")
        else:
            try:
                user = CustomUser.objects.get(username=login)
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials")
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")
        
        data['user'] = user
        return data

# ============================================================================
# WORKOUT SERIALIZERS
# ============================================================================

class ExerciseSetSerializer(serializers.ModelSerializer):
    """Serializer for exercise sets."""
    
    class Meta:
        model = ExerciseSet
        fields = ['id', 'set_number', 'reps', 'time', 'rest']
        read_only_fields = ['id']


class ExerciseSerializer(serializers.ModelSerializer):
    """Serializer for exercises with nested sets."""
    sets = ExerciseSetSerializer(many=True)
    
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'sets', 'order']
        read_only_fields = ['id']


class ProgramSectionSerializer(serializers.ModelSerializer):
    """Serializer for program sections with nested exercises."""
    exercises = ExerciseSerializer(many=True)
    
    class Meta:
        model = ProgramSection
        fields = ['id', 'format', 'type', 'exercises', 'order']
        read_only_fields = ['id']


class WorkoutPlanSerializer(serializers.ModelSerializer):
    """Serializer for workout plans with trainer information and nested sections."""
    trainer_name = serializers.SerializerMethodField()
    sections = ProgramSectionSerializer(many=True, read_only=False, required=False)
    
    class Meta:
        model = WorkoutPlan
        fields = [
            'id', 'name', 'description', 'focus', 'difficulty',
            'weekly_frequency', 'session_length',
            'trainer', 'trainer_name', 'created_at', 'updated_at',
            'sections'
        ]
        read_only_fields = ['created_at', 'updated_at', 'trainer']
    
    def get_trainer_name(self, obj):
        """Return trainer's full name or default."""
        if obj.trainer:
            return f"{obj.trainer.first_name} {obj.trainer.last_name}"
        return "System Default"
    
    def create(self, validated_data):
        """Create workout plan with nested sections, exercises, and sets."""
        sections_data = validated_data.pop('sections', [])
        
        # Create the workout plan
        plan = WorkoutPlan.objects.create(**validated_data)
        
        # Create sections with exercises and sets
        for section_order, section_data in enumerate(sections_data):
            exercises_data = section_data.pop('exercises', [])
            
            section = ProgramSection.objects.create(
                program=plan,
                format=section_data.get('format', ''),
                type=section_data.get('type', ''),
                order=section_order
            )
            
            # Create exercises for this section
            for exercise_order, exercise_data in enumerate(exercises_data):
                sets_data = exercise_data.pop('sets', [])
                
                exercise = Exercise.objects.create(
                    section=section,
                    name=exercise_data.get('name', ''),
                    order=exercise_order
                )
                
                # Create sets for this exercise
                for set_data in sets_data:
                    ExerciseSet.objects.create(
                        exercise=exercise,
                        set_number=set_data.get('set_number'),
                        reps=set_data.get('reps'),
                        time=set_data.get('time'),
                        rest=set_data.get('rest', 0)
                    )
        
        return plan



class WorkoutSessionSerializer(serializers.ModelSerializer):
    """Serializer for workout sessions."""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'user', 'plan', 'plan_name', 'date', 
            'duration_minutes', 'is_completed', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at', 'user']
    
    def create(self, validated_data):
        """Create workout session for authenticated user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class WorkoutFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for post-workout feedback."""
    
    class Meta:
        model = WorkoutFeedback
        fields = [
            'id', 'session', 'difficulty_rating', 'fatigue_level',
            'pain_reported', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']
