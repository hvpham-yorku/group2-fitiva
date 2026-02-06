from django.urls import path
from . import views

urlpatterns = [
    path("auth/csrf/", views.csrf, name="csrf"),
    path("auth/signup/", views.signup_view, name="signup"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.me, name="me"),
    path("profile/me/", views.profile_me, name="profile_me"),
    path("trainer/me/", views.trainer_profile_me, name="trainer_profile_me"),
    path("programs/", views.program_list_published, name="program_list_published"),
    path("programs/mine/", views.program_list_mine, name="program_list_mine"),
    path("programs/create/", views.program_create, name="program_create"),
    path("programs/<int:pk>/", views.program_detail, name="program_detail"),
    path("programs/<int:pk>/publish/", views.program_publish, name="program_publish"),
]
