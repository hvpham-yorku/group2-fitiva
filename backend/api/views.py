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
from .serializers import (
    UserSignupSerializer, UserLoginSerializer, UserSerializer,
    UserProfileSerializer, TrainerProfileSerializer, WorkoutPlanSerializer,
)
from .models import UserProfile, TrainerProfile, WorkoutPlan
from .authentication import CsrfExemptSessionAuthentication
import os
from urllib.parse import urlencode
from rest_framework.exceptions import ValidationError


User = get_user_model()

# CSRF
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

# --- Profile (User fitness profile) ---
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile_me(request):
    """Get or update the current user's fitness profile (age, experience, location, focus)."""
    profile = request.user.profile
    if request.method == "GET":
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)
    # PUT - use partial=True so only sent fields are validated (no need to send read_only)
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    try:
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    except ValidationError as e:
        formatted = {}
        for field, errors in e.detail.items():
            formatted[field] = errors[0] if isinstance(errors, list) else str(errors)
        return Response({"errors": formatted}, status=status.HTTP_400_BAD_REQUEST)


# --- Trainer profile ---
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def trainer_profile_me(request):
    """Get or update the current trainer's public profile. Only for users with is_trainer=True."""
    if not getattr(request.user, "is_trainer", False):
        return Response({"detail": "Only trainers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
    profile = request.user.trainer_profile
    if request.method == "GET":
        serializer = TrainerProfileSerializer(profile)
        return Response(serializer.data)
    serializer = TrainerProfileSerializer(profile, data=request.data, partial=True)
    try:
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    except ValidationError as e:
        formatted = {}
        for field, errors in e.detail.items():
            formatted[field] = errors[0] if isinstance(errors, list) else str(errors)
        return Response({"errors": formatted}, status=status.HTTP_400_BAD_REQUEST)


# --- Workout programs (trainer create/publish; public list published) ---
@api_view(["GET"])
@permission_classes([AllowAny])
def program_list_published(request):
    """List workout programs that are published (for browsing)."""
    qs = WorkoutPlan.objects.filter(is_published=True).select_related("trainer").order_by("-updated_at")
    serializer = WorkoutPlanSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def program_list_mine(request):
    """List current trainer's programs (for My Programs page)."""
    if not request.user.is_trainer:
        return Response({"detail": "Only trainers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
    qs = WorkoutPlan.objects.filter(trainer=request.user).order_by("-updated_at")
    serializer = WorkoutPlanSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def program_detail(request, pk):
    """Get, update, or delete a workout program. Only the owning trainer can modify."""
    if not request.user.is_trainer:
        return Response({"detail": "Only trainers can manage programs."}, status=status.HTTP_403_FORBIDDEN)
    try:
        plan = WorkoutPlan.objects.get(pk=pk, trainer=request.user)
    except WorkoutPlan.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        serializer = WorkoutPlanSerializer(plan)
        return Response(serializer.data)
    if request.method == "DELETE":
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    partial = request.method == "PATCH"
    serializer = WorkoutPlanSerializer(plan, data=request.data, partial=partial)
    try:
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    except ValidationError as e:
        formatted = {}
        for field, errors in e.detail.items():
            formatted[field] = errors[0] if isinstance(errors, list) else str(errors)
        return Response({"errors": formatted}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def program_create(request):
    """Create a new workout program (trainer only)."""
    if not request.user.is_trainer:
        return Response({"detail": "Only trainers can create programs."}, status=status.HTTP_403_FORBIDDEN)
    serializer = WorkoutPlanSerializer(data=request.data)
    try:
        serializer.is_valid(raise_exception=True)
        serializer.save(trainer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except ValidationError as e:
        formatted = {}
        for field, errors in e.detail.items():
            formatted[field] = errors[0] if isinstance(errors, list) else str(errors)
        return Response({"errors": formatted}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def program_publish(request, pk):
    """Toggle or set published status. Trainer only."""
    if not request.user.is_trainer:
        return Response({"detail": "Only trainers can publish programs."}, status=status.HTTP_403_FORBIDDEN)
    try:
        plan = WorkoutPlan.objects.get(pk=pk, trainer=request.user)
    except WorkoutPlan.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    is_published = request.data.get("is_published", not plan.is_published)
    plan.is_published = bool(is_published)
    plan.save()
    return Response(WorkoutPlanSerializer(plan).data)


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