from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import CustomUser, UserProfile

# TEST CASES GENERATED WITH THE USE OF CLAUDE SONNET 4.5
class UserSignupTests(TestCase):
    """Test suite for user Signup endpoint"""
    
    def setUp(self):
        """Set up test client"""
        self.client = APIClient()
        self.signup_url = reverse('signup')  # Will need to name your URL in urls.py
        
    def test_user_signup_success(self):
        """Test successful user signup with valid data"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'is_trainer': False
        }
        
        response = self.client.post(self.signup_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['username'], 'testuser')
        
        # Verify user was created in database
        self.assertTrue(CustomUser.objects.filter(email='test@example.com').exists())
        
        # Verify UserProfile was automatically created
        user = CustomUser.objects.get(email='test@example.com')
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
    
    def test_duplicate_email_signup_fails(self):
        """Test that signing up with an existing email fails"""
        # Create first user
        CustomUser.objects.create_user(
            username='existing',
            email='duplicate@example.com',
            password='Pass123!'
        )
        
        # Try to signup with same email
        data = {
            'username': 'newuser',
            'email': 'duplicate@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(self.signup_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
        self.assertIn('email', response.data['errors'])
    
    def test_duplicate_username_signup_fails(self):
        """Test that signing up with an existing username fails"""
        # Create first user
        CustomUser.objects.create_user(
            username='takenname',
            email='first@example.com',
            password='Pass123!'
        )
        
        # Try to signup with same username
        data = {
            'username': 'takenname',
            'email': 'second@example.com',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'first_name': 'Second',
            'last_name': 'User'
        }
        
        response = self.client.post(self.signup_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
        self.assertIn('username', response.data['errors'])
    
    def test_weak_password_rejected(self):
        """Test that passwords not meeting requirements are rejected"""
        test_cases = [
            ('short', 'Too short'),  # Less than 8 chars
            ('nouppercase123!', 'No uppercase'),  # No uppercase letter
            ('NoNumbers!', 'No numbers'),  # No numbers
            ('NoSpecial123', 'No special char'),  # No special character
        ]
        
        for weak_password, description in test_cases:
            data = {
                'username': 'testuser',
                'email': 'test@example.com',
                'password': weak_password,
                'password2': weak_password,
                'first_name': 'Test',
                'last_name': 'User'
            }
            
            response = self.client.post(self.signup_url, data, format='json')
            
            self.assertEqual(
                response.status_code, 
                status.HTTP_400_BAD_REQUEST,
                f"Failed on: {description}"
            )
            self.assertIn('errors', response.data)
    
    def test_password_mismatch_rejected(self):
        """Test that mismatched passwords are rejected"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password2': 'DifferentPass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        response = self.client.post(self.signup_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)


class UserLoginTests(TestCase):
    """Test suite for user login endpoint"""
    
    def setUp(self):
        """Set up test client and create a test user"""
        self.client = APIClient()
        self.login_url = reverse('login')  # Will need to name your URL in urls.py
        
        # Create a test user
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User'
        )
        UserProfile.objects.create(user=self.user)
    
    def test_login_with_valid_credentials(self):
        """Test successful login with correct username/email and password"""
        # Test with email
        data = {
            'login': 'test@example.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['ok'])
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'test@example.com')
        
        # Test with username
        data = {
            'login': 'testuser',
            'password': 'TestPass123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['ok'])
    
    def test_login_with_invalid_credentials(self):
        """Test that login fails with incorrect password"""
        data = {
            'login': 'test@example.com',
            'password': 'WrongPassword123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
    
    def test_login_with_nonexistent_user(self):
        """Test that login fails with non-existent user"""
        data = {
            'login': 'nonexistent@example.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_login_with_missing_fields(self):
        """Test that login fails when required fields are missing"""
        # Missing password
        data = {
            'login': 'test@example.com'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserLogoutTests(TestCase):
    """Test suite for user logout endpoint"""
    
    def setUp(self):
        """Set up authenticated client"""
        self.client = APIClient()
        self.logout_url = reverse('logout')  # Will need to name your URL in urls.py
        
        # Create and login a user
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_logout_clears_session(self):
        """Test that logout successfully ends the session"""
        response = self.client.post(self.logout_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['ok'])
        
        # Remove force auth
        self.client.force_authenticate(user=None)

        # Try to access protected endpoint after logout
        me_url = reverse('me')
        response = self.client.get(me_url)
        
        # Should be unauthorized after logout
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_logout_without_authentication(self):
        """Test that logout requires authentication"""
        # Create unauthenticated client
        unauth_client = APIClient()
        
        response = unauth_client.post(self.logout_url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CurrentUserTests(TestCase):
    """Test suite for current user endpoint"""
    
    def setUp(self):
        """Set up authenticated client"""
        self.client = APIClient()
        self.me_url = reverse('me')  # Will need to name your URL in urls.py
        
        # Create and login a user
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User'
        )
        UserProfile.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)
    
    def test_get_current_user_when_authenticated(self):
        """Test retrieving current user info when logged in"""
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['authenticated'])
        self.assertEqual(response.data['user']['email'], 'test@example.com')
        self.assertEqual(response.data['user']['username'], 'testuser')
    
    def test_get_current_user_when_unauthenticated(self):
        """Test that unauthenticated requests are rejected"""
        unauth_client = APIClient()
        
        response = unauth_client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
