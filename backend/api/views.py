import os
from urllib.parse import urlencode
from datetime import datetime, timedelta

from django.db.models import Q
from django.contrib.auth import login, logout, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .authentication import CsrfExemptSessionAuthentication
from .models import (
    CustomUser,
    UserProfile,
    TrainerProfile,
    UserSchedule,
    WorkoutPlan,
    WorkoutSession,
    WorkoutFeedback,
    ProgramSection,
    Exercise,
    ExerciseSet,
    ExerciseTemplate,
)

from .serializers import (
    UserSignupSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserScheduleSerializer,
    UserProfileSerializer,
    TrainerProfileSerializer,
    WorkoutPlanSerializer,
    WorkoutSessionSerializer,
    WorkoutFeedbackSerializer,
    ProgramSectionSerializer,
    ExerciseSerializer,
    ExerciseSetSerializer,
    ExerciseTemplateSerializer,
)


User = get_user_model()


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def format_validation_errors(validation_error):
    """Format DRF ValidationError for consistent error responses."""
    formatted_errors = {}
    if isinstance(validation_error.detail, dict):
        for field, errors in validation_error.detail.items():
            if isinstance(errors, list):
                formatted_errors[field] = errors[0]
            else:
                formatted_errors[field] = str(errors)
    else:
        formatted_errors["detail"] = str(validation_error.detail)
    return formatted_errors


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

@ensure_csrf_cookie
@require_GET
def csrf(request):
    """Return CSRF token for client-side authentication."""
    token = get_token(request)
    return JsonResponse({"csrfToken": token})


