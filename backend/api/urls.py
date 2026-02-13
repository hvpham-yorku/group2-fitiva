from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'programs', views.WorkoutProgramViewSet, basename='program')

urlpatterns = [
    # ========================================
    # Authentication Endpoints
    # ========================================
    path("auth/csrf/", views.csrf, name="csrf"),
    path("auth/signup/", views.signup_view, name="signup"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.me, name="me"),
    
    # ========================================
    # User Profile Endpoints
    # ========================================
    path("profile/me/", views.profile_me_view, name="profile_me"),
    path("profile/create/", views.create_profile_view, name="create_profile"),
    
    # ========================================
    # Public Profile & Trainer Endpoints
    # ========================================
    path("users/<int:user_id>/profile/", views.get_public_profile, name="public_profile"),
    path("users/<int:user_id>/programs/", views.get_trainer_programs, name="trainer_programs"),
    
    # ========================================
    # Trainer-Only Endpoints
    # ========================================
    path("trainer/profile/", views.update_trainer_profile, name="update_trainer_profile"),
    
    # ========================================
    # Other Endpoints
    # ========================================
    path('recommendations/', views.get_recommendations, name='recommendations'),
    path('programs/<int:program_id>/', views.get_program_detail, name='program-detail'),
    
    # ========================================
    # Exercise Template Endpoints
    # ========================================
    path('exercise-templates/', views.exercise_templates, name='exercise-templates'),
    path('exercise-templates/<int:template_id>/', views.exercise_template_detail, name='exercise-template-detail'),
    
    # ========================================
    # Router URLs (WorkoutProgramViewSet)
    # Generates: /programs/, /programs/{id}/
    # ========================================
    path('', include(router.urls)),

    # ========================================
    # Schedule Endpoints
    # ========================================
    path('schedule/generate/', views.generate_schedule, name='generate-schedule'),
    path('schedule/active/', views.get_active_schedule, name='active-schedule'),
    path('schedule/workout/<str:date_str>/', views.get_workout_for_date, name='workout-for-date'),
    path('schedule/deactivate/', views.deactivate_schedule, name='deactivate-schedule'),
    path('schedule/remove-program/<int:program_id>/', views.remove_program_from_schedule, name='remove-program-from-schedule'),  
    path('schedule/check-program/<int:program_id>/', views.check_program_in_schedule, name='check-program-in-schedule'),  
    path('schedule/<int:schedule_id>/update-start-date/', views.update_schedule_start_date),


    
]

