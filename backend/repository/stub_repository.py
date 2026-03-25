# Hardcoded stub data derived from seed_data.json
# Used for testing without a live database connection.

from .base import BaseRepository

# ============================================================================
# STUB DATA — mirrors seed_data.json exactly
# ============================================================================

USERS = {
    1: {
        "id": 1,
        "username": "User_TA",
        "first_name": "User",
        "last_name": "TA",
        "email": "user_ta@gmail.com",
        "is_trainer": False,
        "is_staff": False,
        "is_superuser": False,
        "is_active": True,
        "password": "pbkdf2_sha256$600000$AU0usCGeO4nIUUkltandno$TvPE9qy4It2sC9JG1VQ+83N6oXXXQAnG/+NURLc9lGQ=",
    },
    2: {
        "id": 2,
        "username": "Trainer_TA",
        "first_name": "Trainer",
        "last_name": "TA",
        "email": "trainer_ta@gmail.com",
        "is_trainer": True,
        "is_staff": False,
        "is_superuser": False,
        "is_active": True,
        "password": "pbkdf2_sha256$600000$4ycgXDVMvzrPRQEKcyCJze$TTpWOavANVQw5GWABY92YrcSO1cVxs3jJQn3PmicpbQ=",
    },
    3: {
        "id": 3,
        "username": "admin",
        "first_name": "",
        "last_name": "",
        "email": "admin@gmail.com",
        "is_trainer": False,
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
        "password": "pbkdf2_sha256$600000$mrl1Q0WM1GBUaM99qsMTiP$8ksGy64vfU+494hG1fiIZYfnipw1aZT6sTaLRqtVebs=",
    },
    4: {
        "id": 4,
        "username": "trainer_TA2",
        "first_name": "Trainer2",
        "last_name": "TA",
        "email": "trainer_ta2@gmail.com",
        "is_trainer": True,
        "is_staff": False,
        "is_superuser": False,
        "is_active": True,
        "password": "pbkdf2_sha256$600000$xLG2wKhBkIZeAbux0rju8B$V9lsSZlam5LhimVhFtak6Mn9DYOpJGCORSEOFyS0wsU=",
    },
}

USER_PROFILES = {
    1: {
        "id": 1,
        "user": 1,
        "age": None,
        "experience_level": "beginner",
        "training_location": "home",
        "fitness_focus": [],
        "created_at": "2026-03-07T03:20:06.313Z",
        "updated_at": "2026-03-07T03:20:06.313Z",
    },
    2: {
        "id": 2,
        "user": 2,
        "age": None,
        "experience_level": "beginner",
        "training_location": "home",
        "fitness_focus": [],
        "created_at": "2026-03-07T03:21:44.029Z",
        "updated_at": "2026-03-07T03:21:44.029Z",
    },
    5: {
        "id": 5,
        "user": 4,
        "age": None,
        "experience_level": "beginner",
        "training_location": "home",
        "fitness_focus": [],
        "created_at": "2026-03-07T04:01:41.695Z",
        "updated_at": "2026-03-07T04:01:41.695Z",
    },
}

TRAINER_PROFILES = {
    1: {
        "id": 1,
        "user": 2,
        "bio": "I am a trainer TA. I want to help people workout.",
        "years_of_experience": 2,
        "specialty_strength": True,
        "specialty_cardio": False,
        "specialty_flexibility": True,
        "specialty_sports": False,
        "specialty_rehabilitation": False,
        "certifications": "ACE-CPT, ISSA-CPT",
        "created_at": "2026-03-07T03:21:44.030Z",
        "updated_at": "2026-03-07T03:21:44.030Z",
    },
    2: {
        "id": 2,
        "user": 4,
        "bio": "I am trainer ta2, here to help!",
        "years_of_experience": 3,
        "specialty_strength": True,
        "specialty_cardio": True,
        "specialty_flexibility": False,
        "specialty_sports": False,
        "specialty_rehabilitation": True,
        "certifications": "ISSA-CPT, Exercise is Medicine Credential, Cancer Exercise Specialist",
        "created_at": "2026-03-07T04:01:41.697Z",
        "updated_at": "2026-03-07T04:01:41.697Z",
    },
}

