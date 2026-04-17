# Design Notes

## 1. Architecture Overview

This service implements a basic live code execution backend with an asynchronous execution model.

Main components:

- API server
  - Handles HTTP requests
  - Manages sessions
  - Enqueues execution jobs
- Redis + BullMQ
  - Stores queued jobs
  - Enables asynchronous execution
- Worker
  - Consumes execution jobs
  - Runs code
  - Updates execution state
- PostgreSQL + Prisma
  - Persists sessions and executions

## 2. End-to-End Request Flow

### Create code session

1. Client sends `POST /code-sessions`
2. API validates the requested language at service level
3. Session is created with:
   - `session_id`
   - `status`
   - `language`
   - initial template code

### Autosave behavior

1. Client sends `PATCH /code-sessions/{session_id}`
2. API updates the latest source code in the session
3. Session acts as the current draft in the editor

### Execution request

1. Client sends `POST /code-sessions/{session_id}/run`
2. API loads the current session
3. API creates an `Execution` record
4. API copies:
   - `source_code_snapshot`
   - `language_snapshot`
5. API enqueues a BullMQ job
6. API returns immediately with `QUEUED`

### Background execution

1. Worker consumes the job
2. Worker marks execution as `RUNNING`
3. Worker resolves the runner by language
4. Worker executes code in a temp directory
5. Worker collects `stdout`, `stderr`, and terminal status
6. Worker updates:
   - `status`
   - `started_at`
   - `finished_at`
   - `excution_time_ms`

### Result polling

1. Client polls `GET /executions/{execution_id}`
2. API returns the latest persisted execution state

## 3. Data Model

### Session

Purpose:

- Represents the editable draft for a live coding activity

Fields:

- `session_id`
- `status`
- `language`
- `source_code`

### Execution

Purpose:

- Represents one immutable run attempt for a given session

Fields:

- `execution_id`
- `session_id`
- `status`
- `stdout`
- `stderr`
- `source_code_snapshot`
- `language_snapshot`
- `excution_time`
- `started_at`
- `finished_at`
- `excution_time_ms`

Why keep both session and execution?

- Session stores the latest editable state
- Execution stores an immutable run snapshot
- This allows reproducible results and run history per session

## 4. Execution Lifecycle

The worker follows this lifecycle:

```text
QUEUED -> RUNNING -> COMPLETED / FAILED / TIMEOUT
```

Lifecycle persistence is written into PostgreSQL so the client can poll execution progress.

## 5. Reliability

### Retries

BullMQ retry settings are applied per execution job:

- `attempts: 3`
- exponential `backoff`

This helps with transient worker or infrastructure failures.

### Current limitation

The worker currently writes `FAILED` on any failed attempt, even if BullMQ still has remaining retries.

A more accurate design would:

- inspect the current attempt count
- only mark the execution as terminal `FAILED` after the last retry is exhausted

### Failed jobs

Jobs are kept on failure with:

- `removeOnFail: false`

This is useful for debugging.

### Idempotency

Current state:

- The service does not yet prevent duplicate runs for the same session
- Repeated `run` requests will create multiple execution rows

Future improvement:

- add a session-level execution lock
- or reject new runs while one execution is still active

## 6. Safety

Implemented:

- time limit via timeout + process kill
- temp directory per run
- language runner restriction at execution time
- queue backlog protection using waiting-count threshold

Not yet implemented:

- memory limit
- output size limit
- stronger sandboxing
- per-session abuse throttling

## 7. Scalability Considerations

### Horizontal scaling

The design supports multiple workers because BullMQ workers can consume from the same Redis queue.

### Queue backlog handling

The API checks queue waiting count and rejects execution when the backlog becomes too large.

### Current bottlenecks

- execution still runs inside the worker container
- no dedicated sandbox host or per-run container
- stdout/stderr buffering is in memory
- API and worker readiness are not health-check driven in Compose

## 8. Trade-offs

Optimized for:

- simplicity
- clarity
- fast implementation for a take-home assignment

Not optimized for:

- strong process isolation
- production-grade observability
- strict resource governance

## 9. Production Readiness Gaps

To move toward production readiness:

- enforce memory limits
- move execution to a stronger sandbox
- add structured logs and metrics
- add retry-aware execution state handling
- add integration and failure-path tests

## 10. Testing Status

Current coverage in the repo:

- basic Vitest unit tests for `session.service`
- basic Vitest unit tests for worker job processing

Current testing gaps:

- no integration tests against PostgreSQL, Redis, and BullMQ
- no end-to-end API tests
- no timeout-path coverage for the sandbox runner
