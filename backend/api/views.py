import json
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.mail import send_mail # for sending password reset emails
from django.views.decorators.http import require_GET, require_POST
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import TrainerProfileSerializer, UserSignupSerializer, UserLoginSerializer, UserSerializer, UserProfileSerializer
from .models import UserProfile
from .authentication import CsrfExemptSessionAuthentication
import os
from urllib.parse import urlencode
from rest_framework.exceptions import ValidationError


User = get_user_model()

# CSRF Cookie
@ensure_csrf_cookie
@require_GET
def csrf(_request):
    token = get_token(_request)
    return JsonResponse({"csrfToken": token})

# Signup View
@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def signup_view(_request):
    s = UserSignupSerializer(data=_request.data)

    try:
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            UserSerializer(user).data,
            status = status.HTTP_201_CREATED
        )
    except ValidationError as e:
        # formatting errors for frontend display
        formatted_errors = {}
        for field, errors in e.detail.items():
            if isinstance(errors, list):
                formatted_errors[field] = errors[0]
            else:
                formatted_errors[field] = str(errors)

        return Response(
            {'errors': formatted_errors},
            status = status.HTTP_400_BAD_REQUEST
        )
    
# Login View (Session)
@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def login_view(_request):
    serializer = UserLoginSerializer(data=_request.data)
    
    try:
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']  # User is already authenticated by serializer
        
        login(_request, user)
        return Response({
            "ok": True,
            "user": UserSerializer(user).data
        })
    except ValidationError as e:
        return Response(
            {"detail": str(e.detail[0]) if isinstance(e.detail, list) else str(e.detail)},
            status=status.HTTP_401_UNAUTHORIZED
        )


# Logging out
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(_request):
    logout(_request)
    return Response({"ok": True})


# Debugging .../me/ to check if logged in
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(_request):
    return Response({
        "authenticated": True,
        "user": UserSerializer(_request.user).data
    })

# Create fitness profile
@api_view(["POST"])
@permission_classes([IsAuthenticated])

def create_profile_view(_request):
    if UserProfile.objects.filter(user=_request.user).exists():
        return Response({"detail": "Profile already exists. Use update endpoint instead."}, status= status.HTTP_400_BAD_REQUEST)
    serializer = UserProfileSerializer(data = _request.data)

    try:
        serializer.is_valid(raise_exception = True)

        profile = UserProfile.objects.create(
            user = _request.user,
            age = serializer.validated_data.get("age"),
            experience_level = serializer.validated_data.get("experience_level"),
            training_location = serializer.validated_data.get("training_location"),
            fitness_focus = serializer.validated_data.get("fitness_focus"),
        )
        
        return Response(
            UserProfileSerializer(profile).data,
            status = status.HTTP_201_CREATED
        )
    except ValidationError as e:
        formatted_errors= {}
        if isinstance(e.detail, dict):
            for field, errors in e.detail.items():
                if isinstance(errors, list):
                    formatted_errors[field] = errors[0]
                else:
                    formatted_errors[field] = str(errors)
            else:
                formatted_errors["detail"] = str (e.detail)
            return Response({"errors": formatted_errors}, status = status.HTTP_400_BAD_REQUEST)
        

# Get or update current user's profile
@api_view(["GET","PUT"])
@permission_classes([IsAuthenticated])

def profile_me_view(_request):
    profile = UserProfile.objects.filter(user = _request.user).first()

    if _request.method == "GET":
        if not profile:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserProfileSerializer(profile).data, status=status.HTTP_200_OK)

    # PUT
    if not profile:
        return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = UserProfileSerializer(data = _request.data)

    try:
        serializer.is_valid(raise_exception=True)

        profile.age = serializer.validated_data.get("age")
        profile.experience_level = serializer.validated_data.get("experience_level")
        profile.training_location = serializer.validated_data.get("training_location")
        profile.fitness_focus = serializer.validated_data.get("fitness_focus")
        profile.save()

        return Response(
            UserProfileSerializer(profile).data,
            status=status.HTTP_200_OK
        )
    except ValidationError as e:
        formatted_errors = {}
        if isinstance(e.detail, dict):
            for field, errors in e.detail.items():
                if isinstance(errors, list):
                    formatted_errors[field] = errors[0]
                else:
                    formatted_errors[field] = str(errors)
        else:
            formatted_errors["detail"] = str(e.detail)

        return Response(
            {"errors": formatted_errors},
            status=status.HTTP_400_BAD_REQUEST
        )



