# Database Workflow

**We use `db:push` for all schema changes. DO NOT use migrations.**

## Making Schema Changes

```bash
1. Edit db/schema.ts
2. npm run db:push
3. git add db/schema.ts
4. git commit -m "Add X column to Y table"
5. git push
6. Notify teammate in chat
```

## Pulling Schema Changes

```bash
1. git pull
2. npm run db:push        # ⚠️ ALWAYS run this after pulling!
3. Verify: npm run db:studio
```

## Rules

- ✅ **ONLY** edit `db/schema.ts` for schema changes
- ✅ **ALWAYS** run `npm run db:push` after editing schema
- ✅ **ALWAYS** run `npm run db:push` after `git pull`
- ❌ **NEVER** create tables manually in Supabase UI
- ❌ **NEVER** use `npm run db:generate` or `npm run db:migrate`

## Commands

```bash
npm run db:push      # Sync schema to database
npm run db:studio    # Open visual database browser
npm run db:check     # Check if schema matches database
```

## Troubleshooting

**Error: "column X does not exist"**
- Someone made schema changes but didn't tell you
- Run `npm run db:push` to sync

**Before making breaking changes** (dropping columns, renaming tables):
- Message your teammate first!
- They might have uncommitted work

## Why no migrations?

We use a shared Supabase database, not local databases. `db:push` is simpler and faster for our 2-person team. Migrations are overkill.