@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def signup_view(request):
    """Register a new user with optional trainer profile."""
    serializer = UserSignupSerializer(data=request.data)
    
    try:
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    except ValidationError as e:
        return Response(
            {'errors': format_validation_errors(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and create session."""
    serializer = UserLoginSerializer(data=request.data)
    
    try:
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        login(request, user)
        return Response({
            "ok": True,
            "user": UserSerializer(user).data
        })
    except ValidationError as e:
        error_message = str(e.detail[0]) if isinstance(e.detail, list) else str(e.detail)
        return Response(
            {"detail": error_message},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Log out current user and end session."""
    logout(request)
    return Response({"ok": True})


@api_view(["GET"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def me(request):
    """Return current authenticated user's data."""
    return Response({
        "authenticated": True,
        "user": UserSerializer(request.user).data
    })


# ============================================================================
# USER PROFILE VIEWS
# ============================================================================

@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])

def create_profile_view(request):
    """Create fitness profile for current user."""
    if UserProfile.objects.filter(user=request.user).exists():
        return Response(
            {"detail": "Profile already exists. Use update endpoint instead."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = UserProfileSerializer(data=request.data)
    
    try:
        serializer.is_valid(raise_exception=True)
        profile = UserProfile.objects.create(
            user=request.user,
            age=serializer.validated_data.get("age"),
            experience_level=serializer.validated_data.get("experience_level"),
            training_location=serializer.validated_data.get("training_location"),
            fitness_focus=serializer.validated_data.get("fitness_focus"),
        )
        
        return Response(
            UserProfileSerializer(profile).data,
            status=status.HTTP_201_CREATED
        )
    except ValidationError as e:
        return Response(
            {"errors": format_validation_errors(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile_me_view(request):
    """Get or update current user's fitness profile."""
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        return Response(
            {"detail": "Profile not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == "GET":
        return Response(
            UserProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )
    
    # PUT - Update profile
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    
    try:
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            UserProfileSerializer(profile).data,
            status=status.HTTP_200_OK
        )
    except ValidationError as e:
        return Response(
            {"errors": format_validation_errors(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


# ============================================================================
# PUBLIC PROFILE VIEWS
# ============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_public_profile(request, user_id):
    """
    Get public profile for any user.
    Returns basic info + trainer profile if they're a trainer.
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
            trainer_profile = TrainerProfileSerializer(user.trainer_profile).data
        except TrainerProfile.DoesNotExist:
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_trainer_programs(request, user_id):
    """Get all workout programs created by a specific trainer."""
    try:
        user = User.objects.get(id=user_id, is_trainer=True)
    except User.DoesNotExist:
        return Response(
            {"detail": "Trainer not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    programs = WorkoutPlan.objects.filter(trainer=user).order_by('-created_at')
    serializer = WorkoutPlanSerializer(programs, many=True)
    
    return Response({
        "programs": serializer.data,
        "total_count": programs.count()
    }, status=status.HTTP_200_OK)


# ============================================================================
# TRAINER PROFILE VIEWS
# ============================================================================

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_trainer_profile(request):
    """Update trainer profile (trainers only)."""
    if not request.user.is_trainer:
        return Response(
            {"detail": "Only trainers can update trainer profiles"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        trainer_profile = request.user.trainer_profile
    except TrainerProfile.DoesNotExist:
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
        return Response(
            {"errors": format_validation_errors(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


# ============================================================================
# WORKOUT VIEWSETS
# ============================================================================

class WorkoutProgramViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workout plans/programs."""
    serializer_class = WorkoutPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return all workout programs ordered by creation date."""
        return WorkoutPlan.objects.all().select_related('trainer').order_by('-created_at')

    def perform_create(self, serializer):
        """Set the trainer to the current user when creating a new plan."""
        # Check if user is a trainer
        if not self.request.user.is_trainer:
            raise ValidationError({"detail": "Only trainers can create workout programs"})
        serializer.save(trainer=self.request.user)
    
    def perform_update(self, serializer):
        """Ensure only the program owner can update it."""
        if not self.request.user.is_trainer:
            raise ValidationError({"detail": "Only trainers can update workout programs"})
        if serializer.instance.trainer != self.request.user:
            raise ValidationError({"detail": "You can only update your own programs"})
        serializer.save()
    
    def perform_destroy(self, instance):
        """Ensure only the program owner can delete it."""
        if not self.request.user.is_trainer:
            raise ValidationError({"detail": "Only trainers can delete workout programs"})
        if instance.trainer != self.request.user:
            raise ValidationError({"detail": "You can only delete your own programs"})
        instance.delete()


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workout sessions."""
    serializer_class = WorkoutSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return user's workout sessions ordered by date."""
        return WorkoutSession.objects.filter(user=self.request.user).order_by('-date')
    
    def perform_create(self, serializer):
        """Set the user to the current user when creating a session."""
        serializer.save(user=self.request.user)


class WorkoutFeedbackViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workout feedback."""
    serializer_class = WorkoutFeedbackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return feedback for user's workout sessions."""
        return WorkoutFeedback.objects.filter(
            session__user=self.request.user
        ).order_by('-created_at')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """
    Get workout program recommendations based on user's fitness focuses.
    Returns programs that share at least one focus with the user's profile.
    """
    try:
        # Get user's profile
        user_profile = UserProfile.objects.get(user=request.user)
        user_focuses = user_profile.fitness_focus
        
        # Validate user has focuses set
        if not user_focuses or len(user_focuses) == 0:
            return Response({
                'message': 'Please set your fitness focuses in your profile to get recommendations',
                'programs': []
            }, status=status.HTTP_200_OK)
        
        # Get all non-deleted programs
        all_programs = WorkoutPlan.objects.filter(is_deleted=False)
        
        # Filter programs that have at least one matching focus
        recommended_programs = []
        for program in all_programs:
            program_focuses = program.focus
            if program_focuses:
                # Check if there's any overlap between user focuses and program focuses
                matching_focuses = set(user_focuses) & set(program_focuses)
                if matching_focuses:
                    recommended_programs.append(program)
        
        # Serialize the programs
        serializer = WorkoutPlanSerializer(recommended_programs, many=True)
        
        return Response({
            'user_focuses': user_focuses,
            'total_recommendations': len(recommended_programs),
            'programs': serializer.data
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found. Please complete your profile setup.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_program_detail(request, program_id):
    """
    Get detailed information about a specific workout program.
    Includes all sections, exercises, and sets.
    """
    try:
        # Get the program
        program = WorkoutPlan.objects.get(id=program_id, is_deleted=False)
        
        # Serialize with full nested data
        serializer = WorkoutPlanSerializer(program)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except WorkoutPlan.DoesNotExist:
        return Response({
            'error': 'Program not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def exercise_templates(request):
    """
    GET: List all exercise templates (trainer's own + defaults)
    POST: Create a new exercise template
    """
    if not request.user.is_trainer:
        return Response({
            'error': 'Only trainers can access exercise templates'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get trainer's own exercises + default exercises
        templates = ExerciseTemplate.objects.filter(
            Q(trainer=request.user) | Q(is_default=True)
        ).order_by('is_default', '-created_at')
        
        # Optional search filter
        search = request.GET.get('search', '').strip()
        if search:
            templates = templates.filter(name__icontains=search)
        
        serializer = ExerciseTemplateSerializer(templates, many=True)
        return Response({
            'total': templates.count(),
            'exercises': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = ExerciseTemplateSerializer(data=request.data)
        if serializer.is_valid():
            # Set the trainer to current user
            serializer.save(trainer=request.user, is_default=False)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def exercise_template_detail(request, template_id):
    """
    GET: Retrieve specific exercise template
    PUT: Update exercise template
    DELETE: Delete exercise template
    """
    if not request.user.is_trainer:
        return Response({
            'error': 'Only trainers can access exercise templates'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        template = ExerciseTemplate.objects.get(id=template_id)
        
        # Only allow modifying own exercises (not defaults)
        if request.method in ['PUT', 'DELETE']:
            if template.is_default or template.trainer != request.user:
                return Response({
                    'error': 'You can only modify your own exercises'
                }, status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            serializer = ExerciseTemplateSerializer(template)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            serializer = ExerciseTemplateSerializer(template, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            template.delete()
            return Response({
                'message': 'Exercise deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
    
    except ExerciseTemplate.DoesNotExist:
        return Response({
            'error': 'Exercise template not found'
        }, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# PASSWORD RESET VIEWS (To be implemented)
# ============================================================================

def build_reset_url(request, uid, token):
    """Build password reset URL for email."""
    base = os.environ.get("FRONTEND_BASE_URL")
    query_params = urlencode({"uid": uid, "token": token})
    if base:
        return f"{base.rstrip('/')}/reset-password?{query_params}"
    return request.build_absolute_uri(f"/reset-password?{query_params}")


@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Confirm password reset with token and set new password."""
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    
    if not (uid and token and new_password):
        return Response({"detail": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        uid_int = int(urlsafe_base64_decode(uid).decode())
        user = User.objects.get(pk=uid_int)
    except (ValueError, User.DoesNotExist):
        return Response({"detail": "Invalid UID"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()
    return Response({"ok": True})


@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def password_reset(request):
    """
    Initiate password reset process.
    TODO: Implement email sending logic.
    """
    # Implementation pending
    return Response({"ok": True})

# add schedule views

# ============================================================================
# SCHEDULE VIEWS
# ============================================================================

@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def generate_schedule(request):
    """
    Add a program to the user's schedule (or create new schedule).
    Merges with existing schedule if one exists.
    """
    program_id = request.data.get('program_id')
    start_date_str = request.data.get('start_date')
    rest_days = request.data.get('rest_days', [])
    
    if not program_id:
        return Response(
            {"error": "program_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        program = WorkoutPlan.objects.get(id=program_id, is_deleted=False)
    except WorkoutPlan.DoesNotExist:
        return Response(
            {"error": "Program not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user already has this program in their schedule
    try:
        existing_schedule = UserSchedule.objects.get(user=request.user, is_active=True)
        if program in existing_schedule.programs.all():
            return Response(
                {"error": "This program is already in your schedule"},
                status=status.HTTP_400_BAD_REQUEST
            )
    except UserSchedule.DoesNotExist:
        existing_schedule = None
    
    # Get program sections (workout days)
    sections = program.sections.filter(is_rest_day=False).order_by('order')
    
    if sections.count() == 0:
        return Response(
            {"error": "Program has no workout sections"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Determine start date
    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    else:
        if existing_schedule:
            start_date = existing_schedule.start_date
        else:
            today = datetime.now().date()
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            start_date = today + timedelta(days=days_until_monday)
    
    # Build schedule for this program
    days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    program_schedule = {}
    
    frequency = min(program.weekly_frequency, 7)
    section_index = 0
    days_scheduled = 0
    
    for day in days_of_week:
        if day in [d.lower() for d in rest_days]:
            program_schedule[day] = []
        elif days_scheduled < frequency and section_index < sections.count():
            program_schedule[day] = [sections[section_index].id]
            section_index += 1
            days_scheduled += 1
            
            if section_index >= sections.count():
                section_index = 0
        else:
            program_schedule[day] = []
    
    # Merge with existing schedule or create new one
    if existing_schedule:
        # Merge the schedules
        merged_schedule = existing_schedule.weekly_schedule.copy()
        for day, section_ids in program_schedule.items():
            if day not in merged_schedule:
                merged_schedule[day] = []
            elif merged_schedule[day] == 'rest':
                merged_schedule[day] = []
            
            # Add new sections to this day
            if isinstance(merged_schedule[day], list):
                merged_schedule[day].extend(section_ids)
            else:
                merged_schedule[day] = section_ids
        
        existing_schedule.weekly_schedule = merged_schedule
        existing_schedule.save()
        existing_schedule.programs.add(program)
        
        schedule = existing_schedule
    else:
        # Create new schedule
        schedule = UserSchedule.objects.create(
            user=request.user,
            start_date=start_date,
            weekly_schedule=program_schedule,
            is_active=True
        )
        schedule.programs.add(program)
    
    serializer = UserScheduleSerializer(schedule)
    return Response({
        "message": "Program added to your schedule",
        "schedule": serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def remove_program_from_schedule(request, program_id):
    """Remove a specific program from the user's schedule."""
    try:
        schedule = UserSchedule.objects.get(user=request.user, is_active=True)
    except UserSchedule.DoesNotExist:
        return Response(
            {"error": "No active schedule found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        program = WorkoutPlan.objects.get(id=program_id)
    except WorkoutPlan.DoesNotExist:
        return Response(
            {"error": "Program not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if program not in schedule.programs.all():
        return Response(
            {"error": "Program not in schedule"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get sections from this program
    program_sections = list(program.sections.values_list('id', flat=True))
    
    # Remove these sections from the weekly schedule
    updated_schedule = {}
    for day, section_ids in schedule.weekly_schedule.items():
        if isinstance(section_ids, list):
            # Filter out sections from this program
            updated_schedule[day] = [sid for sid in section_ids if sid not in program_sections]
        else:
            updated_schedule[day] = section_ids
    
    schedule.weekly_schedule = updated_schedule
    schedule.programs.remove(program)
    
    # If no programs left, deactivate schedule
    if schedule.programs.count() == 0:
        schedule.is_active = False
    
    schedule.save()
    
    return Response({
        "message": "Program removed from schedule",
        "programs_remaining": schedule.programs.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def check_program_in_schedule(request, program_id):
    """Check if a program is in the user's active schedule."""
    try:
        schedule = UserSchedule.objects.get(user=request.user, is_active=True)
        program = WorkoutPlan.objects.get(id=program_id)
        
        is_in_schedule = program in schedule.programs.all()
        
        return Response({
            "in_schedule": is_in_schedule,
            "schedule_id": schedule.id if is_in_schedule else None
        }, status=status.HTTP_200_OK)
    except UserSchedule.DoesNotExist:
        return Response({"in_schedule": False}, status=status.HTTP_200_OK)
    except WorkoutPlan.DoesNotExist:
        return Response(
            {"error": "Program not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def get_active_schedule(request):
    """Get user's current active workout schedule with merged programs."""
    try:
        schedule = UserSchedule.objects.get(user=request.user, is_active=True)
        serializer = UserScheduleSerializer(schedule)
        
        # Add calendar events for the next 4 weeks
        calendar_events = []
        start_date = schedule.start_date
        days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        for week in range(4):
            for day_index, day_name in enumerate(days_of_week):
                event_date = start_date + timedelta(days=week * 7 + day_index)
                section_ids = schedule.weekly_schedule.get(day_name, [])
                
                if not section_ids or section_ids == 'rest':
                    calendar_events.append({
                        'date': event_date.isoformat(),
                        'day': day_name,
                        'sections': [],
                        'section_type': 'rest',
                        'exercise_count': 0
                    })
                else:
                    # Get all sections for this day
                    sections = []
                    total_exercises = 0
                    
                    # Handle both list and single ID formats
                    if not isinstance(section_ids, list):
                        section_ids = [section_ids] if section_ids != 'rest' else []
                    
                    # FIXED: Proper indentation here
                    for section_id in section_ids:
                        try:
                            section = ProgramSection.objects.get(id=section_id)
                            exercise_count = section.exercises.count()
                            total_exercises += exercise_count
                            
                            sections.append({
                                'id': section.id,
                                'name': section.format,
                                'type': section.type,
                                'exercise_count': exercise_count,
                                # NEW: Add program information
                                'program_id': section.program.id,
                                'program_name': section.program.name,
                                'focus': section.program.focus,
                            })
                        except ProgramSection.DoesNotExist:
                            pass
                    
                    # FIXED: This needs to be at the same level as the for loop above
                    calendar_events.append({
                        'date': event_date.isoformat(),
                        'day': day_name,
                        'sections': sections,
                        'section_type': 'workout' if sections else 'rest',
                        'exercise_count': total_exercises
                    })
        
        return Response({
            'schedule': serializer.data,
            'calendar_events': calendar_events
        }, status=status.HTTP_200_OK)
        
    except UserSchedule.DoesNotExist:
        return Response({
            'message': 'No active schedule found',
            'schedule': None,
            'calendar_events': []
        }, status=status.HTTP_200_OK)
@api_view(['PATCH'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def update_schedule_start_date(request, schedule_id):
    """Update the start date of a schedule."""
    try:
        schedule = UserSchedule.objects.get(id=schedule_id, user=request.user, is_active=True)
    except UserSchedule.DoesNotExist:
        return Response(
            {"error": "Schedule not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    new_start_date = request.data.get('start_date')
    if not new_start_date:
        return Response(
            {"error": "start_date is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        schedule.start_date = datetime.strptime(new_start_date, '%Y-%m-%d').date()
        schedule.save()
        
        return Response({
            "message": "Start date updated successfully",
            "new_start_date": schedule.start_date.isoformat()
        }, status=status.HTTP_200_OK)
    except ValueError:
        return Response(
            {"error": "Invalid date format. Use YYYY-MM-DD"},
            status=status.HTTP_400_BAD_REQUEST
        )
@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def get_workout_for_date(request, date_str):
    """Get all workouts for a specific date (merged from multiple programs)."""
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {"error": "Invalid date format. Use YYYY-MM-DD"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        schedule = UserSchedule.objects.get(user=request.user, is_active=True)
    except UserSchedule.DoesNotExist:
        return Response(
            {"error": "No active schedule found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Calculate which day of the week this is
    day_name = target_date.strftime('%A').lower()
    section_ids = schedule.weekly_schedule.get(day_name, [])
    
    # Handle both list and single ID formats
    if not isinstance(section_ids, list):
        section_ids = [section_ids] if section_ids != 'rest' else []
    
    if not section_ids or section_ids == 'rest':
        return Response({
            'date': date_str,
            'is_rest_day': True,
            'message': 'Rest day - recovery is important!',
            'workouts': []
        }, status=status.HTTP_200_OK)
    
    # Get all sections for this day
    workouts = []
    for section_id in section_ids:
        try:
            section = ProgramSection.objects.get(id=section_id)
            serializer = ProgramSectionSerializer(section)
            workouts.append({
                'program_name': section.program.name,
                'section': serializer.data
            })
        except ProgramSection.DoesNotExist:
            pass
    
    return Response({
        'date': date_str,
        'is_rest_day': False,
        'workouts': workouts,
        'total_exercises': sum(len(w['section']['exercises']) for w in workouts)
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def deactivate_schedule(request):
    """Deactivate the user's current schedule."""
    updated_count = UserSchedule.objects.filter(
        user=request.user,
        is_active=True
    ).update(is_active=False)
    
    return Response({
        'message': f'Deactivated {updated_count} schedule(s)',
        'count': updated_count
    }, status=status.HTTP_200_OK)