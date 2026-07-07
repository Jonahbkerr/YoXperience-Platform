-- Idempotent: earlier columns were applied to some environments via
-- `drizzle-kit push` (not tracked migrations), so this migration may run
-- against a DB that already has them. IF NOT EXISTS makes every ADD a no-op
-- when the column is already present, so the only real change here is
-- slot_definitions.preview_url.
ALTER TABLE "end_user_preferences" ADD COLUMN IF NOT EXISTS "rationale" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "site_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "experiments_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "llm_provider" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "llm_base_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "llm_model" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "llm_api_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "llm_api_key_last_four" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "optimization_goal" text;--> statement-breakpoint
ALTER TABLE "slot_definitions" ADD COLUMN IF NOT EXISTS "preview_url" text;--> statement-breakpoint
ALTER TABLE "slot_definitions" ADD COLUMN IF NOT EXISTS "goal" text;
