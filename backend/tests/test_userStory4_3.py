from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import UserBadge, Challenge

User = get_user_model()

class AchievementGalleryTests(APITestCase):
    """Test suite for US 4.3 - View Achievement Gallery"""

    def setUp(self):
        self.user = User.objects.create_user(username="gallery_tester", password="Testpass123!", email="gallery@fitiva.com")
        self.client.login(username="gallery_tester", password="Testpass123!")

    # --- UNIT & INTEGRATION TESTS ---

    def test_get_badges_gallery_structure(self):
        """Main Scenario: The endpoint returns all system badges, correctly marking earned status"""
        # Grant the user exactly one badge
        badge, _ = UserBadge.objects.get_or_create(user=self.user, badge_id="ten_workouts")

        response = self.client.get("/api/rewards/badges/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_earned"], 1)
        
        badges = response.data["badges"]
        self.assertGreater(len(badges), 5) # Ensure it loads the full dictionary of possible badges
        
        # Find the specific earned badge
        earned_badge = next((b for b in badges if b["badge_id"] == "ten_workouts"), None)
        self.assertIsNotNone(earned_badge)
        self.assertTrue(earned_badge["earned"])
        self.assertEqual(earned_badge["earned_at"], badge.earned_at.isoformat())
        
        # Find an unearned badge
        unearned_badge = next((b for b in badges if b["badge_id"] == "fifty_workouts"), None)
        self.assertFalse(unearned_badge["earned"])
        self.assertIsNone(unearned_badge["earned_at"])

    def test_challenge_badges_dynamically_appended(self):
        """Integration: Badges created by Trainers via Challenges are correctly appended to the gallery list"""
        # A trainer creates a challenge with a custom badge reward
        Challenge.objects.create(
            name="Spring Shred", 
            description="Get shredded", 
            reward_points=100, 
            reward_badge="spring_shred_2026", 
            is_active=True,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=7)
        )

        response = self.client.get("/api/rewards/badges/")
        
        # Ensure the custom challenge badge appears in the gallery payload
        badges = response.data["badges"]
        challenge_badge = next((b for b in badges if b["badge_id"] == "spring_shred_2026"), None)
        
        self.assertIsNotNone(challenge_badge)
        self.assertEqual(challenge_badge["category"], "challenge")
        self.assertEqual(challenge_badge["description"], "Completed Challenge: Spring Shred")
        self.assertFalse(challenge_badge["earned"])