WORKOUT_PLANS = {
    1: {
        "id": 1,
        "name": "Default Program 1",
        "description": "Program created with default exercises already in the website.",
        "focus": ["strength"],
        "difficulty": "intermediate",
        "weekly_frequency": 5,
        "session_length": 50,
        "is_published": True,
        "is_deleted": False,
        "trainer": 2,
        "created_at": "2026-03-07T03:31:46.757Z",
        "updated_at": "2026-03-07T03:31:46.757Z",
    },
    2: {
        "id": 2,
        "name": "Custom Program 1",
        "description": "A program created with some custom exercises created by Trainer TA",
        "focus": ["balance", "flexibility"],
        "difficulty": "beginner",
        "weekly_frequency": 6,
        "session_length": 45,
        "is_published": True,
        "is_deleted": False,
        "trainer": 2,
        "created_at": "2026-03-07T03:33:59.834Z",
        "updated_at": "2026-03-07T03:33:59.834Z",
    },
    3: {
        "id": 3,
        "name": "Second TA Program",
        "description": "Default Exercises are used in this program",
        "focus": ["cardio", "flexibility"],
        "difficulty": "advanced",
        "weekly_frequency": 5,
        "session_length": 45,
        "is_published": True,
        "is_deleted": False,
        "trainer": 4,
        "created_at": "2026-03-07T04:02:39.005Z",
        "updated_at": "2026-03-07T04:02:39.005Z",
    },
}

