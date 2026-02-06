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
from .serializers import UserSignupSerializer, UserLoginSerializer, UserSerializer
from .models import UserProfile
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