# Live Code Execution Service

Backend service for a live code execution feature in a job simulation platform.

## Table Of Contents

- [Tech Stack](#tech-stack)
- [Technology Choices And Why](#technology-choices-and-why)
- [Architecture Overview](#architecture-overview)
- [API Documentation](#api-documentation)
- [Execution Lifecycle](#execution-lifecycle)
- [Supported Languages](#supported-languages)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Design Decisions and Trade-offs](#design-decisions-and-trade-offs)
- [What I Would Improve Next](#what-i-would-improve-next)
- [Current Gaps](#current-gaps)

The system supports:

- Live code sessions
- Autosave source code
- Asynchronous code execution
- Queue-based worker execution with BullMQ + Redis
- Execution lifecycle tracking
- Docker-based local setup

## Tech Stack

- Node.js + Express
- TypeScript
- PostgreSQL
- Redis + BullMQ
- Prisma ORM
- Docker + Docker Compose

## Technology Choices And Why

- Express: chosen because I have used it before, and it allows fast API development with minimal setup
- TypeScript: adds type safety and keeps service-layer and persistence contracts easier to maintain
- PostgreSQL: provides reliable relational persistence for sessions and execution records
- Prisma ORM: speeds up database access with a simple developer workflow and generated types
- Redis + BullMQ: fits asynchronous execution well with queueing, retries, and backoff support
- Docker Compose: makes the local stack easier to run consistently across API, worker, Redis, and PostgreSQL

## Architecture Overview

High-level flow:

1. Client creates a code session with a programming language.
2. Client autosaves the current source code into the session.
3. Client requests execution for the current session.
4. API creates an execution record with a snapshot of the current code.
5. API enqueues a BullMQ job and returns immediately.
6. Worker consumes the job, runs the code, and updates execution state.
7. Client polls execution status and result.

Core components:

- API layer: routes + controllers
- Session service: session lifecycle and enqueue orchestration
- Execution service: execution persistence
- Queue: BullMQ producer
- Worker: BullMQ consumer
- Sandbox service: temp-directory based execution wrapper

## API Documentation

Base URL:

```text
http://localhost:3000
```

### 1. Create Session

`POST /code-sessions`

Request:

```json
{
  "language": "python"
}
```

Response example:

```json
{
  "session_id": "uuid",
  "status": "ACTIVE",
  "language": "python",
  "source_code": "# Write your solution here\n..."
}
```

### 2. Autosave Session

`PATCH /code-sessions/{session_id}`

Request:

```json
{
  "source_code": "print(\"Hello World\")"
}
```

Response example:

```json
{
  "session_id": "uuid",
  "status": "ACTIVE",
  "language": "python",
  "source_code": "print(\"Hello World\")"
}
```

### 3. Run Code

`POST /code-sessions/{session_id}/run`

Response example:

```json
{
  "execution_id": "uuid",
  "session_id": "uuid",
  "status": "QUEUED",
  "source_code_snapshot": "print(\"Hello World\")",
  "language_snapshot": "python",
  "excution_time": "2026-04-17T00:00:00.000Z",
  "started_at": null,
  "finished_at": null,
  "excution_time_ms": null
}
```

### 4. Get Execution Result

`GET /executions/{execution_id}`

Response example:

```json
{
  "execution_id": "uuid",
  "session_id": "uuid",
  "status": "COMPLETED",
  "stdout": "Hello World\n",
  "stderr": "",
  "source_code_snapshot": "print(\"Hello World\")",
  "language_snapshot": "python",
  "excution_time": "2026-04-17T00:00:00.000Z",
  "started_at": "2026-04-17T00:00:01.000Z",
  "finished_at": "2026-04-17T00:00:01.120Z",
  "excution_time_ms": 120
}
```

## Execution Lifecycle

Supported states:

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `TIMEOUT`

State transition:

```text
QUEUED -> RUNNING -> COMPLETED / FAILED / TIMEOUT
```

The worker also records:

- `excution_time`
- `started_at`
- `finished_at`
- `excution_time_ms`

## Supported Languages

Note: the service currently supports only 2 languages for code execution: `javascript` and `python`.

Currently executable:

- `python`
- `javascript`

Current templates and runners are implemented only for Python and JavaScript.

## Local Development

### Option 1: Run with Docker Compose

Start the full stack:

```bash
docker compose up --build
```

Run in background:

```bash
docker compose up --build -d
```

Stop:

```bash
docker compose down
```

Reset database volume:

```bash
docker compose down -v
```

### Option 2: Run Locally Without Docker

Requirements:

- Node.js 18+
- PostgreSQL
- Redis
- Python 3 installed in PATH

Create a local environment file:

```bash
cp .env.example .env
```

Install dependencies:

```bash
npm ci
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Apply the current Prisma schema to the local database:

```bash
npx prisma db push
```

Current script caveat:

- `npm run dev` uses `nodemon`, but `nodemon` is not declared in `package.json`
- make sure `nodemon` is available in your environment before using the dev script

Start API:

```bash
npm run dev
```

Start worker in another terminal:

```bash
npm run worker
```

## Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Typical local variables:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_exec
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EXECUTION_TIMEOUT_MS=3000
QUEUE_MAX_WAITING=1000
WORKER_CONCURRENCY=5
```

When running in Docker Compose:

```env
PORT=3000
REDIS_PORT=6379
EXECUTION_TIMEOUT_MS=3000
QUEUE_MAX_WAITING=1000
WORKER_CONCURRENCY=5
```

Notes:

- `docker-compose.yml` reads shared settings like `PORT`, `EXECUTION_TIMEOUT_MS`, `QUEUE_MAX_WAITING`, and `WORKER_CONCURRENCY` from `.env`.
- Compose intentionally overrides `DATABASE_URL` and `REDIS_HOST` inside containers so service-to-service networking uses `postgres` and `redis` instead of `localhost`.

## Design Decisions and Trade-offs

- Queue-based execution was chosen to keep API requests non-blocking.
- Execution snapshots are stored so code runs are reproducible even if the session changes later.
- A temp directory is created per execution to isolate generated files at a basic level.
- Docker is used for local infrastructure setup and predictable runtime dependencies.

Trade-offs in the current version:

- Isolation is lightweight. Execution runs in the worker container/process, not in a dedicated sandbox container.
- Time limit is implemented, but memory limit is not yet enforced.
- Retry and exponential backoff are configured in BullMQ, but execution state is still written as `FAILED` on every failed attempt before retries are exhausted.
- API responses currently return raw persistence objects instead of a tightly curated response contract.

## What I Would Improve Next

- Add memory limits for execution processes.
- Add health checks for Redis and PostgreSQL in Docker Compose.
- Make execution failure handling retry-aware.
- Limit stdout/stderr size to prevent excessive memory usage.
- Align template languages with actual runnable languages.
- Add request validation with Zod for all payloads.
- Add tests for timeout, queue failure, retry behavior, and worker crash scenarios.
- Add a stronger isolated execution strategy such as `prlimit`, cgroups, or per-run containers.

## Current Gaps

The following are not fully implemented yet:

- Memory limit enforcement
- Strong runtime isolation
- Complete README examples for every edge case
- Broader automated coverage beyond the current Vitest unit tests