EXERCISE_TEMPLATES = {
    1:  {"id": 1,  "name": "Push-ups",        "description": "Start in a plank position with hands shoulder-width apart. Lower your body until chest nearly touches the floor, then push back up.", "muscle_groups": ["chest", "triceps"],              "exercise_type": "reps", "default_recommendations": "3 sets of 8-15 reps",        "image_url": None, "trainer": None, "is_default": True},
    2:  {"id": 2,  "name": "Bench Press",      "description": "Lie on bench, lower barbell/dumbbell to chest, press up to starting position.",                                                        "muscle_groups": ["chest", "triceps", "shoulders"],  "exercise_type": "reps", "default_recommendations": "4 sets of 6-10 reps",        "image_url": None, "trainer": None, "is_default": True},
    3:  {"id": 3,  "name": "Pull-ups",         "description": "Hang from bar with overhand grip, pull body up until chin is over bar.",                                                               "muscle_groups": ["back", "biceps"],                 "exercise_type": "reps", "default_recommendations": "3 sets of 5-12 reps",        "image_url": None, "trainer": None, "is_default": True},
    4:  {"id": 4,  "name": "Barbell Row",      "description": "Bend at hips with barbell, pull weight to lower chest, lower with control.",                                                           "muscle_groups": ["back", "biceps"],                 "exercise_type": "reps", "default_recommendations": "4 sets of 8-12 reps",        "image_url": None, "trainer": None, "is_default": True},
    5:  {"id": 5,  "name": "Squats",           "description": "Stand with feet shoulder-width apart, lower hips back and down, drive through heels to stand.",                                        "muscle_groups": ["quads/hamstrings"],               "exercise_type": "reps", "default_recommendations": "4 sets of 8-12 reps",        "image_url": None, "trainer": None, "is_default": True},
    6:  {"id": 6,  "name": "Lunges",           "description": "Step forward, lower back knee toward ground, push back to start.",                                                                    "muscle_groups": ["quads/hamstrings"],               "exercise_type": "reps", "default_recommendations": "3 sets of 10-15 reps per leg","image_url": None, "trainer": None, "is_default": True},
    7:  {"id": 7,  "name": "Overhead Press",   "description": "Press weight from shoulders overhead, lower with control.",                                                                            "muscle_groups": ["shoulders", "triceps"],           "exercise_type": "reps", "default_recommendations": "4 sets of 8-12 reps",        "image_url": None, "trainer": None, "is_default": True},
    8:  {"id": 8,  "name": "Lateral Raises",   "description": "Raise dumbbells to sides until arms parallel to floor.",                                                                               "muscle_groups": ["shoulders"],                      "exercise_type": "reps", "default_recommendations": "3 sets of 12-15 reps",       "image_url": None, "trainer": None, "is_default": True},
    9:  {"id": 9,  "name": "Bicep Curls",      "description": "Curl weight toward shoulders, keeping elbows stationary.",                                                                             "muscle_groups": ["biceps"],                         "exercise_type": "reps", "default_recommendations": "3 sets of 10-15 reps",       "image_url": None, "trainer": None, "is_default": True},
    10: {"id": 10, "name": "Tricep Dips",      "description": "Lower body by bending elbows, push back up.",                                                                                          "muscle_groups": ["triceps"],                        "exercise_type": "reps", "default_recommendations": "3 sets of 8-12 reps",        "image_url": None, "trainer": None, "is_default": True},
    11: {"id": 11, "name": "Plank",            "description": "Hold body in straight line from head to heels, engaging core.",                                                                        "muscle_groups": ["core"],                           "exercise_type": "time", "default_recommendations": "3 sets of 30-60 seconds",     "image_url": None, "trainer": None, "is_default": True},
    12: {"id": 12, "name": "Crunches",         "description": "Lie on back, lift shoulders off ground using abs.",                                                                                    "muscle_groups": ["core"],                           "exercise_type": "reps", "default_recommendations": "3 sets of 15-25 reps",       "image_url": None, "trainer": None, "is_default": True},
    13: {"id": 13, "name": "Running",          "description": "Maintain steady pace with proper form.",                                                                                               "muscle_groups": ["quads/hamstrings", "full body"],  "exercise_type": "time", "default_recommendations": "20-30 minutes",               "image_url": None, "trainer": None, "is_default": True},
    14: {"id": 14, "name": "Jumping Jacks",    "description": "Jump while spreading legs and raising arms overhead.",                                                                                 "muscle_groups": ["full body"],                      "exercise_type": "reps", "default_recommendations": "3 sets of 20-30 reps",       "image_url": None, "trainer": None, "is_default": True},
    15: {"id": 15, "name": "Burpees",          "description": "Drop to plank, do push-up, jump feet to hands, jump up.",                                                                              "muscle_groups": ["full body"],                      "exercise_type": "reps", "default_recommendations": "3 sets of 10-15 reps",       "image_url": None, "trainer": None, "is_default": True},
    16: {"id": 16, "name": "Custom Exercise 1","description": "A custom exercise created by Trainer TA",                                                                                              "muscle_groups": ["chest"],                          "exercise_type": "reps", "default_recommendations": "2 sets of 8-10 reps",        "image_url": None, "trainer": 2,    "is_default": False},
    17: {"id": 17, "name": "Custom Exercise 2","description": "A second custom exercise created by Trainer TA",                                                                                       "muscle_groups": ["full body", "core"],              "exercise_type": "time", "default_recommendations": "2 sets of 3 minutes",         "image_url": None, "trainer": 2,    "is_default": False},
}

