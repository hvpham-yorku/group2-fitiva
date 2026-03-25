from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    US 4.1 – Earn Points for Workout Completion.
    Creates the UserPoints and PointTransaction tables only.
    UserBadge (US 4.2) lives in migration 0018.
    """

    dependencies = [
        ('api', '0016_userschedule_adjustment_lock_fields'),
    ]

    operations = [
        # US 4.1 – one row per user, running total of points
        migrations.CreateModel(
            name='UserPoints',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_points', models.IntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='points',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'user_points'},
        ),

        # US 4.1 – one row per completed workout session (duplicate guard)
        migrations.CreateModel(
            name='PointTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('points_awarded', models.IntegerField(default=0)),
                ('reason', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='point_transactions',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('session', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='point_transaction',
                    to='api.workoutsession',
                )),
            ],
            options={'db_table': 'point_transactions'},
        ),
    ]
