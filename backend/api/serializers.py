from .models import CustomUser, UserProfile, TrainerProfile
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
import re

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
        return data

    def create(self, data):
        # Remove password2 before creating user, it was only for password confirmation
        data.pop('password2', None)
        
        user = CustomUser.objects.create_user(
            username   = data["username"],
            password   = data["password"],  # This will hash the password correctly
            email      = data["email"],
            first_name = data["first_name"],
            last_name  = data["last_name"],
            is_trainer = data.get("is_trainer", False),
        )
        UserProfile.objects.create(
            user=user, # more fields for profile might be added here later
        )

        if user.is_trainer:
            TrainerProfile.objects.create(user=user)  

        return user
    
class UserLoginSerializer(serializers.Serializer):
    login = serializers.CharField()  # Can be username or email
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        login = data.get('login')
        password = data.get('password')
        
        if not login or not password:
            raise serializers.ValidationError("Login and password are required")
        
        # Check if login is an email format
        if '@' in login:
            # Try to find user by email
            try:
                user = CustomUser.objects.get(email__iexact=login.strip().lower())
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials")
        else:
            # Try to find user by username
            try:
                user = CustomUser.objects.get(username=login)
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials")
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")
        
        # Attach user to validated data for use in the view
        data['user'] = user
        return data
