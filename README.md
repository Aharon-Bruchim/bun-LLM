# Bun + Hono + tRPC Template

Microservice template with Bun runtime, Hono framework, and tRPC API.

## Requirements

- [Bun](https://bun.sh) v1.0+
- MongoDB

## Installation

```bash
bun i
```

## Scripts

| Command          | Description                 |
| ---------------- | --------------------------- |
| `bun dev`        | Development with hot reload |
| `bun start`      | Production                  |
| `bun run lint`   | ESLint                      |
| `bun run format` | Prettier                    |

## Environment Variables

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/mydb
NODE_ENV=development
```

## Project Structure

```
src/
├── index.ts
├── config.ts
├── api/
│   ├── server.ts
│   ├── router.ts
│   ├── trpc.ts
│   └── template/
│       ├── router.ts
│       ├── schema.ts
│       ├── manager.ts
│       ├── model.ts
│       └── interface.ts
└── utils/
    ├── errors.ts
    ├── zod.ts
    └── logger/index.ts
```

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono
- **API:** tRPC
- **Database:** MongoDB + Mongoose
- **Validation:** Zod
- **Logger:** Pino
