import { pgTable, text, timestamp, serial, jsonb, uuid } from "drizzle-orm/pg-core";

// Existing waitlist table (matching your Supabase structure)
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull().unique(),
});

// Existing table with images/data (update name if needed)
export const slideshows = pgTable("slideshows", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  data: jsonb("data"),
});

// Posts table (for managing TikTok/social media posts)
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  title: text("title"),
  account: text("account"),
  startAt: timestamp("start_at"),
  videoUrl: text("video_url"),
  description: text("description"),
  hashtags: text("hashtags"),
  userUid: uuid("user_uid"),
  userEmail: text("user_email"),
  status: text("status").default("queued").notNull(),
});

