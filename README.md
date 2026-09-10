# prisma-nestjs

A sample REST API built step by step with **NestJS + Prisma ORM + SQLite**.
It models a simple blog domain: **`User` 1—N `Post`**, with full CRUD, relations,
input validation and cascading deletes.

## Stack

| Layer | Technology |
|---|---|
| Framework | [NestJS 12](https://nestjs.com) |
| ORM | [Prisma ORM 7.10](https://www.prisma.io) (`prisma-client` generator) |
| Database | SQLite via the `@prisma/adapter-better-sqlite3` driver adapter |
| Validation | `class-validator` + `class-transformer` |
| Modules | ESM (`"type": "module"`), TypeScript 6, `module: nodenext` |
| Tests/Lint | `vitest` and `oxlint` (from the Nest 12 scaffold) |

## Requirements

- **Node.js >= 22** (tested on Node 24) — `better-sqlite3` requires `>=22`.
- npm.

## Getting started

```bash
# 1. install dependencies
npm install

# 2. create the environment file
cp .env.example .env

# 3. apply migrations and create the dev.db file
npm run prisma:migrate

# 4. generate the Prisma Client into src/generated/prisma
npm run prisma:generate

# 5. start the API in watch mode
npm run start:dev
```

The API is available at **http://localhost:3000** (configurable via `PORT`).

### Environment variables

`.env` (not versioned — see `.env.example`):

```dotenv
DATABASE_URL="file:./dev.db"
```

> The SQLite file is created at the **project root** (`./dev.db`).

## Database

- SQLite (single file) — great for development and learning.
- Migrations are versioned under `prisma/migrations/`.
- The `PrismaClient` is generated into `src/generated/prisma/` (git-ignored).

### Database scripts

| Script | What it does |
|---|---|
| `npm run prisma:migrate` | Create and apply a migration from the schema |
| `npm run prisma:generate` | Regenerate the Prisma Client |
| `npm run prisma:studio` | Open Prisma Studio (GUI) |
| `npm run prisma:reset` | Drop the database and reapply all migrations |

### Inspecting the data

```bash
# Prisma Studio
npm run prisma:studio          # http://localhost:5555

# SQLite CLI
sqlite3 -header -column dev.db "SELECT * FROM User;"
sqlite3 -header -column dev.db "SELECT * FROM Post;"
```

> **Note:** Prisma Studio 7.10 requires the URL in the `file://` format. That is why the
> `prisma:studio` script passes `--url "file://$PWD/dev.db"` explicitly. Running plain
> `npx prisma studio` fails with `"file:./dev.db" protocol`.

## Data model

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  Int
}
```

- `User.email` is unique.
- A `Post` always belongs to a `User` (`authorId` is required).
- Deleting a `User` automatically removes its `Post`s (`onDelete: Cascade`).

## Endpoints

Base: `http://localhost:3000`

### Users

| Method | Route | Body | Success |
|---|---|---|---|
| POST | `/users` | `{ "email", "name"? }` | 201 |
| GET | `/users` | — | 200 |
| GET | `/users/:id` | — | 200 |
| PATCH | `/users/:id` | `{ "email"?, "name"? }` | 200 |
| DELETE | `/users/:id` | — | 200 |

```bash
# create
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@prisma.io","name":"Alice"}'

# list (includes each user's posts)
curl http://localhost:3000/users

# get one
curl http://localhost:3000/users/1

# update
curl -X PATCH http://localhost:3000/users/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice Souza"}'

# delete
curl -X DELETE http://localhost:3000/users/1
```

### Posts

| Method | Route | Body | Success |
|---|---|---|---|
| POST | `/posts` | `{ "title", "content"?, "published"?, "authorId" }` | 201 |
| GET | `/posts` | — | 200 |
| GET | `/posts/:id` | — | 200 |
| PATCH | `/posts/:id` | `{ "title"?, "content"?, "published"?, "authorId"? }` | 200 |
| DELETE | `/posts/:id` | — | 200 |

```bash
# create (authorId must exist)
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello World","content":"first post","authorId":1}'

# list (includes each post's author)
curl http://localhost:3000/posts
```

### Error codes

| Code | When |
|---|---|
| 400 | Invalid body (e.g. malformed email, missing required field) |
| 404 | Resource not found (e.g. `User 999 not found`) |
| 409 | Unique constraint violation (e.g. duplicate `email`) |

Prisma errors are mapped to HTTP statuses by a global filter
(`src/common/filters/prisma-exception.filter.ts`): `P2002 → 409`, `P2025 → 404`,
`P2003 → 400`.

## Validation

The DTOs use `class-validator` decorators:

```ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
```

The global `ValidationPipe` is registered in `src/app.module.ts` via `APP_PIPE`, so
it also applies in tests:

```ts
{
  provide: APP_PIPE,
  useValue: new ValidationPipe({ whitelist: true, transform: true }),
}
```

- `whitelist: true` → strips properties not declared on the DTO.
- `transform: true` → converts the JSON payload into a class instance.

## Testing

The project ships with **unit** and **end-to-end (e2e)** tests using `vitest`.

```bash
npm test          # unit tests
npm run test:e2e  # e2e tests (spin up the Nest app + supertest)
```

- E2E specs live in `test/` (`users.e2e-spec.ts`, `posts.e2e-spec.ts`).
- They run against an **isolated `test.db`**: a `globalSetup` (`test/setup-e2e.ts`)
  regenerates the Prisma Client, applies migrations and deletes the file afterwards,
  so the development `dev.db` is never touched.
- Coverage includes happy paths, `400` validation, `404`, `409` duplicate email and
  the `onDelete: Cascade` behavior.

## Project structure

```
prisma/
  schema.prisma            # User and Post models
  migrations/              # migration history
prisma7.config.ts          # Prisma CLI configuration (v7)
src/
  main.ts                  # bootstrap + CORS
  app.module.ts            # root module (registers ValidationPipe + filter)
  common/
    filters/
      prisma-exception.filter.ts   # maps Prisma errors to HTTP statuses
  prisma/
    prisma.module.ts       # global module exposing PrismaService
    prisma.service.ts      # PrismaClient + better-sqlite3 driver adapter
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    dto/{create,update}-user.dto.ts
  posts/
    posts.module.ts
    posts.controller.ts
    posts.service.ts
    dto/{create,update}-post.dto.ts
  generated/prisma/        # generated Prisma Client (git-ignored)
test/
  app.e2e-spec.ts
  users.e2e-spec.ts
  posts.e2e-spec.ts
  setup-e2e.ts             # globalSetup: isolated test.db
  utils/test-app.ts        # app bootstrap + database reset helpers
```

## Technical notes

- **ESM**: the project is `"type": "module"`. Internal imports use the `.js`
  extension (e.g. `import { UsersService } from './users.service.js'`), required by `nodenext`.
- **Prisma 7**: uses a *driver adapter* (`better-sqlite3`) and configuration in
  `prisma7.config.ts` (the database URL no longer lives in `schema.prisma`).
- **`prisma generate`**: after changing the schema, run `npm run prisma:generate`.
  In this setup `migrate dev` did not regenerate the Client automatically.
- **CORS**: enabled permissively (`app.enableCors()`), fine for development.
  In production, restrict the allowed origins.
- **Global providers**: the `ValidationPipe` and the `PrismaExceptionFilter` are
  registered with `APP_PIPE`/`APP_FILTER` in `AppModule` (not `useGlobalPipes` in
  `main.ts`), so they are active both in the running app and in e2e tests.

## Next steps

- [x] E2E tests (Users + Posts) with `vitest` + `supertest`.
- [x] Global error handling (Prisma errors mapped to HTTP statuses).
- [ ] Authentication/authorization.
- [ ] Pagination and filters on listings.
- [ ] Move to PostgreSQL in production (provider + adapter + URL).
