class BaseRepository:


    # ── Auth / Users ──────────────────────────────────────────────────────

    def get_user_by_id(self, user_id):
        raise NotImplementedError

    def get_user_by_username(self, username):
        raise NotImplementedError

    def get_user_by_email(self, email):
        raise NotImplementedError

    def get_all_users(self):
        raise NotImplementedError

    def serialize_user(self, user):
        raise NotImplementedError


    # ── Profiles ──────────────────────────────────────────────────────────

    def update_trainer_profile(self, user_id, data):
        raise NotImplementedError

    def update_user_profile(self, user_id, data):
        raise NotImplementedError

    def get_user_profile(self, user_id):
        raise NotImplementedError

    def get_trainer_profile(self, user_id):
        raise NotImplementedError

    def get_public_profile(self, user_id, requesting_user_id=None):
        raise NotImplementedError


    # ── Programs ──────────────────────────────────────────────────────────

    def get_all_programs(self, include_deleted=False):
        raise NotImplementedError

    def get_program_by_id(self, program_id, include_deleted=False):
        raise NotImplementedError

    def get_programs_by_trainer(self, trainer_user_id, include_deleted=False):
        raise NotImplementedError

    def get_recommendations(self, user_id):
        raise NotImplementedError


    # ── Exercise Templates ─────────────────────────────────────────────────

    def get_exercise_templates(self, trainer_user_id, search=None):
        raise NotImplementedError

    def get_exercise_template_by_id(self, template_id):
        raise NotImplementedError


    # ── Sections / Exercises ──────────────────────────────────────────────

    def get_sections_for_program(self, program_id):
        raise NotImplementedError

    def get_exercises_for_section(self, section_id):
        raise NotImplementedError


    # ── Schedule ──────────────────────────────────────────────────────────

    def get_active_schedule(self, user_id):
        raise NotImplementedError

    def check_program_in_schedule(self, user_id, program_id):
        raise NotImplementedError


    # ── Workout History & Feedback ────────────────────────────────────────

    def get_workout_history(self, user_id, start=None, end=None):
        raise NotImplementedError

    def get_workout_feedback(self, user_id, date_str):
        raise NotImplementedError
