ALTER TABLE "user" ADD COLUMN "encryption_salt" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "wrapped_master_key" text NOT NULL;