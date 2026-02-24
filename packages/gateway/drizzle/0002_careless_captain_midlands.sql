CREATE TYPE "public"."slot_mode" AS ENUM('auto', 'forced', 'split');--> statement-breakpoint
ALTER TABLE "slot_definitions" ADD COLUMN "mode" "slot_mode" DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "slot_definitions" ADD COLUMN "forced_variant" text;--> statement-breakpoint
ALTER TABLE "slot_definitions" ADD COLUMN "traffic_split" text;