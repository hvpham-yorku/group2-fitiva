from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    Exercise,
    ExerciseSet,
    PointTransaction,
    ProgramSection,
    UserBadge,
    UserPoints,
    UserSchedule,
    WorkoutPlan,
    WorkoutSession,
)

User = get_user_model()


# ─────────────────────────────────────────────────────────
# Shared setUp helper used by both test classes
# ─────────────────────────────────────────────────────────

def _build_schedule_for_date(user, section, target_date):
    """
    Create (or replace) an active UserSchedule that places *section*
    on the weekday that matches *target_date*.
    """
    day_name = target_date.strftime("%A").lower()
    UserSchedule.objects.filter(user=user, is_active=True).update(is_active=False)
    weekly = {d: [] for d in
              ["monday", "tuesday", "wednesday", "thursday",
               "friday", "saturday", "sunday"]}
    weekly[day_name] = [section.id]
    sched = UserSchedule.objects.create(
        user=user,
        start_date=target_date,
        weekly_schedule=weekly,
        is_active=True,
    )
    sched.programs.add(section.program)
    return sched


# ─────────────────────────────────────────────────────────────────────────────
# US 4.1 – Earn Points for Workout Completion
# ─────────────────────────────────────────────────────────────────────────────

class UserStory41EarnPointsTests(APITestCase):
    """Test suite for User Story 4.1: Earn Points for Workout Completion (ITR3)"""

    def setUp(self):
        """Set up a regular user, a trainer, a program, and one section with an exercise."""
        self.user = User.objects.create_user(
            username="pointsuser",
            password="TestPass123!",
            email="points@example.com",
            is_trainer=False,
        )
        self.trainer = User.objects.create_user(
            username="ptrainer",
            password="TrainerPass123!",
            email="ptrainer@example.com",
            is_trainer=True,
        )
        self.client.force_authenticate(user=self.user)

        self.program = WorkoutPlan.objects.create(
            name="Points Test Program",
            trainer=self.trainer,
            focus=["strength"],
            difficulty="beginner",
            weekly_frequency=3,
            session_length=45,
            is_deleted=False,
        )
        self.section = ProgramSection.objects.create(
            program=self.program,
            format="Monday",
            type="Chest Day",
            is_rest_day=False,
            order=0,
        )
        ex = Exercise.objects.create(section=self.section, name="Bench Press", order=0)
        ExerciseSet.objects.create(exercise=ex, set_number=1, reps=10, rest=60)

        self.today = date.today()
        self.today_str = self.today.isoformat()
        _build_schedule_for_date(self.user, self.section, self.today)

    # ── Basic points behaviour ────────────────────────────

    def test_points_awarded_on_completion(self):
        """Completing a workout should award at least the 10 base points."""
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("points_awarded", response.data)
        self.assertGreaterEqual(response.data["points_awarded"], 10)

    def test_total_points_included_in_response(self):
        """Response must include a running total_points field."""
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_points", response.data)
        self.assertGreaterEqual(response.data["total_points"], 10)

    def test_userpoints_row_created_in_db(self):
        """A UserPoints row should exist for the user after completing a workout."""
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        self.assertTrue(UserPoints.objects.filter(user=self.user).exists())

    def test_point_transaction_row_created_in_db(self):
        """A PointTransaction row linked to the session should be saved."""
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        session = WorkoutSession.objects.get(user=self.user, date=self.today)
        self.assertTrue(PointTransaction.objects.filter(session=session).exists())

    def test_trainer_account_earns_points_on_completion(self):
        """Trainers use the same completion + points logic as members (profile parity)."""
        self.client.force_authenticate(user=self.trainer)
        _build_schedule_for_date(self.trainer, self.section, self.today)
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["points_awarded"], 10)
        self.assertTrue(UserPoints.objects.filter(user=self.trainer).exists())

    # ── Long-session bonus ────────────────────────────────

    def test_long_session_awards_fifteen_points(self):
        """Session >= 45 min: 10 base + 5 bonus = 15 (no streak on first workout)."""
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 60},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["points_awarded"], 15)

    def test_short_session_awards_only_base_points(self):
        """Session < 45 min: exactly 10 points with no streak."""
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 20},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["points_awarded"], 10)

    # ── Streak bonus ──────────────────────────────────────

    def test_streak_bonus_applied_on_consecutive_day(self):
        """Second consecutive day should earn more than base 10 points."""
        yesterday = (self.today - timedelta(days=1))
        _build_schedule_for_date(self.user, self.section, yesterday)
        self.client.post(
            f"/api/sessions/complete/{yesterday.isoformat()}/",
            {"duration_minutes": 30},
            format="json",
        )
        _build_schedule_for_date(self.user, self.section, self.today)
        response = self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # base 10 + 1-day streak bonus 2 = 12
        self.assertEqual(response.data["points_awarded"], 12)

    # ── Duplicate prevention ──────────────────────────────

    def test_no_duplicate_points_on_second_complete_call(self):
        """Calling complete twice on the same date must not double-count points."""
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        first_total = UserPoints.objects.get(user=self.user).total_points

        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        second_total = UserPoints.objects.get(user=self.user).total_points
        self.assertEqual(first_total, second_total)

    def test_only_one_transaction_per_session(self):
        """Only one PointTransaction should exist per WorkoutSession."""
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        session = WorkoutSession.objects.get(user=self.user, date=self.today)
        count = PointTransaction.objects.filter(session=session).count()
        self.assertEqual(count, 1)

    # ── GET /api/rewards/points/ ──────────────────────────

    def test_get_points_endpoint_returns_200(self):
        """GET /api/rewards/points/ should return 200 with expected keys."""
        response = self.client.get("/api/rewards/points/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_points", response.data)
        self.assertIn("transactions", response.data)

    def test_get_points_starts_at_zero_before_any_workout(self):
        """Before any workout, total_points should be 0."""
        response = self.client.get("/api/rewards/points/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_points"], 0)

    def test_get_points_unauthenticated_is_rejected(self):
        """Unauthenticated request to points endpoint must be rejected."""
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/rewards/points/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_points_accumulate_across_multiple_sessions(self):
        """Completing multiple workouts on different days stacks up points correctly."""
        yesterday = self.today - timedelta(days=1)
        _build_schedule_for_date(self.user, self.section, yesterday)
        self.client.post(
            f"/api/sessions/complete/{yesterday.isoformat()}/",
            {"duration_minutes": 30},
            format="json",
        )
        _build_schedule_for_date(self.user, self.section, self.today)
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        total = UserPoints.objects.get(user=self.user).total_points
        # Day 1: 10 pts, Day 2: 10 + 2 (streak) = 12 → total 22
        self.assertGreaterEqual(total, 20)

    def test_points_transactions_list_grows_after_each_workout(self):
        """Transaction history should contain one entry per completed workout."""
        yesterday = self.today - timedelta(days=1)
        _build_schedule_for_date(self.user, self.section, yesterday)
        self.client.post(
            f"/api/sessions/complete/{yesterday.isoformat()}/",
            {"duration_minutes": 30},
            format="json",
        )
        _build_schedule_for_date(self.user, self.section, self.today)
        self.client.post(
            f"/api/sessions/complete/{self.today_str}/",
            {"duration_minutes": 30},
            format="json",
        )
        response = self.client.get("/api/rewards/points/")
        self.assertEqual(len(response.data["transactions"]), 2)


