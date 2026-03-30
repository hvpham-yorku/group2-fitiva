# User Story 1.1 - Register & Log In with Email
# As a new user/Trainer, I want to create an account using my email and password
# so that I can securely save my profile, workout plans, and progress.
# As a returning user, I want to log in so that I can access my existing plans
# and workout history.

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from api.models import CustomUser, UserProfile


# --- UNIT TESTS ---

class US11_UserRegistrationTests(TestCase):
    """US 1.1 – New user registers with email and password."""

    def setUp(self):
        self.client = APIClient()
        self.signup_url = reverse('signup')

    def test_regular_user_registers_successfully(self):
        """A new regular user can create an account with valid data."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
            'is_trainer': False,
        }
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(email='newuser@example.com').exists())

    def test_trainer_registers_successfully(self):
        """A new trainer account can be created with trainer-specific fields."""
        data = {
            'username': 'traineruser',
            'email': 'trainer@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'Trainer',
            'last_name': 'User',
            'is_trainer': True,
            'trainer_data': {
                'bio': 'Certified fitness trainer',
                'years_of_experience': 4,
                'specialty_strength': True,
                'specialty_cardio': False,
                'specialty_flexibility': False,
                'specialty_sports': False,
                'specialty_rehabilitation': False,
                'certifications': 'ACE',
            },
        }
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_trainer'])

    def test_duplicate_email_is_rejected(self):
        """Registration fails when the email is already taken."""
        CustomUser.objects.create_user(
            username='existing', email='taken@example.com', password='Pass123!'
        )
        data = {
            'username': 'anotheruser',
            'email': 'taken@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'Another',
            'last_name': 'User',
        }
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mismatched_passwords_rejected(self):
        """Registration fails when the two password fields do not match."""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password2': 'DifferentPass123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_is_rejected(self):
        """Registration fails when the password does not meet strength requirements."""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'weak',
            'password2': 'weak',
            'first_name': 'Test',
            'last_name': 'User',
        }
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class US11_UserLoginTests(TestCase):
    """US 1.1 – Returning user logs in to access existing data."""

    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('login')
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User',
        )
        UserProfile.objects.create(user=self.user)

    def test_login_with_email_succeeds(self):
        """Returning user can log in using their email address."""
        response = self.client.post(
            self.login_url, {'login': 'test@example.com', 'password': 'TestPass123!'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['ok'])

    def test_login_with_username_succeeds(self):
        """Returning user can log in using their username."""
        response = self.client.post(
            self.login_url, {'login': 'testuser', 'password': 'TestPass123!'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_wrong_password_is_rejected(self):
        """Login fails when the password is incorrect."""
        response = self.client.post(
            self.login_url, {'login': 'test@example.com', 'password': 'WrongPass123!'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user_is_rejected(self):
        """Login fails for an email that has never been registered."""
        response = self.client.post(
            self.login_url, {'login': 'ghost@example.com', 'password': 'TestPass123!'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_ends_session(self):
        """After logging out the user can no longer access protected endpoints."""
        self.client.post(
            self.login_url, {'login': 'testuser', 'password': 'TestPass123!'}, format='json'
        )
        self.client.post(reverse('logout'))
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('me'))
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

# --- INTEGRATION TESTS ---

class US11_RegisterLoginIntegrationTests(TestCase):
    """US 1.1 Integration - Full register → login → access → logout flow."""

    def setUp(self):
        self.client = APIClient()

    def test_full_register_login_access_logout_flow(self):
        """User registers, logs in, accesses protected endpoint, then logs out."""
        # Step 1: register
        signup = self.client.post(reverse('signup'), {
            'username': 'flowuser', 'email': 'flow@example.com',
            'password': 'SecurePass123!', 'password2': 'SecurePass123!',
            'first_name': 'Flow', 'last_name': 'User', 'is_trainer': False,
        }, format='json')
        self.assertEqual(signup.status_code, status.HTTP_201_CREATED)

        # Step 2: log in
        login = self.client.post(reverse('login'), {
            'login': 'flow@example.com', 'password': 'SecurePass123!',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        # Step 3: access protected endpoint
        me = self.client.get(reverse('me'))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data['user']['email'], 'flow@example.com')

        # Step 4: log out
        logout = self.client.post(reverse('logout'))
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        # Step 5: protected endpoint is now blocked
        self.client.force_authenticate(user=None)
        me_after = self.client.get(reverse('me'))
        self.assertIn(me_after.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
