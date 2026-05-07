# Code Compiler API

A production-grade REST API that executes untrusted code in isolated Docker sandboxes. Built with Node.js, Express, MongoDB, Redis, and BullMQ.

## Architecture

```
Client → Express API → JWT Auth + Rate Limiter → Job Controller
                                                        ↓
                                                   BullMQ Queue (Redis)
                                                        ↓
                                                   Worker Process
                                                        ↓
                                                   Docker Sandbox
                                                   (isolated container)
                                                        ↓
                                               MongoDB + Redis Cache
```

**Key design decisions:**
- Jobs are processed asynchronously — the API returns a `jobId` immediately (202) and the client polls for results. This prevents long-running code from blocking HTTP connections.
- Each execution runs in a fresh Docker container with no network access, capped memory (128MB), capped CPU (0.5 cores), and a 10 second timeout. The container is destroyed after execution.
- The worker runs as a separate process from the API server, meaning execution load doesn't affect API responsiveness.
- Completed job results are cached in Redis with a 1 hour TTL, so repeated polls hit cache instead of MongoDB.

## Tech Stack

| Layer | Technology |
|---|---|
| API server | Node.js, Express |
| Database | MongoDB + Mongoose |
| Queue | BullMQ |
| Cache / Queue store | Redis (ioredis) |
| Sandboxing | Docker |
| Auth | JWT (access + refresh tokens) |
| Validation | express-validator |

## Getting Started

**Prerequisites:** Node.js 18+, Docker Desktop

**1. Clone and install:**
```bash
git clone https://github.com/yourusername/code-compiler-api
cd code-compiler-api
npm install
```

**2. Set up environment:**
```bash
cp .env.example .env
# fill in your JWT secrets
```

**3. Start MongoDB and Redis:**
```bash
docker compose up -d
```

**4. Build sandbox images:**
```bash
docker build -t compiler-javascript -f docker/javascript.Dockerfile .
docker build -t compiler-python -f docker/python.Dockerfile .
```

**5. Start the API server:**
```bash
npm run dev
```

**6. Start the worker (separate terminal):**
```bash
npm run worker
```

API is running at `http://localhost:3000`

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, get tokens |
| POST | `/auth/refresh` | Refresh access token |

### Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/jobs` | ✅ | Submit code for execution |
| GET | `/jobs/:jobId` | ✅ | Poll job status and result |
| GET | `/jobs` | ✅ | Paginated job history |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | ✅ | Get profile |
| GET | `/users/me/stats` | ✅ | Execution statistics |

### Submit a job

```
POST /jobs
Authorization: Bearer <token>

{
  "language": "python",
  "code": "print('hello world')",
  "stdin": ""
}
```

```json
{
  "jobId": "abc123",
  "status": "pending",
  "pollUrl": "/jobs/abc123"
}
```

### Poll for result

```
GET /jobs/abc123
Authorization: Bearer <token>
```

```json
{
  "jobId": "abc123",
  "status": "completed",
  "language": "python",
  "output": {
    "stdout": "hello world\n",
    "stderr": "",
    "exitCode": 0,
    "executionTimeMs": 528
  },
  "createdAt": "2026-05-07T10:09:37.374Z",
  "completedAt": "2026-05-07T10:09:37.935Z"
}
```

### Job status values

| Status | Meaning |
|---|---|
| `pending` | Queued, not yet picked up |
| `running` | Executing in sandbox |
| `completed` | Finished successfully |
| `failed` | Runtime error or non-zero exit |
| `timed_out` | Exceeded 10 second limit |

### Error format

All errors follow a consistent shape:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded 10 requests per minute.",
    "retryAfter": 34
  }
}
```

### Rate limiting

Authenticated users are limited to 10 requests per minute on the `/jobs` POST endpoint. Every response includes:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1746524460
```

## Supported Languages

| Language | Runtime |
|---|---|
| `python` | Python 3.12 |
| `javascript` | Node.js 20 |

## Security

- All user code runs in a Docker container with no network access (`--network none`)
- Memory capped at 128MB per execution (`--memory 128m`)
- CPU capped at 0.5 cores (`--cpus 0.5`)
- Read-only filesystem with a small writable `/tmp`
- 10 second hard timeout — container is killed if exceeded
- Containers are destroyed immediately after execution (`--rm`)
- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens expire in 15 minutes

## Project Structure

```
src/
├── config/         # MongoDB and Redis connections
├── controllers/    # Route handlers
├── middlewares/    # JWT auth, rate limiter, validation
├── models/         # Mongoose schemas
├── queues/         # BullMQ queue definition
├── routes/         # Express routers
├── services/       # Docker execution service
└── workers/        # BullMQ worker process
```