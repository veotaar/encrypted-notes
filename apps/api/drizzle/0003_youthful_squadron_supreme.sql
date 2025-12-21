CREATE TABLE "note" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"content" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "note_tag" (
	"note_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "note_tag_note_id_tag_id_pk" PRIMARY KEY("note_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"content" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tag" ADD CONSTRAINT "note_tag_note_id_note_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."note"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tag" ADD CONSTRAINT "note_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_userId_idx" ON "note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_deletedAt_idx" ON "note" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "noteTag_deletedAt_idx" ON "note_tag" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "tag_userId_idx" ON "tag" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tag_deletedAt_idx" ON "tag" USING btree ("deleted_at");