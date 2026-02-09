from .models import CustomUser, UserProfile, TrainerProfile
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
import re

from rest_framework import serializers
from .models import (
    CustomUser, 
    UserProfile, 
    WorkoutPlan, 
    WorkoutSession, 
    WorkoutFeedback,
    TrainerProfile
)

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["id", "age", "experience_level", "training_location", "fitness_focus", "created_at", "updated_at"] # fields created for [US1.2]
        read_only_fields = ["id", "created_at"]

    def validate_age(self, value):
        if value < 13:
            raise serializers.ValidationError("You must be at least 13 years old")
        if value > 120:
            raise serializers.ValidationError("Please enter a valid age")
        return value
    
    def validate_experience_level(self, value):
        valid_choices = ['beginner', 'intermediate', 'advanced']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid experience level. Choose from: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_training_location(self, value):
        valid_choices = ['home', 'gym']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid training location. Choose from: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_fitness_focus(self, value):
        valid_choices = ['strength', 'cardio', 'flexibility', 'mixed']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Invalid fitness focus. Choose from: {', '.join(valid_choices)}"
            )
        return value
    # This method validates multiple fields together, if needed for interdependent validation
    def validate(self, data):
        if data.get('age') is not None and data.get('age') < 0:
            raise serializers.ValidationError({'age': 'Age is required'})
        if not data.get('experience_level'):
            raise serializers.ValidationError({'experience_level': 'Experience level is required'})
        if not data.get('training_location'):
            raise serializers.ValidationError({'training_location': 'Training location is required'})
        if not data.get('fitness_focus'):
            raise serializers.ValidationError({'fitness_focus': 'Fitness focus is required'})   
        return data
    
    
class TrainerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerProfile
        fields = [
            'id',
            'bio',
            'years_of_experience',
            'specialty_strength',
            'specialty_cardio',
            'specialty_flexibility',
            'specialty_sports',
            'specialty_rehabilitation',
            'certifications',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_years_of_experience(self, value):
        if value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative")
        if value > 50:
            raise serializers.ValidationError("Please enter a valid number of years")
        return value

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    trainer_profile = TrainerProfileSerializer(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ["id", "username", "email", "first_name", "last_name", "is_trainer", "profile", "trainer_profile"]  # ← Add trainer_profile
        read_only_fields = ["id"]


class UserSignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)  # for password confirmation
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    is_trainer = serializers.BooleanField(default=False)
    
    # NEW: Accept trainer_data as a dictionary field
    trainer_data = serializers.JSONField(required=False, allow_null=True)

    def validate_username(self, v):
        if len(v) > 16:
            raise serializers.ValidationError("Username must be 16 characters or less")
        if CustomUser.objects.filter(username=v).exists():
            raise serializers.ValidationError("Username already taken")
        return v

    def validate_email(self, v):
        v_norm = v.strip().lower()
        if CustomUser.objects.filter(email__iexact=v_norm).exists():
            raise serializers.ValidationError("Email already in use")
        return v_norm

    def validate_password(self, v):
        # Check minimum length
        if len(v) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        # Check for uppercase letter
        if not re.search(r'[A-Z]', v):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        
        # Check for number
        if not re.search(r'[0-9]', v):
            raise serializers.ValidationError("Password must contain at least one number")
        
        # Check for special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise serializers.ValidationError("Password must contain at least one special character")
        
        return v
    
    def validate(self, data):
        # Check if passwords match
        if data.get('password') != data.get('password2'):
            raise serializers.ValidationError({"password2": "Passwords do not match"})
        
        # Validate trainer_data if is_trainer is True
        if data.get('is_trainer') and data.get('trainer_data'):
            trainer_data = data['trainer_data']
    
            # Ensure trainer_data is a dictionary
            if not isinstance(trainer_data, dict):
                raise serializers.ValidationError({"trainer_data": "Invalid trainer data format"})
            
            # Check at least one specialty is selected
            has_specialty = (
                trainer_data.get('specialty_strength') or
                trainer_data.get('specialty_cardio') or
                trainer_data.get('specialty_flexibility') or
                trainer_data.get('specialty_sports') or
                trainer_data.get('specialty_rehabilitation')
            )
            
            print("DEBUG - has_specialty:", has_specialty)
            
            if not has_specialty:
                raise serializers.ValidationError({"trainer_data": "At least one specialty must be selected"})
        
        return data


    def create(self, validated_data):
        # Remove password2 before creating user
        validated_data.pop('password2', None)
        
        # Extract trainer_data if present
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
        
        # Create UserProfile with default values
        UserProfile.objects.create(user=user)

        # Create TrainerProfile with data if user is a trainer
        if user.is_trainer:
            if trainer_data:
                # Convert string booleans to actual booleans
                TrainerProfile.objects.create(
                    user=user,
                    bio=trainer_data.get('bio', ''),
                    years_of_experience=int(trainer_data.get('years_of_experience', 0)),
                    specialty_strength=trainer_data.get('specialty_strength') == 'true' or trainer_data.get('specialty_strength') is True,
                    specialty_cardio=trainer_data.get('specialty_cardio') == 'true' or trainer_data.get('specialty_cardio') is True,
                    specialty_flexibility=trainer_data.get('specialty_flexibility') == 'true' or trainer_data.get('specialty_flexibility') is True,
                    specialty_sports=trainer_data.get('specialty_sports') == 'true' or trainer_data.get('specialty_sports') is True,
                    specialty_rehabilitation=trainer_data.get('specialty_rehabilitation') == 'true' or trainer_data.get('specialty_rehabilitation') is True,
                    certifications=trainer_data.get('certifications', ''),
                )
            else:
                # Create empty trainer profile if no data provided
                TrainerProfile.objects.create(user=user)

        return user


    def create(self, data):
        # Remove password2 before creating user
        data.pop('password2', None)
    
        # Extract trainer_data if present
        trainer_data = data.pop('trainer_data', None)
    
        user = CustomUser.objects.create_user(
            username   = data["username"],
            password   = data["password"],
            email      = data["email"],
            first_name = data["first_name"],
            last_name  = data["last_name"],
            is_trainer = data.get("is_trainer", False),
        )
    
        # Create UserProfile
        UserProfile.objects.create(user=user)

        # Create TrainerProfile with data if user is a trainer
        if user.is_trainer and trainer_data:
            TrainerProfile.objects.create(
                user=user,
                bio=trainer_data.get('bio', ''),
                years_of_experience=trainer_data.get('years_of_experience', 0),
                specialty_strength=trainer_data.get('specialty_strength', False),
                specialty_cardio=trainer_data.get('specialty_cardio', False),
                specialty_flexibility=trainer_data.get('specialty_flexibility', False),
                specialty_sports=trainer_data.get('specialty_sports', False),
                specialty_rehabilitation=trainer_data.get('specialty_rehabilitation', False),
                certifications=trainer_data.get('certifications', ''),
            )
        elif user.is_trainer: # if no trainer info is entered but it shouldn't be possible anyways because of validators
            TrainerProfile.objects.create(user=user)

        return user
    
class UserLoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        login = data.get('login')
        password = data.get('password')
        
        if not login or not password:
            raise serializers.ValidationError("Login and password are required")
        
        # Login format username or email check
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
            
        # password checker
        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")
        
        data['user'] = user
        return data




# Workout-related serializers
class WorkoutPlanSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkoutPlan
        fields = [
            'id', 'name', 'description', 'focus', 'difficulty',
            'weekly_frequency', 'session_length', 'is_subscription',
            'trainer', 'trainer_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'trainer']
    
    def get_trainer_name(self, obj):
        """Return trainer's full name"""
        if obj.trainer:
            return f"{obj.trainer.first_name} {obj.trainer.last_name}"
        return "Unknown Trainer"


class WorkoutSessionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = WorkoutSession
        fields = [
            'id', 'user', 'plan', 'plan_name', 'date', 
            'duration_minutes', 'is_completed', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at', 'user']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class WorkoutFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutFeedback
        fields = [
            'id', 'session', 'difficulty_rating', 'fatigue_level',
            'pain_reported', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']