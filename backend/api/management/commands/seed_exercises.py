from django.core.management.base import BaseCommand
from api.models import ExerciseTemplate

class Command(BaseCommand):
    help = 'Seeds default exercise templates'

    def handle(self, *args, **kwargs):
        default_exercises = [
            # Chest
            {
                'name': 'Push-ups',
                'description': 'Start in a plank position with hands shoulder-width apart. Lower your body until chest nearly touches the floor, then push back up.',
                'muscle_groups': ['chest', 'triceps'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 8-15 reps'
            },
            {
                'name': 'Bench Press',
                'description': 'Lie on bench, lower barbell/dumbbell to chest, press up to starting position.',
                'muscle_groups': ['chest', 'triceps', 'shoulders'],
                'exercise_type': 'reps',
                'default_recommendations': '4 sets of 6-10 reps'
            },
            
            # Back
            {
                'name': 'Pull-ups',
                'description': 'Hang from bar with overhand grip, pull body up until chin is over bar.',
                'muscle_groups': ['back', 'biceps'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 5-12 reps'
            },
            {
                'name': 'Barbell Row',
                'description': 'Bend at hips with barbell, pull weight to lower chest, lower with control.',
                'muscle_groups': ['back', 'biceps'],
                'exercise_type': 'reps',
                'default_recommendations': '4 sets of 8-12 reps'
            },
            
            # Legs
            {
                'name': 'Squats',
                'description': 'Stand with feet shoulder-width apart, lower hips back and down, drive through heels to stand.',
                'muscle_groups': ['quads/hamstrings'],
                'exercise_type': 'reps',
                'default_recommendations': '4 sets of 8-12 reps'
            },
            {
                'name': 'Lunges',
                'description': 'Step forward, lower back knee toward ground, push back to start.',
                'muscle_groups': ['quads/hamstrings'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 10-15 reps per leg'
            },
            
            # Shoulders
            {
                'name': 'Overhead Press',
                'description': 'Press weight from shoulders overhead, lower with control.',
                'muscle_groups': ['shoulders', 'triceps'],
                'exercise_type': 'reps',
                'default_recommendations': '4 sets of 8-12 reps'
            },
            {
                'name': 'Lateral Raises',
                'description': 'Raise dumbbells to sides until arms parallel to floor.',
                'muscle_groups': ['shoulders'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 12-15 reps'
            },
            
            # Arms
            {
                'name': 'Bicep Curls',
                'description': 'Curl weight toward shoulders, keeping elbows stationary.',
                'muscle_groups': ['biceps'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 10-15 reps'
            },
            {
                'name': 'Tricep Dips',
                'description': 'Lower body by bending elbows, push back up.',
                'muscle_groups': ['triceps'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 8-12 reps'
            },
            
            # Core
            {
                'name': 'Plank',
                'description': 'Hold body in straight line from head to heels, engaging core.',
                'muscle_groups': ['core'],
                'exercise_type': 'time',
                'default_recommendations': '3 sets of 30-60 seconds'
            },
            {
                'name': 'Crunches',
                'description': 'Lie on back, lift shoulders off ground using abs.',
                'muscle_groups': ['core'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 15-25 reps'
            },
            
            # Cardio
            {
                'name': 'Running',
                'description': 'Maintain steady pace with proper form.',
                'muscle_groups': ['quads/hamstrings', 'full body'],
                'exercise_type': 'time',
                'default_recommendations': '20-30 minutes'
            },
            {
                'name': 'Jumping Jacks',
                'description': 'Jump while spreading legs and raising arms overhead.',
                'muscle_groups': ['full body'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 20-30 reps'
            },
            {
                'name': 'Burpees',
                'description': 'Drop to plank, do push-up, jump feet to hands, jump up.',
                'muscle_groups': ['full body'],
                'exercise_type': 'reps',
                'default_recommendations': '3 sets of 10-15 reps'
            },
        ]
        
        created_count = 0
        for exercise_data in default_exercises:
            _, created = ExerciseTemplate.objects.get_or_create(
                name=exercise_data['name'],
                is_default=True,
                defaults={
                    **exercise_data,
                    'is_default': True,
                    'trainer': None
                }
            )
            if created:
                created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully seeded {created_count} default exercises')
        )
