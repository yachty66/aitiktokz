// Example queries for common database operations
// This file demonstrates how to use Drizzle with your schema

import { db } from "./index";
import { slideshows, waitlist, posts, ucgTemplates, ucgVideos } from "./schema";
import { eq, desc } from "drizzle-orm";

// ============================================
// SLIDESHOW QUERIES
// ============================================

export async function createSlideshow(data: any) {
  const [slideshow] = await db
    .insert(slideshows)
    .values({ data })
    .returning();
  return slideshow;
}

export async function getAllSlideshows() {
  return await db
    .select()
    .from(slideshows)
    .orderBy(desc(slideshows.createdAt));
}

export async function getSlideshowById(id: number) {
  const [slideshow] = await db
    .select()
    .from(slideshows)
    .where(eq(slideshows.id, id))
    .limit(1);
  return slideshow;
}

export async function updateSlideshowData(id: number, data: any) {
  const [slideshow] = await db
    .update(slideshows)
    .set({ data })
    .where(eq(slideshows.id, id))
    .returning();
  return slideshow;
}

export async function deleteSlideshow(id: number) {
  await db.delete(slideshows).where(eq(slideshows.id, id));
}

// ============================================
// WAITLIST QUERIES
// ============================================

export async function addToWaitlist(email: string) {
  const [entry] = await db
    .insert(waitlist)
    .values({ email })
    .returning();
  return entry;
}

export async function getWaitlistByEmail(email: string) {
  const [entry] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.email, email))
    .limit(1);
  return entry;
}

export async function getAllWaitlistEntries() {
  return await db
    .select()
    .from(waitlist)
    .orderBy(desc(waitlist.createdAt));
}

// ============================================
// POSTS QUERIES
// ============================================

export async function createPost(data: {
  title?: string;
  account?: string;
  startAt?: Date;
  videoUrl?: string;
  description?: string;
  hashtags?: string;
  userUid?: string;
  userEmail?: string;
  status?: string;
}) {
  const [post] = await db
    .insert(posts)
    .values(data)
    .returning();
  return post;
}

export async function getAllPosts() {
  return await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt));
}

export async function getPostById(id: number) {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return post;
}

export async function getPostsByUser(userEmail: string) {
  return await db
    .select()
    .from(posts)
    .where(eq(posts.userEmail, userEmail))
    .orderBy(desc(posts.createdAt));
}

export async function getPostsByStatus(status: string) {
  return await db
    .select()
    .from(posts)
    .where(eq(posts.status, status))
    .orderBy(desc(posts.createdAt));
}

export async function updatePostStatus(id: number, status: string) {
  const [post] = await db
    .update(posts)
    .set({ status })
    .where(eq(posts.id, id))
    .returning();
  return post;
}

export async function updatePost(
  id: number,
  data: Partial<{
    title: string;
    account: string;
    startAt: Date;
    videoUrl: string;
    description: string;
    hashtags: string;
    status: string;
  }>
) {
  const [post] = await db
    .update(posts)
    .set(data)
    .where(eq(posts.id, id))
    .returning();
  return post;
}

export async function deletePost(id: number) {
  await db.delete(posts).where(eq(posts.id, id));
}

// ============================================
// UCG TEMPLATES QUERIES
// ============================================

export async function createUcgTemplate(data: {
  status?: "DONE" | "PENDING" | "FAILED";
  title?: string;
  adPrompt?: string;
  imageUrl?: string;
  imageId?: string;
}) {
  const [template] = await db
    .insert(ucgTemplates)
    .values(data)
    .returning();
  return template;
}

export async function getAllUcgTemplates() {
  return await db
    .select()
    .from(ucgTemplates)
    .orderBy(desc(ucgTemplates.createdAt));
}

export async function getUcgTemplateById(id: number) {
  const [template] = await db
    .select()
    .from(ucgTemplates)
    .where(eq(ucgTemplates.id, id))
    .limit(1);
  return template;
}

export async function getUcgTemplatesByStatus(status: "DONE" | "PENDING" | "FAILED") {
  return await db
    .select()
    .from(ucgTemplates)
    .where(eq(ucgTemplates.status, status))
    .orderBy(desc(ucgTemplates.createdAt));
}

export async function updateUcgTemplateStatus(id: number, status: "DONE" | "PENDING" | "FAILED") {
  const [template] = await db
    .update(ucgTemplates)
    .set({ status, updatedAt: new Date() })
    .where(eq(ucgTemplates.id, id))
    .returning();
  return template;
}

export async function updateUcgTemplate(
  id: number,
  data: Partial<{
    status: "DONE" | "PENDING" | "FAILED";
    title: string;
    adPrompt: string;
    imageUrl: string;
    imageId: string;
  }>
) {
  const [template] = await db
    .update(ucgTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ucgTemplates.id, id))
    .returning();
  return template;
}

export async function deleteUcgTemplate(id: number) {
  await db.delete(ucgTemplates).where(eq(ucgTemplates.id, id));
}

// ============================================
// UCG VIDEOS QUERIES
// ============================================

export async function createUcgVideo(data: {
  templateId: number;
  postId?: number;
  status?: "DONE" | "PENDING" | "FAILED";
  bucketId?: string;
  bucketUrl?: string;
  thumbnailUrl?: string;
}) {
  const [video] = await db
    .insert(ucgVideos)
    .values(data)
    .returning();
  return video;
}

export async function getAllUcgVideos() {
  return await db
    .select()
    .from(ucgVideos)
    .orderBy(desc(ucgVideos.createdAt));
}

export async function getUcgVideoById(id: number) {
  const [video] = await db
    .select()
    .from(ucgVideos)
    .where(eq(ucgVideos.id, id))
    .limit(1);
  return video;
}

export async function getUcgVideosByTemplateId(templateId: number) {
  return await db
    .select()
    .from(ucgVideos)
    .where(eq(ucgVideos.templateId, templateId))
    .orderBy(desc(ucgVideos.createdAt));
}

export async function getUcgVideoByPostId(postId: number) {
  const [video] = await db
    .select()
    .from(ucgVideos)
    .where(eq(ucgVideos.postId, postId))
    .limit(1);
  return video;
}

export async function updateUcgVideo(
  id: number,
  data: Partial<{
    postId: number;
    status: "DONE" | "PENDING" | "FAILED";
    bucketId: string;
    bucketUrl: string;
    thumbnailUrl: string;
  }>
) {
  const [video] = await db
    .update(ucgVideos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ucgVideos.id, id))
    .returning();
  return video;
}

export async function deleteUcgVideo(id: number) {
  await db.delete(ucgVideos).where(eq(ucgVideos.id, id));
}

