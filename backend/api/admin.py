from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
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

admin.site.register(CustomUser, UserAdmin)
admin.site.register(UserProfile)
admin.site.register(TrainerProfile)
admin.site.register(UserSchedule)
admin.site.register(WorkoutPlan)
admin.site.register(WorkoutSession)
admin.site.register(WorkoutFeedback)
admin.site.register(ProgramSection)
admin.site.register(ExerciseTemplate)
