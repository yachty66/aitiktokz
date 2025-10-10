// Example queries for common database operations
// This file demonstrates how to use Drizzle with your schema

import { db } from "./index";
import { slideshows, waitlist, posts } from "./schema";
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