PROGRAM_SECTIONS = {
    # Program 1 — Default Program 1 (Trainer_TA)
    1:  {"id": 1,  "program": 1, "format": "Monday",    "type": "Upper", "is_rest_day": False, "order": 0},
    2:  {"id": 2,  "program": 1, "format": "Tuesday",   "type": "Lower", "is_rest_day": False, "order": 1},
    3:  {"id": 3,  "program": 1, "format": "Wednesday", "type": "",      "is_rest_day": False, "order": 2},
    4:  {"id": 4,  "program": 1, "format": "Thursday",  "type": "Push",  "is_rest_day": False, "order": 3},
    5:  {"id": 5,  "program": 1, "format": "Friday",    "type": "Pull",  "is_rest_day": False, "order": 4},
    6:  {"id": 6,  "program": 1, "format": "Saturday",  "type": "Legs",  "is_rest_day": False, "order": 5},
    7:  {"id": 7,  "program": 1, "format": "Sunday",    "type": "",      "is_rest_day": False, "order": 6},
    # Program 2 — Custom Program 1 (Trainer_TA)
    8:  {"id": 8,  "program": 2, "format": "Monday",    "type": "", "is_rest_day": False, "order": 0},
    9:  {"id": 9,  "program": 2, "format": "Tuesday",   "type": "", "is_rest_day": False, "order": 1},
    10: {"id": 10, "program": 2, "format": "Wednesday", "type": "", "is_rest_day": False, "order": 2},
    11: {"id": 11, "program": 2, "format": "Thursday",  "type": "", "is_rest_day": False, "order": 3},
    12: {"id": 12, "program": 2, "format": "Friday",    "type": "", "is_rest_day": False, "order": 4},
    13: {"id": 13, "program": 2, "format": "Saturday",  "type": "", "is_rest_day": False, "order": 5},
    14: {"id": 14, "program": 2, "format": "Sunday",    "type": "", "is_rest_day": False, "order": 6},
    # Program 3 — Second TA Program (trainer_TA2)
    15: {"id": 15, "program": 3, "format": "Monday",    "type": "", "is_rest_day": False, "order": 0},
    16: {"id": 16, "program": 3, "format": "Tuesday",   "type": "", "is_rest_day": False, "order": 1},
    17: {"id": 17, "program": 3, "format": "Wednesday", "type": "", "is_rest_day": False, "order": 2},
    18: {"id": 18, "program": 3, "format": "Thursday",  "type": "", "is_rest_day": False, "order": 3},
    19: {"id": 19, "program": 3, "format": "Friday",    "type": "", "is_rest_day": False, "order": 4},
    20: {"id": 20, "program": 3, "format": "Saturday",  "type": "", "is_rest_day": False, "order": 5},
    21: {"id": 21, "program": 3, "format": "Sunday",    "type": "", "is_rest_day": False, "order": 6},
}

EXERCISES = {
    # Section 1 — Program1 Monday (Upper)
    1:  {"id": 1,  "section": 1,  "name": "Burpees",          "order": 0},
    2:  {"id": 2,  "section": 1,  "name": "Plank",            "order": 1},
    3:  {"id": 3,  "section": 1,  "name": "Jumping Jacks",    "order": 2},
    # Section 2 — Program1 Tuesday (Lower)
    4:  {"id": 4,  "section": 2,  "name": "Crunches",         "order": 0},
    5:  {"id": 5,  "section": 2,  "name": "Lunges",           "order": 1},
    6:  {"id": 6,  "section": 2,  "name": "Squats",           "order": 2},
    # Section 4 — Program1 Thursday (Push)
    7:  {"id": 7,  "section": 4,  "name": "Bench Press",      "order": 0},
    8:  {"id": 8,  "section": 4,  "name": "Jumping Jacks",    "order": 1},
    # Section 5 — Program1 Friday (Pull)
    9:  {"id": 9,  "section": 5,  "name": "Pull-ups",         "order": 0},
    10: {"id": 10, "section": 5,  "name": "Bicep Curls",      "order": 1},
    # Section 6 — Program1 Saturday (Legs)
    11: {"id": 11, "section": 6,  "name": "Squats",           "order": 0},
    # Section 8 — Program2 Monday
    12: {"id": 12, "section": 8,  "name": "Custom Exercise 1","order": 0},
    13: {"id": 13, "section": 8,  "name": "Custom Exercise 2","order": 1},
    # Section 9 — Program2 Tuesday
    14: {"id": 14, "section": 9,  "name": "Custom Exercise 1","order": 0},
    # Section 10 — Program2 Wednesday
    15: {"id": 15, "section": 10, "name": "Custom Exercise 2","order": 0},
    # Section 11 — Program2 Thursday
    16: {"id": 16, "section": 11, "name": "Custom Exercise 1","order": 0},
    # Section 12 — Program2 Friday
    17: {"id": 17, "section": 12, "name": "Burpees",          "order": 0},
    # Section 13 — Program2 Saturday
    18: {"id": 18, "section": 13, "name": "Custom Exercise 2","order": 0},
    # Section 15 — Program3 Monday
    19: {"id": 19, "section": 15, "name": "Burpees",          "order": 0},
    # Section 16 — Program3 Tuesday
    20: {"id": 20, "section": 16, "name": "Lunges",           "order": 0},
    # Section 17 — Program3 Wednesday
    21: {"id": 21, "section": 17, "name": "Push-ups",         "order": 0},
    # Section 20 — Program3 Saturday
    22: {"id": 22, "section": 20, "name": "Barbell Row",      "order": 0},
    # Section 21 — Program3 Sunday
    23: {"id": 23, "section": 21, "name": "Running",          "order": 0},
}

