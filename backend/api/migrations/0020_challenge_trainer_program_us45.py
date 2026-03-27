# Generated manually for US 4.5 — trainer-hosted challenges

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_merge_0003_challenge_userchallenge_0018_userbadge'),
    ]

    operations = [
        migrations.AddField(
            model_name='challenge',
            name='program',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional link to the program this challenge promotes.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='challenges',
                to='api.workoutplan',
            ),
        ),
        migrations.AddField(
            model_name='challenge',
            name='trainer',
            field=models.ForeignKey(
                blank=True,
                help_text='Null = global challenge; set for trainer-hosted challenges.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='hosted_challenges',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
