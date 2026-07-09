ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ai_analysis_mode" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "analysis_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "last_analysis_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "last_analysis_status" text;
