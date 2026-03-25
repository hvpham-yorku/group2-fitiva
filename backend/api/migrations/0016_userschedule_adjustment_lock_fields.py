from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_userschedule_is_locked'),
    ]

    operations = [
        migrations.AddField(
            model_name='userschedule',
            name='adjustment_lock_note',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Optional note saved when the user locks the current plan for the next cycle.',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='userschedule',
            name='adjustments_locked_until',
            field=models.DateField(
                blank=True,
                help_text='If set, AI adjustment suggestions are blocked until the end of this date.',
                null=True,
            ),
        ),
    ]