# Each tuple: (exercise_id, set_number, reps, time_seconds, rest_seconds)
_EXERCISE_SET_ROWS = [
    # Program 1 exercises
    (1,  1, 10, None, 60), (1,  2, 10, None, 60), (1,  3, 10, None, 60),  # Burpees
    (2,  1, None, 30, 60), (2,  2, None, 30, 60), (2,  3, None, 30, 60),  # Plank (time)
    (3,  1, 10, None, 60), (3,  2, 10, None, 60), (3,  3, 10, None, 60),  # Jumping Jacks
    (4,  1, 10, None, 60), (4,  2, 10, None, 60), (4,  3, 10, None, 60),  # Crunches
    (5,  1, 10, None, 60), (5,  2, 10, None, 60), (5,  3, 10, None, 60),  # Lunges
    (6,  1, 10, None, 60), (6,  2, 10, None, 60), (6,  3, 10, None, 60),  # Squats
    (7,  1, 10, None, 60), (7,  2, 10, None, 60), (7,  3, 10, None, 60),  # Bench Press
    (8,  1, 10, None, 60), (8,  2, 10, None, 60), (8,  3, 10, None, 60),  # Jumping Jacks
    (9,  1, 10, None, 60), (9,  2, 10, None, 60), (9,  3, 10, None, 60),  # Pull-ups
    (10, 1, 10, None, 60), (10, 2, 10, None, 60), (10, 3, 10, None, 60),  # Bicep Curls
    (11, 1, 10, None, 60), (11, 2, 10, None, 60), (11, 3, 10, None, 60),  # Squats
    # Program 2 exercises (Custom Exercise 1 = reps, Custom Exercise 2 = time 3min)
    (12, 1, 8,  None, 60), (12, 2, 8,  None, 60),                         # Custom Exercise 1
    (13, 1, None, 180, 60), (13, 2, None, 180, 60),                        # Custom Exercise 2
    (14, 1, 8,  None, 60), (14, 2, 8,  None, 60),                         # Custom Exercise 1
    (15, 1, None, 180, 60), (15, 2, None, 180, 60),                        # Custom Exercise 2
    (16, 1, 8,  None, 60), (16, 2, 8,  None, 60),                         # Custom Exercise 1
    (17, 1, 10, None, 60), (17, 2, 10, None, 60), (17, 3, 10, None, 60),  # Burpees
    (18, 1, None, 180, 60), (18, 2, None, 180, 60),                        # Custom Exercise 2
    # Program 3 exercises
    (19, 1, 10, None, 60), (19, 2, 10, None, 60), (19, 3, 10, None, 60),  # Burpees
    (20, 1, 10, None, 60), (20, 2, 10, None, 60), (20, 3, 10, None, 60),  # Lunges
    (21, 1, 10, None, 60), (21, 2, 10, None, 60), (21, 3, 10, None, 60),  # Push-ups
    (22, 1, 10, None, 60), (22, 2, 10, None, 60), (22, 3, 10, None, 60),  # Barbell Row
    (23, 1, None, 1200, 60), (23, 2, None, 1200, 60),                      # Running (20 min)
]

EXERCISE_SETS = {
    pk: {
        "id": pk,
        "exercise": ex_id,
        "set_number": set_num,
        "reps": reps,
        "time": time_val,
        "rest": rest,
    }
    for pk, (ex_id, set_num, reps, time_val, rest) in enumerate(_EXERCISE_SET_ROWS, start=1)
}

