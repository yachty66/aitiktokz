// Type definitions generated from Drizzle schema
// Import these types throughout your app for type safety

import { slideshows, waitlist, posts, ucgTemplates, ucgVideos } from "./schema";

// Inferred types from schema
export type Slideshow = typeof slideshows.$inferSelect;
export type NewSlideshow = typeof slideshows.$inferInsert;

export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type UcgTemplate = typeof ucgTemplates.$inferSelect;
export type NewUcgTemplate = typeof ucgTemplates.$inferInsert;

export type UcgVideo = typeof ucgVideos.$inferSelect;
export type NewUcgVideo = typeof ucgVideos.$inferInsert;

// Example usage:
// import { UcgTemplate, UcgVideo } from "@/db/types";
//
// const template: UcgTemplate = await db.select().from(ucgTemplates).where(eq(ucgTemplates.id, id));
// const video: UcgVideo = await db.select().from(ucgVideos).where(eq(ucgVideos.templateId, templateId));

