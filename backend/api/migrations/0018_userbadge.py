from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    US 4.2 – Unlock Achievement Badges.
    Creates the UserBadge table only.
    Points tables (US 4.1) live in migration 0017.
    """

    dependencies = [
        ('api', '0017_userpoints_pointtransaction_userbadge'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserBadge',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name='ID',
                )),
                ('badge_id', models.CharField(max_length=50)),
                ('earned_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='badges',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'user_badges',
                'unique_together': {('user', 'badge_id')},
            },
        ),
    ]
