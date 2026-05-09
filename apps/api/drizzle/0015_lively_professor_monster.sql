CREATE TABLE "review_images" (
	"review_image_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"name" text NOT NULL,
	"link" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_reviews_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("review_id") ON DELETE no action ON UPDATE no action;