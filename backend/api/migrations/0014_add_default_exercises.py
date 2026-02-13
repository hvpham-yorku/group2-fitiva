from django.db import migrations

def create_default_exercises(apps, schema_editor):
    ExerciseTemplate = apps.get_model('api', 'ExerciseTemplate')
    
    default_exercises = [
        {
            'name': 'Push-ups',
            'description': 'Classic bodyweight chest exercise. Keep core tight and lower chest to ground.',
            'muscle_groups': ['chest', 'triceps', 'shoulders'],
            'exercise_type': 'reps',
            'default_recommendations': '3-4 sets of 8-15 reps',
            'is_default': True
        },
        {
            'name': 'Squats',
            'description': 'Fundamental lower body exercise. Keep chest up, weight on heels.',
            'muscle_groups': ['quads/hamstrings', 'core'],
            'exercise_type': 'reps',
            'default_recommendations': '3-4 sets of 10-15 reps',
            'is_default': True
        },
        {
            'name': 'Plank',
            'description': 'Core stability exercise. Keep body in straight line.',
            'muscle_groups': ['core'],
            'exercise_type': 'time',
            'default_recommendations': '3 sets of 30-60 seconds',
            'is_default': True
        },
        {
            'name': 'Pull-ups',
            'description': 'Upper body pulling exercise. Full range of motion.',
            'muscle_groups': ['back', 'biceps'],
            'exercise_type': 'reps',
            'default_recommendations': '3-4 sets of 5-12 reps',
            'is_default': True
        },
        {
            'name': 'Lunges',
            'description': 'Single-leg lower body exercise. Step forward, lower back knee.',
            'muscle_groups': ['quads/hamstrings', 'core'],
            'exercise_type': 'reps',
            'default_recommendations': '3 sets of 10-12 reps per leg',
            'is_default': True
        },
        {
            'name': 'Dumbbell Rows',
            'description': 'Back exercise. Pull weight to hip, squeeze shoulder blade.',
            'muscle_groups': ['back', 'biceps'],
            'exercise_type': 'reps',
            'default_recommendations': '3-4 sets of 8-12 reps',
            'is_default': True
        },
        {
            'name': 'Shoulder Press',
            'description': 'Press weights overhead. Keep core engaged.',
            'muscle_groups': ['shoulders', 'triceps'],
            'exercise_type': 'reps',
            'default_recommendations': '3-4 sets of 8-12 reps',
            'is_default': True
        },
        {
            'name': 'Deadlifts',
            'description': 'Full body compound lift. Hinge at hips, keep back straight.',
            'muscle_groups': ['back', 'quads/hamstrings', 'core'],
            'exercise_type': 'reps',
            'default_recommendations': '3-4 sets of 6-10 reps',
            'is_default': True
        },
        {
            'name': 'Bicycle Crunches',
            'description': 'Core rotation exercise. Bring opposite elbow to knee.',
            'muscle_groups': ['core'],
            'exercise_type': 'reps',
            'default_recommendations': '3 sets of 15-20 reps per side',
            'is_default': True
        },
        {
            'name': 'Burpees',
            'description': 'Full body cardio exercise. Jump, plank, push-up, jump up.',
            'muscle_groups': ['full body'],
            'exercise_type': 'reps',
            'default_recommendations': '3 sets of 10-15 reps',
            'is_default': True
        },
        {
            'name': 'Jump Rope',
            'description': 'Cardio exercise. Light on feet, wrists rotate.',
            'muscle_groups': ['full body'],
            'exercise_type': 'time',
            'default_recommendations': '3 sets of 1-2 minutes',
            'is_default': True
        },
        {
            'name': 'Mountain Climbers',
            'description': 'Dynamic core exercise. Plank position, drive knees to chest.',
            'muscle_groups': ['core', 'full body'],
            'exercise_type': 'reps',
            'default_recommendations': '3 sets of 20-30 reps',
            'is_default': True
        },
    ]
    
    for exercise_data in default_exercises:
        ExerciseTemplate.objects.get_or_create(
            name=exercise_data['name'],
            defaults=exercise_data
        )

def remove_default_exercises(apps, schema_editor):
    ExerciseTemplate = apps.get_model('api', 'ExerciseTemplate')
    ExerciseTemplate.objects.filter(is_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0013_workoutsession_status_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_exercises, remove_default_exercises),
    ]
