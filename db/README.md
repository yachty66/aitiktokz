# Database Setup with Drizzle ORM

This project uses **Drizzle ORM** with **Supabase PostgreSQL**.

## Environment Variables

Add this to your `.env.local` file:

```bash
# Supabase PostgreSQL Connection String
# Format: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
DATABASE_URL="postgresql://postgres:your-password@your-project.supabase.co:5432/postgres"

# Existing Supabase vars (for auth, storage, etc.)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-key"
```

### Getting Your DATABASE_URL

1. Go to your Supabase project dashboard
2. Click on **Settings** → **Database**
3. Under **Connection String**, select **URI** (not Session pooler)
4. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password

## How It Works

### Architecture

- **Drizzle ORM**: Handles database CRUD operations (type-safe queries)
- **Supabase Client**: Handles authentication, storage, and real-time features

### Files

- `db/schema.ts` - Define your database tables here
- `db/index.ts` - Database connection and Drizzle instance
- `drizzle.config.ts` - Drizzle Kit configuration for migrations

## Available Commands

```bash
# Generate migration files from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly to database (dev only, skips migrations)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Workflow

### 1. Define Your Schema

Edit `db/schema.ts` to define your tables:

```typescript
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 2. Push to Database

For development, use `db:push` to sync schema directly:

```bash
npm run db:push
```

For production, generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 3. Use in Your Code

Import the `db` instance and query your tables:

```typescript
import { db } from "@/db";
import { users, slideshows } from "@/db/schema";
import { eq } from "drizzle-orm";

// Insert
await db.insert(users).values({ email: "user@example.com" });

// Query
const allUsers = await db.select().from(users);
const user = await db.select().from(users).where(eq(users.email, "user@example.com"));

// Update
await db.update(users).set({ name: "John" }).where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));
```

## Using Drizzle with Supabase Auth

You can use Supabase for authentication and Drizzle for data:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase";
import { db } from "@/db";
import { users } from "@/db/schema";

// Get user from Supabase Auth
const supabase = createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();

// Query their data with Drizzle
const userData = await db.select().from(users).where(eq(users.id, user.id));
```

## Drizzle Studio

Run `npm run db:studio` to open a visual database browser at `https://local.drizzle.studio`

