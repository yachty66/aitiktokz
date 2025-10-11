import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
  serial
} from "drizzle-orm/pg-core";

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

// Exported slideshows table – snapshot of a slideshow at the time of export
export const exportedSlideshows = pgTable("exported_slideshows", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  // Ownership
  userUid: uuid("user_uid"),
  userEmail: text("user_email"),
  // Labels / metadata
  title: text("title"),
  prompt: text("prompt"),
  aspect: text("aspect").default("9:16").notNull(), // e.g., "1:1", "4:5", "3:4", "9:16"
  numSlides: integer("num_slides"),
  totalDurationSec: integer("total_duration_sec"),
  // Output assets
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  // Full slideshow state: images, texts, positions, durations, etc.
  data: jsonb("data"),
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