# ─────────────────────────────────────────────────────────────────────────────
# US 4.2 – Unlock Achievement Badges
# ─────────────────────────────────────────────────────────────────────────────

class UserStory42UnlockBadgesTests(APITestCase):
    """Test suite for User Story 4.2: Unlock Achievement Badges (ITR3)"""

    def setUp(self):
        """Set up a regular user and a simple program they can complete."""
        self.user = User.objects.create_user(
            username="badgeuser",
            password="TestPass123!",
            email="badge@example.com",
            is_trainer=False,
        )
        self.trainer = User.objects.create_user(
            username="btrainer",
            password="TrainerPass123!",
            email="btrainer@example.com",
            is_trainer=True,
        )
        self.client.force_authenticate(user=self.user)

        self.program = WorkoutPlan.objects.create(
            name="Badge Test Program",
            trainer=self.trainer,
            focus=["cardio"],
            difficulty="beginner",
            weekly_frequency=5,
            session_length=40,
            is_deleted=False,
        )
        self.section = ProgramSection.objects.create(
            program=self.program,
            format="Tuesday",
            type="Cardio",
            is_rest_day=False,
            order=0,
        )
        ex = Exercise.objects.create(
            section=self.section, name="Running", order=0
        )
        ExerciseSet.objects.create(
            exercise=ex, set_number=1, reps=None, time=1800, rest=0
        )

    def _complete_on(self, target_date, duration=40):
        """Complete a workout on the given date object, re-building the schedule each time."""
        _build_schedule_for_date(self.user, self.section, target_date)
        return self.client.post(
            f"/api/sessions/complete/{target_date.isoformat()}/",
            {"duration_minutes": duration},
            format="json",
        )

    # ── First-workout badge ───────────────────────────────

    def test_first_workout_badge_returned_in_response(self):
        """Completing the very first workout should return first_workout in newly_unlocked_badges."""
        response = self._complete_on(date.today())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("newly_unlocked_badges", response.data)
        badge_ids = [b["badge_id"] for b in response.data["newly_unlocked_badges"]]
        self.assertIn("first_workout", badge_ids)

    def test_first_workout_badge_saved_to_db(self):
        """The first_workout badge should be persisted in the UserBadge table."""
        self._complete_on(date.today())
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge_id="first_workout").exists()
        )

    def test_badge_response_includes_icon_and_name(self):
        """Newly unlocked badge dicts must include icon and name fields."""
        response = self._complete_on(date.today())
        badges = response.data["newly_unlocked_badges"]
        self.assertGreater(len(badges), 0)
        first = badges[0]
        self.assertIn("icon", first)
        self.assertIn("name", first)
        self.assertIn("earned_at", first)

    # ── Duplicate badge prevention ────────────────────────

    def test_first_workout_badge_not_awarded_twice(self):
        """A second workout must NOT re-award the first_workout badge."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        self._complete_on(yesterday)
        response = self._complete_on(today)
        badge_ids = [b["badge_id"] for b in response.data.get("newly_unlocked_badges", [])]
        self.assertNotIn("first_workout", badge_ids)

    def test_unique_together_prevents_db_duplicates(self):
        """UserBadge.unique_together must keep badge count at 1 even if called twice."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        self._complete_on(yesterday)
        self._complete_on(today)
        count = UserBadge.objects.filter(
            user=self.user, badge_id="first_workout"
        ).count()
        self.assertEqual(count, 1)

    # ── Milestone badges ──────────────────────────────────

    def test_five_workouts_badge_unlocked_at_fifth_completion(self):
        """Completing 5 workouts total should unlock the five_workouts badge."""
        base = date.today() - timedelta(days=10)
        for i in range(5):
            self._complete_on(base + timedelta(days=i))
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge_id="five_workouts").exists()
        )

    def test_four_workouts_does_not_unlock_five_badge(self):
        """four completions must NOT unlock the five_workouts badge."""
        base = date.today() - timedelta(days=10)
        for i in range(4):
            self._complete_on(base + timedelta(days=i))
        self.assertFalse(
            UserBadge.objects.filter(user=self.user, badge_id="five_workouts").exists()
        )

    # ── Streak badges ─────────────────────────────────────

    def test_streak_3_badge_awarded_after_three_consecutive_days(self):
        """Three consecutive workout days should unlock the streak_3 badge."""
        base = date.today() - timedelta(days=2)
        for i in range(3):
            self._complete_on(base + timedelta(days=i))
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge_id="streak_3").exists()
        )

    def test_no_streak_3_badge_for_non_consecutive_days(self):
        """A gap in consecutive days must NOT trigger the streak_3 badge."""
        today = date.today()
        two_days_ago = today - timedelta(days=2)
        # complete day 0 and day 2 – day 1 is skipped
        self._complete_on(two_days_ago)
        self._complete_on(today)
        self.assertFalse(
            UserBadge.objects.filter(user=self.user, badge_id="streak_3").exists()
        )

    def test_streak_7_badge_awarded_after_seven_consecutive_days(self):
        """Seven consecutive workout days should unlock the streak_7 badge."""
        base = date.today() - timedelta(days=6)
        for i in range(7):
            self._complete_on(base + timedelta(days=i))
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge_id="streak_7").exists()
        )

    # ── GET /api/rewards/badges/ ──────────────────────────

    def test_get_badges_endpoint_returns_200(self):
        """GET /api/rewards/badges/ should return 200 with badges list."""
        response = self.client.get("/api/rewards/badges/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("badges", response.data)
        self.assertIn("total_earned", response.data)
        self.assertGreater(len(response.data["badges"]), 0)

    def test_earned_badge_has_correct_flags(self):
        """An earned badge should appear with earned=True and a non-null earned_at."""
        self._complete_on(date.today())
        response = self.client.get("/api/rewards/badges/")
        earned = [b for b in response.data["badges"] if b["badge_id"] == "first_workout"]
        self.assertEqual(len(earned), 1)
        self.assertTrue(earned[0]["earned"])
        self.assertIsNotNone(earned[0]["earned_at"])

    def test_unearned_badge_has_earned_false(self):
        """Badges not yet earned should appear with earned=False and null earned_at."""
        response = self.client.get("/api/rewards/badges/")
        iron_will = [b for b in response.data["badges"] if b["badge_id"] == "fifty_workouts"]
        self.assertEqual(len(iron_will), 1)
        self.assertFalse(iron_will[0]["earned"])
        self.assertIsNone(iron_will[0]["earned_at"])

    def test_total_earned_increments_after_badge_unlock(self):
        """total_earned in the badges response should increase after completing first workout."""
        before = self.client.get("/api/rewards/badges/").data["total_earned"]
        self._complete_on(date.today())
        after = self.client.get("/api/rewards/badges/").data["total_earned"]
        self.assertGreater(after, before)

    def test_get_badges_unauthenticated_is_rejected(self):
        """Unauthenticated requests to badges endpoint must be rejected."""
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/rewards/badges/")
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_complete_response_always_has_newly_unlocked_badges_key(self):
        """The complete response must always include the newly_unlocked_badges list."""
        response = self._complete_on(date.today())
        self.assertIn("newly_unlocked_badges", response.data)
        self.assertIsInstance(response.data["newly_unlocked_badges"], list)

    def test_no_badges_for_trainer_user(self):
        """Trainer completing a workout should also receive badge checks."""
        # Trainers can also earn badges – this just checks the endpoint works for them
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get("/api/rewards/badges/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_earned"], 0)
