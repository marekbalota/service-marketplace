ALTER TABLE "post_locations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "post_locations" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id") ON DELETE no action ON UPDATE no action;