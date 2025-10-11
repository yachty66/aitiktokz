# 🚀 How to Create New Tables with Drizzle

## ✅ Short Answer: YES, Create Tables Through Drizzle!

You should **define tables in Drizzle** and let it sync to Supabase. Don't create tables manually in Supabase anymore.

---

## 📝 Step-by-Step: Creating a New Table

### Example: Let's create a `users` table

### Step 1: Define the Table in `db/schema.ts`

```typescript
import { pgTable, text, timestamp, serial, jsonb } from "drizzle-orm/pg-core";

// Your existing tables
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull().unique(),
});

// ✨ ADD YOUR NEW TABLE HERE
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Step 2: Push to Supabase Database

```bash
npm run db:push
```

That's it! 🎉 The table is now created in your Supabase database.

### Step 3: Verify in Drizzle Studio

```bash
npm run db:studio
```

Open https://local.drizzle.studio and you'll see your new `users` table.

---

## 📊 Common Column Types

```typescript
import { 
  pgTable, 
  serial,      // Auto-incrementing integer (1, 2, 3...)
  text,        // Text string
  varchar,     // Variable character (with length limit)
  integer,     // Integer number
  boolean,     // true/false
  timestamp,   // Date and time
  jsonb,       // JSON data
  uuid,        // UUID string
} from "drizzle-orm/pg-core";

export const example = pgTable("example", {
  // Primary key (auto-increment)
  id: serial("id").primaryKey(),
  
  // Text fields
  title: text("title").notNull(),
  description: text("description"),  // nullable
  
  // Text with length limit
  username: varchar("username", { length: 50 }).notNull().unique(),
  
  // Numbers
  age: integer("age"),
  viewCount: integer("view_count").default(0).notNull(),
  
  // Boolean
  isActive: boolean("is_active").default(true).notNull(),
  isPublished: boolean("is_published").default(false),
  
  // JSON
  metadata: jsonb("metadata"),
  settings: jsonb("settings").$type<{ theme: string; notifications: boolean }>(),
  
  // UUID
  externalId: uuid("external_id").defaultRandom(),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 🔗 Creating Relationships (Foreign Keys)

### Example: Videos belong to Slideshows

```typescript
export const slideshows = pgTable("slideshows", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  // Foreign key reference
  slideshowId: integer("slideshow_id")
    .references(() => slideshows.id)
    .notNull(),
  title: text("title").notNull(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Then push to database:
```bash
npm run db:push
```

---

## 🔄 Modifying Existing Tables

### Adding a Column

1. Edit `db/schema.ts`:
```typescript
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // ✨ Add new column
  name: text("name"),
  referralSource: text("referral_source"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

2. Push changes:
```bash
npm run db:push
```

Drizzle will detect the changes and update your table!

### Renaming or Removing Columns

**⚠️ Be careful!** Drizzle might drop and recreate columns, which could lose data.

For production, use migrations instead:
```bash
npm run db:generate  # Creates migration file
npm run db:migrate   # Applies migration
```

---

## 🎯 Complete Example: Adding a Comments Table

### 1. Define Schema

```typescript
// db/schema.ts

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  slideshowId: integer("slideshow_id")
    .references(() => slideshows.id)
    .notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 2. Create Types

```typescript
// db/types.ts

import { comments } from "./schema";

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

### 3. Add Query Functions

```typescript
// db/queries.ts

import { comments } from "./schema";

export async function createComment(data: {
  slideshowId: number;
  authorEmail: string;
  content: string;
}) {
  const [comment] = await db
    .insert(comments)
    .values(data)
    .returning();
  return comment;
}

export async function getCommentsBySlideshow(slideshowId: number) {
  return await db
    .select()
    .from(comments)
    .where(eq(comments.slideshowId, slideshowId))
    .orderBy(desc(comments.createdAt));
}
```

### 4. Push to Database

```bash
npm run db:push
```

### 5. Use in API Route

```typescript
// app/api/comments/route.ts

import { NextResponse } from "next/server";
import { createComment } from "@/db/queries";

export async function POST(req: Request) {
  const { slideshowId, authorEmail, content } = await req.json();
  
  const comment = await createComment({
    slideshowId,
    authorEmail,
    content,
  });
  
  return NextResponse.json({ data: comment });
}
```

---

## 🎭 Dev vs Production Workflows

### 🧪 Development (Fast & Easy)

Use `db:push` for quick iteration:
```bash
npm run db:push
```

- ✅ Instant sync
- ✅ No migration files
- ⚠️ May drop/recreate columns (data loss possible)

### 🚀 Production (Safe & Tracked)

Use migrations for controlled changes:
```bash
npm run db:generate  # Creates SQL migration files
npm run db:migrate   # Applies migrations
```

- ✅ Version controlled
- ✅ Safe migrations
- ✅ Can review SQL before applying

---

## ✨ Pro Tips

### 1. **Always Use Drizzle for Schema Changes**
Don't mix Drizzle with manual Supabase SQL. Choose one source of truth (Drizzle).

### 2. **Use `withTimezone: true` for Timestamps**
Matches Supabase's default `timestamptz` type:
```typescript
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
```

### 3. **Use `serial` for Auto-Incrementing IDs**
Matches your existing tables (not `uuid`):
```typescript
id: serial("id").primaryKey()
```

### 4. **Add Indexes for Performance**
```typescript
import { pgTable, serial, text, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
}));
```

### 5. **Type Your JSONB Columns**
```typescript
metadata: jsonb("metadata").$type<{
  theme: "light" | "dark";
  settings: {
    notifications: boolean;
  };
}>()
```

---

## 📚 Common Patterns

### Unique Constraints
```typescript
email: text("email").notNull().unique()
```

### Default Values
```typescript
status: text("status").default("pending").notNull()
```

### Not Null
```typescript
title: text("title").notNull()
```

### Optional (Nullable)
```typescript
description: text("description")  // No .notNull()
```

### Check Constraints
```typescript
import { check } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  price: integer("price").notNull(),
}, (table) => ({
  priceCheck: check("price_check", sql`${table.price} >= 0`),
}));
```

---

## 🚨 Important Notes

1. **Existing Data**: Your existing `waitlist` and `slideshows` tables won't be affected. Drizzle only creates/modifies tables you define.

2. **Supabase Auth Users**: Supabase has a built-in `auth.users` table. If you need a custom users table, name it something else like `profiles` or use a different schema.

3. **Row Level Security (RLS)**: Tables created by Drizzle won't have RLS policies by default. You can add them in Supabase SQL Editor if needed.

4. **Migrations**: The `db/migrations` folder will be created when you run `npm run db:generate`. Commit these files to git.

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Create/update tables (dev) | `npm run db:push` |
| Open database GUI | `npm run db:studio` |
| Generate migration | `npm run db:generate` |
| Apply migration | `npm run db:migrate` |

---

## ❓ FAQ

**Q: Will this break my existing Supabase tables?**  
A: No! Drizzle only manages tables you define in `schema.ts`.

**Q: Can I still use Supabase client?**  
A: Yes! Use Drizzle for data, Supabase for auth/storage.

**Q: What if I need to run raw SQL?**  
A: You can use `db.execute(sql`YOUR SQL HERE`)` or use Supabase SQL Editor.

**Q: How do I add a new column to an existing table?**  
A: Just add it to the schema and run `npm run db:push`.

**Q: Can I preview changes before applying?**  
A: Yes! Use `npm run db:generate` to see the SQL migration file first.

---

🎉 **You're ready to create tables with Drizzle!**

