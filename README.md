# Fitiva - Workout Training Planner

**Course**: EECS 2311 Z Winter 2026 | **Team**: Group 2

Fitiva is a web application for personalized workout planning, serving both fitness enthusiasts and trainers.

## Team

---

## Features

✅ User & trainer authentication  
✅ Personalized fitness profiles  
✅ Workout program creation & management  
✅ Exercise template library  
✅ Smart workout recommendations  
✅ Multi-program scheduling  
✅ Session tracking  
✅ Light/dark theme support  

---

## Tech Stack

- **Frontend**: Next.js 16.1.6, React 19.2.3, TypeScript
- **Backend**: Django 4.2.8, Django REST Framework
- **Database**: MySQL 8.0
- **DevOps**: Docker Compose

---

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git

### 1. Clone & Setup

```bash
git clone https://github.com/hvpham-yorku/project-group-2-fitiva.git
cd project-group-2-fitiva
git checkout ITR1
```

### 2. Start Application

```bash 
docker-compose up --build
```

Wait for all services to start (~1-2 minutes)

### 3. Initialize Database

Open a new terminal:

```bash
docker-compose exec backend python manage.py migrate
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/ (optional)

---

## Testing

Run all 40 unit tests:

```bash
docker-compose exec backend python manage.py test api
```

Or run it with more detailed output:

```bash
docker-compose exec backend python manage.py test api --verbosity=2
```

---

## Documentation

📖 **[Visit the Wiki](https://github.com/hvpham-yorku/project-group-2-fitiva/wiki)** for complete documentation:

- [Setup & Installation](https://github.com/hvpham-yorku/project-group-2-fitiva/wiki/Setup) - Detailed deployment guide
- [Architecture](https://github.com/hvpham-yorku/project-group-2-fitiva/wiki/Architecture) - System design
- [Codebase Structure](https://github.com/hvpham-yorku/project-group-2-fitiva/wiki/Codebase-Structure) - File organization & API endpoints
- [Testing](https://github.com/hvpham-yorku/project-group-2-fitiva/wiki/Testing) - Test suite documentation

---

## Useful Commands

### Stop Application

```bash
# Stop containers (preserves data)
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

### Database Management

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create admin user
docker-compose exec backend python manage.py createsuperuser

# Access database shell
docker-compose exec db mysql -u fitivauser -pfitiva123 fitiva_db
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Repository Structure

```
project-group-2-fitiva/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Pages & routes
│   │   ├── components/   # React components
│   │   ├── contexts/     # Auth & theme contexts
│   │   └── library/      # API client
│   └── package.json
├── backend/               # Django application
│   ├── api/
│   │   ├── models.py     # Database models
│   │   ├── views.py      # API endpoints
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── tests/        # 40 unit tests
│   ├── manage.py
│   └── requirements.txt
├── docker-compose.yml     # Container orchestration
├── log.md                 # Development log (ITR1 requirement)
└── README.md
```

---

## Development Workflow

### Making Changes

**Frontend**: Edit files in `frontend/src/` - changes auto-reload  
**Backend**: Edit files in `backend/api/` - Django auto-reloads  

### After Any Changes to the Models

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using ports and then remove them manually
lsof -i :3000
lsof -i :8000
lsof -i :3307

# Or change ports in docker-compose.yml to any available ports and then try that way
```

### Database Issues

```bash
# Reset everything
docker-compose down -v
docker-compose up --build
docker-compose exec backend python manage.py migrate
```

### View Service Status

```bash
docker-compose ps
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/hvpham-yorku/project-group-2-fitiva/issues)
- **Wiki**: [Complete Documentation](https://github.com/hvpham-yorku/project-group-2-fitiva/wiki)
