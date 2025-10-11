# Drizzle ORM Setup Guide

## ✅ What's Been Installed

Drizzle ORM has been successfully added to your project with the following:

- **drizzle-orm** - The ORM library
- **postgres** - PostgreSQL driver for Node.js
- **drizzle-kit** - CLI tool for migrations and schema management

## 📁 New Files Created

```
/db
  ├── index.ts          # Database connection
  ├── schema.ts         # Database schema definitions
  ├── queries.ts        # Example query functions
  └── README.md         # Detailed documentation

drizzle.config.ts       # Drizzle Kit configuration
package.json            # Updated with new scripts
```

## 🔧 How Drizzle Works with Supabase

### The Stack

```
┌─────────────────────────────────────┐
│         Your Next.js App            │
├─────────────────┬───────────────────┤
│   Drizzle ORM   │  Supabase Client  │
│   (Database)    │  (Auth, Storage)  │
└────────┬────────┴────────┬──────────┘
         │                 │
         ▼                 ▼
   ┌─────────────────────────────┐
   │   Supabase PostgreSQL       │
   │   (Your Database)           │
   └─────────────────────────────┘
```

**Use Drizzle for:**
- Type-safe database queries
- Insert, update, delete operations
- Complex joins and queries
- Schema management

**Use Supabase Client for:**
- Authentication (`supabase.auth`)
- File storage (`supabase.storage`)
- Real-time subscriptions
- Row Level Security (RLS)

## 🚀 Quick Start

### Step 1: Set Up Environment Variables

Create a `.env.local` file with:

```bash
# Database connection for Drizzle
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Supabase for auth/storage (existing)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

**To get your DATABASE_URL:**
1. Go to your Supabase dashboard
2. Settings → Database
3. Connection String → URI (NOT Session pooler)
4. Copy and replace `[YOUR-PASSWORD]` with your database password

### Step 2: Push Schema to Database

```bash
npm run db:push
```

This will create the tables defined in `db/schema.ts` in your Supabase database.

### Step 3: Verify with Drizzle Studio

```bash
npm run db:studio
```

Opens a visual database browser at `https://local.drizzle.studio` where you can view and edit your data.

## 📝 Example Usage

### Before (Supabase Client)

```typescript
const supabase = createClient(url, key);
const { data, error } = await supabase
  .from("waitlist")
  .insert({ email: "user@example.com" });
```

### After (Drizzle ORM)

```typescript
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { eq } from "drizzle-orm";

// Insert
const [entry] = await db
  .insert(waitlist)
  .values({ email: "user@example.com" })
  .returning();

// Query
const entries = await db
  .select()
  .from(waitlist)
  .where(eq(waitlist.email, "user@example.com"));
```

## 🎯 Migration Example

See `app/api/waitlist/route.drizzle-example.ts` for a complete example of how to refactor an existing Supabase route to use Drizzle.

## 📚 Available Scripts

```bash
npm run db:push      # Push schema changes to database (dev)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open visual database browser
```

## 🔄 Development Workflow

### For Development
1. Edit `db/schema.ts` to modify your database schema
2. Run `npm run db:push` to sync changes instantly
3. Use `npm run db:studio` to view your data

### For Production
1. Edit `db/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Commit migration files to git
4. Run `npm run db:migrate` in production

## 🔐 Best Practices

1. **Use Drizzle for Data, Supabase for Auth**
   ```typescript
   // Get user from Supabase Auth
   const supabase = createSupabaseServerClient();
   const { data: { user } } = await supabase.auth.getUser();
   
   // Query user's data with Drizzle
   const userData = await db
     .select()
     .from(users)
     .where(eq(users.id, user.id));
   ```

2. **Type Safety**
   - Drizzle automatically infers types from your schema
   - No need to manually type your queries!

3. **Reusable Queries**
   - Put common queries in `db/queries.ts`
   - Import and use them across your app

4. **Error Handling**
   ```typescript
   try {
     await db.insert(users).values({ email });
   } catch (error) {
     // Handle unique constraint violations, etc.
   }
   ```

## 📖 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle with Supabase Guide](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [Drizzle Queries](https://orm.drizzle.team/docs/select)
- [Schema Definition](https://orm.drizzle.team/docs/sql-schema-declaration)

## 🎓 Next Steps

1. ✅ Install dependencies (DONE)
2. ✅ Create schema files (DONE)
3. ⏭️  Add DATABASE_URL to your `.env.local`
4. ⏭️  Run `npm run db:push` to create tables
5. ⏭️  Start using Drizzle in your API routes
6. ⏭️  (Optional) Refactor existing Supabase queries to Drizzle

## ❓ Questions?

Check `db/README.md` for more detailed documentation and examples!

