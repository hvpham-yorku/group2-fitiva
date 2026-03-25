# Real database implementation — identical interface to StubRepository.
# Uses Django ORM + DRF serializers under the hood.

from django.db.models import Q
from django.contrib.auth import get_user_model
from .base import BaseRepository

from api.models import (
    UserProfile,
    TrainerProfile,
    WorkoutPlan,
    ProgramSection,
    ExerciseTemplate,
    UserSchedule,
    WorkoutSession,
    WorkoutFeedback,
)
from api.serializers import (
    UserSerializer,
    UserProfileSerializer,
    TrainerProfileSerializer,
    WorkoutPlanSerializer,
    ProgramSectionSerializer,
    ExerciseTemplateSerializer,
    WorkoutSessionSerializer,
)

User = get_user_model()


class DBRepository(BaseRepository):

    # ── Auth / Users ──────────────────────────────────────────────────────

    def get_user_by_id(self, user_id):
        return User.objects.filter(id=user_id).first()

    def get_user_by_username(self, username):
        return User.objects.filter(username=username).first()

    def get_user_by_email(self, email):
        return User.objects.filter(email=email).first()

    def get_all_users(self):
        return UserSerializer(User.objects.all(), many=True).data

    def serialize_user(self, user):
        return UserSerializer(user).data

    # ── Profiles ──────────────────────────────────────────────────────────
    
    def update_trainer_profile(self, user_id, data):
        profile = TrainerProfile.objects.get(user_id=user_id)
        serializer = TrainerProfileSerializer(profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return serializer.data

    def update_user_profile(self, user_id, data):
        profile = UserProfile.objects.get(user_id=user_id)
        serializer = UserProfileSerializer(profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return serializer.data

    def get_user_profile(self, user_id):
        profile = UserProfile.objects.get(user_id=user_id)
        return UserProfileSerializer(profile).data  # return dict, not model

    def get_trainer_profile(self, user_id):
        profile = TrainerProfile.objects.filter(user_id=user_id).first()
        if not profile:
            return None
        return TrainerProfileSerializer(profile).data

    def get_public_profile(self, user_id, requesting_user_id=None):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return None

        is_owner = requesting_user_id == user_id

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

        trainer_profile = None
        if user.is_trainer:
            try:
                trainer_profile = TrainerProfileSerializer(user.trainer_profile).data
            except TrainerProfile.DoesNotExist:
                pass

        return {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email if is_owner else None,
            "is_trainer": user.is_trainer,
            "is_owner": is_owner,
            "user_profile": user_profile,
            "trainer_profile": trainer_profile,
        }

    # ── Programs ──────────────────────────────────────────────────────────

    def get_all_programs(self, include_deleted=False):
        qs = (
            WorkoutPlan.objects.all()
            if include_deleted
            else WorkoutPlan.objects.filter(is_deleted=False)
        )
        return WorkoutPlanSerializer(qs.order_by("-created_at"), many=True).data

    def get_program_by_id(self, program_id, include_deleted=False):
        qs = WorkoutPlan.objects.all() if include_deleted else WorkoutPlan.objects.filter(is_deleted=False)
        plan = qs.filter(id=program_id).first()
        if not plan:
            return None
        return WorkoutPlanSerializer(plan).data

    def get_programs_by_trainer(self, trainer_user_id, include_deleted=False):
        qs = (
            WorkoutPlan.objects.filter(trainer_id=trainer_user_id)
            if include_deleted
            else WorkoutPlan.objects.filter(trainer_id=trainer_user_id, is_deleted=False)
        )
        qs = qs.order_by("-created_at")
        serialized = WorkoutPlanSerializer(qs, many=True).data
        return {"programs": serialized, "total_count": qs.count()}

    # ── Recommendations ───────────────────────────────────────────────────

    def get_recommendations(self, user_id):
        profile = UserProfile.objects.filter(user_id=user_id).first()
        if not profile:
            return {"error": "User profile not found. Please complete your profile setup."}

        user_focuses = profile.fitness_focus or []
        if not user_focuses:
            return {
                "message": "Please set your fitness focuses in your profile to get recommendations",
                "programs": [],
            }

        all_programs = WorkoutPlan.objects.filter(is_deleted=False)
        recommended = [p for p in all_programs if p.focus and set(user_focuses) & set(p.focus)]
        return {
            "user_focuses": user_focuses,
            "total_recommendations": len(recommended),
            "programs": WorkoutPlanSerializer(recommended, many=True).data,
        }

    # ── Exercise Templates ─────────────────────────────────────────────────

    def get_exercise_templates(self, trainer_user_id, search=None):
        qs = ExerciseTemplate.objects.filter(
            Q(trainer_id=trainer_user_id) | Q(is_default=True)
        ).order_by("is_default", "-created_at")

        if search:
            qs = qs.filter(name__icontains=search)

        return {"total": qs.count(), "exercises": ExerciseTemplateSerializer(qs, many=True).data}

    def get_exercise_template_by_id(self, template_id):
        template = ExerciseTemplate.objects.filter(id=template_id).first()
        if not template:
            return None
        return ExerciseTemplateSerializer(template).data

    # ── Sections / Exercises ──────────────────────────────────────────────

    def get_sections_for_program(self, program_id):
        qs = ProgramSection.objects.filter(program_id=program_id).order_by("order")
        return ProgramSectionSerializer(qs, many=True).data

    def get_exercises_for_section(self, section_id):
        section = ProgramSection.objects.filter(id=section_id).first()
        if not section:
            return []
        return ProgramSectionSerializer(section).data.get("exercises", [])

    # ── Schedule ──────────────────────────────────────────────────────────

    def get_active_schedule(self, user_id):
        schedule = UserSchedule.objects.filter(user_id=user_id, is_active=True).first()
        if not schedule:
            return {"message": "No active schedule found", "schedule": None, "calendar_events": []}
        return schedule  # return raw model, views.py serializes this manually anyways

    def check_program_in_schedule(self, user_id, program_id):
        schedule = UserSchedule.objects.filter(user_id=user_id, is_active=True).first()
        if not schedule:
            return {"in_schedule": False}
        in_schedule = schedule.programs.filter(id=program_id).exists()
        return {
            "in_schedule": in_schedule,
            "schedule_id": schedule.id if in_schedule else None,
        }

    # ── Workout History ───────────────────────────────────────────────────

    def get_workout_history(self, user_id, start=None, end=None):
        qs = WorkoutSession.objects.filter(user_id=user_id, status="completed")
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        qs = qs.order_by("-date")
        return {"total": qs.count(), "sessions": WorkoutSessionSerializer(qs, many=True).data}

    def get_workout_feedback(self, user_id, date_str):
        from api.serializers import WorkoutFeedbackSerializer
        
        session = WorkoutSession.objects.filter(user_id=user_id, date=date_str).first()
        if not session:
            return None
        feedback = WorkoutFeedback.objects.filter(session=session).first()
        if not feedback:
            return None
        return WorkoutFeedbackSerializer(feedback).data