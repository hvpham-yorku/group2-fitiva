# Fitiva

Fitiva is a web app for personalized workout planning (users + trainers).

## Tech Stack
- Frontend: Next.js 16 (React 19, Tailwind CSS v4)
- Backend: Django 4.2 + Django REST Framework
- Database: MySQL 8
- Dev Environment: Docker + Docker Compose

## Requirements
- Docker Desktop (Mac/Windows)
- Git

## Quick Start (recommended)
```bash
docker compose up --build

## URLs to use

Frontend: http://localhost:3000
Backend: http://localhost:8000
Django Admin: http://localhost:8000/admin

## Useful Commands

# Stop containers
docker compose down

# Stop + delete DB data (reset)
docker compose down -v

# Run Django migrations manually (if needed)
docker compose exec backend python manage.py migrate

# Create admin user
docker compose exec backend python manage.py createsuperuser

## Repo Structure

frontend/ Next.js app
backend/ Django project
docker-compose.yml dev orchestration
log.md progress + decisions (required for ITR1)