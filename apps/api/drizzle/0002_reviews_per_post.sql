ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewee_id_user_profiles_user_profile_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "reviewee_id";
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "post_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_post_id_posts_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE no action ON UPDATE no action;