# No sessions, schedules, or feedback in seed — all start empty
WORKOUT_SESSIONS  = {}
WORKOUT_FEEDBACKS = {}
USER_SCHEDULES    = {}


# ============================================================================
# INTERNAL HELPERS
# ============================================================================

def _profile_by_user(user_id):
    return next((p for p in USER_PROFILES.values() if p["user"] == user_id), None)

def _trainer_profile_by_user(user_id):
    return next((p for p in TRAINER_PROFILES.values() if p["user"] == user_id), None)

def _sets_for_exercise(exercise_id):
    return sorted(
        [s for s in EXERCISE_SETS.values() if s["exercise"] == exercise_id],
        key=lambda s: s["set_number"],
    )

def _exercises_for_section(section_id):
    return sorted(
        [e for e in EXERCISES.values() if e["section"] == section_id],
        key=lambda e: e["order"],
    )

def _sections_for_program(program_id):
    return sorted(
        [s for s in PROGRAM_SECTIONS.values() if s["program"] == program_id],
        key=lambda s: s["order"],
    )

def _serialize_exercise(ex):
    return {**ex, "sets": _sets_for_exercise(ex["id"])}

def _serialize_section(sec):
    return {
        **sec,
        "exercises": [_serialize_exercise(e) for e in _exercises_for_section(sec["id"])],
    }

def _serialize_program(plan):
    trainer = USERS.get(plan["trainer"], {})
    return {
        **plan,
        "trainer_name": f"{trainer.get('first_name', '')} {trainer.get('last_name', '')}".strip(),
        "sections": [_serialize_section(s) for s in _sections_for_program(plan["id"])],
    }

def _serialize_user(user):
    return {k: user[k] for k in ("id", "username", "first_name", "last_name", "email", "is_trainer")}


# ============================================================================
# STUB REPOSITORY
# ============================================================================

