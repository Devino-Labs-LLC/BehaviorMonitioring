# BMetrics database scripts

BMetrics uses **Sequelize** with **MySQL** (`server/config/database.js`). Credentials come from environment variables or AWS Secrets Manager — never hardcoded.

## Commands

| Command | Safe for production RDS? | Behavior |
|---------|--------------------------|----------|
| `npm run db:init` | **Yes** | Create missing tables only; add known missing columns on `Home` |
| `npm run db:sync` | **No** | Dev only — `sequelize.sync({ alter: true })` |
| `npm run db:reset` | **No** | Dev only — `sequelize.sync({ force: true })` drops all data |

**Never run `db:sync` or `db:reset` against production RDS.**

## Local development

1. Copy `server/.env.template` to `server/.env`.
2. Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
3. From `server/`:

```bash
npm run db:init
```

Use `db:sync` only when you intentionally need Sequelize to alter existing tables in a **local** database.

## AWS Elastic Beanstalk / RDS

### Automatic (recommended)

When `NODE_ENV=production`, the API calls `syncDatabase()` on startup (`server/models/index.js`). That uses the same safe logic as `db:init`: **creates tables that do not exist**; does not drop or alter existing tables.

Ensure EB environment variables include:

- `NODE_ENV=production`
- `AWS_DB_SECRET_NAME` (and IAM permission to read it), **or** `MYSQL_*` vars set directly

### Manual (SSH / one-off)

```bash
cd /var/app/current
export NODE_ENV=production
npm run db:init
```

`loadSecrets()` runs first, same as the running server.

## What `db:init` does

1. `loadSecrets()` — loads `MYSQL_*` from AWS Secrets Manager when configured
2. `testConnection()` — verifies connectivity
3. `syncDatabaseSafe()` — for each model, `sync()` only if the table is missing; adds `Home.capacity` / `Home.current_occupancy` if absent

Safe to run multiple times. Existing data is not dropped.

## Other scripts

- `npm run db:import <csv-dir>` — import CSV data (not schema init)
- `scripts/add-*.js` — one-off column migrations (run manually when documented)
