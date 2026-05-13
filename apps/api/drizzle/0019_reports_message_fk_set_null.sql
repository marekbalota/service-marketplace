ALTER TABLE "reports" DROP CONSTRAINT "reports_message_id_messages_message_id_fk";--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE SET NULL ON UPDATE NO ACTION;
