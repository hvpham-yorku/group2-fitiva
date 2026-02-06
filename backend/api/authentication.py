from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication without CSRF validation for API endpoints.
    This allows the API to work with session cookies without requiring CSRF tokens.
    """
    def enforce_csrf(self, request):
        # Skip CSRF check for API requests
        return
