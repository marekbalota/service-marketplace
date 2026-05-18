CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE TABLE "profile_locations" (
	"user_profile_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "profile_locations_user_profile_id_location_id_pk" PRIMARY KEY("user_profile_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "review_images" (
	"review_image_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"name" text NOT NULL,
	"link" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" uuid;--> statement-breakpoint
ALTER TABLE "profile_locations" ADD CONSTRAINT "profile_locations_user_profile_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_locations" ADD CONSTRAINT "profile_locations_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_reviews_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("review_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_impersonated_by_user_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;