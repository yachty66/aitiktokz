CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"title" text,
	"account" text,
	"start_at" timestamp,
	"video_url" text,
	"description" text,
	"hashtags" text,
	"user_uid" uuid,
	"user_email" text,
	"status" text DEFAULT 'queued' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slideshow-templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "slideshow-templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "ucg_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"title" text,
	"ad_prompt" text,
	"image_url" text,
	"image_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ucg_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"post_id" integer,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"bucket_id" text,
	"bucket_url" text,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "waitlist_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ucg_videos" ADD CONSTRAINT "ucg_videos_template_id_ucg_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."ucg_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ucg_videos" ADD CONSTRAINT "ucg_videos_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;