ALTER TABLE "message_threads" ADD COLUMN "initiator_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_initiator_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_post_initiator_unique" UNIQUE("post_id","initiator_id");