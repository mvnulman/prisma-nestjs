# prisma-nestjs

API REST de exemplo construída passo a passo com **NestJS + Prisma ORM + SQLite**.
Modela um domínio simples de blog: **`User` 1—N `Post`**, com CRUD completo, relações,
validação de entrada e exclusão em cascata.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | [NestJS 12](https://nestjs.com) |
| ORM | [Prisma ORM 7.10](https://www.prisma.io) (generator `prisma-client`) |
| Banco | SQLite via driver adapter `@prisma/adapter-better-sqlite3` |
| Validação | `class-validator` + `class-transformer` |
| Módulos | ESM (`"type": "module"`), TypeScript 6, `module: nodenext` |
| Testes/Lint | `vitest` e `oxlint` (do scaffold do Nest 12) |

## Requisitos

- **Node.js >= 22** (testado no Node 24) — o `better-sqlite3` exige `>=22`.
- npm.

## Como rodar

```bash
# 1. instala as dependências
npm install

# 2. cria o arquivo de variáveis de ambiente
cp .env.example .env

# 3. aplica as migrations e cria o arquivo dev.db
npm run prisma:migrate

# 4. gera o Prisma Client em src/generated/prisma
npm run prisma:generate

# 5. sobe a API em modo watch
npm run start:dev
```

A API fica disponível em **http://localhost:3000** (configurável via `PORT`).

### Variáveis de ambiente

`.env` (não versionado — veja `.env.example`):

```dotenv
DATABASE_URL="file:./dev.db"
```

> O arquivo SQLite é criado na **raiz do projeto** (`./dev.db`).

## Banco de dados

- SQLite (arquivo único) — ideal para desenvolvimento e aprendizado.
- As migrations ficam versionadas em `prisma/migrations/`.
- O `PrismaClient` é gerado em `src/generated/prisma/` (ignorado no git).

### Scripts de banco

| Script | O que faz |
|---|---|
| `npm run prisma:migrate` | Cria e aplica uma migration a partir do schema |
| `npm run prisma:generate` | Regenera o Prisma Client |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI) |
| `npm run prisma:reset` | Apaga o banco e reaplica todas as migrations |

### Inspecionar os dados

```bash
# Prisma Studio
npm run prisma:studio          # http://localhost:5555

# CLI do SQLite
sqlite3 -header -column dev.db "SELECT * FROM User;"
sqlite3 -header -column dev.db "SELECT * FROM Post;"
```

> **Nota:** o Prisma Studio 7.10 exige a URL no formato `file://`. Por isso o script
> `prisma:studio` passa `--url "file://$PWD/dev.db"` explicitamente. Rodar apenas
> `npx prisma studio` falha com `"file:./dev.db" protocol`.

## Modelo de dados

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

- `User.email` é único.
- Um `Post` sempre pertence a um `User` (`authorId` obrigatório).
- Ao deletar um `User`, seus `Post`s são removidos automaticamente (`onDelete: Cascade`).

## Endpoints

Base: `http://localhost:3000`

### Users

| Método | Rota | Body | Sucesso |
|---|---|---|---|
| POST | `/users` | `{ "email", "name"? }` | 201 |
| GET | `/users` | — | 200 |
| GET | `/users/:id` | — | 200 |
| PATCH | `/users/:id` | `{ "email"?, "name"? }` | 200 |
| DELETE | `/users/:id` | — | 200 |

```bash
# criar
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@prisma.io","name":"Alice"}'

# listar (inclui os posts de cada usuário)
curl http://localhost:3000/users

# buscar um
curl http://localhost:3000/users/1

# atualizar
curl -X PATCH http://localhost:3000/users/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice Souza"}'

# remover
curl -X DELETE http://localhost:3000/users/1
```

### Posts

| Método | Rota | Body | Sucesso |
|---|---|---|---|
| POST | `/posts` | `{ "title", "content"?, "published"?, "authorId" }` | 201 |
| GET | `/posts` | — | 200 |
| GET | `/posts/:id` | — | 200 |
| PATCH | `/posts/:id` | `{ "title"?, "content"?, "published"?, "authorId"? }` | 200 |
| DELETE | `/posts/:id` | — | 200 |

```bash
# criar (authorId deve existir)
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello World","content":"primeiro post","authorId":1}'

# listar (inclui o autor de cada post)
curl http://localhost:3000/posts
```

### Códigos de erro

| Código | Quando |
|---|---|
| 400 | Corpo inválido (ex.: e-mail malformado, campo obrigatório ausente) |
| 404 | Recurso não encontrado (ex.: `User 999 not found`) |

## Validação

Os DTOs usam decorators do `class-validator`:

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

O `ValidationPipe` global (`src/main.ts`) aplica as regras antes do controller:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

- `whitelist: true` → remove propriedades não declaradas no DTO.
- `transform: true` → converte o JSON em instância da classe.

## Estrutura do projeto

```
prisma/
  schema.prisma            # models User e Post
  migrations/              # histórico de migrations
prisma7.config.ts          # configuração do CLI do Prisma (v7)
src/
  main.ts                  # bootstrap + ValidationPipe + CORS
  app.module.ts            # módulo raiz
  prisma/
    prisma.module.ts       # módulo global que expõe o PrismaService
    prisma.service.ts      # PrismaClient + driver adapter better-sqlite3
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
  generated/prisma/        # Prisma Client gerado (ignorado no git)
```

## Notas técnicas

- **ESM**: o projeto é `"type": "module"`. Imports internos usam extensão `.js`
  (ex.: `import { UsersService } from './users.service.js'`), exigência do `nodenext`.
- **Prisma 7**: usa *driver adapter* (`better-sqlite3`) e configuração em
  `prisma7.config.ts` (a URL do banco não fica mais no `schema.prisma`).
- **`prisma generate`**: após alterar o schema, rode `npm run prisma:generate`.
  Neste setup o `migrate dev` não regenerou o Client automaticamente.
- **CORS**: habilitado de forma permissiva (`app.enableCors()`), adequado para
  desenvolvimento. Em produção, restrinja as origens permitidas.

## Próximos passos

- [ ] Testes e2e (Users + Posts) com `vitest` + `supertest`.
- [ ] Autenticação/autorização.
- [ ] Paginação e filtros nas listagens.
- [ ] Tratamento global de erros.
- [ ] Migrar para PostgreSQL em produção (provider + adapter + URL).
