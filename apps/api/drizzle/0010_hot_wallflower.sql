ALTER TABLE "reports" ALTER COLUMN "post_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "review_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_reviews_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("review_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_exactly_one_target" CHECK (("reports"."post_id" IS NOT NULL)::int + ("reports"."message_id" IS NOT NULL)::int + ("reports"."review_id" IS NOT NULL)::int = 1);