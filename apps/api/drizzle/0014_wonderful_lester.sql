CREATE TYPE "public"."report_status" AS ENUM('PENDING', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_message_id_messages_message_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "status" "report_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE set null ON UPDATE no action;