# BCP CLI — Sprint 9 Phase 4

**Estado del documento:** 📌 VIGENTE (documento de referencia continuo) — Documentación viva de la CLI.


Command-line interface for BCP administration and operations.

## Installation

```bash
# Install CLI globally (after building)
pnpm install -g ./apps/cli

# Or run directly
pnpm --filter @bcp/cli exec bcp <command>
```

## Commands

### workspace:list

List all workspaces with pagination.

```bash
bcp workspace:list [--limit 10] [--offset 0]
```

**Options:**
- `--limit`: Number of results (default: 10)
- `--offset`: Pagination offset (default: 0)

**Example:**
```bash
bcp workspace:list --limit 20
```

**Output:**
```
┌────────────────┬─────────────────────┬───────┬────────┬──────────┬───────────┬─────────────────────────────┐
│ id             │ name                │ slug  │ status │ contacts │ campaigns │ created                     │
├────────────────┼─────────────────────┼───────┼────────┼──────────┼───────────┼─────────────────────────────┤
│ ws-1a2b3c4d... │ Acme Corporation    │ acme  │ active │ 5000     │ 50        │ 2026-01-15T10:30:00.000Z   │
│ ws-5e6f7g8h... │ Startup Inc         │ startup-inc │ active │ 1200 │ 15 │ 2026-02-01T14:20:00.000Z │
└────────────────┴─────────────────────┴───────┴────────┴──────────┴───────────┴─────────────────────────────┘

Total: 2 workspaces
```

### campaign:status

Get detailed status and statistics for a campaign.

```bash
bcp campaign:status <campaignId>
```

**Arguments:**
- `campaignId`: Campaign ID (required)

**Example:**
```bash
bcp campaign:status c-1a2b3c4d5e6f
```

**Output:**
```
=== Campaign Details ===
ID:          c-1a2b3c4d5e6f
Name:        Q3 Marketing Campaign
Status:      completed
Channel:     whatsapp
Created:     2026-07-01T09:15:00.000Z
Started:     2026-07-01T09:30:00.000Z
Completed:   2026-07-02T11:45:00.000Z

=== Delivery Statistics ===
┌───────────┬───────┐
│ (index)   │ Count │
├───────────┼───────┤
│ sent      │ 980   │
│ delivered │ 950   │
│ read      │ 850   │
│ failed    │ 20    │
└───────────┴───────┘

Total deliveries: 1000
```

### delivery:retry

Retry failed deliveries for a campaign.

```bash
bcp delivery:retry <campaignId> [--status failed]
```

**Arguments:**
- `campaignId`: Campaign ID (required)

**Options:**
- `--status`: Delivery status to retry (default: failed)

**Example:**
```bash
# Retry all failed deliveries
bcp delivery:retry c-1a2b3c4d5e6f

# Retry specific status
bcp delivery:retry c-1a2b3c4d5e6f --status pending
```

**Output:**
```
Found 20 deliveries to retry
Updating delivery status to "pending"...
✓ Updated 20 deliveries
Deliveries will be re-processed by the worker
```

### db:migrate

Run Prisma database migrations. Wrapper around `pnpm db:migrate`.

```bash
bcp db:migrate
```

**Example:**
```bash
bcp db:migrate
```

**Output:**
```
Running Prisma migrations...
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL at "postgresql://..."

migrations:
  No pending migrations to apply.

✓ Migrations completed
```

### db:seed

Seed database with demo data for testing and development.

```bash
bcp db:seed
```

**Creates:**
- Demo workspace (`slug: demo`)
- Demo user (`email: demo@example.com`)
- 10 demo contacts
- Welcome template (SMS)

**Output:**
```
Seeding database with demo data...
✓ Created workspace: Demo Workspace
✓ Created user: demo@example.com
✓ Added user to workspace
✓ Created 10 demo contacts
✓ Created demo template: Welcome Template

✓ Database seeding completed

Demo credentials:
  Email:  demo@example.com
  Workspace: demo
```

## Exit Codes

- `0`: Success
- `1`: Error (database connection, invalid arguments, etc.)

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Environment mode (development, production)

## Typical Workflows

### Development Setup
```bash
# 1. Run migrations
bcp db:migrate

# 2. Seed demo data
bcp db:seed

# 3. Check workspace
bcp workspace:list
```

### Production Operations
```bash
# List all workspaces
bcp workspace:list --limit 100

# Check campaign status
bcp campaign:status c-xyz123

# Retry failed deliveries
bcp delivery:retry c-xyz123
```

## Error Handling

All commands provide clear error messages:

```bash
$ bcp campaign:status invalid-id
Campaign invalid-id not found
```

Exit code `1` indicates an error. Check the error message for remediation steps.
