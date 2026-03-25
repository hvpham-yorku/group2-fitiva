import os
from django.core.management.base import BaseCommand
from api.models import CustomUser

class Command(BaseCommand):
    help = 'Seeds TA test data and validates passwords'

    def handle(self, *args, **options):
        # 1. Check if User_TA exists
        if not CustomUser.objects.filter(username='User_TA').exists():
            self.stdout.write('Seeding database from seed_data.json...')
            os.system('python manage.py loaddata seed_data.json')
        
        # 2. Reset passwords for test accounts
        ta_accounts = ['User_TA', 'Trainer_TA', 'admin', 'trainer_TA2']
        for username in ta_accounts:
            try:
                user = CustomUser.objects.get(username=username)
                user.set_password('TestingTA123!')
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Validated credentials for: {username}'))
            except CustomUser.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'User {username} not found.'))