import { pgTable, text, timestamp, serial, jsonb, uuid, integer } from "drizzle-orm/pg-core";

// Existing waitlist table (matching your Supabase structure)
export const waitlist = pgTable("waitlist", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull().unique(),
});

// Slideshow templates table (maps to slideshow-templates in DB)
export const slideshows = pgTable("slideshow-templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  data: jsonb("data"),
});

// Posts table (for managing TikTok/social media posts)
export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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

// UCG Templates table (stores template info with status, title, and image)
export const ucgTemplates = pgTable("ucg_templates", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("PENDING"), // DONE, PENDING, FAILED
  title: text("title"),
  adPrompt: text("ad_prompt"),
  imageUrl: text("image_url"),
  imageId: text("image_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// UCG Videos table (stores generated videos linked to templates)
export const ucgVideos = pgTable("ucg_videos", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => ucgTemplates.id).notNull(), // one template can have many videos
  postId: integer("post_id").references(() => posts.id),
  status: text("status").notNull().default("PENDING"), // DONE, PENDING, FAILED
  bucketId: text("bucket_id"),
  bucketUrl: text("bucket_url"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});