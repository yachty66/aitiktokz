// Type definitions generated from Drizzle schema
// Import these types throughout your app for type safety

import { slideshows, waitlist, posts } from "./schema";

// Inferred types from schema
export type Slideshow = typeof slideshows.$inferSelect;
export type NewSlideshow = typeof slideshows.$inferInsert;

export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

// Example usage:
// import { Slideshow, WaitlistEntry, Post } from "@/db/types";
//
// const post: Post = await db.select().from(posts).where(eq(posts.id, id));
// const newPost: NewPost = { title: "My Video", status: "queued" };