class StubRepository(BaseRepository):

    # ── Auth / Users ──────────────────────────────────────────────────────

    def get_user_by_id(self, user_id):
        return USERS.get(user_id)

    def get_user_by_username(self, username):
        return next((u for u in USERS.values() if u["username"] == username), None)

    def get_user_by_email(self, email):
        return next((u for u in USERS.values() if u["email"] == email), None)

    def get_all_users(self):
        return [_serialize_user(u) for u in USERS.values()]

    def serialize_user(self, user):
        return _serialize_user(user)

    # ── Profiles ──────────────────────────────────────────────────────────

    def update_trainer_profile(self, user_id, data):
        profile = _trainer_profile_by_user(user_id)
        if not profile:
            return None
        allowed = [
            "bio", "years_of_experience", "specialty_strength",
            "specialty_cardio", "specialty_flexibility",
            "specialty_sports", "specialty_rehabilitation", "certifications"
        ]
        for key in allowed:
            if key in data:
                profile[key] = data[key]
        return profile

    def update_user_profile(self, user_id, data):
        profile = _profile_by_user(user_id)
        if not profile:
            return None
        allowed = ["age", "experience_level", "training_location", "fitness_focus"]
        for key in allowed:
            if key in data:
                profile[key] = data[key]
        return profile

    def get_user_profile(self, user_id):
        return _profile_by_user(user_id)

    def get_trainer_profile(self, user_id):
        return _trainer_profile_by_user(user_id)

    def get_public_profile(self, user_id, requesting_user_id=None):
        user = USERS.get(user_id)
        if not user:
            return None
        is_owner = requesting_user_id == user_id
        raw_profile = _profile_by_user(user_id)
        user_profile = (
            {k: raw_profile[k] for k in ("age", "experience_level", "training_location", "fitness_focus")}
            if raw_profile else None
        )
        trainer_profile = None
        if user["is_trainer"]:
            tp = _trainer_profile_by_user(user_id)
            if tp:
                trainer_profile = {k: v for k, v in tp.items() if k != "user"}
        return {
            "id": user["id"],
            "username": user["username"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "email": user["email"] if is_owner else None,
            "is_trainer": user["is_trainer"],
            "is_owner": is_owner,
            "user_profile": user_profile,
            "trainer_profile": trainer_profile,
        }
        
        

    # ── Programs ──────────────────────────────────────────────────────────

    def get_all_programs(self, include_deleted=False):
        plans = [p for p in WORKOUT_PLANS.values() if include_deleted or not p["is_deleted"]]
        return [_serialize_program(p) for p in plans]

    def get_program_by_id(self, program_id, include_deleted=False):
        plan = WORKOUT_PLANS.get(program_id)
        if not plan or (not include_deleted and plan["is_deleted"]):
            return None
        return _serialize_program(plan)

    def get_programs_by_trainer(self, trainer_user_id, include_deleted=False):
        plans = [
            p for p in WORKOUT_PLANS.values()
            if p["trainer"] == trainer_user_id and (include_deleted or not p["is_deleted"])
        ]
        serialized = [_serialize_program(p) for p in plans]
        return {"programs": serialized, "total_count": len(serialized)}

    # ── Recommendations ───────────────────────────────────────────────────

    def get_recommendations(self, user_id):
        profile = _profile_by_user(user_id)
        if not profile:
            return {"error": "User profile not found. Please complete your profile setup."}
        user_focuses = profile.get("fitness_focus", [])
        if not user_focuses:
            return {
                "message": "Please set your fitness focuses in your profile to get recommendations",
                "programs": [],
            }
        recommended = [
            _serialize_program(p)
            for p in WORKOUT_PLANS.values()
            if not p["is_deleted"] and set(user_focuses) & set(p.get("focus", []))
        ]
        return {
            "user_focuses": user_focuses,
            "total_recommendations": len(recommended),
            "programs": recommended,
        }

    # ── Exercise Templates ─────────────────────────────────────────────────

    def get_exercise_templates(self, trainer_user_id, search=None):
        templates = [
            t for t in EXERCISE_TEMPLATES.values()
            if t["is_default"] or t["trainer"] == trainer_user_id
        ]
        if search:
            templates = [t for t in templates if search.lower() in t["name"].lower()]
        return {"total": len(templates), "exercises": templates}

    def get_exercise_template_by_id(self, template_id):
        return EXERCISE_TEMPLATES.get(template_id)

    # ── Sections / Exercises ──────────────────────────────────────────────

    def get_sections_for_program(self, program_id):
        return [_serialize_section(s) for s in _sections_for_program(program_id)]

    def get_exercises_for_section(self, section_id):
        return [_serialize_exercise(e) for e in _exercises_for_section(section_id)]

    # ── Schedule ──────────────────────────────────────────────────────────

    def get_active_schedule(self, user_id):
        schedule = next(
            (s for s in USER_SCHEDULES.values() if s["user"] == user_id and s["is_active"]),
            None,
        )
        if not schedule:
            return {"message": "No active schedule found", "schedule": None, "calendar_events": []}
        return schedule

    def check_program_in_schedule(self, user_id, program_id):
        schedule = next(
            (s for s in USER_SCHEDULES.values() if s["user"] == user_id and s["is_active"]),
            None,
        )
        if not schedule:
            return {"in_schedule": False}
        in_schedule = program_id in schedule.get("programs", [])
        return {"in_schedule": in_schedule, "schedule_id": schedule["id"] if in_schedule else None}

    # ── Workout History ───────────────────────────────────────────────────

    def get_workout_history(self, user_id):
        sessions = sorted(
            [s for s in WORKOUT_SESSIONS.values() if s["user"] == user_id and s["status"] == "completed"],
            key=lambda s: s["date"],
            reverse=True,
        )
        return {"total": len(sessions), "sessions": sessions}

    def get_workout_feedback(self, user_id, date_str):
        session = next(
            (s for s in WORKOUT_SESSIONS.values() if s["user"] == user_id and s["date"] == date_str),
            None,
        )
        if not session:
            return None
        return next(
            (f for f in WORKOUT_FEEDBACKS.values() if f["session"] == session["id"]),
            None,
        )