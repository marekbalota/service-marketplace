CREATE TABLE "profile_locations" (
	"user_profile_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_locations_user_profile_id_location_id_pk" PRIMARY KEY("user_profile_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "profile_locations" ADD CONSTRAINT "profile_locations_user_profile_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_locations" ADD CONSTRAINT "profile_locations_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE no action ON UPDATE no action;