# Forgot Password (implement later)
def build_reset_url(_request, uid, token):
    base = os.environ.get("FRONTEND_BASE_URL") 
    q = urlencode({"uid": uid, "token": token})
    if base:
        return f"{base.rstrip('/')}/reset-password?{q}"
    return _request.build_absolute_uri(f"/reset-password?{q}")


# Password Reset Token Confirmation 
@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def password_reset_confirm(_request):
    uid = _request.data.get("uid")
    token = _request.data.get("token")
    newpw = _request.data.get("new_password")
    if not (uid and token and newpw):
        return Response({"detail": "missing fields"}, status=400)
    try:
        uid_int = int(urlsafe_base64_decode(uid).decode())
        user = User.objects.get(pk=uid_int)
    except Exception:
        return Response({"detail": "invalid uid"}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({"detail": "invalid token"}, status=400)
    user.set_password(newpw)
    user.save()
    return Response({"ok": True})

# Password Reset view
@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def password_reset(_request):


    # code to be added here later if we want it implemented



    return Response({"ok": True})

# Public Profile View (can view any user's profile)
@api_view(["GET"])
@permission_classes([IsAuthenticated])  # Must be logged in to view profiles
def get_public_profile(request, user_id):
    """
    Get public profile for any user (trainer or regular user)
    Returns basic info + trainer profile if they're a trainer
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if viewing own profile
    is_owner = request.user.id == user.id
    
    # Get user profile
    user_profile = None
    try:
        profile = user.profile
        user_profile = {
            "age": profile.age,
            "experience_level": profile.experience_level,
            "training_location": profile.training_location,
            "fitness_focus": profile.fitness_focus,
        }
    except UserProfile.DoesNotExist:
        pass
    
    # Get trainer profile if user is a trainer
    trainer_profile = None
    if user.is_trainer:
        try:
            t_profile = user.trainer_profile
            trainer_profile = TrainerProfileSerializer(t_profile).data
        except:
            pass
    
    return Response({
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email if is_owner else None,  # Only show email to owner
        "is_trainer": user.is_trainer,
        "is_owner": is_owner,
        "user_profile": user_profile,
        "trainer_profile": trainer_profile,
    }, status=status.HTTP_200_OK)


# Get Trainer's Programs
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_trainer_programs(request, user_id):
    """
    Get all workout programs created by a specific trainer
    """
    try:
        user = User.objects.get(id=user_id, is_trainer=True)
    except User.DoesNotExist:
        return Response(
            {"detail": "Trainer not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from .models import WorkoutPlan
    programs = WorkoutPlan.objects.filter(trainer=user).order_by('-created_at')
    
    programs_data = []
    for program in programs:
        programs_data.append({
            "id": program.id,
            "name": program.name,
            "description": program.description,
            "focus": program.focus,
            "difficulty": program.difficulty,
            "weekly_frequency": program.weekly_frequency,
            "session_length": program.session_length,
            "is_subscription": program.is_subscription,
            "created_at": program.created_at.isoformat(),
            "updated_at": program.updated_at.isoformat(),
        })
    
    return Response({
        "programs": programs_data,
        "total_count": len(programs_data)
    }, status=status.HTTP_200_OK)


# Update Trainer Profile
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_trainer_profile(request):
    """
    Update trainer profile (only trainers can update their own profile)
    """
    if not request.user.is_trainer:
        return Response(
            {"detail": "Only trainers can update trainer profiles"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        trainer_profile = request.user.trainer_profile
    except:
        return Response(
            {"detail": "Trainer profile not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = TrainerProfileSerializer(
        trainer_profile, 
        data=request.data, 
        partial=True
    )
    
    try:
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ValidationError as e:
        formatted_errors = {}
        if isinstance(e.detail, dict):
            for field, errors in e.detail.items():
                if isinstance(errors, list):
                    formatted_errors[field] = errors[0]
                else:
                    formatted_errors[field] = str(errors)
        else:
            formatted_errors["detail"] = str(e.detail)
        
        return Response(
            {"errors": formatted_errors},
            status=status.HTTP_400_BAD_REQUEST
        )
