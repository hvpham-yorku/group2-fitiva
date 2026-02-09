from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'programs', views.WorkoutProgramViewSet, basename='program')

# Placeholder for now - we can add actual endpoints later
urlpatterns = [
    path("auth/csrf/", views.csrf, name="csrf"),
    path("auth/signup/", views.signup_view, name ="signup"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.me, name="me"),
    #path("auth/password-reset/", views.password_reset), 
    #path("auth/password-reset-confirm/", views.password_reset_confirm),

    path('', include(router.urls)),
]