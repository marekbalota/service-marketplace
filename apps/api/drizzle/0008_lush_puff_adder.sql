CREATE TABLE "message_reports" (
	"report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "message_reports_reporter_message_unique" UNIQUE("reporter_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE no action ON UPDATE no action;