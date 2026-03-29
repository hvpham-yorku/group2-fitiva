# Fitiva — TA Setup Guide


## Prerequisites

Make sure the following are installed on your machine before starting:
- Git (https://git-scm.com)
- Docker Desktop (https://www.docker.com/products/docker-desktop)
  - This includes both Docker and Docker Compose
  - Make sure Docker Desktop is running before proceeding

---

## Step 1: Clone the Repository

> If you downloaded the ZIP from the GitHub tag, skip this step.
> Just unzip the folder and open a terminal inside it.

1. Go to the project's GitHub page
2. Click the green "Code" button
3. Copy the HTTPS URL
4. Open a terminal and run:

```bash
git clone <paste-url-here>
cd project-group-2-fitiva
```

---

## Step 2: Navigate to the Backend Folder

```bash
cd backend
```

---

## Step 3: Environment Configuration

No setup required. All environment variables are pre-configured
in `docker-compose.yml` inside the `backend/` folder, including:
- MySQL database credentials
- Django debug settings
- Frontend API URL (http://localhost:8000)

The database is also automatically migrated and seeded with
exercise data on container startup via the docker-compose command.

Simply proceed to Step 4.

---

## Step 4: Build and Start the Containers

Run the following command from inside the `backend/` folder
(this is where `docker-compose.yml` lives for this project):

```bash
docker compose up --build -d
```

This will:
- Build the Django backend container
- Build the MySQL database container
- Build the Next.js frontend container
- Start all services in the background

Wait about 30–60 seconds for all containers to fully start.

To confirm all containers are running:

```bash
docker compose ps
```

You should see three services with status "Up":
- backend
- db
- frontend

---

## Step 5 & 6: Migrations & Seed Data

Everything runs automatically on container startup:
- Database migrations
- Exercise seed data
- Default user/trainer accounts

**IMPORTANT:** Run the command pasted below in the terminal while on the root of the project:
```bash
docker exec -it fitiva-backend python manage.py shell -c "from api.models import CustomUser; accounts = ['User_TA', 'Trainer_TA', 'admin', 'trainer_TA2']; [ (u.set_password('TestingTA123!'), u.save()) for u in CustomUser.objects.filter(username__in=accounts) ]; print('All test passwords updated successfully!')"
```
After that, proceed to Step 7 to access the application.

---

## Step 7: Default Login Credentials

After the docker automatically loads seed data and you run the command given above, you can log in with these accounts:

Regular User:
```
Username: User_TA
Password: TestingTA123!
```

Trainer Account 1:
```
Username: Trainer_TA
Password: TestingTA123!
```

Trainer Account 2:
```
Username: trainer_TA2
Password: TestingTA123!
```

Admin Panel (if needed, localhost:8000/admin):
```
Username: admin
Password: TestingTA123!
```

---

## Step 8: Access the Application

Frontend (main app):
```
http://localhost:3000
```

Backend API:
```
http://localhost:8000/api/
```

Django Admin Panel:
```
http://localhost:8000/admin/
```

---

## Step 9: Running the Tests

### What is the difference between unit and integration tests?

Unit tests (`tests/unit/`) test one piece of logic in isolation.
They do not depend on the real MySQL database — Django creates a
temporary test database automatically for each run and destroys it
afterwards. These tests verify things like:
- API returns 403 when a user is not authenticated
- Signup rejects invalid email formats
- Pain day calculation returns the correct day name
- Schedule generator produces the right number of workout days

Integration tests (`tests/integration/`) test that multiple real
components work together end-to-end using the actual MySQL database.
They verify things like:
- `WorkoutPlan.objects.create()` actually writes to MySQL
- `Repository.get_all_users()` correctly reads back from MySQL
- Soft-deleting a plan persists `is_deleted=True` in the real DB

In short: unit tests check that the logic is correct,
integration tests check that the database actually works
with that logic.

---

### Run ALL tests (unit + integration):

```bash
docker compose exec backend python manage.py test tests
```

### Run ONLY unit tests:

```bash
docker compose exec backend python manage.py test tests.unit
```

### Run ONLY integration tests:

```bash
docker compose exec backend python manage.py test tests.integration
```

### Run a specific test file:

```bash
docker compose exec backend python manage.py test tests.unit.test_authentication
docker compose exec backend python manage.py test tests.unit.test_profiles
docker compose exec backend python manage.py test tests.integration.test_db
```

### Run with verbose output:

```bash
docker compose exec backend python manage.py test tests --verbosity=2
```

Expected result: 153 tests, all passing (OK)

> **Note:** Lines like `Forbidden: /api/auth/me/` and `Bad Request: /api/...`
> that appear during the test run are **NORMAL**. These are intentional
> error-case tests verifying that the API correctly rejects invalid
> requests. They are not failures. Only the final line matters — it
> should say **OK**.

---

## Step 10: Verify Dependency Injection (Stub vs Real DB)

The database source is controlled by a single line in:

```
backend/repository/__init__.py
```

Current (real DB — default):
```python
from .db_repository import DBRepository as Repository
```

To switch to stub (one line change):
```python
from .stub_repository import StubRepository as Repository
```

This single change automatically propagates everywhere because
`api/views.py` simply imports whatever `Repository` is set to:

```python
from repository import Repository; db = Repository()
```

So swapping the one line in `repository/__init__.py` is all that
is needed to switch the entire application between the real
database and the stub — no other files need to be touched.

### Switching to Stub

1. In `backend/repository/__init__.py`, comment out the DB line and uncomment the stub line:
```python
# from .db_repository import DBRepository as Repository
from .stub_repository import StubRepository as Repository
```

2. Clear cache and rebuild:
```bash
find . -type d -name __pycache__ -exec rm -rf {} +
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Switching Back to Real DB

1. Revert the line in `backend/repository/__init__.py`:
```python
from .db_repository import DBRepository as Repository
# from .stub_repository import StubRepository as Repository
```

2. Clear cache and rebuild:
```bash
find . -type d -name __pycache__ -exec rm -rf {} +
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Verify Which Repository is Active

```bash
docker compose exec backend python manage.py shell -c "
from repository import Repository
print(Repository.__name__)
"
```

- Should print `StubRepository` or `DBRepository` depending on your current setting.

### Verify Both Implementations Share the Same Interface

```bash
docker compose exec backend python manage.py shell -c "
from repository.db_repository import DBRepository
from repository.stub_repository import StubRepository
db_methods = {m for m in dir(DBRepository) if not m.startswith('_')}
stub_methods = {m for m in dir(StubRepository) if not m.startswith('_')}
missing = db_methods - stub_methods
print('Missing from stub:', missing if missing else 'None — fully compliant!')
"
```

Expected output:
```
Missing from stub: None — fully compliant!
```

---

## Test Structure

backend/
└── tests/
├── init.py
├── unit/
│ ├── init.py
│ ├── test_authentication.py
│ ├── test_profiles.py
│ ├── test_exercise_templates.py
│ ├── test_recommendations.py
│ ├── test_schedules.py
│ ├── test_workout_sessions.py
│ ├── test_workoutcompletion.py
│ ├── test_workout_history.py
│ ├── test_summary_dashboard.py
│ ├── test_training_trends.py
│ ├── test_challenges.py
│ └── test_rewards.py
└── integration/
├── init.py
└── test_db.py

---

## Shutting Down

To stop all containers:

```bash
docker compose down
```

To stop and remove all data (full reset):

```bash
docker compose down -v
```

---

## Troubleshooting

### Containers won't start:
Make sure Docker Desktop is running, then try:
```bash
docker compose down
docker compose up --build -d
```

### Database connection errors:
Wait an extra 30 seconds for MySQL to finish initializing, then retry.

### Migrations fail:
```bash
docker compose exec backend python manage.py migrate --run-syncdb
```

### Port already in use:
Make sure nothing else is running on ports 3000, 8000, or 3306.
You can check with:
```bash
lsof -i :3000
lsof -i :8000
lsof -i :3306
```

### Tests can't find modules:
Make sure you are running test commands from inside the `backend/` folder,
not from the project root.
