# Merge migration: resolves conflict between
#   0003_remove_userschedule_is_locked_and_more  (schedule lock refactor)
#   0020_challenge_trainer_program_us45           (trainer challenges refactor)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_remove_userschedule_is_locked_and_more'),
        ('api', '0020_challenge_trainer_program_us45'),
    ]

    operations = [
    ]