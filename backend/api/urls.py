from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


# ============================================================================
# Router — generates:
#   GET  /programs/           → list
#   POST /programs/           → create
#   GET  /programs/{id}/      → retrieve
#   PUT  /programs/{id}/      → update
#   DELETE /programs/{id}/    → destroy
# ============================================================================
router = DefaultRouter()
router.register(r'programs', views.WorkoutProgramViewSet, basename='program')


urlpatterns = [

    # ========================================================================
    # Router URLs (WorkoutProgramViewSet)
    # Must be included BEFORE any manual path that could shadow /programs/{id}/
    # ========================================================================
    path('', include(router.urls)),

    # ========================================================================
    # Authentication
    # ========================================================================
    path('auth/csrf/',                   views.csrf,                    name='csrf'),
    path('auth/signup/',                 views.signup_view,             name='signup'),
    path('auth/login/',                  views.login_view,              name='login'),
    path('auth/logout/',                 views.logout_view,             name='logout'),
    path('auth/me/',                     views.me,                      name='me'),
    path('auth/password-reset/',         views.password_reset,          name='password-reset'),
    path('auth/password-reset-confirm/', views.password_reset_confirm,  name='password-reset-confirm'),

    # ========================================================================
    # User Profile
    # ========================================================================
    path('profile/me/',     views.profile_me_view,      name='profile_me'),
    path('profile/create/', views.create_profile_view,  name='create_profile'),

    # ========================================================================
    # Public User & Trainer Profiles
    # ========================================================================
    path('users/<int:user_id>/profile/',  views.get_public_profile,    name='public_profile'),
    path('users/<int:user_id>/programs/', views.get_trainer_programs,  name='trainer_programs'),

    # ========================================================================
    # Trainer-Only
    # ========================================================================
    path('trainer/profile/',                                views.update_trainer_profile,    name='update_trainer_profile'),
    path('trainer/trainee-count/',                          views.trainer_trainee_count,     name='trainer-trainee-count'),
    path('trainer/programs/<int:program_id>/feedback/',     views.trainer_program_feedback,  name='trainer-program-feedback'),

    # ========================================================================
    # Programs & Recommendations
    # ========================================================================
    path('recommendations/', views.get_recommendations, name='recommendations'),

    # ========================================================================
    # Exercise Templates
    # ========================================================================
    path('exercise-templates/',                      views.exercise_templates,        name='exercise-templates'),
    path('exercise-templates/<int:template_id>/',    views.exercise_template_detail,  name='exercise-template-detail'),

    # ========================================================================
    # Schedule — Core
    # ========================================================================
    path('schedule/generate/',                          views.generate_schedule,             name='generate-schedule'),
    path('schedule/active/',                            views.get_active_schedule,           name='active-schedule'),
    path('schedule/workout/<str:date_str>/',            views.get_workout_for_date,          name='workout-for-date'),
    path('schedule/deactivate/',                        views.deactivate_schedule,           name='deactivate-schedule'),
    path('schedule/remove-program/<int:program_id>/',   views.remove_program_from_schedule,  name='remove-program-from-schedule'),
    path('schedule/check-program/<int:program_id>/',    views.check_program_in_schedule,     name='check-program-in-schedule'),
    path('schedule/<int:schedule_id>/update-start-date/', views.update_schedule_start_date,  name='update-schedule-start-date'),
    path('schedule/<int:schedule_id>/update-end-date/',   views.update_schedule_end_date,    name='update-schedule-end-date'),

    # Schedule — Lock / Unlock  ← NEW (US: accept/reject/lock adjustments)
    path('schedule/<int:schedule_id>/lock/', views.lock_schedule, name='lock-schedule'),
    path('schedule/lock-adjustments/', views.schedule_adjustment_lock, name='schedule-adjustment-lock'),

    # Schedule — Regeneration (US 2.3)
    # Two-step flow: preview (no save) → user accepts → apply (saves)
    path('schedule/regenerate/preview/', views.regenerate_schedule_preview,  name='regenerate-schedule-preview'),
    path('schedule/regenerate/apply/',   views.regenerate_schedule_apply,    name='regenerate-schedule-apply'),

    # Schedule — Pain Recovery & Revert
    path('schedule/apply-recovery-option/', views.apply_recovery_option,  name='apply-recovery-option'),
    path('schedule/revert/',                views.revert_schedule,         name='revert-schedule'),

    # ========================================================================
    # Workout Sessions
    # ========================================================================
    path('sessions/start/<str:date_str>/',    views.start_workout_session,    name='start-session'),
    path('sessions/complete/<str:date_str>/', views.complete_workout_session, name='complete-session'),
    path('sessions/undo/<str:date_str>/',     views.undo_workout_session,     name='undo-session'),
    path('sessions/history/',                 views.workout_history,          name='session-history'),
    path('sessions/feedback/<str:date_str>/', views.workout_feedback,         name='session-feedback'),

    # ========================================================================
    # Rewards
    # ========================================================================
    path('rewards/points/', views.get_user_points, name='user-points'),
    path('rewards/badges/', views.get_user_badges, name='user-badges'),
]