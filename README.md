# AI Code Review Platform

An AI-powered GitHub code review and security analysis platform mimicking a professional SaaS tool.

## Features

- **GitHub Integration**: Fetch repository files using the public GitHub API.
- **AI Analysis**: Harnesses AI models (Claude/Gemini) to perform static code analysis, security checks, and code quality assessment.
- **Rich Dashboard**: Clean, modern dark mode UI using React, Tailwind V4, Recharts, and Shadcn UI.
- **Issue Breakdown**: Categorized issues with severities, detailed reasons, and code-based auto-fix suggestions.

## Tech Stack
- Frontend: React + Vite, Tailwind CSS, Shadcn UI
- Backend: Express (TypeScript) handles API proxy requests to LLMs (also compatible with FastAPI structure as outlined in `models.py`)
- Database: Provided sample PostgreSQL SQLAlchemy `models.py` for extension.

## Local Setup

### 1. Environment Variables

Create a `.env` file from the example:
```bash
cp .env.example .env
```
Ensure you provide a valid `GEMINI_API_KEY` (or `CLAUDE_API_KEY` if adapting the Python endpoint).

### 2. Node Dependencies & Build

```bash
npm install
npm run build
npm run start
```

### 3. Docker (For FastAPI / Python adaptation)

We have provided a `docker-compose.yml`, `requirements.txt`, and `models.py` demonstrating how to migrate the node-based prototype logic into a standard Python + Postgres stack.

```bash
docker-compose up --build
```
