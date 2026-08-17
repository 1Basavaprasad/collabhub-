# CollabHub Backend

CollabHub is a production-style real-time collaboration platform. This repository contains the backend service built with FastAPI, PostgreSQL, SQLAlchemy 2.x, Alembic, and Pydantic v2.

---

## 🛠 Tech Stack

- **Python**: 3.12+
- **Framework**: FastAPI
- **Database ORM**: SQLAlchemy 2.x
- **Database Migrations**: Alembic
- **Settings & Validation**: Pydantic v2 & Pydantic Settings
- **ASGI Server**: Uvicorn

---

## 📁 Directory Structure

```text
backend/
├── alembic/              # Alembic database migration scripts
│   ├── versions/         # Migration revision files
│   └── env.py            # Migration runtime configuration
├── app/
│   ├── api/              # API route controllers
│   │   └── routes/
│   ├── core/             # Core configuration & database connection
│   │   ├── config.py
│   │   └── database.py
│   ├── models/           # SQLAlchemy database models
│   ├── repositories/     # Data access layer
│   ├── schemas/          # Pydantic validation schemas
│   ├── services/         # Business logic layer
│   ├── __init__.py
│   └── main.py           # FastAPI entry point & health check
├── tests/                # Automated tests
├── alembic.ini           # Alembic CLI configuration
├── .env.example          # Template for environment variables
├── .gitignore            # Git ignore rules
├── requirements.txt      # Project dependencies
└── README.md             # Setup and usage guide
```

---

## 🚀 Getting Started

### 1. Prerequisites

- Python 3.12 or higher
- PostgreSQL (for database persistence)

### 2. Create and Activate Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the template environment file:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Linux / macOS:**
```bash
cp .env.example .env
```

Update `.env` with your PostgreSQL database credentials:
```env
PROJECT_NAME=CollabHub
ENVIRONMENT=development
API_V1_STR=/api/v1

POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=collabhub
```

---

## 🏃 Running the Application

Start the development server with hot-reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Endpoints

- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Interactive OpenAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative Documentation (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Health Check Response

`GET /health` returns:
```json
{
  "status": "healthy",
  "service": "collabhub-api"
}
```

---

## 🗄 Database Migrations (Alembic)

To run existing migrations:
```bash
alembic upgrade head
```

To create a new migration after updating models:
```bash
alembic revision --autogenerate -m "Describe migration"
```
